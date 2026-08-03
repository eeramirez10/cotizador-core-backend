import { QuoteEntity } from "../../domain/entities/quote.entity";

interface DecimalLike {
  toString(): string;
}

const toNumber = (value: number | DecimalLike | null): number | null => {
  if (value === null) return null;
  if (typeof value === "number") return value;
  return Number(value.toString());
};

interface QuoteRow {
  id: string;
  quoteNumber: string;
  clientDraftId: string | null;
  status: QuoteEntity["status"];
  deliveryStatus: QuoteEntity["deliveryStatus"];
  firstSentAt: Date | null;
  orderStatus: QuoteEntity["orderStatus"];
  orderGeneratedAt: Date | null;
  orderReference: string | null;
  erpQuoteNumber: string | null;
  erpQuoteRegisteredAt: Date | null;
  erpQuoteRegisteredByUserId: string | null;
  origin: QuoteEntity["origin"];
  captureMethod: QuoteEntity["captureMethod"];
  originalQuoteDate: Date | null;
  sourceChannel: QuoteEntity["sourceChannel"];
  currency: QuoteEntity["currency"];
  exchangeRate: number | DecimalLike;
  exchangeRateDate: Date;
  taxRate: number | DecimalLike;
  subtotal: number | DecimalLike;
  tax: number | DecimalLike;
  total: number | DecimalLike;
  deliveryPlace: string | null;
  paymentTerms: string;
  commercialConditions: string | null;
  validityDays: number;
  validUntil: Date;
  branchId: string;
  customerId: string;
  createdByUserId: string;
  updatedByUserId: string | null;
  rejectionReason: QuoteEntity["rejectionReason"];
  rejectionComment: string | null;
  rejectedAt: Date | null;
  rejectedByUserId: string | null;
  cancellationReason: QuoteEntity["cancellationReason"];
  cancellationComment: string | null;
  cancelledAt: Date | null;
  cancelledByUserId: string | null;
  approvalReturnReason: QuoteEntity["approvalReturnReason"];
  approvalReturnComment: string | null;
  rootQuoteId: string | null;
  previousVersionId: string | null;
  supersededByQuoteId: string | null;
  revisionNumber: number;
  revisionReason: QuoteEntity["revisionReason"];
  revisionComment: string | null;
  supersededAt: Date | null;
  archivedAt: Date | null;
  archivedByUserId: string | null;
  archiveReason: string | null;
  nextVersions: Array<{
    id: string;
    quoteNumber: string;
    status: QuoteEntity["status"];
    revisionNumber: number;
  }>;
  providedByUserId: string | null;
  providedByNameSnapshot: string | null;
  providedByBranchNameSnapshot: string | null;
  providedAt: Date | null;
  providedByAssignedByUserId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch: {
    id: string;
    code: string;
    name: string;
    street: string | null;
    exteriorNumber: string | null;
    interiorNumber: string | null;
    neighborhood: string | null;
    city: string | null;
    municipality: string | null;
    state: string | null;
    postalCode: string | null;
    country: string | null;
    email: string | null;
    phone: string | null;
    secondaryPhone: string | null;
  };
  customer: {
    id: string;
    displayName: string;
    legalName: string | null;
    email: string | null;
    phone: string | null;
    whatsapp: string;
  };
  createdByUser: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
    branchId: string;
    branch: {
      code: string;
      name: string;
    };
  };
  updatedByUser: {
    id: string;
    firstName: string;
    lastName: string;
    branchId: string;
    branch: {
      code: string;
      name: string;
    };
  } | null;
  rejectedByUser: {
    id: string;
    firstName: string;
    lastName: string;
    branchId: string;
    branch: { code: string; name: string };
  } | null;
  cancelledByUser: {
    id: string;
    firstName: string;
    lastName: string;
    branchId: string;
    branch: { code: string; name: string };
  } | null;
  archivedByUser: {
    id: string;
    firstName: string;
    lastName: string;
    branchId: string;
    branch: { code: string; name: string };
  } | null;
  erpQuoteRegisteredByUser: {
    id: string;
    firstName: string;
    lastName: string;
    branchId: string;
    branch: { code: string; name: string };
  } | null;
  items: Array<{
    id: string;
    quoteId: string;
    clientItemId: string | null;
    productId: string | null;
    externalProductCode: string | null;
    ean: string | null;
    customerDescription: string | null;
    customerDescriptionOriginal: string | null;
    customerDescriptionEditedAt: Date | null;
    customerDescriptionEditedByUserId: string | null;
    customerUnit: string | null;
    erpDescription: string | null;
    unit: string;
    qty: number | DecimalLike;
    stock: number | DecimalLike | null;
    deliveryTime: string | null;
    itemComment: string | null;
    sellerSupplierId: string | null;
    sellerSupplierNameSnapshot: string | null;
    sellerQuotedUnitCost: number | DecimalLike | null;
    sellerQuotedCurrency: QuoteEntity["currency"] | null;
    sellerQuotedExchangeRate: number | DecimalLike | null;
    sellerQuotedBrand: string | null;
    sellerSupplierDescription: string | null;
    sellerSupplierOrigin: string | null;
    sellerSupplierQuoteValidUntil: Date | null;
    sellerSupplierQuoteReference: string | null;
    sellerSupplierQuoteNotes: string | null;
    sellerOriginRestrictions: string[];
    sellerDeliveryState: string | null;
    sellerSupplierDeliveryTime: string | null;
    purchaseStandard: string | null;
    purchaseDiameter: string | null;
    purchaseThickness: string | null;
    purchaseBore: string | null;
    technicalFamily: string | null;
    technicalAttributes: unknown;
    cost: number | DecimalLike;
    costCurrency: QuoteEntity["currency"];
    marginPct: number | DecimalLike;
    sourceCurrency: QuoteEntity["currency"] | null;
    sourceUnitPrice: number | DecimalLike | null;
    sourceSubtotal: number | DecimalLike | null;
    unitPrice: number | DecimalLike;
    subtotal: number | DecimalLike;
    sourceRequiresReview: boolean;
    requiresReview: boolean;
    createdAt: Date;
    updatedAt: Date;
    product: {
      id: string;
      code: string | null;
      ean: string | null;
      description: string;
      unit: string;
      currency: QuoteEntity["currency"];
    } | null;
    customerDescriptionEditedByUser: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  }>;
  events: Array<{
    id: string;
    quoteId: string;
    status: QuoteEntity["status"];
    note: string | null;
    actorUserId: string | null;
    createdAt: Date;
    actorUser: {
      id: string;
      firstName: string;
      lastName: string;
    } | null;
  }>;
}

export class QuoteMapper {
  static toEntity(row: QuoteRow): QuoteEntity {
    return {
      id: row.id,
      quoteNumber: row.quoteNumber,
      clientDraftId: row.clientDraftId,
      status: row.status,
      deliveryStatus: row.deliveryStatus,
      firstSentAt: row.firstSentAt,
      orderStatus: row.orderStatus,
      orderGeneratedAt: row.orderGeneratedAt,
      orderReference: row.orderReference,
      erpQuoteNumber: row.erpQuoteNumber,
      erpQuoteRegisteredAt: row.erpQuoteRegisteredAt,
      erpQuoteRegisteredByUserId: row.erpQuoteRegisteredByUserId,
      origin: row.origin,
      captureMethod: row.captureMethod,
      originalQuoteDate: row.originalQuoteDate,
      sourceChannel: row.sourceChannel,
      currency: row.currency,
      exchangeRate: Number(toNumber(row.exchangeRate)),
      exchangeRateDate: row.exchangeRateDate,
      taxRate: Number(toNumber(row.taxRate)),
      subtotal: Number(toNumber(row.subtotal)),
      tax: Number(toNumber(row.tax)),
      total: Number(toNumber(row.total)),
      deliveryPlace: row.deliveryPlace,
      paymentTerms: row.paymentTerms,
      commercialConditions: row.commercialConditions,
      validityDays: row.validityDays,
      validUntil: row.validUntil,
      branchId: row.branchId,
      customerId: row.customerId,
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId,
      rejectionReason: row.rejectionReason,
      rejectionComment: row.rejectionComment,
      rejectedAt: row.rejectedAt,
      rejectedByUserId: row.rejectedByUserId,
      cancellationReason: row.cancellationReason,
      cancellationComment: row.cancellationComment,
      cancelledAt: row.cancelledAt,
      cancelledByUserId: row.cancelledByUserId,
      approvalReturnReason: row.approvalReturnReason,
      approvalReturnComment: row.approvalReturnComment,
      rootQuoteId: row.rootQuoteId,
      previousVersionId: row.previousVersionId,
      supersededByQuoteId: row.supersededByQuoteId,
      revisionNumber: row.revisionNumber,
      revisionReason: row.revisionReason,
      revisionComment: row.revisionComment,
      supersededAt: row.supersededAt,
      archivedAt: row.archivedAt,
      archivedByUserId: row.archivedByUserId,
      archiveReason: row.archiveReason,
      nextRevision: row.nextVersions[0] ?? null,
      providedByUserId: row.providedByUserId,
      providedByNameSnapshot: row.providedByNameSnapshot,
      providedByBranchNameSnapshot: row.providedByBranchNameSnapshot,
      providedAt: row.providedAt,
      providedByAssignedByUserId: row.providedByAssignedByUserId,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      branch: row.branch,
      customer: row.customer,
      createdByUser: {
        id: row.createdByUser.id,
        firstName: row.createdByUser.firstName,
        lastName: row.createdByUser.lastName,
        email: row.createdByUser.email,
        phone: row.createdByUser.phone,
        branchId: row.createdByUser.branchId,
        branchCode: row.createdByUser.branch.code,
        branchName: row.createdByUser.branch.name,
      },
      updatedByUser: row.updatedByUser
        ? {
            id: row.updatedByUser.id,
            firstName: row.updatedByUser.firstName,
            lastName: row.updatedByUser.lastName,
            branchId: row.updatedByUser.branchId,
            branchCode: row.updatedByUser.branch.code,
            branchName: row.updatedByUser.branch.name,
          }
        : null,
      rejectedByUser: row.rejectedByUser
        ? {
            id: row.rejectedByUser.id,
            firstName: row.rejectedByUser.firstName,
            lastName: row.rejectedByUser.lastName,
            branchId: row.rejectedByUser.branchId,
            branchCode: row.rejectedByUser.branch.code,
            branchName: row.rejectedByUser.branch.name,
          }
        : null,
      cancelledByUser: row.cancelledByUser
        ? {
            id: row.cancelledByUser.id,
            firstName: row.cancelledByUser.firstName,
            lastName: row.cancelledByUser.lastName,
            branchId: row.cancelledByUser.branchId,
            branchCode: row.cancelledByUser.branch.code,
            branchName: row.cancelledByUser.branch.name,
          }
        : null,
      archivedByUser: row.archivedByUser
        ? {
            id: row.archivedByUser.id,
            firstName: row.archivedByUser.firstName,
            lastName: row.archivedByUser.lastName,
            branchId: row.archivedByUser.branchId,
            branchCode: row.archivedByUser.branch.code,
            branchName: row.archivedByUser.branch.name,
          }
        : null,
      erpQuoteRegisteredByUser: row.erpQuoteRegisteredByUser
        ? {
            id: row.erpQuoteRegisteredByUser.id,
            firstName: row.erpQuoteRegisteredByUser.firstName,
            lastName: row.erpQuoteRegisteredByUser.lastName,
            branchId: row.erpQuoteRegisteredByUser.branchId,
            branchCode: row.erpQuoteRegisteredByUser.branch.code,
            branchName: row.erpQuoteRegisteredByUser.branch.name,
          }
        : null,
      items: row.items.map((item) => ({
        id: item.id,
        quoteId: item.quoteId,
        clientItemId: item.clientItemId,
        productId: item.productId,
        externalProductCode: item.externalProductCode,
        ean: item.ean,
        customerDescription: item.customerDescription,
        customerDescriptionOriginal: item.customerDescriptionOriginal,
        customerDescriptionEditedAt: item.customerDescriptionEditedAt,
        customerDescriptionEditedByUserId: item.customerDescriptionEditedByUserId,
        customerUnit: item.customerUnit,
        erpDescription: item.erpDescription,
        unit: item.unit,
        qty: Number(toNumber(item.qty)),
        stock: toNumber(item.stock),
        deliveryTime: item.deliveryTime,
        itemComment: item.itemComment,
        sellerSupplierId: item.sellerSupplierId,
        sellerSupplierNameSnapshot: item.sellerSupplierNameSnapshot,
        sellerQuotedUnitCost: toNumber(item.sellerQuotedUnitCost),
        sellerQuotedCurrency: item.sellerQuotedCurrency,
        sellerQuotedExchangeRate: toNumber(item.sellerQuotedExchangeRate),
        sellerQuotedBrand: item.sellerQuotedBrand,
        sellerSupplierDescription: item.sellerSupplierDescription,
        sellerSupplierOrigin: item.sellerSupplierOrigin,
        sellerSupplierQuoteValidUntil: item.sellerSupplierQuoteValidUntil,
        sellerSupplierQuoteReference: item.sellerSupplierQuoteReference,
        sellerSupplierQuoteNotes: item.sellerSupplierQuoteNotes,
        sellerOriginRestrictions: item.sellerOriginRestrictions,
        sellerDeliveryState: item.sellerDeliveryState,
        sellerSupplierDeliveryTime: item.sellerSupplierDeliveryTime,
        purchaseStandard: item.purchaseStandard,
        purchaseDiameter: item.purchaseDiameter,
        purchaseThickness: item.purchaseThickness,
        purchaseBore: item.purchaseBore,
        technicalFamily: item.technicalFamily,
        technicalAttributes:
          item.technicalAttributes && typeof item.technicalAttributes === "object" && !Array.isArray(item.technicalAttributes)
            ? Object.fromEntries(Object.entries(item.technicalAttributes).filter((entry): entry is [string, string] => typeof entry[1] === "string"))
            : {},
        cost: Number(toNumber(item.cost)),
        costCurrency: item.costCurrency,
        marginPct: Number(toNumber(item.marginPct)),
        sourceCurrency: item.sourceCurrency,
        sourceUnitPrice: toNumber(item.sourceUnitPrice),
        sourceSubtotal: toNumber(item.sourceSubtotal),
        unitPrice: Number(toNumber(item.unitPrice)),
        subtotal: Number(toNumber(item.subtotal)),
        sourceRequiresReview: item.sourceRequiresReview,
        requiresReview: item.requiresReview,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        product: item.product
          ? {
              id: item.product.id,
              code: item.product.code,
              ean: item.product.ean,
              description: item.product.description,
              unit: item.product.unit,
              currency: item.product.currency,
            }
          : null,
        customerDescriptionEditedByUser: item.customerDescriptionEditedByUser,
      })),
      events: row.events.map((event) => ({
        id: event.id,
        quoteId: event.quoteId,
        status: event.status,
        note: event.note,
        actorUserId: event.actorUserId,
        createdAt: event.createdAt,
        actorUser: event.actorUser
          ? {
              id: event.actorUser.id,
              firstName: event.actorUser.firstName,
              lastName: event.actorUser.lastName,
            }
          : null,
      })),
    };
  }
}
