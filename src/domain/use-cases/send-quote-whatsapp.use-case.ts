import type { UserRole } from "../../infrastructure/database/generated/enums";
import type { QuoteMessagingPort } from "../contracts/quote-messaging.port";
import type { QuoteDocumentLinkPort } from "../contracts/quote-document-link.port";
import type { UploadedFileInput, FileAttachmentsUseCase } from "./file-attachments.use-case";
import type { CustomerRepository } from "../repositories/customer.repository";
import type { QuoteRepository } from "../repositories/quote.repository";

interface SendQuoteWhatsAppActor {
  id: string;
  role: UserRole;
  branchId: string;
}

interface SendQuoteWhatsAppInput {
  quoteId: string;
  contactId?: string;
  file: UploadedFileInput;
  actor: SendQuoteWhatsAppActor;
}

export interface SendQuoteWhatsAppResult {
  providerMessageId: string;
  status: "QUEUED" | "SENT";
  recipient: string;
  contactName: string;
  sellerName: string;
  attachmentId: string;
}

export class SendQuoteWhatsAppUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly attachments: FileAttachmentsUseCase,
    private readonly messaging: QuoteMessagingPort,
    private readonly documentLinks: QuoteDocumentLinkPort,
  ) {}

  async execute(input: SendQuoteWhatsAppInput): Promise<SendQuoteWhatsAppResult> {
    const scope = { role: input.actor.role, userId: input.actor.id, branchId: input.actor.branchId };
    const quote = await this.quoteRepository.findById({ id: input.quoteId, scope });
    if (!quote) throw new Error("Quote not found.");
    if (quote.archivedAt) throw new Error("Archived quotes are read-only.");
    if (!["QUOTED", "APPROVED"].includes(quote.status)) {
      throw new Error("Quote must be QUOTED or APPROVED to send it by WhatsApp.");
    }
    if (quote.nextRevision && ["DRAFT", "PENDING", "PENDING_APPROVAL", "CHANGES_REQUESTED"].includes(quote.nextRevision.status)) {
      throw new Error("Quote cannot be sent while a revision is in progress.");
    }

    const contacts = await this.customerRepository.findContacts({
      customerId: quote.customerId,
      scope: { role: input.actor.role, branchId: input.actor.branchId },
    });
    const selectedContact = input.contactId
      ? contacts.find((contact) => contact.id === input.contactId)
      : quote.customerContactId
        ? contacts.find((contact) => contact.id === quote.customerContactId)
        : undefined;
    if (input.contactId && !selectedContact) throw new Error("Customer contact not found.");

    const rawRecipient = selectedContact?.mobile || selectedContact?.phone || quote.customer.whatsapp;
    const recipient = this.normalizePhone(rawRecipient);
    if (!recipient) throw new Error("The selected customer contact does not have a valid WhatsApp number.");

    const contactName = selectedContact?.name.trim() || quote.customer.displayName.trim() || "Cliente";
    const sellerName = `${quote.createdByUser.firstName} ${quote.createdByUser.lastName}`.trim();
    const attachment = await this.attachments.uploadCustomerQuotePdf(input.quoteId, input.file, input.actor);
    const documentUrl = this.documentLinks.create(attachment.id);

    try {
      const message = await this.messaging.sendWhatsAppQuote({
        recipient,
        contactName,
        sellerName,
        quoteNumber: quote.quoteNumber,
        documentUrl,
      });
      await this.quoteRepository.recordDeliveryAttempt({
        id: quote.id,
        actorUserId: input.actor.id,
        scope,
        data: {
          channel: "WHATSAPP",
          recipient,
          status: message.status,
          providerMessageId: message.providerMessageId,
          fileAssetId: attachment.id,
          customerContactId: selectedContact?.id ?? null,
          templateSid: message.templateSid,
          errorMessage: null,
          note: `Cotización ${quote.quoteNumber} enviada por WhatsApp por ${sellerName}.`,
          sentAt: new Date(),
        },
      });
      return {
        providerMessageId: message.providerMessageId,
        status: message.status,
        recipient,
        contactName,
        sellerName,
        attachmentId: attachment.id,
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.slice(0, 1000) : "Unknown Twilio error.";
      await this.quoteRepository.recordDeliveryAttempt({
        id: quote.id,
        actorUserId: input.actor.id,
        scope,
        data: {
          channel: "WHATSAPP",
          recipient,
          status: "FAILED",
          providerMessageId: null,
          fileAssetId: attachment.id,
          customerContactId: selectedContact?.id ?? null,
          templateSid: null,
          errorMessage,
          note: `Falló el envío por WhatsApp de la cotización ${quote.quoteNumber}: ${errorMessage}`,
          sentAt: new Date(),
        },
      }).catch(() => undefined);
      throw error;
    }
  }

  private normalizePhone(value: string | null | undefined): string | null {
    let digits = `${value ?? ""}`.replace(/\D/g, "");
    if (digits.length === 13 && digits.startsWith("521")) digits = `52${digits.slice(3)}`;
    if (digits.length === 10) digits = `52${digits}`;
    if (digits.length < 11 || digits.length > 15) return null;
    return `+${digits}`;
  }
}
