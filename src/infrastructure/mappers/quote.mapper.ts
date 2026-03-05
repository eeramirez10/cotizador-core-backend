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
  status: QuoteEntity["status"];
  origin: QuoteEntity["origin"];
  currency: QuoteEntity["currency"];
  exchangeRate: number | DecimalLike;
  exchangeRateDate: Date;
  taxRate: number | DecimalLike;
  subtotal: number | DecimalLike;
  tax: number | DecimalLike;
  total: number | DecimalLike;
  branchId: string;
  customerId: string;
  createdByUserId: string;
  updatedByUserId: string | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
  branch: {
    id: string;
    code: string;
    name: string;
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
  items: Array<{
    id: string;
    quoteId: string;
    productId: string | null;
    externalProductCode: string | null;
    ean: string | null;
    customerDescription: string | null;
    customerUnit: string | null;
    erpDescription: string | null;
    unit: string;
    qty: number | DecimalLike;
    stock: number | DecimalLike | null;
    deliveryTime: string | null;
    cost: number | DecimalLike;
    costCurrency: QuoteEntity["currency"];
    marginPct: number | DecimalLike;
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
      status: row.status,
      origin: row.origin,
      currency: row.currency,
      exchangeRate: Number(toNumber(row.exchangeRate)),
      exchangeRateDate: row.exchangeRateDate,
      taxRate: Number(toNumber(row.taxRate)),
      subtotal: Number(toNumber(row.subtotal)),
      tax: Number(toNumber(row.tax)),
      total: Number(toNumber(row.total)),
      branchId: row.branchId,
      customerId: row.customerId,
      createdByUserId: row.createdByUserId,
      updatedByUserId: row.updatedByUserId,
      notes: row.notes,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      branch: row.branch,
      customer: row.customer,
      createdByUser: {
        id: row.createdByUser.id,
        firstName: row.createdByUser.firstName,
        lastName: row.createdByUser.lastName,
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
      items: row.items.map((item) => ({
        id: item.id,
        quoteId: item.quoteId,
        productId: item.productId,
        externalProductCode: item.externalProductCode,
        ean: item.ean,
        customerDescription: item.customerDescription,
        customerUnit: item.customerUnit,
        erpDescription: item.erpDescription,
        unit: item.unit,
        qty: Number(toNumber(item.qty)),
        stock: toNumber(item.stock),
        deliveryTime: item.deliveryTime,
        cost: Number(toNumber(item.cost)),
        costCurrency: item.costCurrency,
        marginPct: Number(toNumber(item.marginPct)),
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
