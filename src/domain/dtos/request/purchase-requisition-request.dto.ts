import type {
  Currency,
  PurchaseCostSource,
  PurchaseOfferSource,
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
      quotationOwner?: PurchaseOfferSource;
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
      const allowed: PurchaseCostSource[] = ["ERP_COST", "SELLER_SUPPLIER_QUOTE", "PRICE_LIST", "ESTIMATED"];
      if (!allowed.includes(body.sellerCostSource as PurchaseCostSource)) return ["sellerCostSource is invalid."];
      data.sellerCostSource = body.sellerCostSource as PurchaseCostSource;
    }
    if (body.quotationOwner !== undefined) {
      if (body.quotationOwner !== "SELLER" && body.quotationOwner !== "PURCHASING") return ["quotationOwner is invalid."];
      data.quotationOwner = body.quotationOwner;
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

export class UpdatePurchaseRequisitionDocumentRequestDto {
  private constructor(public readonly data: {
    supplierOrderReference?: string | null;
    shipmentReference?: string | null;
    fobTerms?: string | null;
    paymentTerms?: string | null;
    qualityCertificatesRequired?: boolean;
    markingInstructions?: string | null;
  }) {}

  static create(input: unknown): [string?, UpdatePurchaseRequisitionDocumentRequestDto?] {
    if (!input || typeof input !== "object" || Array.isArray(input)) return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    const limits = {
      supplierOrderReference: 120,
      shipmentReference: 120,
      fobTerms: 255,
      paymentTerms: 255,
      markingInstructions: 500,
    } as const;
    const data: UpdatePurchaseRequisitionDocumentRequestDto["data"] = {};
    for (const [key, limit] of Object.entries(limits)) {
      if (body[key] === undefined) continue;
      if (body[key] !== null && typeof body[key] !== "string") return [`${key} is invalid.`];
      const value = typeof body[key] === "string" ? body[key].trim() : null;
      if (value && value.length > limit) return [`${key} must not exceed ${limit} characters.`];
      data[key as keyof typeof limits] = value || null;
    }
    if (body.qualityCertificatesRequired !== undefined) {
      if (typeof body.qualityCertificatesRequired !== "boolean") return ["qualityCertificatesRequired is invalid."];
      data.qualityCertificatesRequired = body.qualityCertificatesRequired;
    }
    if (Object.keys(data).length === 0) return ["At least one field is required."];
    return [, new UpdatePurchaseRequisitionDocumentRequestDto(data)];
  }
}

export class UpdatePurchaseSupplierCodeRequestDto {
  private constructor(public readonly supplierProductCode: string | null) {}

  static create(input: unknown): [string?, UpdatePurchaseSupplierCodeRequestDto?] {
    if (!input || typeof input !== "object" || Array.isArray(input)) return ["Invalid request body."];
    const body = input as Record<string, unknown>;
    if (!Object.hasOwn(body, "supplierProductCode")) return ["supplierProductCode is required."];
    const value = body.supplierProductCode;
    if (value !== null && typeof value !== "string") return ["supplierProductCode is invalid."];
    const code = typeof value === "string" ? value.trim().toUpperCase() : null;
    if (code && code.length > 120) return ["supplierProductCode must not exceed 120 characters."];
    return [, new UpdatePurchaseSupplierCodeRequestDto(code || null)];
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

export class SendUnquotedRequisitionRequestDto {
  constructor(public readonly itemIds: string[], public readonly buyerUserId: string) {}

  static create(input: unknown): [string?, SendUnquotedRequisitionRequestDto?] {
    const body = input as Record<string, unknown> | null;
    const itemIds = body?.itemIds;
    const buyerUserId = body?.buyerUserId;
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!Array.isArray(itemIds) || itemIds.length === 0) return ["Selecciona al menos una partida."];
    if (itemIds.length > 500) return ["Selecciona un máximo de 500 partidas por solicitud."];
    if (itemIds.some((id) => typeof id !== "string" || !uuid.test(id))) return ["La selección contiene una partida sin identificador válido. Actualiza la cotización y vuelve a intentarlo."];
    if (new Set(itemIds).size !== itemIds.length) return ["La selección contiene partidas duplicadas."];
    if (typeof buyerUserId !== "string" || !uuid.test(buyerUserId)) return ["Selecciona un responsable de Compras válido."];
    return [, new SendUnquotedRequisitionRequestDto(itemIds, buyerUserId)];
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
    if (!optionalText(body.origin)) return ["origin is required for supplier offers."];
    if (!optionalText(body.deliveryTime)) return ["deliveryTime is required for supplier offers."];
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

export class CreatePurchaseSupplierOffersBatchRequestDto {
  constructor(public readonly offers: Array<{
    itemId: string;
    offer: CreatePurchaseSupplierOfferRequestDto;
    itemDetails?: Pick<UpdatePurchaseRequisitionItemRequestDto["data"],
      "standard" | "diameter" | "thickness" | "bore" | "technicalFamily" | "technicalAttributes" | "originRestrictions">;
  }>, public readonly deliveryState: string | null) {}

  static create(input: unknown): [string?, CreatePurchaseSupplierOffersBatchRequestDto?] {
    if (!input || typeof input !== "object" || !Array.isArray((input as { offers?: unknown }).offers)) return ["offers must be an array."];
    const rows = (input as { offers: unknown[] }).offers;
    if (rows.length < 1 || rows.length > 100) return ["Selecciona entre 1 y 100 partidas."];
    const offers: CreatePurchaseSupplierOffersBatchRequestDto["offers"] = [];
    for (const [index, row] of rows.entries()) {
      if (!row || typeof row !== "object") return [`Partida ${index + 1}: datos inválidos.`];
      const itemId = typeof (row as { itemId?: unknown }).itemId === "string" ? (row as { itemId: string }).itemId.trim() : "";
      if (!itemId) return [`Partida ${index + 1}: itemId es obligatorio.`];
      const [error, offer] = CreatePurchaseSupplierOfferRequestDto.create(row);
      if (error || !offer) return [`Partida ${index + 1}: ${error || "datos inválidos."}`];
      const rawDetails = (row as { itemDetails?: unknown }).itemDetails;
      let itemDetails: CreatePurchaseSupplierOffersBatchRequestDto["offers"][number]["itemDetails"];
      if (rawDetails !== undefined) {
        const [detailsError, parsed] = UpdatePurchaseRequisitionItemRequestDto.create(rawDetails);
        if (detailsError || !parsed) return [`Partida ${index + 1}: ${detailsError || "datos técnicos inválidos."}`];
        itemDetails = {
          standard: parsed.data.standard, diameter: parsed.data.diameter,
          thickness: parsed.data.thickness, bore: parsed.data.bore,
          technicalFamily: parsed.data.technicalFamily,
          technicalAttributes: parsed.data.technicalAttributes,
          originRestrictions: parsed.data.originRestrictions,
        };
      }
      offers.push({ itemId, offer, itemDetails });
    }
    if (new Set(offers.map(({ itemId }) => itemId)).size !== offers.length) return ["No repitas partidas en el lote."];
    if (new Set(offers.map(({ offer }) => offer.supplierId)).size !== 1) return ["Todas las partidas deben tener el mismo proveedor."];
    if (new Set(offers.map(({ offer }) => offer.currency)).size !== 1) return ["La cotización del proveedor debe usar una sola moneda."];
    if (new Set(offers.map(({ offer }) => offer.exchangeRate)).size !== 1) return ["Usa el mismo tipo de cambio en todas las partidas."];
    if (new Set(offers.map(({ offer }) => offer.taxRate)).size !== 1) return ["Usa la misma tasa de IVA en todas las partidas."];
    const header = offers[0].offer;
    for (const { offer } of offers.slice(1)) {
      if (offer.quoteDate.getTime() !== header.quoteDate.getTime()
        || offer.validUntil?.getTime() !== header.validUntil?.getTime()
        || offer.externalReference !== header.externalReference
        || offer.paymentTerms !== header.paymentTerms
        || offer.deliveryTerms !== header.deliveryTerms
        || offer.documentSubtotal !== header.documentSubtotal
        || offer.documentDiscount !== header.documentDiscount
        || offer.documentFreight !== header.documentFreight
        || offer.documentOtherCharges !== header.documentOtherCharges
        || offer.taxIncluded !== header.taxIncluded
        || offer.documentTax !== header.documentTax
        || offer.documentTotal !== header.documentTotal) return ["Los datos generales de la cotización deben coincidir en todo el lote."];
    }
    return [, new CreatePurchaseSupplierOffersBatchRequestDto(offers, optionalText((input as Record<string, unknown>).deliveryState) ?? null)];
  }
}

export class UpdatePurchaseSupplierOffersBatchRequestDto {
  constructor(
    public readonly offers: Array<CreatePurchaseSupplierOffersBatchRequestDto["offers"][number] & { offerId: string | null }>,
    public readonly deliveryState: string | null,
  ) {}

  static create(input: unknown): [string?, UpdatePurchaseSupplierOffersBatchRequestDto?] {
    const [error, batch] = CreatePurchaseSupplierOffersBatchRequestDto.create(input);
    if (error || !batch) return [error || "Datos del lote inválidos."];
    const rows = (input as { offers: Array<{ offerId?: unknown }> }).offers;
    const offers: UpdatePurchaseSupplierOffersBatchRequestDto["offers"] = [];
    for (const [index, row] of rows.entries()) {
      if (row.offerId !== undefined && (typeof row.offerId !== "string" || !row.offerId.trim())) {
        return [`Partida ${index + 1}: offerId no es válido.`];
      }
      offers.push({ ...batch.offers[index], offerId: typeof row.offerId === "string" ? row.offerId.trim() : null });
    }
    const existingIds = offers.flatMap(({ offerId }) => offerId ? [offerId] : []);
    if (new Set(existingIds).size !== existingIds.length) return ["No repitas propuestas existentes en el lote."];
    return [, new UpdatePurchaseSupplierOffersBatchRequestDto(offers, batch.deliveryState)];
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
      contactKey: string;
      channel: SupplierContactChannel;
      value: string;
      normalizedValue: string;
      phoneKind: SupplierPhoneKind | null;
      extension: string | null;
      isWhatsApp: boolean;
      contactName: string | null;
      contactPosition: string | null;
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
      incomingContacts.push({ contactKey: "primary", channel: "EMAIL", value: email, contactName: body.contactName, contactPosition: body.contactPosition, isPrimary: true });
    }
    if (!incomingContacts.some((value) => (value as Record<string, unknown> | null)?.channel === "PHONE") && phone) {
      incomingContacts.push({ contactKey: "primary", channel: "PHONE", value: phone, phoneKind: "UNKNOWN", contactName: body.contactName, contactPosition: body.contactPosition, isPrimary: true });
    }
    const contacts: SaveSupplierRequestDto["contacts"] = [];
    const seenContacts = new Set<string>();
    for (const [index, value] of incomingContacts.entries()) {
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
        contactKey: (optionalText(contact.contactKey) ?? `contact-${index + 1}`).slice(0, 60),
        channel,
        value: channel === "EMAIL" ? normalized : contactValue,
        normalizedValue: normalized,
        phoneKind,
        extension: channel === "PHONE" ? normalizedPhone!.extension : null,
        isWhatsApp: channel === "PHONE" && contact.isWhatsApp === true,
        contactName: optionalText(contact.contactName) ?? null,
        contactPosition: optionalText(contact.contactPosition) ?? null,
        label: optionalText(contact.label) ?? null,
        isPrimary: contact.isPrimary === true,
      });
    }
    const primaryContactKey = contacts.find((contact) => contact.isPrimary)?.contactKey ?? contacts[0]?.contactKey;
    contacts.forEach((contact) => {
      contact.isPrimary = contact.contactKey === primaryContactKey;
    });
    const primaryEmail = contacts.find((contact) => contact.channel === "EMAIL" && contact.isPrimary)?.normalizedValue
      ?? contacts.find((contact) => contact.channel === "EMAIL")?.normalizedValue
      ?? null;
    const primaryPhone = contacts.find((contact) => contact.channel === "PHONE" && contact.isPrimary)?.normalizedValue
      ?? contacts.find((contact) => contact.channel === "PHONE")?.normalizedValue
      ?? null;
    const primaryContact = contacts.find((contact) => contact.isPrimary && contact.contactName)
      ?? contacts.find((contact) => contact.contactName);
    return [, new SaveSupplierRequestDto(
      name,
      scope,
      optionalText(body.taxId)?.toUpperCase() ?? null,
      optionalText(body.state)?.toUpperCase() ?? null,
      country,
      primaryContact?.contactName ?? optionalText(body.contactName) ?? null,
      primaryContact?.contactPosition ?? optionalText(body.contactPosition) ?? null,
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
