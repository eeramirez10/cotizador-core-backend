import type {
  Currency,
  PurchaseCostSource,
  PurchaseRequisitionStatus,
  SupplierScope,
  SupplierContactChannel,
  SupplierPhoneKind,
} from "../../../infrastructure/database/generated/enums";
import {
  normalizeSupplierEmail,
  normalizeSupplierPhone,
} from "../../utils/supplier-contact-normalizer";

const optionalText = (value: unknown): string | null | undefined => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== "string") return null;
  return value.trim() || null;
};

const dateOnly = (value: unknown): Date | null | undefined => {
  if (value === undefined || value === null || value === "") return value === undefined ? undefined : null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return undefined;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
};

const stringRecord = (value: unknown): Record<string, string> | undefined => {
  if (value === undefined) return undefined;
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string")
      .map(([key, entry]) => [key.trim(), entry.trim()])
      .filter(([key, entry]) => Boolean(key && entry)),
  );
};

export class GetPurchaseRequisitionsQueryDto {
  constructor(
    public readonly page: number,
    public readonly pageSize: number,
    public readonly search?: string,
    public readonly status?: PurchaseRequisitionStatus,
  ) {}

  static create(input: unknown): [string?, GetPurchaseRequisitionsQueryDto?] {
    const query = (input || {}) as Record<string, unknown>;
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(100, Math.max(1, Number(query.pageSize) || 20));
    const search = typeof query.search === "string" && query.search.trim() ? query.search.trim() : undefined;
    const status = typeof query.status === "string" ? query.status.trim().toUpperCase() as PurchaseRequisitionStatus : undefined;
    const allowed: PurchaseRequisitionStatus[] = ["DRAFT", "SUBMITTED", "IN_PROGRESS", "PARTIALLY_QUOTED", "COST_REVIEW", "READY_FOR_ORDER", "COMPLETED", "CANCELLED"];
    if (status && !allowed.includes(status)) return ["status is invalid."];
    return [, new GetPurchaseRequisitionsQueryDto(page, pageSize, search, status)];
  }
}

export class UpdatePurchaseRequisitionItemRequestDto {
  constructor(
    public readonly data: {
      standard?: string | null;
      diameter?: string | null;
      thickness?: string | null;
      bore?: string | null;
      technicalFamily?: string | null;
      technicalAttributes?: Record<string, string>;
      sellerUnitCost?: number;
      sellerCurrency?: Currency;
      sellerCostSource?: PurchaseCostSource;
      sellerBrand?: string | null;
      originRestrictions?: string[];
      sellerDeliveryTime?: string | null;
      deliveryPlace?: string | null;
    },
  ) {}

  static create(input: unknown): [string?, UpdatePurchaseRequisitionItemRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const data: UpdatePurchaseRequisitionItemRequestDto["data"] = {
      standard: optionalText(body.standard),
      diameter: optionalText(body.diameter),
      thickness: optionalText(body.thickness),
      bore: optionalText(body.bore),
      technicalFamily: optionalText(body.technicalFamily),
      technicalAttributes: stringRecord(body.technicalAttributes),
      sellerBrand: optionalText(body.sellerBrand),
      sellerDeliveryTime: optionalText(body.sellerDeliveryTime),
      deliveryPlace: optionalText(body.deliveryPlace),
    };
    if (body.sellerUnitCost !== undefined) {
      const value = Number(body.sellerUnitCost);
      if (!Number.isFinite(value) || value < 0) return ["sellerUnitCost must be zero or greater."];
      data.sellerUnitCost = value;
    }
    if (body.sellerCurrency !== undefined) {
      if (body.sellerCurrency !== "MXN" && body.sellerCurrency !== "USD") return ["sellerCurrency is invalid."];
      data.sellerCurrency = body.sellerCurrency;
    }
    if (body.sellerCostSource !== undefined) {
      const allowed: PurchaseCostSource[] = ["ERP_COST", "SELLER_SUPPLIER_QUOTE", "ESTIMATED"];
      if (!allowed.includes(body.sellerCostSource as PurchaseCostSource)) return ["sellerCostSource is invalid."];
      data.sellerCostSource = body.sellerCostSource as PurchaseCostSource;
    }
    if (body.originRestrictions !== undefined) {
      if (!Array.isArray(body.originRestrictions) || body.originRestrictions.some((value) => typeof value !== "string")) {
        return ["originRestrictions must be a string array."];
      }
      data.originRestrictions = [...new Set(body.originRestrictions.map((value) => String(value).trim()).filter(Boolean))];
    }
    const defined = Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
    if (Object.keys(defined).length === 0) return ["At least one field is required."];
    return [, new UpdatePurchaseRequisitionItemRequestDto(defined)];
  }
}

export class LinkPurchaseRequisitionItemToErpRequestDto {
  private constructor(
    public readonly erpCode: string,
    public readonly erpEan: string,
  ) {}

  static create(input: unknown): [string?, LinkPurchaseRequisitionItemToErpRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const erpCode = typeof body.erpCode === "string" ? body.erpCode.trim().toUpperCase() : "";
    const erpEan = typeof body.erpEan === "string" ? body.erpEan.trim() : "";
    if (!erpCode) return ["erpCode is required."];
    if (!erpEan) return ["erpEan is required."];
    return [, new LinkPurchaseRequisitionItemToErpRequestDto(erpCode, erpEan)];
  }
}

export class AssignPurchaseRequisitionRequestDto {
  constructor(public readonly buyerUserId: string) {}
  static create(input: unknown): [string?, AssignPurchaseRequisitionRequestDto?] {
    const value = (input as Record<string, unknown> | null)?.buyerUserId;
    if (typeof value !== "string" || !value.trim()) return ["buyerUserId is required."];
    return [, new AssignPurchaseRequisitionRequestDto(value.trim())];
  }
}

export class CreatePurchaseSupplierOfferRequestDto {
  constructor(
    public readonly supplierId: string,
    public readonly supplierProductCode: string | null,
    public readonly alternateCodes: string[],
    public readonly supplierDescription: string | null,
    public readonly qty: number,
    public readonly unit: string | null,
    public readonly listUnitPrice: number | null,
    public readonly discountPct: number | null,
    public readonly unitCost: number,
    public readonly currency: Currency,
    public readonly exchangeRate: number | null,
    public readonly taxRate: number,
    public readonly brand: string | null,
    public readonly origin: string | null,
    public readonly deliveryTime: string | null,
    public readonly availableDate: Date | null,
    public readonly minimumQty: number | null,
    public readonly validUntil: Date | null,
    public readonly quoteDate: Date,
    public readonly externalReference: string | null,
    public readonly paymentTerms: string | null,
    public readonly deliveryTerms: string | null,
    public readonly documentSubtotal: number | null,
    public readonly documentDiscount: number,
    public readonly documentFreight: number,
    public readonly documentOtherCharges: number,
    public readonly taxIncluded: boolean,
    public readonly documentTax: number | null,
    public readonly documentTotal: number | null,
    public readonly notes: string | null,
  ) {}

  static create(input: unknown): [string?, CreatePurchaseSupplierOfferRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const supplierId = typeof body.supplierId === "string" ? body.supplierId.trim() : "";
    const qty = Number(body.qty);
    const unitCost = Number(body.unitCost);
    const currency = body.currency as Currency;
    const exchangeRate = body.exchangeRate === undefined || body.exchangeRate === null || body.exchangeRate === "" ? null : Number(body.exchangeRate);
    const taxRate = body.taxRate === undefined ? 0.16 : Number(body.taxRate);
    const nullableNumber = (key: string): number | null => body[key] === undefined || body[key] === null || body[key] === "" ? null : Number(body[key]);
    const listUnitPrice = nullableNumber("listUnitPrice");
    const discountPct = nullableNumber("discountPct");
    const minimumQty = nullableNumber("minimumQty");
    const documentSubtotal = nullableNumber("documentSubtotal");
    const documentTax = nullableNumber("documentTax");
    const documentTotal = nullableNumber("documentTotal");
    const documentDiscount = nullableNumber("documentDiscount") ?? 0;
    const documentFreight = nullableNumber("documentFreight") ?? 0;
    const documentOtherCharges = nullableNumber("documentOtherCharges") ?? 0;
    if (!supplierId) return ["supplierId is required."];
    if (!Number.isFinite(qty) || qty <= 0) return ["qty must be greater than zero."];
    if (!Number.isFinite(unitCost) || unitCost < 0) return ["unitCost must be zero or greater."];
    if (currency !== "MXN" && currency !== "USD") return ["currency is invalid."];
    if (currency === "USD" && (!exchangeRate || !Number.isFinite(exchangeRate) || exchangeRate <= 0)) return ["exchangeRate is required for USD offers."];
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 1) return ["taxRate is invalid."];
    for (const [field, value] of Object.entries({ listUnitPrice, minimumQty, documentSubtotal, documentTax, documentTotal, documentDiscount, documentFreight, documentOtherCharges })) {
      if (value !== null && (!Number.isFinite(value) || value < 0)) return [`${field} is invalid.`];
    }
    if (discountPct !== null && (!Number.isFinite(discountPct) || discountPct < 0 || discountPct > 100)) return ["discountPct is invalid."];
    const validUntil = dateOnly(body.validUntil);
    const availableDate = dateOnly(body.availableDate);
    const quoteDate = dateOnly(body.quoteDate) ?? new Date();
    if (body.validUntil && validUntil === undefined) return ["validUntil is invalid."];
    if (body.availableDate && availableDate === undefined) return ["availableDate is invalid."];
    if (body.quoteDate && quoteDate === undefined) return ["quoteDate is invalid."];
    return [, new CreatePurchaseSupplierOfferRequestDto(
      supplierId,
      optionalText(body.supplierProductCode)?.toUpperCase() ?? null,
      Array.isArray(body.alternateCodes) ? [...new Set(body.alternateCodes.map((value) => String(value).trim().toUpperCase()).filter(Boolean))] : [],
      optionalText(body.supplierDescription) ?? null,
      qty,
      optionalText(body.unit)?.toUpperCase() ?? null,
      listUnitPrice,
      discountPct,
      unitCost,
      currency,
      exchangeRate,
      taxRate,
      optionalText(body.brand) ?? null,
      optionalText(body.origin) ?? null,
      optionalText(body.deliveryTime) ?? null,
      availableDate ?? null,
      minimumQty,
      validUntil ?? null,
      quoteDate,
      optionalText(body.externalReference) ?? null,
      optionalText(body.paymentTerms) ?? null,
      optionalText(body.deliveryTerms) ?? null,
      documentSubtotal,
      documentDiscount,
      documentFreight,
      documentOtherCharges,
      body.taxIncluded === true,
      documentTax,
      documentTotal,
      optionalText(body.notes) ?? null,
    )];
  }
}

export class SaveSupplierRequestDto {
  constructor(
    public readonly name: string,
    public readonly scope: SupplierScope,
    public readonly taxId: string | null,
    public readonly state: string | null,
    public readonly country: string | null,
    public readonly contactName: string | null,
    public readonly contactPosition: string | null,
    public readonly creditTerms: string | null,
    public readonly currency: Currency | null,
    public readonly notes: string | null,
    public readonly email: string | null,
    public readonly phone: string | null,
    public readonly contacts: Array<{
      channel: SupplierContactChannel;
      value: string;
      normalizedValue: string;
      phoneKind: SupplierPhoneKind | null;
      extension: string | null;
      isWhatsApp: boolean;
      contactName: string | null;
      label: string | null;
      isPrimary: boolean;
    }>,
    public readonly allowPotentialDuplicate: boolean,
  ) {}

  static create(input: unknown): [string?, SaveSupplierRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const scope = body.scope as SupplierScope;
    const email = optionalText(body.email) ?? null;
    const phone = optionalText(body.phone) ?? null;
    const country = optionalText(body.country) ?? (scope === "NATIONAL" ? "MÉXICO" : null);
    const currency = body.currency === undefined || body.currency === null || body.currency === ""
      ? null
      : body.currency as Currency;
    if (!name) return ["name is required."];
    if (scope !== "NATIONAL" && scope !== "INTERNATIONAL") return ["scope is invalid."];
    if (currency !== null && currency !== "MXN" && currency !== "USD") return ["currency is invalid."];
    if (body.contacts !== undefined && !Array.isArray(body.contacts)) return ["contacts must be an array."];
    const incomingContacts = [...(Array.isArray(body.contacts) ? body.contacts : [])];
    if (!incomingContacts.some((value) => (value as Record<string, unknown> | null)?.channel === "EMAIL") && email) {
      incomingContacts.push({ channel: "EMAIL", value: email, contactName: body.contactName, isPrimary: true });
    }
    if (!incomingContacts.some((value) => (value as Record<string, unknown> | null)?.channel === "PHONE") && phone) {
      incomingContacts.push({ channel: "PHONE", value: phone, phoneKind: "UNKNOWN", contactName: body.contactName, isPrimary: true });
    }
    const contacts: SaveSupplierRequestDto["contacts"] = [];
    const seenContacts = new Set<string>();
    for (const value of incomingContacts) {
      if (!value || typeof value !== "object") return ["Each contact must be an object."];
      const contact = value as Record<string, unknown>;
      const channel = contact.channel as SupplierContactChannel;
      const contactValue = optionalText(contact.value) ?? null;
      if ((channel !== "EMAIL" && channel !== "PHONE") || !contactValue) return ["Each contact requires a valid channel and value."];
      const phoneKind = channel === "PHONE"
        ? (["LANDLINE", "MOBILE", "UNKNOWN"].includes(String(contact.phoneKind)) ? contact.phoneKind as SupplierPhoneKind : "UNKNOWN")
        : null;
      const normalizedEmail = channel === "EMAIL" ? normalizeSupplierEmail(contactValue) : null;
      const normalizedPhone = channel === "PHONE"
        ? normalizeSupplierPhone(contactValue, country, optionalText(contact.extension) ?? null)
        : null;
      if (channel === "EMAIL" && !normalizedEmail) return ["A supplier contact email is invalid."];
      if (channel === "PHONE" && !normalizedPhone) {
        return ["A supplier contact phone is invalid or requires an international prefix for the selected country."];
      }
      const normalized = normalizedEmail ?? normalizedPhone!.e164;
      const key = `${channel}:${normalized}`;
      if (seenContacts.has(key)) continue;
      seenContacts.add(key);
      contacts.push({
        channel,
        value: channel === "EMAIL" ? normalized : contactValue,
        normalizedValue: normalized,
        phoneKind,
        extension: channel === "PHONE" ? normalizedPhone!.extension : null,
        isWhatsApp: channel === "PHONE" && contact.isWhatsApp === true,
        contactName: optionalText(contact.contactName) ?? null,
        label: optionalText(contact.label) ?? null,
        isPrimary: contact.isPrimary === true,
      });
    }
    for (const channel of ["EMAIL", "PHONE"] as const) {
      const channelContacts = contacts.filter((contact) => contact.channel === channel);
      if (channelContacts.length > 0 && !channelContacts.some((contact) => contact.isPrimary)) channelContacts[0]!.isPrimary = true;
      let primaryFound = false;
      channelContacts.forEach((contact) => {
        if (contact.isPrimary && primaryFound) contact.isPrimary = false;
        if (contact.isPrimary) primaryFound = true;
      });
    }
    const primaryEmail = contacts.find((contact) => contact.channel === "EMAIL" && contact.isPrimary)?.normalizedValue
      ?? contacts.find((contact) => contact.channel === "EMAIL")?.normalizedValue
      ?? null;
    const primaryPhone = contacts.find((contact) => contact.channel === "PHONE" && contact.isPrimary)?.normalizedValue
      ?? contacts.find((contact) => contact.channel === "PHONE")?.normalizedValue
      ?? null;
    return [, new SaveSupplierRequestDto(
      name,
      scope,
      optionalText(body.taxId)?.toUpperCase() ?? null,
      optionalText(body.state)?.toUpperCase() ?? null,
      country,
      optionalText(body.contactName) ?? null,
      optionalText(body.contactPosition) ?? null,
      optionalText(body.creditTerms) ?? null,
      currency,
      optionalText(body.notes) ?? null,
      primaryEmail,
      primaryPhone,
      contacts,
      body.allowPotentialDuplicate === true,
    )];
  }
}

export class SetSupplierActiveRequestDto {
  private constructor(public readonly isActive: boolean) {}

  static create(input: unknown): [string?, SetSupplierActiveRequestDto?] {
    const value = (input as Record<string, unknown> | null)?.isActive;
    if (typeof value !== "boolean") return ["isActive must be boolean."];
    return [, new SetSupplierActiveRequestDto(value)];
  }
}

export class SyncErpSupplierRequestDto {
  private constructor(public readonly erpCode: string) {}

  static create(input: unknown): [string?, SyncErpSupplierRequestDto?] {
    const value = (input as Record<string, unknown> | null)?.erpCode;
    const erpCode = typeof value === "string" ? value.trim().toUpperCase() : "";
    if (!erpCode || !erpCode.startsWith("3")) return ["A valid ERP supplier code is required."];
    return [, new SyncErpSupplierRequestDto(erpCode)];
  }
}
