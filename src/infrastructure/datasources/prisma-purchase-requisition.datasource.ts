import type {
  FindPurchaseRequisitionsParams,
  FindPurchaseRequisitionsResult,
  LinkPurchaseRequisitionItemToErpData,
  PurchaseRequisitionActor,
  SavePurchaseSupplierOfferData,
  SaveErpSupplierData,
  SaveSupplierData,
  UpdatePurchaseRequisitionItemData,
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
import { canonicalizeProductText, normalizeProductDisplayText } from "../../domain/utils/canonical-product-text";
import { Prisma } from "../database/generated/client";
import { prisma } from "../database/prisma-client";

const requisitionInclude = {
  quote: {
    select: {
      quoteNumber: true,
      currency: true,
      customer: { select: { legalName: true, displayName: true } },
    },
  },
  branch: { select: { name: true } },
  requestedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  assignedBuyer: { select: { id: true, firstName: true, lastName: true, role: true } },
  costApprovedBy: { select: { id: true, firstName: true, lastName: true, role: true } },
  items: {
    orderBy: { position: "asc" as const },
    include: {
      quoteItem: { select: { clientItemId: true } },
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
  quoteCurrency: row.quote.currency,
  branchId: row.branchId,
  branchName: row.branch.name,
  customerName: row.quote.customer.legalName?.trim() || row.quote.customer.displayName,
  requestedByUserId: row.requestedByUserId,
  requestedBy: userSummary(row.requestedBy)!,
  assignedBuyerUserId: row.assignedBuyerUserId,
  assignedBuyer: userSummary(row.assignedBuyer),
  status: row.status,
  deliveryState: row.deliveryState,
  deliveryPlace: row.deliveryPlace,
  notes: row.notes,
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
  createdAt: row.createdAt,
  updatedAt: row.updatedAt,
});

export class PrismaPurchaseRequisitionDatasource extends PurchaseRequisitionDatasource {
  constructor(private readonly internalApprovalEnabled = true) {
    super();
  }

  async ensureForApprovedQuote(quote: QuoteEntity): Promise<PurchaseRequisitionEntity | null> {
    const existing = await prisma.purchaseRequisition.findUnique({
      where: { quoteId: quote.id },
      include: requisitionInclude,
    });
    if (existing) {
      await this.materializeSellerOffers(existing.id, quote);
      const refreshed = await prisma.purchaseRequisition.findUnique({ where: { id: existing.id }, include: requisitionInclude });
      return refreshed ? requisitionEntity(refreshed) : requisitionEntity(existing);
    }

    const requiredItems = quote.items.flatMap((item, index) => {
      const erpCode = (item.externalProductCode || item.product?.code || "").trim();
      const localNew = !erpCode;
      const fulfillment = getQuoteItemFulfillment({
        qty: item.qty,
        stock: item.stock,
        externalProductCode: erpCode || null,
      });
      if (!fulfillment.requiresPurchase) return [];

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
        sellerCostSource: hasSellerQuote ? "SELLER_SUPPLIER_QUOTE" as const : localNew ? "ESTIMATED" as const : "ERP_COST" as const,
        sellerSupplierId: item.sellerSupplierId,
        sellerSupplierName: item.sellerSupplierNameSnapshot,
        sellerBrand: item.sellerQuotedBrand,
        originRestrictions: item.sellerOriginRestrictions,
        sellerDeliveryTime: item.sellerSupplierDeliveryTime,
        deliveryPlace: item.sellerDeliveryState,
      }];
    });

    if (requiredItems.length === 0) return null;

    try {
      const deliveryStates = [...new Set(requiredItems.map((item) => item.deliveryPlace).filter((value): value is string => Boolean(value)))];
      const created = await prisma.purchaseRequisition.create({
        data: {
          requisitionNumber: `REQ-${quote.quoteNumber.replace(/^QT-/, "")}`,
          quoteId: quote.id,
          branchId: quote.branchId,
          requestedByUserId: quote.createdByUserId,
          status: "SUBMITTED",
          deliveryState: deliveryStates.length === 1 ? deliveryStates[0] : null,
          deliveryPlace: null,
          submittedAt: new Date(),
          items: { create: requiredItems },
        },
        include: requisitionInclude,
      });
      await this.materializeSellerOffers(created.id, quote);
      const refreshed = await prisma.purchaseRequisition.findUnique({ where: { id: created.id }, include: requisitionInclude });
      return requisitionEntity(refreshed || created);
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        const concurrent = await prisma.purchaseRequisition.findUnique({
          where: { quoteId: quote.id },
          include: requisitionInclude,
        });
        if (concurrent) return requisitionEntity(concurrent);
      }
      throw error;
    }
  }

  async findPaginated(params: FindPurchaseRequisitionsParams): Promise<FindPurchaseRequisitionsResult> {
    const where: Prisma.PurchaseRequisitionWhereInput = {
      AND: [
        this.scopeWhere(params.actor),
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

  async findByQuoteId(quoteId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    const row = await prisma.purchaseRequisition.findFirst({
      where: { quoteId, ...this.scopeWhere(actor) },
      include: requisitionInclude,
    });
    return row ? requisitionEntity(row) : null;
  }

  async updateItem(
    requisitionId: string,
    itemId: string,
    data: UpdatePurchaseRequisitionItemData,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null> {
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
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id: requisitionId, ...this.scopeWhere(actor) },
      include: { items: { where: { id: itemId }, select: { id: true, productId: true, selectedOfferId: true } } },
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
          status: item.selectedOfferId ? "READY" : undefined,
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

  async submit(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    const current = await this.findById(id, actor);
    if (!current) return null;
    if (current.requestedByUserId !== actor.id && actor.role !== "ADMIN") throw new Error("Only the requester can submit this requisition.");
    if (current.status !== "DRAFT") throw new Error("Only draft requisitions can be submitted.");
    if (current.items.some((item) => item.sellerUnitCost <= 0 || !item.deliveryPlace || !item.sellerDeliveryTime)) {
      throw new Error("Every item requires seller cost, delivery time and delivery place before submission.");
    }
    const row = await prisma.purchaseRequisition.update({
      where: { id },
      data: { status: "SUBMITTED", submittedAt: new Date() },
      include: requisitionInclude,
    });
    return requisitionEntity(row);
  }

  async assign(id: string, buyerUserId: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    if (!["ADMIN", "MANAGER", "PURCHASING"].includes(actor.role)) throw new Error("Not allowed to assign requisitions.");
    const buyer = await prisma.user.findFirst({ where: { id: buyerUserId, role: "PURCHASING", isActive: true }, select: { id: true } });
    if (!buyer) throw new Error("Active purchasing user not found.");
    const current = await prisma.purchaseRequisition.findFirst({ where: { id, ...this.scopeWhere(actor) }, select: { id: true, status: true } });
    if (!current) return null;
    if (["COMPLETED", "CANCELLED"].includes(current.status)) throw new Error("Closed requisitions are read-only.");
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
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can register supplier offers.");
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id: requisitionId, ...this.scopeWhere(actor) },
      include: { items: { where: { id: data.requisitionItemId }, select: { id: true } } },
    });
    if (!requisition || requisition.items.length === 0) return null;
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

  async selectOffer(
    requisitionId: string,
    itemId: string,
    offerId: string,
    actor: PurchaseRequisitionActor,
  ): Promise<PurchaseRequisitionEntity | null> {
    if (!["ADMIN", "PURCHASING"].includes(actor.role)) throw new Error("Only ADMIN or PURCHASING can select supplier offers.");
    const requisition = await prisma.purchaseRequisition.findFirst({
      where: { id: requisitionId, ...this.scopeWhere(actor) },
      include: {
        items: {
          where: { id: itemId },
          include: { offers: { where: { id: offerId, isActive: true }, include: { supplier: true } } },
        },
      },
    });
    const item = requisition?.items[0];
    const offer = item?.offers[0];
    if (!requisition || !item || !offer) return null;
    const blockedOrigin = item.originRestrictions.some(
      (restriction) => offer.origin && canonicalizeProductText(offer.origin) === canonicalizeProductText(restriction),
    );
    if (blockedOrigin) throw new Error("Supplier offer origin conflicts with the customer restrictions.");

    await prisma.$transaction(async (tx) => {
      await tx.purchaseSupplierOffer.updateMany({ where: { requisitionItemId: itemId }, data: { isSelected: false } });
      await tx.purchaseSupplierOffer.update({ where: { id: offerId }, data: { isSelected: true, updatedByUserId: actor.id } });
      if (offer.supplier.source === "LOCAL" && offer.supplier.status === "PROSPECT") {
        await tx.supplier.update({
          where: { id: offer.supplierId },
          data: { status: "PENDING_ERP", updatedByUserId: actor.id },
        });
      }
      await tx.purchaseRequisitionItem.update({
        where: { id: itemId },
        data: {
          selectedOfferId: offerId,
          status: item.source === "LOCAL_NEW" && !item.erpCode ? "PENDING_ERP_CODE" : "READY",
        },
      });
      await tx.purchaseRequisition.update({ where: { id: requisitionId }, data: { costApprovedAt: null, costApprovedByUserId: null } });
      await this.recomputeStatus(tx, requisitionId, actor.id);
    });
    return this.findById(requisitionId, actor);
  }

  async approveCostVariance(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
    if (!this.internalApprovalEnabled) throw new Error("Internal requisition approval is disabled.");
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
    const requisition = await prisma.purchaseRequisition.findUnique({
      where: { quoteId },
      select: { status: true, items: { select: { status: true } } },
    });
    return Boolean(
      requisition &&
      (["READY_FOR_ORDER", "COMPLETED"].includes(requisition.status)
        || (!this.internalApprovalEnabled && requisition.status === "COST_REVIEW")) &&
      requisition.items.every((item) => item.status === "READY"),
    );
  }

  async markCompletedByQuoteId(quoteId: string): Promise<void> {
    await prisma.purchaseRequisition.updateMany({
      where: {
        quoteId,
        status: this.internalApprovalEnabled
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
        isActive: true,
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
    const matchingLocal = await prisma.supplier.findFirst({
      where: {
        erpCode: null,
        OR: [
          ...(data.normalizedTaxId ? [{ normalizedTaxId: data.normalizedTaxId }] : []),
          { canonicalName: data.canonicalName },
          ...(data.normalizedEmail ? [{ normalizedEmail: data.normalizedEmail }] : []),
          ...(data.normalizedPhone ? [{ normalizedPhone: data.normalizedPhone }] : []),
        ],
      },
      select: { id: true },
    });
    if (matchingLocal) {
      const linked = await prisma.supplier.update({
        where: { id: matchingLocal.id },
        data: { ...primaryData, erpCode: data.erpCode },
      });
      return supplierEntity(linked);
    }
    const row = await prisma.supplier.upsert({
      where: { erpCode: data.erpCode },
      update: primaryData,
      create: {
        ...primaryData,
        erpCode: data.erpCode,
        createdByUserId: data.actorUserId,
      },
    });
    return supplierEntity(row);
  }

  async updateSupplier(id: string, data: SaveSupplierData): Promise<SupplierEntity | null> {
    const existing = await prisma.supplier.findUnique({ where: { id }, select: { id: true, source: true } });
    if (!existing) return null;
    if (existing.source === "ERP") throw new Error("ERP suppliers must be refreshed from ERP.");
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
          offers: { where: { source: "SELLER", isActive: true }, select: { id: true } },
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
        if (!quoteItem || requisitionItem.offers.length > 0) continue;
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
    return {};
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
            selectedOffer: { select: { unitCost: true, currency: true, exchangeRate: true } },
          },
        },
      },
    });
    if (!requisition) return;
    const hasHigherCost = requisition.items.some((item) => {
      if (!item.selectedOffer) return false;
      const sellerMxn = item.sellerCurrency === "MXN"
        ? number(item.sellerUnitCost)
        : number(item.sellerUnitCost) * number(item.sellerExchangeRate);
      const offerRate = item.selectedOffer.exchangeRate ? number(item.selectedOffer.exchangeRate) : number(item.sellerExchangeRate);
      const offerMxn = item.selectedOffer.currency === "MXN"
        ? number(item.selectedOffer.unitCost)
        : number(item.selectedOffer.unitCost) * offerRate;
      return offerMxn > sellerMxn + 0.0001;
    });
    const allReady = requisition.items.length > 0 && requisition.items.every((item) => item.status === "READY");
    const hasSelected = requisition.items.some((item) => Boolean(item.selectedOffer));
    const requiresInternalCostApproval = this.internalApprovalEnabled && hasHigherCost && !requisition.costApprovedAt;
    const status = requiresInternalCostApproval
      ? "COST_REVIEW"
      : allReady
        ? "READY_FOR_ORDER"
        : hasSelected
          ? "PARTIALLY_QUOTED"
          : "IN_PROGRESS";
    await tx.purchaseRequisition.update({ where: { id: requisitionId }, data: { status } });
    if (
      !this.internalApprovalEnabled
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
