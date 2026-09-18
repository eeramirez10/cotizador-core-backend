import type { UserRole } from "../../infrastructure/database/generated/enums";
import type { QuoteMessagingPort } from "../contracts/quote-messaging.port";
import type { QuoteDocumentLinkPort } from "../contracts/quote-document-link.port";
import type { UploadedFileInput, FileAttachmentsUseCase } from "./file-attachments.use-case";
import type { CustomerRepository } from "../repositories/customer.repository";
import type { QuoteRepository } from "../repositories/quote.repository";
import { WhatsAppPhone } from "../utils/whatsapp-phone";
import type { WhatsAppInboxRepository } from "../repositories/whatsapp-inbox.repository";
import type {
  GetWhatsAppConversationWindowUseCase,
  WhatsAppDeliveryMode,
} from "./get-whatsapp-conversation-window.use-case";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";

interface SendQuoteWhatsAppActor {
  id: string;
  role: UserRole;
  branchId: string;
}

interface SendQuoteWhatsAppInput {
  quoteId: string;
  contactId?: string;
  message: string;
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
  deliveryMode: WhatsAppDeliveryMode;
}

export class SendQuoteWhatsAppUseCase {
  constructor(
    private readonly quoteRepository: QuoteRepository,
    private readonly customerRepository: CustomerRepository,
    private readonly attachments: FileAttachmentsUseCase,
    private readonly messaging: QuoteMessagingPort,
    private readonly documentLinks: QuoteDocumentLinkPort,
    private readonly conversationWindow: GetWhatsAppConversationWindowUseCase,
    private readonly inboxRepository: WhatsAppInboxRepository,
    private readonly businessPhone: string,
    private readonly realtime?: WhatsAppRealtimePublisher,
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

    const rawRecipient = selectedContact?.mobile
      || selectedContact?.phone
      || quote.customerContact?.mobile
      || quote.customerContact?.phone
      || quote.customer.whatsapp;
    const recipient = WhatsAppPhone.create(rawRecipient)?.value;
    if (!recipient) throw new Error("The selected customer contact does not have a valid WhatsApp number.");

    const contactName = selectedContact?.name.trim()
      || quote.customerContact?.name.trim()
      || quote.customer.displayName.trim()
      || "Cliente";
    const sellerName = `${quote.createdByUser.firstName} ${quote.createdByUser.lastName}`.trim();
    const window = await this.conversationWindow.execute(recipient);
    const attachment = await this.attachments.uploadCustomerQuotePdf(input.quoteId, input.file, input.actor);
    const documentToken = this.documentLinks.createToken(attachment.id);

    try {
      const message = await this.messaging.sendWhatsAppQuote({
        recipient,
        contactName,
        sellerName,
        quoteNumber: quote.quoteNumber,
        documentToken,
        messageBody: input.message,
        deliveryMode: window.deliveryMode,
      });
      const sentAt = new Date();
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
          note: input.message,
          sentAt,
        },
      });
      const normalizedBusinessPhone = WhatsAppPhone.create(this.businessPhone)?.value;
      if (normalizedBusinessPhone) {
        const registered = await this.inboxRepository.registerQuoteDelivery({
          businessPhoneE164: normalizedBusinessPhone,
          participantPhoneE164: recipient,
          providerMessageId: message.providerMessageId,
          status: message.status,
          body: input.message,
          sentAt,
          sentByUserId: input.actor.id,
          ownerUserId: quote.createdByUserId,
          branchId: quote.branchId,
          customerId: quote.customerId,
          customerContactId: selectedContact?.id ?? null,
          quoteId: quote.id,
          fileAssetId: attachment.id,
        }).catch((error) => {
          console.error("whatsapp_inbox_quote_delivery_sync_failed", error);
          return null;
        });
        if (registered) {
          void this.realtime?.publish({
            type: "WHATSAPP_CONVERSATION_CHANGED",
            conversationId: registered.conversationId,
            reason: "QUOTE_SENT",
            occurredAt: sentAt.toISOString(),
            message: {
              id: registered.messageId,
              conversationId: registered.conversationId,
              direction: "OUTBOUND",
              authorType: "USER",
              authorName: sellerName,
              body: input.message,
              messageType: "QUOTE_DOCUMENT",
              status: message.status,
              occurredAt: sentAt.toISOString(),
              quote: { id: quote.id, quoteNumber: quote.quoteNumber, status: quote.status },
              fileAssetId: attachment.id,
              attachments: [],
            },
            conversation: {
              lastMessage: input.message,
              lastMessageAt: sentAt.toISOString(),
            },
          });
        }
      }
      return {
        providerMessageId: message.providerMessageId,
        status: message.status,
        recipient,
        contactName,
        sellerName,
        attachmentId: attachment.id,
        deliveryMode: message.deliveryMode,
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

}
