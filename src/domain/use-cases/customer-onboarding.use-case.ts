import type { CustomerOnboardingStatus, UserRole } from "../../infrastructure/database/generated/enums";
import { prisma } from "../../infrastructure/database/prisma-client";
import type { CustomerTaxDocumentExtractorPort, ExtractedCustomerTaxDocument } from "../contracts/customer-tax-document-extractor.port";
import type { FileStoragePort } from "../contracts/file-storage.port";

export interface CustomerOnboardingActor {
  id: string;
  role: UserRole;
  branchId: string;
}

export interface CustomerOnboardingWriteInput {
  legalName?: string | null;
  taxId?: string | null;
  taxRegime?: string | null;
  cfdiUse?: string | null;
  billingStreet?: string | null;
  billingExteriorNumber?: string | null;
  billingInteriorNumber?: string | null;
  billingNeighborhood?: string | null;
  billingCity?: string | null;
  billingState?: string | null;
  billingPostalCode?: string | null;
  billingCountry?: string | null;
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactWhatsapp?: string | null;
}

export interface CustomerTaxDocumentUpload {
  content: Uint8Array;
  originalName: string;
  mimeType: string;
}

const detailInclude = {
  customer: { select: { id: true, source: true, displayName: true, legalName: true, profileStatus: true } },
  acceptedQuote: { select: { id: true, quoteNumber: true, status: true } },
  seller: { select: { id: true, firstName: true, lastName: true } },
  branch: { select: { id: true, name: true } },
  taxDocumentAttachment: { select: { id: true, originalName: true, mimeType: true, createdAt: true } },
};

export class CustomerOnboardingUseCase {
  constructor(
    private readonly storage?: FileStoragePort,
    private readonly taxDocumentExtractor?: CustomerTaxDocumentExtractorPort,
  ) {}

  async createManual(customerId: string, actor: CustomerOnboardingActor) {
    const existing = await prisma.customerOnboarding.findUnique({
      where: { customerId },
      include: detailInclude,
    });
    if (existing) {
      const accessible = await prisma.customerOnboarding.findFirst({
        where: { id: existing.id, ...this.scope(actor) },
        select: { id: true },
      });
      if (!accessible) throw new Error("CUSTOMER_ONBOARDING_NOT_FOUND");
      return this.toResponse(existing);
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: customerId,
        isActive: true,
        source: "LOCAL",
        ...(actor.role === "ADMIN" ? {} : {
          createdByUser: { is: { branchId: actor.branchId } },
        }),
      },
      include: {
        createdByUser: { select: { id: true, branchId: true } },
        contacts: { orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }], take: 1 },
      },
    });
    if (!customer) throw new Error("CUSTOMER_NOT_AVAILABLE_FOR_ONBOARDING");

    const contact = customer.contacts[0];
    const row = await prisma.customerOnboarding.create({
      data: {
        customerId: customer.id,
        sellerId: actor.role === "SELLER" ? actor.id : customer.createdByUser?.id || actor.id,
        branchId: customer.createdByUser?.branchId || actor.branchId,
        source: "MANUAL",
        legalName: customer.legalName,
        taxId: customer.taxId,
        taxRegime: customer.taxRegime,
        billingStreet: customer.billingStreet,
        billingExteriorNumber: customer.billingExteriorNumber,
        billingInteriorNumber: customer.billingInteriorNumber,
        billingNeighborhood: customer.billingNeighborhood,
        billingCity: customer.billingCity,
        billingState: customer.billingState,
        billingPostalCode: customer.billingPostalCode,
        billingCountry: customer.billingCountry || "MÉXICO",
        contactName: contact?.name || customer.displayName,
        contactEmail: contact?.email || customer.email,
        contactPhone: contact?.phone || customer.phone,
        contactWhatsapp: contact?.mobile || customer.whatsapp,
      },
      include: detailInclude,
    });
    const normalized = this.missingFields(row).length === 0
      ? await prisma.customerOnboarding.update({ where: { id: row.id }, data: { status: "PENDING_REVIEW" }, include: detailInclude })
      : row;
    return this.toResponse(normalized);
  }

  async ensureAfterAcceptance(quoteId: string, conversationId: string) {
    const quote = await prisma.quote.findUnique({
      where: { id: quoteId },
      select: {
        id: true, customerId: true, createdByUserId: true, branchId: true,
        customer: true,
        customerContact: true,
      },
    });
    if (!quote || quote.customer.source !== "LOCAL" || quote.customer.profileStatus === "FISCAL_COMPLETED") return null;

    const row = await prisma.customerOnboarding.upsert({
      where: { customerId: quote.customerId },
      create: {
        customerId: quote.customerId,
        acceptedQuoteId: quote.id,
        conversationId,
        sellerId: quote.createdByUserId,
        branchId: quote.branchId,
        legalName: quote.customer.legalName,
        taxId: quote.customer.taxId,
        taxRegime: quote.customer.taxRegime,
        billingStreet: quote.customer.billingStreet,
        billingExteriorNumber: quote.customer.billingExteriorNumber,
        billingInteriorNumber: quote.customer.billingInteriorNumber,
        billingNeighborhood: quote.customer.billingNeighborhood,
        billingCity: quote.customer.billingCity,
        billingState: quote.customer.billingState,
        billingPostalCode: quote.customer.billingPostalCode,
        billingCountry: quote.customer.billingCountry || "MÉXICO",
        contactName: quote.customerContact?.name || quote.customer.displayName,
        contactEmail: quote.customerContact?.email || quote.customer.email,
        contactPhone: quote.customerContact?.phone || quote.customer.phone,
        contactWhatsapp: quote.customerContact?.mobile || quote.customer.whatsapp,
      },
      update: {
        acceptedQuoteId: quote.id,
        conversationId,
        sellerId: quote.createdByUserId,
        branchId: quote.branchId,
      },
      include: detailInclude,
    });
    return this.toResponse(row);
  }

  async list(actor: CustomerOnboardingActor, input: { status?: CustomerOnboardingStatus; page: number; pageSize: number }) {
    const where = { ...this.scope(actor), ...(input.status ? { status: input.status } : {}) };
    const [total, rows] = await prisma.$transaction([
      prisma.customerOnboarding.count({ where }),
      prisma.customerOnboarding.findMany({
        where,
        include: detailInclude,
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: (input.page - 1) * input.pageSize,
        take: input.pageSize,
      }),
    ]);
    return { items: rows.map((row) => this.toResponse(row)), total, page: input.page, pageSize: input.pageSize };
  }

  async get(id: string, actor: CustomerOnboardingActor) {
    const row = await prisma.customerOnboarding.findFirst({ where: { id, ...this.scope(actor) }, include: detailInclude });
    if (!row) throw new Error("CUSTOMER_ONBOARDING_NOT_FOUND");
    return this.toResponse(row);
  }

  async getForConversation(conversationId: string) {
    const row = await prisma.customerOnboarding.findUnique({ where: { conversationId }, include: detailInclude });
    return row?.customer.source === "LOCAL" ? { exists: true, onboarding: this.toResponse(row) } : { exists: false };
  }

  async getForConversationAsActor(conversationId: string, actor: CustomerOnboardingActor) {
    const row = await prisma.customerOnboarding.findFirst({
      where: { conversationId, ...this.scope(actor), customer: { source: "LOCAL" } },
      include: detailInclude,
    });
    return row ? { exists: true, onboarding: this.toResponse(row) } : { exists: false };
  }

  async update(id: string, input: CustomerOnboardingWriteInput, actor: CustomerOnboardingActor) {
    const existing = await this.get(id, actor);
    if (actor.role !== "ADMIN" && !["COLLECTING", "PENDING_REVIEW"].includes(existing.status)) {
      throw new Error("CUSTOMER_ONBOARDING_LOCKED");
    }
    return this.updateRow(id, input);
  }

  async updateFromAssistant(conversationId: string, input: CustomerOnboardingWriteInput) {
    const existing = await prisma.customerOnboarding.findUnique({ where: { conversationId }, select: { id: true, status: true } });
    if (!existing) return { error: "CUSTOMER_ONBOARDING_NOT_FOUND" };
    if (!["COLLECTING", "PENDING_REVIEW"].includes(existing.status)) return { error: "CUSTOMER_ONBOARDING_LOCKED" };
    const incremental = Object.fromEntries(Object.entries(input).filter(([, value]) => typeof value === "string" && value.trim()));
    return { success: true, onboarding: await this.updateRow(existing.id, incremental) };
  }

  async uploadTaxDocument(id: string, file: CustomerTaxDocumentUpload, actor: CustomerOnboardingActor) {
    if (!this.storage || !this.taxDocumentExtractor) throw new Error("TAX_DOCUMENT_EXTRACTION_NOT_CONFIGURED");
    const existing = await this.get(id, actor);
    if (actor.role !== "ADMIN" && !["COLLECTING", "PENDING_REVIEW"].includes(existing.status)) {
      throw new Error("CUSTOMER_ONBOARDING_LOCKED");
    }
    this.assertPdf(file);
    const saved = await this.storage.save(file);
    try {
      const extraction = await this.taxDocumentExtractor.extract(file);
      const previous = await prisma.customerOnboarding.findUnique({ where: { id }, select: { taxDocumentStorageKey: true } });
      const response = await this.applyExtraction(id, extraction, {
        taxDocumentStorageKey: saved.storageKey,
        taxDocumentOriginalName: file.originalName,
        taxDocumentMimeType: file.mimeType,
        taxDocumentAttachmentId: null,
      });
      if (previous?.taxDocumentStorageKey) await this.storage.delete(previous.taxDocumentStorageKey);
      return response;
    } catch (error) {
      await this.storage.delete(saved.storageKey);
      throw error;
    }
  }

  async processWhatsAppTaxDocument(conversationId: string, attachmentId: string, actor?: CustomerOnboardingActor) {
    if (!this.storage || !this.taxDocumentExtractor) return { error: "TAX_DOCUMENT_EXTRACTION_NOT_CONFIGURED" };
    const onboarding = await prisma.customerOnboarding.findFirst({
      where: { conversationId, customer: { source: "LOCAL" }, ...(actor ? this.scope(actor) : {}) },
      select: { id: true, status: true },
    });
    if (!onboarding) return { error: "CUSTOMER_ONBOARDING_NOT_FOUND" };
    if (!["COLLECTING", "PENDING_REVIEW"].includes(onboarding.status)) return { error: "CUSTOMER_ONBOARDING_LOCKED" };
    const attachment = await prisma.whatsAppInboundAttachment.findFirst({
      where: { id: attachmentId, inboundMessage: { conversationId } },
      select: { id: true, originalName: true, mimeType: true, storageKey: true },
    });
    if (!attachment) return { error: "ATTACHMENT_NOT_FOUND" };
    this.assertPdf({ originalName: attachment.originalName, mimeType: attachment.mimeType });
    const stored = await this.storage.read(attachment.storageKey);
    if (!stored) return { error: "ATTACHMENT_FILE_NOT_FOUND" };
    const extraction = await this.taxDocumentExtractor.extract({
      content: stored.content, originalName: attachment.originalName, mimeType: attachment.mimeType,
    });
    const response = await this.applyExtraction(onboarding.id, extraction, {
      taxDocumentAttachmentId: attachment.id,
      taxDocumentStorageKey: null,
      taxDocumentOriginalName: attachment.originalName,
      taxDocumentMimeType: attachment.mimeType,
    });
    return { success: true, onboarding: response };
  }

  async downloadTaxDocument(id: string, actor: CustomerOnboardingActor) {
    if (!this.storage) throw new Error("TAX_DOCUMENT_STORAGE_NOT_CONFIGURED");
    const row = await prisma.customerOnboarding.findFirst({
      where: { id, ...this.scope(actor) },
      select: {
        taxDocumentStorageKey: true, taxDocumentOriginalName: true, taxDocumentMimeType: true,
        taxDocumentAttachment: { select: { storageKey: true, originalName: true, mimeType: true } },
      },
    });
    if (!row) throw new Error("CUSTOMER_ONBOARDING_NOT_FOUND");
    const storageKey = row.taxDocumentStorageKey || row.taxDocumentAttachment?.storageKey;
    if (!storageKey) throw new Error("TAX_DOCUMENT_NOT_FOUND");
    const stored = await this.storage.read(storageKey);
    if (!stored) throw new Error("TAX_DOCUMENT_NOT_FOUND");
    return {
      content: stored.content,
      originalName: row.taxDocumentOriginalName || row.taxDocumentAttachment?.originalName || "constancia-fiscal.pdf",
      mimeType: row.taxDocumentMimeType || row.taxDocumentAttachment?.mimeType || "application/pdf",
    };
  }

  async submitForCxc(id: string, actor: CustomerOnboardingActor) {
    const existing = await prisma.customerOnboarding.findFirst({ where: { id, ...this.scope(actor) } });
    if (!existing) throw new Error("CUSTOMER_ONBOARDING_NOT_FOUND");
    if (!["COLLECTING", "PENDING_REVIEW"].includes(existing.status)) throw new Error("CUSTOMER_ONBOARDING_LOCKED");
    const missing = this.missingFields(existing);
    if (missing.length) throw new Error(`CUSTOMER_ONBOARDING_INCOMPLETE:${missing.join(",")}`);
    const row = await prisma.customerOnboarding.update({
      where: { id }, data: { status: "PENDING_CXC", submittedAt: new Date() }, include: detailInclude,
    });
    return this.toResponse(row);
  }

  async approveForErp(id: string, actor: CustomerOnboardingActor) {
    if (actor.role !== "ADMIN") throw new Error("CUSTOMER_ONBOARDING_ADMIN_REQUIRED");
    const completed = await this.complete(id, actor);
    const row = await prisma.customerOnboarding.update({
      where: { id }, data: { status: "READY_FOR_ERP", approvedAt: new Date() }, include: detailInclude,
    });
    return { ...this.toResponse(row), customer: completed.customer };
  }

  async markErpLinked(id: string, erpCode: string, actor: CustomerOnboardingActor) {
    if (actor.role !== "ADMIN") throw new Error("CUSTOMER_ONBOARDING_ADMIN_REQUIRED");
    const existing = await prisma.customerOnboarding.findUnique({ where: { id }, select: { customerId: true, status: true } });
    if (!existing) throw new Error("CUSTOMER_ONBOARDING_NOT_FOUND");
    if (existing.status !== "READY_FOR_ERP") throw new Error("CUSTOMER_ONBOARDING_NOT_READY_FOR_ERP");
    const normalizedCode = erpCode.trim();
    if (!normalizedCode) throw new Error("ERP_CODE_REQUIRED");
    await prisma.$transaction([
      prisma.customer.update({ where: { id: existing.customerId }, data: { source: "ERP", externalSystem: "PROSCAI", externalId: normalizedCode, code: normalizedCode, updatedByUserId: actor.id } }),
      prisma.customerOnboarding.update({ where: { id }, data: { status: "ERP_LINKED", erpCode: normalizedCode, linkedAt: new Date(), reviewedByUserId: actor.id } }),
    ]);
    return this.get(id, actor);
  }

  async complete(id: string, actor: CustomerOnboardingActor) {
    const existing = await prisma.customerOnboarding.findFirst({ where: { id, ...this.scope(actor) }, include: { customer: true } });
    if (!existing) throw new Error("CUSTOMER_ONBOARDING_NOT_FOUND");
    if (existing.customer.source !== "LOCAL") throw new Error("ERP_CUSTOMER_ONBOARDING_NOT_ALLOWED");
    const missing = this.missingFields(existing);
    if (missing.length) throw new Error(`CUSTOMER_ONBOARDING_INCOMPLETE:${missing.join(",")}`);
    const duplicate = await prisma.customer.findFirst({
      where: { id: { not: existing.customerId }, taxId: existing.taxId!.trim().toUpperCase(), isActive: true },
      select: { id: true },
    });
    if (duplicate) throw new Error("CUSTOMER_TAX_ID_ALREADY_EXISTS");

    await prisma.$transaction(async (tx) => {
      await tx.customer.update({
        where: { id: existing.customerId },
        data: {
          legalName: existing.legalName,
          taxId: existing.taxId!.trim().toUpperCase(),
          taxRegime: existing.taxRegime,
          billingStreet: existing.billingStreet,
          billingExteriorNumber: existing.billingExteriorNumber,
          billingInteriorNumber: existing.billingInteriorNumber,
          billingNeighborhood: existing.billingNeighborhood,
          billingCity: existing.billingCity,
          billingState: existing.billingState,
          billingPostalCode: existing.billingPostalCode,
          billingCountry: existing.billingCountry || "MÉXICO",
          email: existing.contactEmail,
          phone: existing.contactPhone,
          whatsapp: existing.contactWhatsapp || existing.customer.whatsapp,
          profileStatus: "FISCAL_COMPLETED",
          updatedByUserId: actor.id,
        },
      });
      const contact = await tx.customerContact.findFirst({
        where: { customerId: existing.customerId },
        orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
        select: { id: true },
      });
      const contactData = {
        name: existing.contactName!, email: existing.contactEmail, phone: existing.contactPhone,
        mobile: existing.contactWhatsapp, isPrimary: true,
      };
      if (contact) await tx.customerContact.update({ where: { id: contact.id }, data: contactData });
      else await tx.customerContact.create({ data: { customerId: existing.customerId, ...contactData } });
      await tx.customerOnboarding.update({
        where: { id },
        data: { status: "COMPLETED", reviewedByUserId: actor.id, completedAt: new Date() },
      });
    });
    return this.get(id, actor);
  }

  private async updateRow(id: string, input: CustomerOnboardingWriteInput) {
    const data: Record<string, unknown> = {};
    for (const key of Object.keys(input) as Array<keyof CustomerOnboardingWriteInput>) {
      if (typeof input[key] === "undefined") continue;
      let value = typeof input[key] === "string" ? input[key]!.trim() || null : input[key];
      if (key === "taxId" && typeof value === "string") value = value.toUpperCase().replace(/\s+/g, "");
      if (key === "contactEmail" && typeof value === "string") value = value.toLowerCase();
      data[key] = value;
    }
    const row = await prisma.customerOnboarding.update({ where: { id }, data, include: detailInclude });
    const status = this.missingFields(row).length === 0 ? "PENDING_REVIEW" : "COLLECTING";
    const normalized = ["COMPLETED", "READY_FOR_ERP", "ERP_LINKED", "CANCELLED"].includes(row.status)
      ? row
      : await prisma.customerOnboarding.update({ where: { id }, data: { status }, include: detailInclude });
    return this.toResponse(normalized);
  }

  private scope(actor: CustomerOnboardingActor) {
    if (actor.role === "ADMIN") return {};
    if (actor.role === "MANAGER") return { branchId: actor.branchId };
    return { sellerId: actor.id };
  }

  private missingFields(value: CustomerOnboardingWriteInput): string[] {
    const fields: Array<[keyof CustomerOnboardingWriteInput, string]> = [
      ["legalName", "legalName"], ["taxId", "taxId"], ["taxRegime", "taxRegime"],
      ["billingPostalCode", "billingPostalCode"], ["contactName", "contactName"],
    ];
    const missing = fields.filter(([key]) => !this.text(value[key])).map(([, label]) => label);
    if (!this.text(value.contactEmail) && !this.text(value.contactWhatsapp)) missing.push("contactEmailOrWhatsapp");
    return missing;
  }

  private toResponse(row: any) {
    return {
      ...row,
      extractionConfidence: row.extractionConfidence === null ? null : Number(row.extractionConfidence),
      missingFields: this.missingFields(row),
      seller: row.seller ? { ...row.seller, name: `${row.seller.firstName} ${row.seller.lastName}`.trim() } : null,
    };
  }

  private async applyExtraction(
    id: string,
    extraction: ExtractedCustomerTaxDocument,
    document: {
      taxDocumentAttachmentId: string | null;
      taxDocumentStorageKey: string | null;
      taxDocumentOriginalName: string;
      taxDocumentMimeType: string;
    },
  ) {
    const contact = extraction.contacts?.[0];
    const row = await prisma.customerOnboarding.update({
      where: { id },
      data: {
        ...document,
        legalName: extraction.businessName || undefined,
        taxId: extraction.taxId?.toUpperCase().replace(/\s+/g, "") || undefined,
        taxRegime: extraction.taxRegime || undefined,
        billingStreet: extraction.address?.street || undefined,
        billingExteriorNumber: extraction.address?.exteriorNumber || undefined,
        billingInteriorNumber: extraction.address?.interiorNumber || undefined,
        billingNeighborhood: extraction.address?.neighborhood || undefined,
        billingCity: extraction.address?.city || undefined,
        billingState: extraction.address?.state || undefined,
        billingPostalCode: extraction.address?.postalCode || undefined,
        billingCountry: extraction.address?.country || undefined,
        contactName: contact?.name || undefined,
        contactEmail: contact?.email?.toLowerCase() || undefined,
        contactPhone: contact?.landlinePhone || undefined,
        contactWhatsapp: contact?.whatsappPhone || undefined,
        extractionConfidence: extraction.confidence,
        extractionEvidence: extraction.evidence,
      },
      include: detailInclude,
    });
    const status = this.missingFields(row).length === 0 ? "PENDING_REVIEW" : "COLLECTING";
    const normalized = await prisma.customerOnboarding.update({ where: { id }, data: { status }, include: detailInclude });
    return this.toResponse(normalized);
  }

  private assertPdf(file: Pick<CustomerTaxDocumentUpload, "originalName" | "mimeType">): void {
    if (file.mimeType !== "application/pdf" && !file.originalName.toLowerCase().endsWith(".pdf")) {
      throw new Error("TAX_DOCUMENT_MUST_BE_PDF");
    }
  }

  private text(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.replace(/\s+/g, " ").trim() : null;
  }
}
