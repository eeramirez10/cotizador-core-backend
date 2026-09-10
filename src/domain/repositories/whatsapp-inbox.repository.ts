import type { WhatsAppConversationMode, WhatsAppOutboundMessageStatus } from "../../infrastructure/database/generated/enums";
import type {
  RegisterWhatsAppQuoteDeliveryInput,
  WhatsAppInboxActor,
  WhatsAppInboxConversation,
  WhatsAppInboxConversationPage,
  WhatsAppInboxMessage,
  WhatsAppInboxMessagePage,
} from "../entities/whatsapp-inbox.entity";

export abstract class WhatsAppInboxRepository {
  abstract listConversations(input: {
    actor: WhatsAppInboxActor;
    search?: string;
    cursor?: string;
    pageSize: number;
  }): Promise<WhatsAppInboxConversationPage>;

  abstract findConversation(input: {
    conversationId: string;
    actor: WhatsAppInboxActor;
  }): Promise<WhatsAppInboxConversation | null>;

  abstract listMessages(input: {
    conversationId: string;
    actor: WhatsAppInboxActor;
    cursor?: string;
    after?: Date;
    pageSize: number;
  }): Promise<WhatsAppInboxMessagePage>;

  abstract markRead(conversationId: string, actor: WhatsAppInboxActor, readAt: Date): Promise<boolean>;

  abstract setMode(input: {
    conversationId: string;
    actor: WhatsAppInboxActor;
    mode: WhatsAppConversationMode;
    changedAt: Date;
  }): Promise<WhatsAppInboxConversation | null>;

  abstract recordManualMessage(input: {
    messageId: string;
    conversationId: string;
    providerMessageId: string;
    body: string;
    sentByUserId: string;
    sentAt: Date;
  }): Promise<WhatsAppInboxMessage>;

  abstract registerQuoteDelivery(input: RegisterWhatsAppQuoteDeliveryInput): Promise<{
    conversationId: string;
    messageId: string;
  }>;

  abstract updateOutboundStatus(input: {
    providerMessageId: string;
    status: WhatsAppOutboundMessageStatus;
    errorMessage: string | null;
    occurredAt: Date;
  }): Promise<{ conversationId: string; messageId: string } | null>;
}
