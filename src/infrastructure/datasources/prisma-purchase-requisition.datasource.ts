import type {
  FindPurchaseRequisitionsParams,
  FindPurchaseRequisitionsResult,
  LinkPurchaseRequisitionItemToErpData,
  PurchaseRequisitionActor,
  SavePurchaseSupplierOfferData,
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
      offers: {
        where: { isActive: true },
        orderBy: [{ isSelected: "desc" as const }, { createdAt: "desc" as const }],
        include: {
          supplier: true,
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
  scope: SupplierEntity["scope"];
  country: string | null;
  contactName: string | null;
  email: string | null;
  phone: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): SupplierEntity => ({
  id: supplier.id,
  erpCode: supplier.erpCode,
  name: supplier.name,
  source: supplier.source,
  scope: supplier.scope,
  country: supplier.country,
  contactName: supplier.contactName,
  email: supplier.email,
  phone: supplier.phone,
  isActive: supplier.isActive,
  createdAt: supplier.createdAt,
  updatedAt: supplier.updatedAt,
});

const offerEntity = (offer: RequisitionRow["items"][number]["offers"][number]): PurchaseSupplierOfferEntity => ({
  id: offer.id,
  requisitionItemId: offer.requisitionItemId,
  supplierId: offer.supplierId,
  qty: number(offer.qty),
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
  validUntil: offer.validUntil,
  quoteDate: offer.quoteDate,
  sentAt: offer.sentAt,
  externalReference: offer.externalReference,
  notes: offer.notes,
  isSelected: offer.isSelected,
  isActive: offer.isActive,
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
  async ensureForApprovedQuote(quote: QuoteEntity): Promise<PurchaseRequisitionEntity | null> {
    const existing = await prisma.purchaseRequisition.findUnique({
      where: { quoteId: quote.id },
      include: requisitionInclude,
    });
    if (existing) return requisitionEntity(existing);

    const requiredItems = quote.items.flatMap((item, index) => {
      const erpCode = (item.externalProductCode || item.product?.code || "").trim();
      const localNew = !erpCode;
      const availableStock = Math.max(0, item.stock ?? 0);
      const missingQty = Math.max(0, item.qty - availableStock);
      if (!localNew && missingQty <= 0) return [];

      const hasSellerQuote = item.sellerQuotedUnitCost !== null && item.sellerQuotedUnitCost > 0;
      return [{
        quoteItemId: item.id,
        position: index + 1,
        productId: item.productId,
        source: localNew ? "LOCAL_NEW" as const : "ERP_NO_STOCK" as const,
        erpCode: erpCode || null,
        qty: localNew ? item.qty : missingQty,
        unit: item.unit,
        description: item.erpDescription?.trim() || item.product?.description?.trim() || item.customerDescription?.trim() || "SIN DESCRIPCION",
        standard: item.purchaseStandard,
        diameter: item.purchaseDiameter,
        thickness: item.purchaseThickness,
        bore: item.purchaseBore,
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
      return requisitionEntity(created);
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
      await this.recomputeStatus(tx, requisitionId);
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

      await this.recomputeStatus(tx, requisitionId);
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
      await tx.purchaseSupplierOffer.create({
        data: {
          requisitionItemId: data.requisitionItemId,
          supplierId: data.supplierId,
          qty: data.qty,
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
      await tx.purchaseRequisitionItem.update({
        where: { id: itemId },
        data: {
          selectedOfferId: offerId,
          status: item.source === "LOCAL_NEW" && !item.erpCode ? "PENDING_ERP_CODE" : "READY",
        },
      });
      await tx.purchaseRequisition.update({ where: { id: requisitionId }, data: { costApprovedAt: null, costApprovedByUserId: null } });
      await this.recomputeStatus(tx, requisitionId);
    });
    return this.findById(requisitionId, actor);
  }

  async approveCostVariance(id: string, actor: PurchaseRequisitionActor): Promise<PurchaseRequisitionEntity | null> {
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
      ["READY_FOR_ORDER", "COMPLETED"].includes(requisition.status) &&
      requisition.items.every((item) => item.status === "READY"),
    );
  }

  async markCompletedByQuoteId(quoteId: string): Promise<void> {
    await prisma.purchaseRequisition.updateMany({
      where: { quoteId, status: "READY_FOR_ORDER" },
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
              ],
            }
          : {}),
      },
      orderBy: [{ name: "asc" }, { erpCode: "asc" }],
    });
    return rows.map(supplierEntity);
  }

  async createSupplier(data: SaveSupplierData): Promise<SupplierEntity> {
    const duplicate = await prisma.supplier.findFirst({
      where: {
        OR: [
          ...(data.erpCode ? [{ erpCode: data.erpCode }] : []),
          { canonicalName: data.canonicalName, isActive: true },
        ],
      },
      select: { id: true },
    });
    if (duplicate) throw new Error("Supplier already exists.");
    const row = await prisma.supplier.create({
      data: {
        erpCode: data.erpCode,
        name: data.name,
        canonicalName: data.canonicalName,
        source: data.erpCode ? "ERP" : "LOCAL",
        scope: data.scope,
        country: data.country,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        createdByUserId: data.actorUserId,
      },
    });
    return supplierEntity(row);
  }

  async updateSupplier(id: string, data: SaveSupplierData): Promise<SupplierEntity | null> {
    const existing = await prisma.supplier.findUnique({ where: { id }, select: { id: true } });
    if (!existing) return null;
    const row = await prisma.supplier.update({
      where: { id },
      data: {
        erpCode: data.erpCode,
        name: data.name,
        canonicalName: data.canonicalName,
        source: data.erpCode ? "ERP" : "LOCAL",
        scope: data.scope,
        country: data.country,
        contactName: data.contactName,
        email: data.email,
        phone: data.phone,
        updatedByUserId: data.actorUserId,
      },
    });
    return supplierEntity(row);
  }

  private scopeWhere(actor: PurchaseRequisitionActor): Prisma.PurchaseRequisitionWhereInput {
    if (actor.role === "SELLER") return { requestedByUserId: actor.id };
    if (actor.role === "MANAGER") return { branchId: actor.branchId };
    return {};
  }

  private async recomputeStatus(tx: Prisma.TransactionClient, requisitionId: string): Promise<void> {
    const requisition = await tx.purchaseRequisition.findUnique({
      where: { id: requisitionId },
      select: {
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
    const status = hasHigherCost && !requisition.costApprovedAt
      ? "COST_REVIEW"
      : allReady
        ? "READY_FOR_ORDER"
        : hasSelected
          ? "PARTIALLY_QUOTED"
          : "IN_PROGRESS";
    await tx.purchaseRequisition.update({ where: { id: requisitionId }, data: { status } });
  }

  private round4(value: number): number {
    return Number(value.toFixed(4));
  }
}
