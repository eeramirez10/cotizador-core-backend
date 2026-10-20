import { randomUUID } from "node:crypto";
import type {
  DeletedPurchaseRequisition,
  FindPurchaseRequisitionsParams,
  FindPurchaseRequisitionsResult,
  LinkPurchaseRequisitionItemToErpData,
  PurchaseRequisitionActor,
  SavePurchaseSupplierOfferData,
  SaveErpSupplierData,
  SaveSupplierData,
  SupplierOfferAllocation,
  UpdatePurchaseRequisitionItemData,
  UpdatePurchaseRequisitionDocumentData,
} from "../../domain/datasources/purchase-requisition.datasource";
import { PurchaseRequisitionDatasource } from "../../domain/datasources/purchase-requisition.datasource";
import type {
  ProcurementUserSummary,
  PurchaseRequisitionEntity,
  PurchaseRequisitionItemEntity,
  PurchaseSupplierOfferEntity,
  SupplierEntity,
} from "../../domain/entities/purchase-requisition.entity";
import type { QuoteEntity } from "../../domain/entities/quote.entity";
import { getQuoteItemFulfillment } from "../../domain/use-cases/quote-item-fulfillment.helper";
import { convertQuoteAmount } from "../../domain/use-cases/quote-currency.helper";
import { canRequestPurchasingPrices, resolvePurchasePriceAwards } from "../../domain/use-cases/purchase-price-inquiry-rule";
import { requisitionSubmissionError } from "../../domain/use-cases/requisition-submission-rule";
import { erpCodeForQuoteItem, quotationOwnerForSupplierReference, selectUnquotedPurchaseItems } from "../../domain/use-cases/select-unquoted-purchase-items";
import { areSupplierRequisitionsReadyForOrder, groupRequisitionItemsBySupplier } from "../../domain/use-cases/requisitions-per-supplier-rule";
import { assertRequisitionCanBeDeleted } from "../../domain/use-cases/requisition-deletion-rule";
import { canIssueSupplierRequisitions } from "../../domain/use-cases/supplier-requisition-eligibility";
import { supplierRequisitionGroupKey, validateSupplierOfferAllocations } from "../../domain/use-cases/supplier-offer-allocation";
import { resolveSupplierErpSyncTarget } from "../../domain/use-cases/supplier-erp-sync-target";
import { resolveRuntimeValue, type RuntimeValue } from "../../domain/services/runtime-value";
import { canonicalizeProductText, normalizeProductDisplayText } from "../../domain/utils/canonical-product-text";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

const requisitionInclude = {
  quote: {
    select: {
      quoteNumber: true,
      status: true,
      currency: true,
      exchangeRate: true,
      customer: { select: { legalName: true, displayName: true } },
    },
  },
  branch: { select: { name: true, address: true, phone: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  assignedBuyer: { select: { id: true, firstName: true, lastName: true, role: true } },
  costApprovedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  supplierRequisitions: {
    orderBy: { number: "asc" as const },
    include: { supplier: { select: { name: true } }, lines: { orderBy: { position: "asc" as const } } },
  },
  items: {
    orderBy: { position: "asc" as const },
    include: {
      quoteItem: { select: { clientItemId: true, customerDescription: true, erpDescription: true } },
      offers: {
        where: { isActive: true },
        orderBy: [{ isSelected: "desc" as const }, { createdAt: "desc" as const }],
        include: {
          supplier: true,
          supplierQuote: true,
          createdBy: { select: { id: true, firstName: true, lastName: true, role: true } },
        },
      },
    },
  },
} satisfies Prisma.PurchaseRequisitionInclude;

type RequisitionRow = Prisma.PurchaseRequisitionGetPayload<{ include: typeof requisitionInclude }>;
type DecimalLike = { toString(): string };

const number = (value: number | DecimalLike): number =>
  typeof value === "number" ? value : Number(value.toString());

const nullable = (value: string | null | undefined): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim().replace(/\s+/g, " ");
  return normalized || null;
};

const jsonStringRecord = (value: Prisma.JsonValue | null): Record<string, string> =>
  value && typeof value === "object" && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
    : {};

const userSummary = (user: {
  id: string;
  firstName: string;
  lastName: string;
  role: string;
} | null): ProcurementUserSummary | null =>
  user
    ? {
        id: user.id,
        fullName: `${user.firstName} ${user.lastName}`.trim(),
        role: user.role,
      }
    : null;

const supplierEntity = (supplier: {
  id: string;
  erpCode: string | null;
  name: string;
  source: SupplierEntity["source"];
  status: SupplierEntity["status"];
  scope: SupplierEntity["scope"];
  taxId: string | null;
  normalizedTaxId: string | null;
  state: string | null;
  creditTerms: string | null;
  currency: SupplierEntity["currency"];
  country: string | null;
  contactName: string | null;
  contactPosition: string | null;
  email: string | null;
  normalizedEmail: string | null;
  phone: string | null;
  normalizedPhone: string | null;
  phoneExtension: string | null;
  mobile: string | null;
  notes: string | null;
  erpSyncedAt: Date | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  contacts?: Array<{
    id: string;
    contactKey: string;
    channel: "EMAIL" | "PHONE";
    value: string;
    normalizedValue: string;
    phoneKind: "LANDLINE" | "MOBILE" | "UNKNOWN" | null;
    extension: string | null;
    isWhatsApp: boolean;
    contactName: string | null;
    contactPosition: string | null;
    label: string | null;
    isPrimary: boolean;
  }>;
}): SupplierEntity => ({
  id: supplier.id,
  erpCode: supplier.erpCode,
  name: supplier.name,
  source: supplier.source,
  status: supplier.status,
  scope: supplier.scope,
  taxId: supplier.taxId,
  normalizedTaxId: supplier.normalizedTaxId,
  state: supplier.state,
  creditTerms: supplier.creditTerms,
  currency: supplier.currency,
  country: supplier.country,
  contactName: supplier.contactName,
  contactPosition: supplier.contactPosition,
  email: supplier.email,
  normalizedEmail: supplier.normalizedEmail,
  phone: supplier.phone,
  normalizedPhone: supplier.normalizedPhone,
  phoneExtension: supplier.phoneExtension,
  mobile: supplier.mobile,
  contacts: (supplier.contacts ?? []).map((contact) => ({ ...contact })),
  notes: supplier.notes,
  erpSyncedAt: supplier.erpSyncedAt,
  isActive: supplier.isActive,
  createdAt: supplier.createdAt,
  updatedAt: supplier.updatedAt,
});

const offerEntity = (offer: RequisitionRow["items"][number]["offers"][number]): PurchaseSupplierOfferEntity => ({
  id: offer.id,
  requisitionItemId: offer.requisitionItemId,
  supplierQuoteId: offer.supplierQuoteId,
  supplierId: offer.supplierId,
  source: offer.source,
  supplierProductCode: offer.supplierProductCode,
  alternateCodes: offer.alternateCodes,
  supplierDescription: offer.supplierDescription,
  qty: number(offer.qty),
  unit: offer.unit,
  listUnitPrice: offer.listUnitPrice === null ? null : number(offer.listUnitPrice),
  discountPct: offer.discountPct === null ? null : number(offer.discountPct),
  unitCost: number(offer.unitCost),
  currency: offer.currency,
  exchangeRate: offer.exchangeRate ? number(offer.exchangeRate) : null,
  subtotal: number(offer.subtotal),
  taxRate: number(offer.taxRate),
  tax: number(offer.tax),
  total: number(offer.total),
  brand: offer.brand,
  origin: offer.origin,
  deliveryTime: offer.deliveryTime,
  availableDate: offer.availableDate,
  minimumQty: offer.minimumQty === null ? null : number(offer.minimumQty),
  validUntil: offer.validUntil,
  quoteDate: offer.quoteDate,
  sentAt: offer.sentAt,
  externalReference: offer.externalReference,
  notes: offer.notes,
  isSelected: offer.isSelected,
  awardedQty: offer.awardedQty === null ? null : number(offer.awardedQty),
  isActive: offer.isActive,
  supplierQuote: offer.supplierQuote ? {
    id: offer.supplierQuote.id,
    reference: offer.supplierQuote.reference,
    quoteDate: offer.supplierQuote.quoteDate,
    validUntil: offer.supplierQuote.validUntil,
    currency: offer.supplierQuote.currency,
    exchangeRate: offer.supplierQuote.exchangeRate ? number(offer.supplierQuote.exchangeRate) : null,
    paymentTerms: offer.supplierQuote.paymentTerms,
    deliveryTerms: offer.supplierQuote.deliveryTerms,
    subtotal: number(offer.supplierQuote.subtotal),
    discount: number(offer.supplierQuote.discount),
    freight: number(offer.supplierQuote.freight),
    otherCharges: number(offer.supplierQuote.otherCharges),
    taxIncluded: offer.supplierQuote.taxIncluded,
    taxRate: number(offer.supplierQuote.taxRate),
    tax: number(offer.supplierQuote.tax),
    total: number(offer.supplierQuote.total),
    notes: offer.supplierQuote.notes,
    fileAssetId: offer.supplierQuote.fileAssetId,
  } : null,
  supplier: supplierEntity(offer.supplier),
  createdBy: userSummary(offer.createdBy)!,
  createdAt: offer.createdAt,
  updatedAt: offer.updatedAt,
});

const requisitionEntity = (row: RequisitionRow): PurchaseRequisitionEntity => ({
  id: row.id,
  requisitionNumber: row.requisitionNumber,
  quoteId: row.quoteId,
  quoteNumber: row.quote.quoteNumber,
  quoteStatus: row.quote.status,
  supplierId: row.supplierId,
  supplierName: row.supplierName,
  quoteCurrency: row.quote.currency,
  quoteExchangeRate: number(row.quote.exchangeRate),
  branchId: row.branchId,
  branchName: row.branch.name,
  branchAddress: row.branch.address,
  branchPhone: row.branch.phone,
  customerName: row.quote.customer.legalName?.trim() || row.quote.customer.displayName,
  requestedByUserId: row.requestedByUserId,
  requestedBy: userSummary(row.requestedBy)!,
  assignedBuyerUserId: row.assignedBuyerUserId,
  assignedBuyer: userSummary(row.assignedBuyer),
  status: row.status,
  deliveryState: row.deliveryState,
  deliveryPlace: row.deliveryPlace,
  notes: row.notes,
  supplierOrderReference: row.supplierOrderReference,
  shipmentReference: row.shipmentReference,
  fobTerms: row.fobTerms,
  paymentTerms: row.paymentTerms,
  qualityCertificatesRequired: row.qualityCertificatesRequired,
  markingInstructions: row.markingInstructions,
  submittedAt: row.submittedAt,
  completedAt: row.completedAt,
  costApprovedAt: row.costApprovedAt,
  costApprovedBy: userSummary(row.costApprovedBy),
  items: row.items.map((item): PurchaseRequisitionItemEntity => ({
    id: item.id,
    quoteItemId: item.quoteItemId,
    quoteClientItemId: item.quoteItem.clientItemId,
    position: item.position,
    productId: item.productId,
    source: item.source,
    erpCode: item.erpCode,
    erpEan: item.erpEan,
    erpLinkedAt: item.erpLinkedAt,
    erpLinkedByUserId: item.erpLinkedByUserId,
    qty: number(item.qty),
    unit: item.unit,
    description: item.description,
    customerDescription: item.quoteItem.customerDescription,
    erpDescription: item.quoteItem.erpDescription || (item.source === "ERP_NO_STOCK" ? item.description : null),
    standard: item.standard,
    diameter: item.diameter,
    thickness: item.thickness,
    bore: item.bore,
    technicalFamily: item.technicalFamily,
    technicalAttributes: jsonStringRecord(item.technicalAttributes),
    sellerUnitCost: number(item.sellerUnitCost),
    sellerCurrency: item.sellerCurrency,
    sellerExchangeRate: number(item.sellerExchangeRate),
    sellerCostSource: item.sellerCostSource,
    quotationOwner: item.quotationOwner ?? (item.sellerSupplierId || item.offers.some((offer) => offer.source === "SELLER") ? "SELLER" : "PURCHASING"),
    sellerSupplierId: item.sellerSupplierId,
    sellerSupplierName: item.sellerSupplierName,
    sellerBrand: item.sellerBrand,
    originRestrictions: item.originRestrictions,
    sellerDeliveryTime: item.sellerDeliveryTime,
    deliveryPlace: item.deliveryPlace,
    status: item.status,
    selectedOfferId: item.selectedOfferId,
    offers: item.offers.map(offerEntity),
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  })),
  supplierRequisitions: row.supplierRequisitions.map((document) => ({
    id: document.id,
    number: document.number,
    supplierId: document.supplierId,
    supplierName: document.supplierName,
    currency: document.currency,
    createdAt: document.createdAt,
    lines: document.lines.map((line) => ({
      id: line.id,
      requisitionItemId: line.requisitionItemId,
      offerId: line.offerId,
      position: line.position,
      description: line.description,
      erpCode: line.erpCode,
      supplierProductCode: line.supplierProductCode,
      unit: line.unit,
      qty: number(line.qty),
      unitCost: number(line.unitCost),
      exchangeRate: line.exchangeRate === null ? null : number(line.exchangeRate),
      taxRate: number(line.taxRate),
      subtotal: number(line.subtotal),
      tax: number(line.tax),
      total: number(line.total),
    })),
  })),
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class PrismaPurchaseRequisitionDatasource extends PurchaseRequisitionDatasource {
  constructor(
    private readonly internalApprovalEnabled: RuntimeValue<boolean> = true,
    private readonly allowLocalWithoutErpCode: RuntimeValue<boolean> = false,
  ) {
    super();
  }

  async ensureForApprovedQuote(quote: QuoteEntity): Promise<PurchaseRequisitionEntity[]> {
    const requiredItems = quote.items.flatMap((item, index) => {
      const erpCode = erpCodeForQuoteItem(item);
      const localNew = !erpCode;
      const fulfillment = getQuoteItemFulfillment({
        qty: item.qty,
        stock: item.stock,
        externalProductCode: erpCode || null,
      });
      if (!fulfillment.requiresPurchase || !item.sellerSupplierId) return [];

      const hasSellerQuote = item.sellerQuotedUnitCost !== null && item.sellerQuotedUnitCost > 0;
      return [{
        quoteItemId: item.id,
        position: index + 1,
        productId: item.productId,
        source: localNew ? "LOCAL_NEW" as const : "ERP_NO_STOCK" as const,
        erpCode: erpCode || null,
        qty: fulfillment.purchaseQty,
        unit: item.unit,
        description: item.erpDescription?.trim() || item.product?.description?.trim() || item.customerDescription?.trim() || "SIN DESCRIPCION",
        standard: item.purchaseStandard,
        diameter: item.purchaseDiameter,
        thickness: item.purchaseThickness,
        bore: item.purchaseBore,
        technicalFamily: item.technicalFamily,
        technicalAttributes: item.technicalAttributes,
        sellerUnitCost: hasSellerQuote ? item.sellerQuotedUnitCost! : Math.max(0, item.cost),
        sellerCurrency: item.sellerQuotedCurrency || item.costCurrency,
        sellerExchangeRate: quote.exchangeRate,
        sellerCostSource: hasSellerQuote
          ? item.sellerCostSource || "ESTIMATED"
          : localNew ? "ESTIMATED" as const : "ERP_COST" as const,
        quotationOwner: quotationOwnerForSupplierReference(item.sellerSupplierId),
        sellerSupplierId: item.sellerSupplierId,
        sellerSupplierName: item.sellerSupplierNameSnapshot,
        sellerBrand: item.sellerQuotedBrand,
        originRestrictions: item.sellerOriginRestrictions,
        sellerDeliveryTime: item.sellerSupplierDeliveryTime,
        deliveryPlace: item.sellerDeliveryState,
      }];
    });

    const groups = groupRequisitionItemsBySupplier(requiredItems);

    const draftIds = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${quote.id}))`;
      const existing = await tx.purchaseRequisition.findMany({
        where: { quoteId: quote.id },
        include: { items: { select: { quoteItemId: true } } },
        orderBy: { createdAt: "asc" },
      });
      const existingItems = new Map(existing.flatMap((requisition) =>
        requisition.items.map((item) => [item.quoteItemId, requisition] as const)));
      const usedNumbers = new Set(existing.map((requisition) => requisition.requisitionNumber));
      const baseNumber = `REQ-${quote.quoteNumber.replace(/^QT-/, "")}`;
      const createdIds: string[] = [];
      let sequence = 0;
      for (const [supplierId, items] of groups) {
        let requisition = existing.find((entry) => entry.supplierId === supplierId);
        const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: supplierId }, select: { name: true } });
        const supplierName = items[0].sellerSupplierName || supplier.name;
        const inherited = items.filter((item) => {
          const previous = existingItems.get(item.quoteItemId);
          return previous?.supplierId === null && previous.status === "DRAFT";
        });
        const conflicting = items.map((item) => existingItems.get(item.quoteItemId))
          .find((previous) => previous && (previous.supplierId !== null || previous.status !== "DRAFT"));
        if (conflicting && conflicting.supplierId !== supplierId) {
          throw new Error("La partida ya pertenece a otra requisición. Revisa su proveedor antes de continuar.");
        }
        if (!requisition) {
          let requisitionNumber: string;
          do {
            sequence += 1;
            requisitionNumber = `${baseNumber.slice(0, 36)}-${String(sequence).padStart(3, "0")}`;
          } while (usedNumbers.has(requisitionNumber));
          usedNumbers.add(requisitionNumber);
          const deliveryStates = [...new Set(items.map((item) => item.deliveryPlace).filter((value): value is string => Boolean(value)))];
          const fresh = items.filter((item) => !existingItems.has(item.quoteItemId));
          const created = await tx.purchaseRequisition.create({
            data: {
              requisitionNumber,
              quoteId: quote.id,
              supplierId,
              supplierName,
              branchId: quote.branchId,
              requestedByUserId: quote.createdByUserId,
              status: "DRAFT",
              deliveryState: deliveryStates.length === 1 ? deliveryStates[0] : null,
              ...(fresh.length ? { items: { create: fresh } } : {}),
            },
          });
          for (const item of inherited) {
            await this.moveUnassignedDraftItem(tx, item.quoteItemId, created.id, supplierId, supplierName);
          }
          createdIds.push(created.id);
          continue;
        }
        if (requisition.status !== "DRAFT") continue;
        const missing = items.filter((item) => !existingItems.has(item.quoteItemId));
        if (missing.length > 0) {
          await tx.purchaseRequisitionItem.createMany({ data: missing.map((item) => ({ ...item, requisitionId: requisition!.id })) });
        }
        for (const item of inherited) {
          await this.moveUnassignedDraftItem(tx, item.quoteItemId, requisition.id, supplierId, supplierName);
        }
        if (requisition.supplierName !== supplierName) {
          await tx.purchaseRequisition.update({ where: { id: requisition.id }, data: { supplierName } });
        }
        createdIds.push(requisition.id);
      }
      return createdIds;
    });

    for (const id of draftIds) {
      const requisition = await prisma.purchaseRequisition.findUnique({ where: { id }, select: { status: true } });
      if (requisition?.status === "DRAFT") await this.materializeSellerOffers(id, quote);
    }
    const rows = await prisma.purchaseRequisition.findMany({
      where: { quoteId: quote.id, OR: [{ supplierId: { not: null } }, { status: { not: "DRAFT" } }] },
      include: requisitionInclude,
      orderBy: { requisitionNumber: "asc" },
    });
    return rows.map(requisitionEntity);
  }

  async listBuyersForBranch(branchId: string): Promise<ProcurementUserSummary[]> {
    const buyers = await prisma.user.findMany({
      where: { branchId, role: "PURCHASING", isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    return buyers.map((buyer) => ({
      id: buyer.id,
      fullName: `${buyer.firstName} ${buyer.lastName}`.trim(),
      role: buyer.role,
    }));
  }

  async sendUnquotedItemsToPurchasing(
    quote: QuoteEntity,
    itemIds: string[],
    buyerUserId: string,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity> {
    const selected = selectUnquotedPurchaseItems(quote.items, itemIds);
    const items = selected.map(({ item, position, erpCode, purchaseQty }) => {
      return {
        quoteItemId: item.id,
        position,
        productId: item.productId,
        source: erpCode ? "ERP_NO_STOCK" as const : "LOCAL_NEW" as const,
        erpCode: erpCode || null,
        qty: purchaseQty,
        unit: item.unit,
        description: item.erpDescription?.trim() || item.product?.description?.trim() || item.customerDescription?.trim() || "SIN DESCRIPCION",
        standard: item.purchaseStandard,
        diameter: item.purchaseDiameter,
        thickness: item.purchaseThickness,
        bore: item.purchaseBore,
        technicalFamily: item.technicalFamily,
        technicalAttributes: item.technicalAttributes,
        sellerUnitCost: 0,
        sellerCurrency: item.costCurrency,
        sellerExchangeRate: quote.exchangeRate,
        sellerCostSource: "ESTIMATED" as const,
        quotationOwner: "PURCHASING" as const,
        sellerSupplierId: null,
        sellerSupplierName: null,
        sellerBrand: null,
        originRestrictions: item.sellerOriginRestrictions,
        sellerDeliveryTime: null,
        deliveryPlace: item.sellerDeliveryState,
      };
    });

    const row = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${quote.id}))`;
      const currentQuote = await tx.quote.findUnique({ where: { id: quote.id }, select: { status: true, branchId: true, captureMethod: true } });
      if (!currentQuote || !canRequestPurchasingPrices(currentQuote.status, currentQuote.captureMethod) || currentQuote.branchId !== quote.branchId) {
        throw new Error("La cotización ya no está en borrador o aprobada, o cambió de sucursal.");
      }
      const buyer = await tx.user.findFirst({
        where: { id: buyerUserId, branchId: quote.branchId, role: "PURCHASING", isActive: true },
        select: { id: true },
      });
      if (!buyer) throw new Error("Selecciona un responsable de Compras activo de esta sucursal.");
      const linked = await tx.purchaseRequisitionItem.findFirst({ where: { quoteItemId: { in: itemIds } }, select: { quoteItemId: true } });
      if (linked) throw new Error("Una partida ya tiene requisición. Actualiza la cotización y vuelve a intentarlo.");
      const existing = await tx.purchaseRequisition.findMany({
        where: { quoteId: quote.id }, select: { requisitionNumber: true },
      });
      const usedNumbers = new Set(existing.map((entry) => entry.requisitionNumber));
      const baseNumber = `REQ-${quote.quoteNumber.replace(/^QT-/, "")}`.slice(0, 36);
      let sequence = 1;
      while (usedNumbers.has(`${baseNumber}-${String(sequence).padStart(3, "0")}`)) sequence += 1;
      return tx.purchaseRequisition.create({
        data: {
          requisitionNumber: `${baseNumber}-${String(sequence).padStart(3, "0")}`,
          quoteId: quote.id,
          branchId: quote.branchId,
          requestedByUserId: actor.id,
          assignedBuyerUserId: buyer.id,
          status: "SUBMITTED",
          submittedAt: new Date(),
          items: { create: items },
        },
        include: requisitionInclude,
      });
    });
    return requisitionEntity(row);
  }

  private async moveUnassignedDraftItem(
    tx: Prisma.TransactionClient,
    quoteItemId: string,
    requisitionId: string,
    supplierId: string,
    supplierName: string,
  ): Promise<void> {
    const linkedOffers = await tx.purchaseSupplierOffer.count({
      where: { requisitionItem: { quoteItemId }, supplierQuoteId: { not: null } },
    });
    if (linkedOffers > 0) throw new Error("La partida pendiente tiene propuestas vinculadas y requiere revisión antes de asignar proveedor.");
    await tx.purchaseRequisitionItem.update({
      where: { quoteItemId },
      data: { requisitionId, sellerSupplierId: supplierId, sellerSupplierName: supplierName },
    });
  }

  async findPaginated(params: FindPurchaseRequisitionsParams): Promise<FindPurchaseRequisitionsResult> {
    const where: Prisma.PurchaseRequisitionWhereInput = {
      AND: [
        this.scopeWhere(params.actor),
        { OR: [{ supplierId: { not: null } }, { status: { not: "DRAFT" } }] },
        params.status ? { status: params.status } : {},
        params.search
          ? {
              OR: [
                { requisitionNumber: { contains: params.search, mode: "insensitive" } },
                { quote: { quoteNumber: { contains: params.search, mode: "insensitive" } } },
                { quote: { customer: { displayName: { contains: params.search, mode: "insensitive" } } } },
                { items: { some: { description: { contains: params.search, mode: "insensitive" } } } },
              ],
            }
          : {},
      ],
    };
    const [total, rows] = await prisma.$transaction([
      prisma.purchaseRequisition.count({ where }),
      prisma.purchaseRequisition.findMany({
        where,
        include: requisitionInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: (params.page - 1) * params.pageSize,
        take: params.pageSize,
      }),
    ]);
    return { total, items: rows.map(requisitionEntity) };
  }

  async findById(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    const row = await prisma.purchaseRequisition.findFirst({
      where: { id, ...this.scopeWhere(actor) },
      include: requisitionInclude,
    });
    return row ? requisitionEntity(row) : null;
  }

  async listBuyers(id: string, actor: PurchaseRequisitionActor): Promise<ProcurementUserSummary[] | null> {
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id, ...this.scopeWhere(actor) },
      select: { branchId: true },
    });
    if (!requisition) return null;
    const buyers = await prisma.user.findMany({
      where: { branchId: requisition.branchId, role: "PURCHASING", isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true },
      orderBy: [{ firstName: "asc" }, { lastName: "asc" }],
    });
    return buyers.map((buyer) => ({
      id: buyer.id,
      fullName: `${buyer.firstName} ${buyer.lastName}`.trim(),
      role: buyer.role,
    }));
  }

  async findByQuoteId(quoteId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity[]> {
    const rows = await prisma.purchaseRequisition.findMany({
      where: { quoteId, ...this.scopeWhere(actor), OR: [{ supplierId: { not: null } }, { status: { not: "DRAFT" } }] },
      include: requisitionInclude,
      orderBy: { requisitionNumber: "asc" },
    });
    return rows.map(requisitionEntity);
  }

  async deletePermanently(id: string, confirmation: string, actor: PurchaseRequisitionActor): Promise<DeletedPurchaseRequisition | null> {
    if (actor.role !== "ADMIN") throw new Error("Only ADMIN can delete purchase requisitions.");
    return prisma.$transaction(async (tx) => {
      const requisition = await tx.purchaseRequisition.findUnique({
        where: { id },
        select: {
          id: true,
          requisitionNumber: true,
          status: true,
          quoteId: true,
          quote: {
            select: {
              quoteNumber: true,
              erpOrderNumber: true,
              orderStatus: true,
              orderExports: { select: { id: true }, take: 1 },
            },
          },
        },
      });
      if (!requisition) return null;
      assertRequisitionCanBeDeleted({
        confirmation,
        requisitionNumber: requisition.requisitionNumber,
        status: requisition.status,
        erpOrderNumber: requisition.quote.erpOrderNumber,
        orderStatus: requisition.quote.orderStatus,
        hasOrderExport: requisition.quote.orderExports.length > 0,
      });

      const [supplierQuotes, offerAttachments] = await Promise.all([
        tx.purchaseSupplierQuote.findMany({ where: { requisitionId: id }, select: { fileAssetId: true } }),
        tx.purchaseOfferAttachment.findMany({
          where: { purchaseSupplierOffer: { requisitionItem: { requisitionId: id } } },
          select: { fileAssetId: true },
        }),
      ]);
      const fileIds = [...new Set([
        ...supplierQuotes.map((row) => row.fileAssetId),
        ...offerAttachments.map((row) => row.fileAssetId),
      ].filter((fileId): fileId is string => Boolean(fileId)))];

      await tx.purchaseRequisitionItem.updateMany({ where: { requisitionId: id }, data: { selectedOfferId: null } });
      const lines = await tx.purchaseSupplierRequisitionLine.deleteMany({ where: { supplierRequisition: { requisitionId: id } } });
      const supplierRequisitions = await tx.purchaseSupplierRequisition.deleteMany({ where: { requisitionId: id } });
      const offers = await tx.purchaseSupplierOffer.deleteMany({ where: { requisitionItem: { requisitionId: id } } });
      await tx.purchaseSupplierQuote.deleteMany({ where: { requisitionId: id } });
      await tx.purchaseRequisition.delete({ where: { id } });

      const orphanedWhere: Prisma.FileAssetWhereInput = {
        id: { in: fileIds },
        quoteAttachments: { none: {} },
        quoteDeliveryAttempts: { none: {} },
        purchaseOfferAttachments: { none: {} },
        purchaseSupplierQuotes: { none: {} },
        whatsappOutboundMessages: { none: {} },
      };
      const orphanedFiles = fileIds.length > 0 ? await tx.fileAsset.findMany({
        where: orphanedWhere,
        select: { id: true, storageKey: true },
      }) : [];
      let deletedFiles = orphanedFiles;
      if (orphanedFiles.length > 0) {
        await tx.fileAsset.deleteMany({ where: orphanedWhere });
        const remaining = await tx.fileAsset.findMany({
          where: { id: { in: orphanedFiles.map((file) => file.id) } },
          select: { id: true },
        });
        const remainingIds = new Set(remaining.map((file) => file.id));
        deletedFiles = orphanedFiles.filter((file) => !remainingIds.has(file.id));
      }
      await tx.auditLog.create({
        data: {
          actorUserId: actor.id,
          entityType: "PURCHASE_REQUISITION",
          entityId: id,
          action: "DELETE_PERMANENTLY",
          payload: {
            requisitionNumber: requisition.requisitionNumber,
            quoteId: requisition.quoteId,
            quoteNumber: requisition.quote.quoteNumber,
            deletedSupplierRequisitions: supplierRequisitions.count,
            deletedSupplierRequisitionLines: lines.count,
            deletedOffers: offers.count,
            deletedExclusiveFiles: deletedFiles.length,
          },
        },
      });
      return { storageKeysToDelete: deletedFiles.map((file) => file.storageKey) };
    }, { timeout: 30_000, isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  async updateDocument(id: string, data: UpdatePurchaseRequisitionDocumentData, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    const current = await prisma.purchaseRequisition.findFirst({
      where: { id, ...this.scopeWhere(actor) },
      select: { id: true, status: true, requestedByUserId: true },
    });
    if (!current) return null;
    if (["COMPLETED", "CANCELLED"].includes(current.status)) throw new Error("Closed requisitions are read-only.");
    if (actor.role === "SELLER" && (current.status !== "DRAFT" || current.requestedByUserId !== actor.id)) {
      throw new Error("Seller can only edit own draft requisitions.");
    }
    if (actor.role === "PURCHASING" && current.status === "DRAFT") throw new Error("Purchase requisition must be submitted first.");
    await prisma.purchaseRequisition.update({ where: { id }, data });
    return this.findById(id, actor);
  }

  async updateSupplierCode(
    id: string,
    itemId: string,
    offerId: string,
    supplierProductCode: string | null,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null> {
    await this.assertNotFinalized(id);
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id, ...this.scopeWhere(actor) },
      select: {
        status: true,
        requestedByUserId: true,
        items: {
          where: { id: itemId },
          select: { offers: { where: { id: offerId, isActive: true }, select: { id: true, source: true } } },
        },
      },
    });
    const offer = requisition?.items[0]?.offers[0];
    if (!offer || !requisition) return null;
    if (["COMPLETED", "CANCELLED"].includes(requisition.status)) throw new Error("Closed requisitions are read-only.");
    if (actor.role === "SELLER" && (
      requisition.requestedByUserId !== actor.id || requisition.status !== "DRAFT" || offer.source !== "SELLER"
    )) throw new Error("Seller can only edit own draft supplier quotes.");
    if (actor.role === "PURCHASING" && requisition.status === "DRAFT") throw new Error("Purchase requisition must be submitted first.");
    await prisma.purchaseSupplierOffer.update({ where: { id: offerId }, data: { supplierProductCode } });
    return this.findById(id, actor);
  }

  async updateItem(
    requisitionId: string,
    itemId: string,
    data: UpdatePurchaseRequisitionItemData,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null> {
    await this.assertNotFinalized(requisitionId);
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id: requisitionId, ...this.scopeWhere(actor) },
      include: { items: { where: { id: itemId }, select: { id: true, productId: true, source: true, selectedOfferId: true } } },
    });
    const item = requisition?.items[0];
    if (!requisition || !item) return null;
    if (actor.role === "SELLER" && (requisition.requestedByUserId !== actor.id || requisition.status !== "DRAFT")) {
      throw new Error("Seller can only edit own draft requisitions.");
    }
    if (actor.role === "MANAGER") throw new Error("MANAGER cannot edit requisition items.");
    if (["COMPLETED", "CANCELLED"].includes(requisition.status)) throw new Error("Closed requisitions are read-only.");
    if (data.quotationOwner !== undefined && requisition.status !== "DRAFT") {
      throw new Error("Quotation responsibility can only change in draft requisitions.");
    }
    await prisma.$transaction(async (tx) => {
      await tx.purchaseRequisitionItem.update({
        where: { id: itemId },
        data: {
          standard: data.standard === undefined ? undefined : nullable(data.standard),
          diameter: data.diameter === undefined ? undefined : nullable(data.diameter),
          thickness: data.thickness === undefined ? undefined : nullable(data.thickness),
          bore: data.bore === undefined ? undefined : nullable(data.bore),
          technicalFamily: data.technicalFamily === undefined ? undefined : nullable(data.technicalFamily),
          technicalAttributes: data.technicalAttributes,
          sellerUnitCost: data.sellerUnitCost,
          sellerCurrency: data.sellerCurrency,
          sellerCostSource: data.sellerCostSource,
          quotationOwner: data.quotationOwner,
          sellerBrand: data.sellerBrand === undefined ? undefined : nullable(data.sellerBrand),
          originRestrictions: data.originRestrictions?.map(canonicalizeProductText),
          sellerDeliveryTime: data.sellerDeliveryTime === undefined ? undefined : nullable(data.sellerDeliveryTime),
          deliveryPlace: data.deliveryPlace === undefined ? undefined : nullable(data.deliveryPlace),
        },
      });

      if (data.sellerUnitCost !== undefined || data.sellerCurrency !== undefined) {
        await tx.purchaseRequisition.update({
          where: { id: requisitionId },
          data: { costApprovedAt: null, costApprovedByUserId: null },
        });
      }
      await this.recomputeStatus(tx, requisitionId, actor.id);
    });
    return this.findById(requisitionId, actor);
  }

  async linkItemToErp(
    requisitionId: string,
    itemId: string,
    data: LinkPurchaseRequisitionItemToErpData,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null> {
    await this.assertNotFinalized(requisitionId);
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id: requisitionId, ...this.scopeWhere(actor) },
      include: { items: { where: { id: itemId }, select: { id: true, productId: true, selectedOfferId: true, offers: { where: { isSelected: true }, select: { id: true } } } } },
    });
    const item = requisition?.items[0];
    if (!requisition || !item) return null;
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) {
      throw new Error("Only ADMIN or PURCHASING can link an ERP product.");
    }
    if (["COMPLETED", "CANCELLED"].includes(requisition.status)) {
      throw new Error("Closed requisitions are read-only.");
    }

    await prisma.$transaction(async (tx) => {
      const updatedItem = await tx.purchaseRequisitionItem.update({
        where: { id: itemId },
        data: {
          erpCode: data.erpCode,
          erpEan: data.erpEan,
          erpLinkedAt: new Date(),
          erpLinkedByUserId: data.actorUserId,
          status: item.offers.length > 0 ? "READY" : undefined,
        },
        select: { quoteItemId: true, productId: true },
      });

      await tx.quoteItem.update({
        where: { id: updatedItem.quoteItemId },
        data: { externalProductCode: data.erpCode, ean: data.erpEan },
      });

      if (updatedItem.productId) {
        await tx.product.update({
          where: { id: updatedItem.productId },
          data: {
            source: "ERP",
            code: data.erpCode,
            ean: data.erpEan,
            externalId: data.erpCode,
            externalSystem: "ERP",
            procurementStatus: "ERP_LINKED",
            procurementUpdatedAt: new Date(),
            procurementUpdatedByUserId: data.actorUserId,
            updatedByUserId: data.actorUserId,
          },
        });
      }

      await this.recomputeStatus(tx, requisitionId, actor.id);
    });

    return this.findById(requisitionId, actor);
  }

  async submit(id: string, buyerUserId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    const current = await this.findById(id, actor);
    if (!current) return null;
    if (current.requestedByUserId !== actor.id && actor.role !== "ADMIN") throw new Error("Only the requester can submit this requisition.");
    if (current.status !== "DRAFT") throw new Error("Only draft requisitions can be submitted.");
    if (!current.supplierId || current.items.some((item) => item.sellerSupplierId !== current.supplierId)) {
      throw new Error("Asigna todas las partidas a un mismo proveedor antes de enviar la requisición a Compras.");
    }
    const submissionError = requisitionSubmissionError(current.items);
    if (submissionError) throw new Error(submissionError);
    const buyer = await prisma.user.findFirst({
      where: { id: buyerUserId, branchId: current.branchId, role: "PURCHASING", isActive: true },
      select: { id: true },
    });
    if (!buyer) throw new Error("Active purchasing user for this branch not found.");
    const row = await prisma.purchaseRequisition.update({
      where: { id },
      data: { status: "SUBMITTED", submittedAt: new Date(), assignedBuyerUserId: buyer.id },
      include: requisitionInclude,
    });
    return requisitionEntity(row);
  }

  async assign(id: string, buyerUserId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    if (!["ADMIN", "MANAGER", "PURCHASING"].includes(actor.role)) throw new Error("Not allowed to assign requisitions.");
    const current = await prisma.purchaseRequisition.findFirst({ where: { id, ...this.scopeWhere(actor) }, select: { id: true, status: true, branchId: true } });
    if (!current) return null;
    if (["COMPLETED", "CANCELLED"].includes(current.status)) throw new Error("Closed requisitions are read-only.");
    const buyer = await prisma.user.findFirst({
      where: { id: buyerUserId, branchId: current.branchId, role: "PURCHASING", isActive: true },
      select: { id: true },
    });
    if (!buyer) throw new Error("Active purchasing user for this branch not found.");
    const row = await prisma.purchaseRequisition.update({
      where: { id },
      data: { assignedBuyerUserId: buyer.id, status: current.status === "SUBMITTED" ? "IN_PROGRESS" : undefined },
      include: requisitionInclude,
    });
    return requisitionEntity(row);
  }

  async createOffer(
    requisitionId: string,
    data: SavePurchaseSupplierOfferData,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null> {
    await this.assertNotFinalized(requisitionId);
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can register supplier offers.");
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id: requisitionId, ...this.scopeWhere(actor) },
      include: { items: { where: { id: data.requisitionItemId }, select: { id: true, originRestrictions: true } } },
    });
    if (!requisition || requisition.items.length === 0) return null;
    if (!requisition.items[0].originRestrictions.length) throw new Error("Selecciona una restricción o Sin restricción para la partida.");
    if (["DRAFT", "COMPLETED", "CANCELLED"].includes(requisition.status)) throw new Error("Requisition is not available for supplier offers.");
    const supplier = await prisma.supplier.findFirst({ where: { id: data.supplierId, isActive: true }, select: { id: true } });
    if (!supplier) throw new Error("Active supplier not found.");

    const subtotal = this.round4(data.qty * data.unitCost);
    const tax = this.round4(subtotal * data.taxRate);
    await prisma.$transaction(async (tx) => {
      const supplierQuote = await tx.purchaseSupplierQuote.create({
        data: {
          requisitionId,
          supplierId: data.supplierId,
          source: data.source,
          reference: data.externalReference,
          quoteDate: data.quoteDate,
          validUntil: data.validUntil,
          currency: data.currency,
          exchangeRate: data.exchangeRate,
          paymentTerms: data.paymentTerms,
          deliveryTerms: data.deliveryTerms,
          subtotal: data.documentSubtotal ?? subtotal,
          discount: data.documentDiscount,
          freight: data.documentFreight,
          otherCharges: data.documentOtherCharges,
          taxIncluded: data.taxIncluded,
          taxRate: data.taxRate,
          tax: data.documentTax ?? tax,
          total: data.documentTotal ?? this.round4(subtotal + tax),
          notes: data.notes,
          createdByUserId: data.actorUserId,
        },
        select: { id: true },
      });
      await tx.purchaseSupplierOffer.create({
        data: {
          requisitionItemId: data.requisitionItemId,
          supplierQuoteId: supplierQuote.id,
          supplierId: data.supplierId,
          source: data.source,
          supplierProductCode: data.supplierProductCode,
          alternateCodes: data.alternateCodes,
          supplierDescription: data.supplierDescription,
          qty: data.qty,
          unit: data.unit,
          listUnitPrice: data.listUnitPrice,
          discountPct: data.discountPct,
          unitCost: data.unitCost,
          currency: data.currency,
          exchangeRate: data.exchangeRate,
          subtotal,
          taxRate: data.taxRate,
          tax,
          total: this.round4(subtotal + tax),
          brand: data.brand,
          origin: data.origin,
          deliveryTime: data.deliveryTime,
          availableDate: data.availableDate,
          minimumQty: data.minimumQty,
          validUntil: data.validUntil,
          quoteDate: data.quoteDate,
          externalReference: data.externalReference,
          notes: data.notes,
          createdByUserId: data.actorUserId,
        },
      });
      await tx.purchaseRequisitionItem.update({ where: { id: data.requisitionItemId }, data: { status: "QUOTING" } });
      await tx.purchaseRequisition.update({ where: { id: requisitionId }, data: { status: "IN_PROGRESS" } });
    });
    return this.findById(requisitionId, actor);
  }

  async createOffersBatch(
    requisitionId: string,
    offers: SavePurchaseSupplierOfferData[],
    actor: PurchaseRequisitionActor,
  ): Promise<{ requisition: PurchaseRequisitionEntity; offerIds: string[] } | null> {
    await this.assertNotFinalized(requisitionId);
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can register supplier offers.");
    if (offers.length < 1 || offers.length > 100) throw new Error("Selecciona entre 1 y 100 partidas.");
    const itemIds = offers.map((offer) => offer.requisitionItemId);
    if (new Set(itemIds).size !== itemIds.length) throw new Error("No repitas partidas en el lote.");
    const supplierIds = new Set(offers.map((offer) => offer.supplierId));
    if (supplierIds.size !== 1 || new Set(offers.map((offer) => offer.currency)).size !== 1) throw new Error("El lote requiere un proveedor y una moneda.");
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id: requisitionId, ...this.scopeWhere(actor) },
      include: { items: { where: { id: { in: itemIds } }, select: { id: true, originRestrictions: true } } },
    });
    if (!requisition || requisition.items.length !== offers.length) return null;
    for (const offer of offers) {
      const item = requisition.items.find((entry) => entry.id === offer.requisitionItemId)!;
      if (!(offer.itemDetails?.originRestrictions ?? item.originRestrictions).length) {
        throw new Error("Selecciona una restricción o Sin restricción para cada partida.");
      }
    }
    if (["DRAFT", "COMPLETED", "CANCELLED"].includes(requisition.status)) throw new Error("Requisition is not available for supplier offers.");
    const supplier = await prisma.supplier.findFirst({ where: { id: offers[0].supplierId, isActive: true }, select: { id: true } });
    if (!supplier) throw new Error("Active supplier not found.");

    const header = offers[0];
    const subtotal = this.round4(offers.reduce((sum, offer) => sum + offer.qty * offer.unitCost, 0));
    const documentSubtotal = header.documentSubtotal ?? subtotal;
    const taxableAmount = Math.max(0, documentSubtotal - header.documentDiscount + header.documentFreight + header.documentOtherCharges);
    const tax = header.documentTax ?? this.round4(header.taxIncluded
      ? taxableAmount - taxableAmount / (1 + header.taxRate)
      : taxableAmount * header.taxRate);
    const total = header.documentTotal ?? this.round4(taxableAmount + (header.taxIncluded ? 0 : tax));
    const offerIds = await prisma.$transaction(async (tx) => {
      const supplierQuote = await tx.purchaseSupplierQuote.create({
        data: {
          requisitionId, supplierId: header.supplierId, source: "PURCHASING", reference: header.externalReference,
          quoteDate: header.quoteDate, validUntil: header.validUntil, currency: header.currency,
          exchangeRate: header.exchangeRate, paymentTerms: header.paymentTerms, deliveryTerms: header.deliveryTerms,
          subtotal: documentSubtotal, discount: header.documentDiscount,
          freight: header.documentFreight, otherCharges: header.documentOtherCharges,
          taxIncluded: header.taxIncluded, taxRate: header.taxRate,
          tax, total,
          notes: header.notes, createdByUserId: actor.id,
        }, select: { id: true },
      });
      const rows = offers.map((offer) => {
        const id = randomUUID();
        const lineSubtotal = this.round4(offer.qty * offer.unitCost);
        const lineTax = this.round4(lineSubtotal * offer.taxRate);
        return {
            id,
            requisitionItemId: offer.requisitionItemId, supplierQuoteId: supplierQuote.id,
            supplierId: offer.supplierId, source: "PURCHASING" as const, supplierProductCode: offer.supplierProductCode,
            alternateCodes: offer.alternateCodes, supplierDescription: offer.supplierDescription,
            qty: offer.qty, unit: offer.unit, listUnitPrice: offer.listUnitPrice, discountPct: offer.discountPct,
            unitCost: offer.unitCost, currency: offer.currency, exchangeRate: offer.exchangeRate,
            subtotal: lineSubtotal, taxRate: offer.taxRate, tax: lineTax, total: this.round4(lineSubtotal + lineTax),
            brand: offer.brand, origin: offer.origin, deliveryTime: offer.deliveryTime,
            availableDate: offer.availableDate, minimumQty: offer.minimumQty, validUntil: offer.validUntil,
            quoteDate: offer.quoteDate, externalReference: offer.externalReference, notes: offer.notes,
            createdByUserId: actor.id,
        };
      });
      await tx.purchaseSupplierOffer.createMany({ data: rows });
      await tx.purchaseRequisitionItem.updateMany({ where: { id: { in: itemIds }, requisitionId }, data: { status: "QUOTING" } });
      const technicalUpdates = offers.flatMap((offer) => offer.itemDetails ? [{
        id: offer.requisitionItemId,
        standard: nullable(offer.itemDetails.standard),
        diameter: nullable(offer.itemDetails.diameter),
        thickness: nullable(offer.itemDetails.thickness),
        bore: nullable(offer.itemDetails.bore),
        technical_family: nullable(offer.itemDetails.technicalFamily),
        technical_attributes: offer.itemDetails.technicalAttributes ?? {},
        origin_restrictions: (offer.itemDetails.originRestrictions ?? []).map(canonicalizeProductText),
      }] : []);
      if (technicalUpdates.length > 0) {
        // A single set-based update keeps the technical edits in the offer transaction.
        await tx.$executeRaw`
          UPDATE purchase_requisition_items AS item
          SET standard = details.standard,
              diameter = details.diameter,
              thickness = details.thickness,
              bore = details.bore,
              technical_family = details.technical_family,
              technical_attributes = details.technical_attributes,
              origin_restrictions = ARRAY(SELECT jsonb_array_elements_text(details.origin_restrictions))
          FROM jsonb_to_recordset(${JSON.stringify(technicalUpdates)}::jsonb) AS details(
            id uuid, standard text, diameter text, thickness text, bore text,
            technical_family text, technical_attributes jsonb, origin_restrictions jsonb
          )
          WHERE item.id = details.id AND item.requisition_id = ${requisitionId}::uuid
        `;
      }
      await tx.purchaseRequisition.update({ where: { id: requisitionId }, data: {
        status: "IN_PROGRESS", deliveryState: header.deliveryState ?? requisition.deliveryState,
      } });
      return rows.map((row) => row.id);
    });
    const updated = await this.findById(requisitionId, actor);
    if (!updated) throw new Error("Requisition was saved but could not be reloaded.");
    return { requisition: updated, offerIds };
  }

  async updateOffersBatch(
    requisitionId: string,
    supplierQuoteId: string,
    offers: Array<SavePurchaseSupplierOfferData & { offerId: string | null }>,
    actor: PurchaseRequisitionActor,
  ): Promise<{ requisition: PurchaseRequisitionEntity; offerIds: string[] } | null> {
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can edit supplier offers.");
    if (offers.length < 1 || offers.length > 100) throw new Error("Selecciona entre 1 y 100 partidas.");
    const itemIds = offers.map((offer) => offer.requisitionItemId);
    if (new Set(itemIds).size !== itemIds.length) throw new Error("No repitas partidas en el lote.");
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requisitionId}))`;
      const requisition = await tx.purchaseRequisition.findFirst({
        where: { id: requisitionId, ...this.scopeWhere(actor) },
        select: {
          id: true, status: true, deliveryState: true, costApprovedAt: true,
          supplierRequisitions: { select: { id: true }, take: 1 },
          items: { where: { id: { in: itemIds } }, select: { id: true, status: true } },
        },
      });
      if (!requisition) return null;
      if (requisition.supplierRequisitions.length) throw new Error("Las requisiciones finales ya fueron emitidas; sus propuestas no se pueden editar.");
      if (["DRAFT", "COMPLETED", "CANCELLED"].includes(requisition.status)) throw new Error("La requisición no está disponible para editar propuestas.");
      if (requisition.items.length !== offers.length) throw new Error("Una o más partidas no pertenecen a esta requisición.");
      const supplierQuote = await tx.purchaseSupplierQuote.findFirst({
        where: { id: supplierQuoteId, requisitionId, source: "PURCHASING" },
        include: { offers: { where: { isActive: true }, select: { id: true, requisitionItemId: true, isSelected: true, awardedQty: true, qty: true } } },
      });
      if (!supplierQuote) throw new Error("No se encontró la referencia de Compras para este proveedor.");
      if (supplierQuote.offers.length === 0) throw new Error("La referencia no tiene propuestas activas.");
      if (offers.some((offer) => offer.supplierId !== supplierQuote.supplierId)) {
        throw new Error("La referencia corresponde a un solo proveedor. Crea otra referencia para otro proveedor.");
      }
      if (new Set(offers.map((offer) => offer.currency)).size !== 1) throw new Error("La referencia debe usar una sola moneda.");
      const existingById = new Map(supplierQuote.offers.map((offer) => [offer.id, offer]));
      const suppliedExisting = offers.filter((offer) => offer.offerId !== null);
      if (suppliedExisting.length !== existingById.size) throw new Error("Incluye todas las propuestas existentes al editar esta referencia.");
      for (const offer of suppliedExisting) {
        const existing = existingById.get(offer.offerId!);
        if (!existing || existing.requisitionItemId !== offer.requisitionItemId) {
          throw new Error("Una propuesta no pertenece a esta referencia o cambió de partida.");
        }
        if (existing.isSelected && offer.qty < number(existing.awardedQty ?? existing.qty)) {
          throw new Error("La cantidad propuesta no puede ser menor que la cantidad ya adjudicada.");
        }
      }
      const header = offers[0];
      const subtotal = this.round4(offers.reduce((sum, offer) => sum + offer.qty * offer.unitCost, 0));
      const documentSubtotal = header.documentSubtotal ?? subtotal;
      const taxableAmount = Math.max(0, documentSubtotal - header.documentDiscount + header.documentFreight + header.documentOtherCharges);
      const tax = header.documentTax ?? this.round4(header.taxIncluded
        ? taxableAmount - taxableAmount / (1 + header.taxRate)
        : taxableAmount * header.taxRate);
      const total = header.documentTotal ?? this.round4(taxableAmount + (header.taxIncluded ? 0 : tax));
      await tx.purchaseSupplierQuote.update({ where: { id: supplierQuoteId }, data: {
        reference: header.externalReference, quoteDate: header.quoteDate, validUntil: header.validUntil,
        currency: header.currency, exchangeRate: header.exchangeRate,
        paymentTerms: header.paymentTerms, deliveryTerms: header.deliveryTerms,
        subtotal: documentSubtotal, discount: header.documentDiscount,
        freight: header.documentFreight, otherCharges: header.documentOtherCharges,
        taxIncluded: header.taxIncluded, taxRate: header.taxRate, tax, total,
        notes: header.notes, updatedByUserId: actor.id,
      } });
      const newRows: Prisma.PurchaseSupplierOfferCreateManyInput[] = [];
      const offerIds: string[] = [];
      for (const offer of offers) {
        const id = offer.offerId ?? randomUUID();
        offerIds.push(id);
        const lineSubtotal = this.round4(offer.qty * offer.unitCost);
        const lineTax = this.round4(lineSubtotal * offer.taxRate);
        const data = {
          supplierProductCode: offer.supplierProductCode, alternateCodes: offer.alternateCodes,
          supplierDescription: offer.supplierDescription, qty: offer.qty, unit: offer.unit,
          listUnitPrice: offer.listUnitPrice, discountPct: offer.discountPct,
          unitCost: offer.unitCost, currency: offer.currency, exchangeRate: offer.exchangeRate,
          subtotal: lineSubtotal, taxRate: offer.taxRate, tax: lineTax, total: this.round4(lineSubtotal + lineTax),
          brand: offer.brand, origin: offer.origin, deliveryTime: offer.deliveryTime,
          availableDate: offer.availableDate, minimumQty: offer.minimumQty,
          validUntil: offer.validUntil, quoteDate: offer.quoteDate,
          externalReference: offer.externalReference, notes: offer.notes, updatedByUserId: actor.id,
        };
        if (offer.offerId) {
          await tx.purchaseSupplierOffer.update({ where: { id }, data });
        } else {
          newRows.push({ id, requisitionItemId: offer.requisitionItemId, supplierQuoteId,
            supplierId: offer.supplierId, source: "PURCHASING", createdByUserId: actor.id, ...data });
        }
      }
      if (newRows.length) {
        await tx.purchaseSupplierOffer.createMany({ data: newRows });
        await tx.purchaseRequisitionItem.updateMany({
          where: { id: { in: newRows.map((row) => row.requisitionItemId) }, requisitionId, status: { in: ["PENDING", "QUOTING"] } },
          data: { status: "QUOTING" },
        });
      }
      const technicalUpdates = offers.flatMap((offer) => offer.itemDetails ? [{
        id: offer.requisitionItemId,
        standard: nullable(offer.itemDetails.standard), diameter: nullable(offer.itemDetails.diameter),
        thickness: nullable(offer.itemDetails.thickness), bore: nullable(offer.itemDetails.bore),
        technical_family: nullable(offer.itemDetails.technicalFamily),
        technical_attributes: offer.itemDetails.technicalAttributes ?? {},
        origin_restrictions: (offer.itemDetails.originRestrictions ?? []).map(canonicalizeProductText),
      }] : []);
      if (technicalUpdates.length) {
        await tx.$executeRaw`
          UPDATE purchase_requisition_items AS item
          SET standard = details.standard, diameter = details.diameter,
              thickness = details.thickness, bore = details.bore,
              technical_family = details.technical_family,
              technical_attributes = details.technical_attributes,
              origin_restrictions = ARRAY(SELECT jsonb_array_elements_text(details.origin_restrictions))
          FROM jsonb_to_recordset(${JSON.stringify(technicalUpdates)}::jsonb) AS details(
            id uuid, standard text, diameter text, thickness text, bore text,
            technical_family text, technical_attributes jsonb, origin_restrictions jsonb
          )
          WHERE item.id = details.id AND item.requisition_id = ${requisitionId}::uuid
        `;
      }
      await tx.purchaseRequisition.update({ where: { id: requisitionId }, data: {
        deliveryState: header.deliveryState ?? requisition.deliveryState,
        ...(supplierQuote.offers.some((offer) => offer.isSelected) && requisition.costApprovedAt
          ? { costApprovedAt: null, costApprovedByUserId: null } : {}),
      } });
      await this.recomputeStatus(tx, requisitionId, actor.id);
      await tx.auditLog.create({ data: {
        actorUserId: actor.id, entityType: "PURCHASE_REQUISITION", entityId: requisitionId,
        action: "UPDATE_SUPPLIER_REFERENCE", payload: { supplierQuoteId, offerIds },
      } });
      return offerIds;
    }, { timeout: 20_000 });
    if (!result) return null;
    const updated = await this.findById(requisitionId, actor);
    if (!updated) throw new Error("Requisition was saved but could not be reloaded.");
    return { requisition: updated, offerIds: result };
  }

  async selectOffer(
    requisitionId: string,
    itemId: string,
    offerId: string,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null> {
    const item = await prisma.purchaseRequisitionItem.findFirst({ where: { id: itemId, requisitionId }, select: { qty: true } });
    if (!item) return null;
    await this.allocateOffers(requisitionId, itemId, [{ offerId, qty: number(item.qty) }], actor);
    return this.findById(requisitionId, actor);
  }

  async allocateOffers(requisitionId: string, itemId: string, allocations: SupplierOfferAllocation[], actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can select supplier offers.");
    const found = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requisitionId}))`;
      const requisition = await tx.purchaseRequisition.findFirst({
        where: { id: requisitionId, ...this.scopeWhere(actor) },
        include: {
          quote: { select: { status: true, currency: true, exchangeRate: true } },
          supplierRequisitions: { select: { id: true } },
          items: { where: { id: itemId }, include: { offers: { include: { supplier: true } } } },
        },
      });
      if (!requisition) return false;
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requisition.quoteId}))`;
      if (requisition.supplierRequisitions.length) throw new Error("Supplier requisitions were already generated; awards are locked.");
      if (["DRAFT", "COMPLETED", "CANCELLED"].includes(requisition.status)) throw new Error("Closed requisitions cannot change supplier awards.");
      const item = requisition.items[0];
      if (!item) return false;
      validateSupplierOfferAllocations(number(item.qty), allocations, item.offers.map((offer) => ({
        id: offer.id, qty: number(offer.qty), isActive: offer.isActive,
        minimumQty: offer.minimumQty === null ? null : number(offer.minimumQty),
      })));
      for (const allocation of allocations) {
        const offer = item.offers.find((candidate) => candidate.id === allocation.offerId)!;
        if (item.originRestrictions.some((restriction) => offer.origin && canonicalizeProductText(offer.origin) === canonicalizeProductText(restriction))) {
          throw new Error("Supplier offer origin conflicts with the customer restrictions.");
        }
        if (offer.currency === "USD" && (!offer.exchangeRate || number(offer.exchangeRate) <= 0)) {
          throw new Error("USD supplier offers require an exchange rate for cost comparison.");
        }
      }
      await tx.purchaseRequisitionItem.update({ where: { id: itemId }, data: { selectedOfferId: null } });
      await tx.purchaseSupplierOffer.updateMany({ where: { requisitionItemId: itemId }, data: { isSelected: false, awardedQty: null } });
      for (const allocation of allocations) {
        const offer = item.offers.find((candidate) => candidate.id === allocation.offerId)!;
        await tx.purchaseSupplierOffer.update({ where: { id: allocation.offerId }, data: { isSelected: true, awardedQty: allocation.qty, updatedByUserId: actor.id } });
        if (offer.supplier.source === "LOCAL" && offer.supplier.status === "PROSPECT") {
          await tx.supplier.update({ where: { id: offer.supplierId }, data: { status: "PENDING_ERP", updatedByUserId: actor.id } });
        }
      }
      await tx.purchaseRequisitionItem.update({
        where: { id: itemId },
        data: {
          selectedOfferId: allocations.length === 1 ? allocations[0].offerId : null,
          status: item.source === "LOCAL_NEW" && !item.erpCode ? "PENDING_ERP_CODE" : "READY",
        },
      });
      if (["DRAFT", "PENDING", "CHANGES_REQUESTED"].includes(requisition.quote.status)) {
        const weightedQuoteCost = allocations.reduce((total, allocation) => {
          const offer = item.offers.find((candidate) => candidate.id === allocation.offerId)!;
          return total + allocation.qty * convertQuoteAmount(
            number(offer.unitCost), offer.currency, requisition.quote.currency,
            number(offer.exchangeRate ?? requisition.quote.exchangeRate),
          );
        }, 0) / number(item.qty);
        const quoteCost = this.round4(weightedQuoteCost);
        const sellerCost = this.round4(convertQuoteAmount(
          quoteCost, requisition.quote.currency, item.sellerCurrency,
          number(requisition.quote.exchangeRate),
        ));
        const previous = await tx.quoteItem.findUnique({ where: { id: item.quoteItemId }, select: {
          sellerQuotedUnitCost: true, sellerQuotedCurrency: true, sellerQuotedExchangeRate: true,
        } });
        const costChanged = !previous || previous.sellerQuotedUnitCost === null
          || Math.abs(number(previous.sellerQuotedUnitCost) - quoteCost) > 0.0001
          || previous.sellerQuotedCurrency !== requisition.quote.currency
          || Math.abs(number(previous.sellerQuotedExchangeRate ?? 0) - number(requisition.quote.exchangeRate)) > 0.0001;
        await tx.quoteItem.update({
          where: { id: item.quoteItemId },
          data: {
            sellerQuotedUnitCost: quoteCost,
            sellerQuotedCurrency: requisition.quote.currency,
            sellerQuotedExchangeRate: requisition.quote.exchangeRate,
            sellerCostSource: "SELLER_SUPPLIER_QUOTE",
            ...(costChanged ? { salePriceReviewRequired: true, purchaseSuggestedUnitPrice: null } : {}),
          },
        });
        await tx.purchaseRequisitionItem.update({ where: { id: itemId }, data: { sellerUnitCost: sellerCost } });
      }
      await tx.purchaseRequisition.update({ where: { id: requisitionId }, data: { costApprovedAt: null, costApprovedByUserId: null } });
      await this.recomputeStatus(tx, requisitionId, actor.id);
      return true;
    }, { timeout: 20_000 });
    return found ? this.findById(requisitionId, actor) : null;
  }

  async finalizePricesForQuote(quoteId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity[] | null> {
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can finalize purchasing prices.");
    const found = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${quoteId}))`;
      const quote = await tx.quote.findFirst({
        where: { id: quoteId, ...(actor.role === "PURCHASING" ? { branchId: actor.branchId } : {}) },
        select: { status: true, currency: true, exchangeRate: true },
      });
      if (!quote) return false;
      if (!["DRAFT", "PENDING", "CHANGES_REQUESTED"].includes(quote.status)) {
        throw new Error("La cotización ya no está en una etapa donde Compras pueda finalizar precios.");
      }
      const requisitions = await tx.purchaseRequisition.findMany({
        where: { quoteId, ...this.scopeWhere(actor), status: { notIn: ["DRAFT", "CANCELLED"] } },
        include: {
          supplierRequisitions: { select: { id: true } },
          items: {
            where: { status: { not: "CANCELLED" } },
            include: { offers: { where: { isActive: true }, include: { supplier: true } } },
          },
        },
      });
      if (!requisitions.length) throw new Error("La cotización no tiene partidas solicitadas a Compras.");
      if (requisitions.some((requisition) => requisition.supplierRequisitions.length || !requisition.items.length)) {
        throw new Error("Las requisiciones deben tener partidas activas y no estar cerradas para pedido.");
      }
      for (const requisition of requisitions) {
        for (const item of requisition.items) {
          const { awards, autoSelected } = resolvePurchasePriceAwards(item.position, number(item.qty),
            item.offers.map((offer) => ({ ...offer, qty: number(offer.qty),
              awardedQty: offer.awardedQty === null ? null : number(offer.awardedQty),
              minimumQty: offer.minimumQty === null ? null : number(offer.minimumQty) })));
          for (const { offer } of awards) {
            if (item.originRestrictions.some((restriction) => offer.origin
              && canonicalizeProductText(offer.origin) === canonicalizeProductText(restriction))) {
              throw new Error(`La partida ${item.position} tiene una restricción de origen incompatible con el proveedor.`);
            }
            if (offer.currency === "USD" && (!offer.exchangeRate || number(offer.exchangeRate) <= 0)) {
              throw new Error(`La partida ${item.position} requiere un tipo de cambio para el costo en USD.`);
            }
          }
          if (autoSelected) {
            const offer = awards[0].offer;
            await tx.purchaseSupplierOffer.update({ where: { id: offer.id }, data: { isSelected: true, awardedQty: item.qty, updatedByUserId: actor.id } });
            if (offer.supplier.source === "LOCAL" && offer.supplier.status === "PROSPECT") {
              await tx.supplier.update({ where: { id: offer.supplierId }, data: { status: "PENDING_ERP", updatedByUserId: actor.id } });
            }
          }
          const quoteCost = this.round4(awards.reduce((total, { offer, qty }) => total + qty * convertQuoteAmount(
            number(offer.unitCost), offer.currency, quote.currency, number(offer.exchangeRate ?? quote.exchangeRate),
          ), 0) / number(item.qty));
          const previous = await tx.quoteItem.findUnique({ where: { id: item.quoteItemId }, select: {
            sellerQuotedUnitCost: true, sellerQuotedCurrency: true, sellerQuotedExchangeRate: true,
          } });
          const costChanged = !previous || previous.sellerQuotedUnitCost === null
            || Math.abs(number(previous.sellerQuotedUnitCost) - quoteCost) > 0.0001
            || previous.sellerQuotedCurrency !== quote.currency
            || Math.abs(number(previous.sellerQuotedExchangeRate ?? 0) - number(quote.exchangeRate)) > 0.0001;
          await tx.quoteItem.update({ where: { id: item.quoteItemId }, data: {
            sellerQuotedUnitCost: quoteCost, sellerQuotedCurrency: quote.currency,
            sellerQuotedExchangeRate: quote.exchangeRate, sellerCostSource: "SELLER_SUPPLIER_QUOTE",
            ...(costChanged ? { salePriceReviewRequired: true } : {}),
            purchaseSuggestedUnitPrice: null,
          } });
          await tx.purchaseRequisitionItem.update({ where: { id: item.id }, data: {
            selectedOfferId: awards.length === 1 ? awards[0].offer.id : null,
            sellerUnitCost: this.round4(convertQuoteAmount(quoteCost, quote.currency, item.sellerCurrency, number(quote.exchangeRate))),
            status: item.source === "LOCAL_NEW" && !item.erpCode ? "PENDING_ERP_CODE" : "READY",
          } });
        }
        await tx.purchaseRequisition.update({ where: { id: requisition.id }, data: { costApprovedAt: null, costApprovedByUserId: null } });
        await this.recomputeStatus(tx, requisition.id, actor.id);
      }
      return true;
    }, { timeout: 30_000 });
    if (!found) return null;
    return (await this.findByQuoteId(quoteId, actor)).filter((requisition) => !["DRAFT", "CANCELLED"].includes(requisition.status));
  }

  async generateSupplierRequisitions(requisitionId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can generate supplier requisitions.");
    const found = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${requisitionId}))`;
      const requisition = await tx.purchaseRequisition.findFirst({
        where: { id: requisitionId, ...this.scopeWhere(actor) },
        include: {
          quote: { select: { status: true } },
          supplierRequisitions: { select: { id: true } },
          items: { where: { status: { not: "CANCELLED" } }, include: { offers: { where: { isSelected: true, isActive: true } } } },
        },
      });
      if (!requisition) return false;
      if (requisition.supplierRequisitions.length) return true;
      if (requisition.quote.status !== "APPROVED") {
        throw new Error("Supplier requisitions require a customer-approved quote.");
      }
      if (!canIssueSupplierRequisitions(
        requisition.status,
        requisition.items,
        resolveRuntimeValue(this.allowLocalWithoutErpCode),
      )) {
        throw new Error("Supplier requisitions require every item awarded and approved. Local items without ERP code require the system setting to be enabled.");
      }
      const groups = new Map<string, { supplierId: string; currency: "MXN" | "USD"; lines: Array<{ item: typeof requisition.items[number]; offer: typeof requisition.items[number]["offers"][number]; qty: number }> }>();
      for (const item of requisition.items) {
        const totalQty = item.offers.reduce((sum, offer) => sum + Math.round(number(offer.awardedQty ?? item.qty) * 10_000), 0);
        if (totalQty !== Math.round(number(item.qty) * 10_000)) throw new Error("Awarded quantities must equal the requisition item quantity.");
        for (const offer of item.offers) {
          const qty = number(offer.awardedQty ?? item.qty);
          if (qty <= 0 || qty > number(offer.qty)) throw new Error("Awarded quantity exceeds the supplier offer quantity.");
          const key = supplierRequisitionGroupKey(offer.supplierId, offer.currency);
          const group = groups.get(key) ?? { supplierId: offer.supplierId, currency: offer.currency, lines: [] };
          group.lines.push({ item, offer, qty });
          groups.set(key, group);
        }
      }
      let index = 0;
      for (const group of groups.values()) {
        index += 1;
        const supplier = await tx.supplier.findUniqueOrThrow({ where: { id: group.supplierId }, select: { name: true } });
        await tx.purchaseSupplierRequisition.create({
          data: {
            requisitionId,
            supplierId: group.supplierId,
            supplierName: supplier.name,
            number: `${requisition.requisitionNumber}-${String(index).padStart(2, "0")}`,
            currency: group.currency,
            createdByUserId: actor.id,
            lines: { create: group.lines.map(({ item, offer, qty }) => {
              const subtotal = this.round4(qty * number(offer.unitCost));
              const tax = this.round4(subtotal * number(offer.taxRate));
              return {
                requisitionItemId: item.id,
                offerId: offer.id,
                position: item.position,
                description: offer.supplierDescription || item.description,
                erpCode: item.erpCode,
                supplierProductCode: offer.supplierProductCode,
                unit: offer.unit || item.unit,
                qty,
                unitCost: offer.unitCost,
                exchangeRate: offer.exchangeRate,
                taxRate: offer.taxRate,
                subtotal,
                tax,
                total: this.round4(subtotal + tax),
              };
            }) },
          },
        });
      }
      return true;
    }, { timeout: 20_000 });
    return found ? this.findById(requisitionId, actor) : null;
  }

  async approveCostVariance(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    if (!resolveRuntimeValue(this.internalApprovalEnabled)) throw new Error("Internal requisition approval is disabled.");
    if (!["ADMIN", "MANAGER"].includes(actor.role)) throw new Error("Only ADMIN or MANAGER can approve cost variance.");
    const current = await prisma.purchaseRequisition.findFirst({ where: { id, ...this.scopeWhere(actor) }, select: { id: true, status: true } });
    if (!current) return null;
    if (current.status !== "COST_REVIEW") throw new Error("Requisition is not pending cost review.");
    await prisma.$transaction(async (tx) => {
      await tx.purchaseRequisition.update({
        where: { id },
        data: { costApprovedAt: new Date(), costApprovedByUserId: actor.id },
      });
      await this.recomputeStatus(tx, id);
    });
    return this.findById(id, actor);
  }

  async isReadyForOrder(quoteId: string): Promise<boolean> {
    const [quote, requisitions] = await Promise.all([
      prisma.quote.findUnique({
        where: { id: quoteId },
        select: { items: { select: { id: true, qty: true, stock: true, externalProductCode: true, product: { select: { code: true, source: true } } } } },
      }),
      prisma.purchaseRequisition.findMany({
        where: { quoteId, OR: [{ supplierId: { not: null } }, { status: { not: "DRAFT" } }] },
        select: { status: true, items: { select: { quoteItemId: true, status: true } } },
      }),
    ]);
    if (!quote) return false;
    const requiredIds = quote.items.filter((item) => getQuoteItemFulfillment({
      qty: number(item.qty),
      stock: item.stock === null ? null : number(item.stock),
      externalProductCode: erpCodeForQuoteItem(item) || null,
    }).requiresPurchase).map((item) => item.id);
    return areSupplierRequisitionsReadyForOrder(requiredIds, requisitions, resolveRuntimeValue(this.internalApprovalEnabled));
  }

  async markCompletedByQuoteId(quoteId: string): Promise<void> {
    await prisma.purchaseRequisition.updateMany({
      where: {
        quoteId,
        OR: [{ supplierId: { not: null } }, { status: { not: "DRAFT" } }],
        status: resolveRuntimeValue(this.internalApprovalEnabled)
          ? "READY_FOR_ORDER"
          : { in: ["READY_FOR_ORDER", "COST_REVIEW"] },
      },
      data: { status: "COMPLETED", completedAt: new Date() },
    });
  }

  async listSuppliers(search: string | undefined, includeInactive: boolean): Promise<SupplierEntity[]> {
    const rows = await prisma.supplier.findMany({
      where: {
        ...(includeInactive ? {} : { isActive: true }),
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: "insensitive" as const } },
                { erpCode: { contains: search, mode: "insensitive" as const } },
                { taxId: { contains: search, mode: "insensitive" as const } },
                { contactName: { contains: search, mode: "insensitive" as const } },
                { email: { contains: search, mode: "insensitive" as const } },
                { phone: { contains: search, mode: "insensitive" as const } },
                {
                  contacts: {
                    some: {
                      OR: [
                        { value: { contains: search, mode: "insensitive" as const } },
                        { contactName: { contains: search, mode: "insensitive" as const } },
                        { contactPosition: { contains: search, mode: "insensitive" as const } },
                        { label: { contains: search, mode: "insensitive" as const } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { erpCode: "asc" }],
      include: { contacts: { orderBy: [{ channel: "asc" }, { isPrimary: "desc" }, { createdAt: "asc" }] } },
    });
    return rows.map(supplierEntity);
  }

  async createSupplier(data: SaveSupplierData): Promise<SupplierEntity> {
    const hardDuplicate = data.normalizedTaxId ? await prisma.supplier.findFirst({
      where: {
        normalizedTaxId: data.normalizedTaxId,
      },
      select: { id: true, name: true },
    }) : null;
    if (hardDuplicate) throw new Error(`Ya existe un proveedor con ese RFC: ${hardDuplicate.name}.`);
    const normalizedContacts = data.contacts.map((contact) => contact.normalizedValue);
    const potentialDuplicate = await prisma.supplier.findFirst({
      where: {
        isActive: true,
        OR: [
          { canonicalName: data.canonicalName },
          ...(data.normalizedEmail ? [{ normalizedEmail: data.normalizedEmail }] : []),
          ...(data.normalizedPhone ? [{ normalizedPhone: data.normalizedPhone }] : []),
          ...(normalizedContacts.length ? [{ contacts: { some: { normalizedValue: { in: normalizedContacts } } } }] : []),
        ],
      },
      select: { id: true, name: true },
    });
    if (potentialDuplicate && !data.allowPotentialDuplicate) {
      throw new Error(`Posible proveedor duplicado: ${potentialDuplicate.name}. Selecciona el existente o confirma que deseas crear otro.`);
    }
    const row = await prisma.supplier.create({
      data: {
        erpCode: null,
        name: data.name,
        canonicalName: data.canonicalName,
        source: "LOCAL",
        status: data.status || "PROSPECT",
        scope: data.scope,
        taxId: data.taxId,
        normalizedTaxId: data.normalizedTaxId,
        state: data.state,
        country: data.country,
        contactName: data.contactName,
        contactPosition: data.contactPosition,
        creditTerms: data.creditTerms,
        currency: data.currency,
        notes: data.notes,
        email: data.email,
        normalizedEmail: data.normalizedEmail,
        phone: data.phone,
        normalizedPhone: data.normalizedPhone,
        phoneExtension: data.contacts.find((contact) => contact.channel === "PHONE" && contact.isPrimary)?.extension ?? null,
        mobile: data.contacts.find((contact) => contact.channel === "PHONE" && contact.phoneKind === "MOBILE")?.value ?? null,
        contacts: {
          create: data.contacts.map(({ normalizedValue, ...contact }) => ({ ...contact, normalizedValue })),
        },
        createdByUserId: data.actorUserId,
      },
      include: { contacts: true },
    });
    return supplierEntity(row);
  }

  async upsertErpSupplier(data: SaveErpSupplierData): Promise<SupplierEntity> {
    const now = new Date();
    const primaryData = {
      name: data.name,
      canonicalName: data.canonicalName,
      source: "ERP" as const,
      status: "ERP_SYNCED" as const,
      scope: "NATIONAL" as const,
      taxId: data.taxId,
      normalizedTaxId: data.normalizedTaxId,
      state: data.state,
      creditTerms: data.creditTerms,
      currency: data.currency,
      country: "MEXICO",
      contactName: data.contactName,
      contactPosition: data.contactPosition,
      email: data.email,
      normalizedEmail: data.normalizedEmail,
      phone: data.phone,
      normalizedPhone: data.normalizedPhone,
      phoneExtension: data.phoneExtension,
      mobile: data.mobile,
      notes: data.notes,
      erpSyncedAt: now,
      isActive: true,
      updatedByUserId: data.actorUserId,
    };
    const existingByCode = await prisma.supplier.findUnique({ where: { erpCode: data.erpCode } });
    const taxIdMatches = data.normalizedTaxId
      ? await prisma.supplier.findMany({ where: { normalizedTaxId: data.normalizedTaxId } })
      : [];
    const identifiedSupplier = resolveSupplierErpSyncTarget(existingByCode, taxIdMatches);
    const matchingLocal = identifiedSupplier || await prisma.supplier.findFirst({
      where: {
        erpCode: null,
        normalizedTaxId: null,
        OR: [
          { canonicalName: data.canonicalName },
          ...(data.normalizedEmail ? [{ normalizedEmail: data.normalizedEmail }] : []),
          ...(data.normalizedPhone ? [{ normalizedPhone: data.normalizedPhone }] : []),
        ],
      },
    });
    try {
      if (matchingLocal) {
        const linked = await prisma.supplier.update({
          where: { id: matchingLocal.id },
          data: {
            ...primaryData,
            erpCode: data.erpCode,
            taxId: data.taxId || matchingLocal.taxId,
            normalizedTaxId: data.normalizedTaxId || matchingLocal.normalizedTaxId,
            contactName: data.contactName || matchingLocal.contactName,
            contactPosition: data.contactPosition || matchingLocal.contactPosition,
            email: data.email || matchingLocal.email,
            normalizedEmail: data.normalizedEmail || matchingLocal.normalizedEmail,
            phone: data.phone || matchingLocal.phone,
            normalizedPhone: data.normalizedPhone || matchingLocal.normalizedPhone,
            phoneExtension: data.phoneExtension || matchingLocal.phoneExtension,
            mobile: data.mobile || matchingLocal.mobile,
            notes: data.notes || matchingLocal.notes,
          },
          include: { contacts: true },
        });
        return supplierEntity(linked);
      }
      const row = await prisma.supplier.create({
        data: {
          ...primaryData,
          erpCode: data.erpCode,
          createdByUserId: data.actorUserId,
        },
        include: { contacts: true },
      });
      return supplierEntity(row);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        throw new Error("Ya existe un proveedor con ese código ERP o RFC. Actualiza la lista y selecciona el proveedor existente.");
      }
      throw error;
    }
  }

  async updateSupplier(id: string, data: SaveSupplierData): Promise<SupplierEntity | null> {
    const existing = await prisma.supplier.findUnique({ where: { id }, select: { id: true, source: true } });
    if (!existing) return null;
    if (existing.source === "ERP") throw new Error("ERP suppliers must be refreshed from ERP.");
    if (data.normalizedTaxId) {
      const duplicate = await prisma.supplier.findFirst({
        where: { normalizedTaxId: data.normalizedTaxId, id: { not: id } },
        select: { name: true },
      });
      if (duplicate) throw new Error(`Ya existe un proveedor con ese RFC: ${duplicate.name}.`);
    }
    const row = await prisma.$transaction(async (tx) => {
      await tx.supplierContact.deleteMany({ where: { supplierId: id } });
      return tx.supplier.update({
        where: { id },
        data: {
          name: data.name,
          canonicalName: data.canonicalName,
          source: "LOCAL",
          scope: data.scope,
          taxId: data.taxId,
          normalizedTaxId: data.normalizedTaxId,
          state: data.state,
          country: data.country,
          contactName: data.contactName,
          contactPosition: data.contactPosition,
          creditTerms: data.creditTerms,
          currency: data.currency,
          notes: data.notes,
          email: data.email,
          normalizedEmail: data.normalizedEmail,
          phone: data.phone,
          normalizedPhone: data.normalizedPhone,
          phoneExtension: data.contacts.find((contact) => contact.channel === "PHONE" && contact.isPrimary)?.extension ?? null,
          mobile: data.contacts.find((contact) => contact.channel === "PHONE" && contact.phoneKind === "MOBILE")?.value ?? null,
          contacts: {
            create: data.contacts.map(({ normalizedValue, ...contact }) => ({ ...contact, normalizedValue })),
          },
          updatedByUserId: data.actorUserId,
        },
        include: { contacts: true },
      });
    });
    return supplierEntity(row);
  }

  async setSupplierActive(id: string, isActive: boolean, actorUserId: string): Promise<SupplierEntity | null> {
    const existing = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return null;
    const row = await prisma.supplier.update({
      where: { id },
      data: { isActive, updatedByUserId: actorUserId },
      include: { contacts: true },
    });
    return supplierEntity(row);
  }

  private async materializeSellerOffers(requisitionId: string, quote: QuoteEntity): Promise<void> {
    const quoteItems = new Map(quote.items.map((item) => [item.id, item]));
    await prisma.$transaction(async (tx) => {
      const requisitionItems = await tx.purchaseRequisitionItem.findMany({
        where: { requisitionId },
        include: {
          quoteItem: { select: { clientItemId: true } },
          offers: {
            where: { source: "SELLER", isActive: true },
            select: {
              id: true,
              supplierQuoteId: true,
              supplierProductCode: true,
              supplierQuote: { select: { supplierId: true, currency: true, fileAssetId: true } },
            },
          },
        },
      });
      const quoteAttachments = await tx.quoteAttachment.findMany({
        where: { quoteId: quote.id, category: "SELLER_SUPPLIER_QUOTE", clientItemId: { not: null } },
        select: { fileAssetId: true, clientItemId: true },
      });
      const fileAssetByClientItemId = new Map(
        quoteAttachments.flatMap((attachment) => attachment.clientItemId
          ? [[attachment.clientItemId, attachment.fileAssetId] as const]
          : []),
      );
      const supplierQuotesByGroup = new Map<string, {
        id: string;
        subtotal: number;
        tax: number;
        total: number;
      }>();

      for (const requisitionItem of requisitionItems) {
        const quoteItem = quoteItems.get(requisitionItem.quoteItemId);
        if (!quoteItem) continue;

        const hasSellerQuote = Boolean(quoteItem.sellerQuotedUnitCost && quoteItem.sellerQuotedUnitCost > 0);
        await tx.purchaseRequisitionItem.update({
          where: { id: requisitionItem.id },
          data: {
            standard: quoteItem.purchaseStandard,
            diameter: quoteItem.purchaseDiameter,
            thickness: quoteItem.purchaseThickness,
            bore: quoteItem.purchaseBore,
            technicalFamily: quoteItem.technicalFamily,
            technicalAttributes: quoteItem.technicalAttributes,
            sellerUnitCost: hasSellerQuote ? quoteItem.sellerQuotedUnitCost! : Math.max(0, quoteItem.cost),
            sellerCurrency: quoteItem.sellerQuotedCurrency || quoteItem.costCurrency,
            sellerExchangeRate: quoteItem.sellerQuotedExchangeRate || quote.exchangeRate,
            sellerCostSource: hasSellerQuote
              ? quoteItem.sellerCostSource || "ESTIMATED"
              : requisitionItem.source === "LOCAL_NEW" ? "ESTIMATED" : "ERP_COST",
            quotationOwner: requisitionItem.quotationOwner ?? (hasSellerQuote && quoteItem.sellerSupplierId ? "SELLER" : "PURCHASING"),
            sellerSupplierId: quoteItem.sellerSupplierId,
            sellerSupplierName: quoteItem.sellerSupplierNameSnapshot,
            sellerBrand: quoteItem.sellerQuotedBrand,
            originRestrictions: quoteItem.sellerOriginRestrictions,
            sellerDeliveryTime: quoteItem.sellerSupplierDeliveryTime,
            deliveryPlace: quoteItem.sellerDeliveryState,
          },
        });

        if (!quoteItem.sellerSupplierId || !quoteItem.sellerQuotedUnitCost || quoteItem.sellerQuotedUnitCost <= 0) continue;
        const subtotal = this.round4(requisitionItem.qty.toNumber() * quoteItem.sellerQuotedUnitCost);
        const tax = this.round4(subtotal * quote.taxRate);
        const total = this.round4(subtotal + tax);
        const currency = quoteItem.sellerQuotedCurrency || quoteItem.costCurrency;
        const fileAssetId = requisitionItem.quoteItem.clientItemId
          ? fileAssetByClientItemId.get(requisitionItem.quoteItem.clientItemId) || null
          : null;
        const supplierQuoteGroup = fileAssetId
          ? `FILE:${fileAssetId}:${quoteItem.sellerSupplierId}:${currency}`
          : `ITEM:${requisitionItem.id}`;
        const existingOffer = requisitionItem.offers[0];
        if (existingOffer) {
          let supplierQuoteId = existingOffer.supplierQuoteId;
          const supplierQuoteChanged = Boolean(existingOffer.supplierQuote && (
            existingOffer.supplierQuote.supplierId !== quoteItem.sellerSupplierId
            || existingOffer.supplierQuote.currency !== currency
            || existingOffer.supplierQuote.fileAssetId !== fileAssetId
          ));
          if (supplierQuoteId && supplierQuoteChanged) {
            const sharedOffers = await tx.purchaseSupplierOffer.count({ where: { supplierQuoteId } });
            if (sharedOffers > 1) supplierQuoteId = null;
          }
          if (!supplierQuoteId) {
            const created = await tx.purchaseSupplierQuote.create({
              data: {
                requisitionId,
                supplierId: quoteItem.sellerSupplierId,
                fileAssetId,
                source: "SELLER",
                reference: quoteItem.sellerSupplierQuoteReference,
                quoteDate: new Date(),
                validUntil: quoteItem.sellerSupplierQuoteValidUntil,
                currency,
                exchangeRate: quoteItem.sellerQuotedExchangeRate || quote.exchangeRate,
                subtotal,
                taxRate: quote.taxRate,
                tax,
                total,
                notes: quoteItem.sellerSupplierQuoteNotes,
                createdByUserId: quote.createdByUserId,
              },
              select: { id: true },
            });
            supplierQuoteId = created.id;
          } else {
            await tx.purchaseSupplierQuote.update({
              where: { id: supplierQuoteId },
              data: {
                supplierId: quoteItem.sellerSupplierId,
                fileAssetId,
                reference: quoteItem.sellerSupplierQuoteReference,
                validUntil: quoteItem.sellerSupplierQuoteValidUntil,
                currency,
                exchangeRate: quoteItem.sellerQuotedExchangeRate || quote.exchangeRate,
                notes: quoteItem.sellerSupplierQuoteNotes,
              },
            });
          }
          await tx.purchaseSupplierOffer.update({
            where: { id: existingOffer.id },
            data: {
              supplierQuoteId,
              supplierId: quoteItem.sellerSupplierId,
              supplierDescription: quoteItem.sellerSupplierDescription,
              supplierProductCode: quoteItem.sellerSupplierProductCode ?? existingOffer.supplierProductCode,
              qty: requisitionItem.qty,
              unit: requisitionItem.unit,
              unitCost: quoteItem.sellerQuotedUnitCost,
              currency,
              exchangeRate: quoteItem.sellerQuotedExchangeRate || quote.exchangeRate,
              subtotal,
              taxRate: quote.taxRate,
              tax,
              total,
              brand: quoteItem.sellerQuotedBrand,
              origin: quoteItem.sellerSupplierOrigin,
              deliveryTime: quoteItem.sellerSupplierDeliveryTime,
              validUntil: quoteItem.sellerSupplierQuoteValidUntil,
              externalReference: quoteItem.sellerSupplierQuoteReference,
              notes: quoteItem.sellerSupplierQuoteNotes,
              updatedByUserId: quote.updatedByUserId || quote.createdByUserId,
            },
          });
          continue;
        }
        let supplierQuote = supplierQuotesByGroup.get(supplierQuoteGroup);
        if (!supplierQuote) {
          const created = await tx.purchaseSupplierQuote.create({
            data: {
              requisitionId,
              supplierId: quoteItem.sellerSupplierId,
              fileAssetId,
              source: "SELLER",
              reference: quoteItem.sellerSupplierQuoteReference,
              quoteDate: new Date(),
              validUntil: quoteItem.sellerSupplierQuoteValidUntil,
              currency,
              exchangeRate: quoteItem.sellerQuotedExchangeRate || quote.exchangeRate,
              subtotal: 0,
              taxRate: quote.taxRate,
              tax: 0,
              total: 0,
              notes: quoteItem.sellerSupplierQuoteNotes,
              createdByUserId: quote.createdByUserId,
            },
            select: { id: true },
          });
          supplierQuote = { id: created.id, subtotal: 0, tax: 0, total: 0 };
          supplierQuotesByGroup.set(supplierQuoteGroup, supplierQuote);
        }
        await tx.purchaseSupplierOffer.create({
          data: {
            requisitionItemId: requisitionItem.id,
            supplierQuoteId: supplierQuote.id,
            supplierId: quoteItem.sellerSupplierId,
            source: "SELLER",
            supplierDescription: quoteItem.sellerSupplierDescription,
            supplierProductCode: quoteItem.sellerSupplierProductCode,
            qty: requisitionItem.qty,
            unit: requisitionItem.unit,
            unitCost: quoteItem.sellerQuotedUnitCost,
            currency: quoteItem.sellerQuotedCurrency || quoteItem.costCurrency,
            exchangeRate: quoteItem.sellerQuotedExchangeRate || quote.exchangeRate,
            subtotal,
            taxRate: quote.taxRate,
            tax,
            total,
            brand: quoteItem.sellerQuotedBrand,
            origin: quoteItem.sellerSupplierOrigin,
            deliveryTime: quoteItem.sellerSupplierDeliveryTime,
            validUntil: quoteItem.sellerSupplierQuoteValidUntil,
            quoteDate: new Date(),
            externalReference: quoteItem.sellerSupplierQuoteReference,
            notes: quoteItem.sellerSupplierQuoteNotes,
            createdByUserId: quote.createdByUserId,
          },
        });
        supplierQuote.subtotal = this.round4(supplierQuote.subtotal + subtotal);
        supplierQuote.tax = this.round4(supplierQuote.tax + tax);
        supplierQuote.total = this.round4(supplierQuote.total + total);
      }

      for (const supplierQuote of supplierQuotesByGroup.values()) {
        await tx.purchaseSupplierQuote.update({
          where: { id: supplierQuote.id },
          data: {
            subtotal: supplierQuote.subtotal,
            tax: supplierQuote.tax,
            total: supplierQuote.total,
          },
        });
      }

      const sellerSupplierQuotes = await tx.purchaseSupplierQuote.findMany({
        where: { requisitionId, source: "SELLER" },
        select: {
          id: true,
          offers: {
            where: { source: "SELLER", isActive: true },
            select: { subtotal: true, tax: true, total: true },
          },
        },
      });
      for (const supplierQuote of sellerSupplierQuotes) {
        await tx.purchaseSupplierQuote.update({
          where: { id: supplierQuote.id },
          data: {
            subtotal: this.round4(supplierQuote.offers.reduce((sum, offer) => sum + offer.subtotal.toNumber(), 0)),
            tax: this.round4(supplierQuote.offers.reduce((sum, offer) => sum + offer.tax.toNumber(), 0)),
            total: this.round4(supplierQuote.offers.reduce((sum, offer) => sum + offer.total.toNumber(), 0)),
          },
        });
      }

      const sellerOffers = await tx.purchaseSupplierOffer.findMany({
        where: { requisitionItem: { requisitionId }, source: "SELLER", isActive: true },
        select: { id: true, supplierQuoteId: true, requisitionItem: { select: { quoteItem: { select: { clientItemId: true } } } } },
      });
      const offerByClientItemId = new Map(
        sellerOffers.flatMap((offer) => offer.requisitionItem.quoteItem.clientItemId
          ? [[offer.requisitionItem.quoteItem.clientItemId, { offerId: offer.id, supplierQuoteId: offer.supplierQuoteId }] as const]
          : []),
      );
      const offerAttachments = quoteAttachments.flatMap((attachment) => {
        const target = attachment.clientItemId ? offerByClientItemId.get(attachment.clientItemId) : null;
        return target ? [{ fileAssetId: attachment.fileAssetId, purchaseSupplierOfferId: target.offerId }] : [];
      });
      if (offerAttachments.length > 0) {
        await tx.purchaseOfferAttachment.createMany({ data: offerAttachments, skipDuplicates: true });
      }
      for (const attachment of quoteAttachments) {
        const target = attachment.clientItemId ? offerByClientItemId.get(attachment.clientItemId) : null;
        if (target?.supplierQuoteId) {
          await tx.purchaseSupplierQuote.update({ where: { id: target.supplierQuoteId }, data: { fileAssetId: attachment.fileAssetId } });
        }
      }
    });
  }

  private scopeWhere(actor: PurchaseRequisitionActor): Prisma.PurchaseRequisitionWhereInput {
    if (actor.role === "SELLER") return { requestedByUserId: actor.id };
    if (actor.role === "MANAGER") return { branchId: actor.branchId };
    if (actor.role === "PURCHASING") return { branchId: actor.branchId, status: { not: "DRAFT" } };
    return {};
  }

  private async assertNotFinalized(requisitionId: string): Promise<void> {
    if (await prisma.purchaseSupplierRequisition.count({ where: { requisitionId } })) {
      throw new Error("Supplier requisitions were already generated; purchase details are locked.");
    }
  }

  private async recomputeStatus(
    tx: Prisma.TransactionClient,
    requisitionId: string,
    actorUserId?: string,
  ): Promise<void> {
    const requisition = await tx.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      select: {
        status: true,
        costApprovedAt: true,
        items: {
          where: { status: { not: "CANCELLED" } },
          select: {
            status: true,
            sellerUnitCost: true,
            sellerCurrency: true,
            sellerExchangeRate: true,
            qty: true,
            offers: { where: { isSelected: true, isActive: true }, select: { unitCost: true, currency: true, exchangeRate: true, awardedQty: true } },
          },
        },
      },
    });
    if (!requisition) return;
    if (requisition.status === "DRAFT") return;
    const hasHigherCost = requisition.items.some((item) => {
      if (!item.offers.length) return false;
      const sellerMxn = item.sellerCurrency === "MXN"
        ? number(item.sellerUnitCost)
        : number(item.sellerUnitCost) * number(item.sellerExchangeRate);
      const offerTotalMxn = item.offers.reduce((sum, offer) => {
        const rate = offer.currency === "MXN" ? 1 : number(offer.exchangeRate ?? item.sellerExchangeRate);
        return sum + number(offer.unitCost) * number(offer.awardedQty ?? item.qty) * rate;
      }, 0);
      return offerTotalMxn > sellerMxn * number(item.qty) + 0.0001;
    });
    const allReady = requisition.items.length > 0 && requisition.items.every((item) => item.status === "READY");
    const hasSelected = requisition.items.some((item) => item.offers.length > 0);
    const internalApprovalEnabled = resolveRuntimeValue(this.internalApprovalEnabled);
    const requiresInternalCostApproval = internalApprovalEnabled && hasHigherCost && !requisition.costApprovedAt;
    const status = requiresInternalCostApproval
      ? "COST_REVIEW"
      : allReady
        ? "READY_FOR_ORDER"
        : hasSelected
          ? "PARTIALLY_QUOTED"
          : "IN_PROGRESS";
    await tx.purchaseRequisition.update({ where: { id: requisitionId }, data: { status } });
    if (
      !internalApprovalEnabled
      && hasHigherCost
      && actorUserId
      && requisition.status !== status
    ) {
      await tx.auditLog.create({
        data: {
          actorUserId,
          entityType: "PURCHASE_REQUISITION",
          entityId: requisitionId,
          action: "INTERNAL_COST_APPROVAL_BYPASSED",
          payload: { resultingStatus: status },
        },
      });
    }
  }

  private round4(value: number): number {
    return Number(value.toFixed(4));
  }
}
