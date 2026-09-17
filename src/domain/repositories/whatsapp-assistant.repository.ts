import type {
  WhatsAppAssistantActionType,
  WhatsAppAssistantJobEntity,
  WhatsAppAssistantPrincipal,
  WhatsAppAssistantQuoteDetails,
  WhatsAppAssistantQuoteSummary,
  WhatsAppCustomerChangeRequestEntity,
  WhatsAppPendingActionEntity,
} from "../entities/whatsapp-assistant.entity";

export abstract class WhatsAppAssistantRepository {
  abstract getPrincipal(conversationId: string): Promise<WhatsAppAssistantPrincipal>;
  abstract getParticipantPhone(conversationId: string): Promise<string | null>;
  abstract claimNextJob(staleBefore: Date): Promise<WhatsAppAssistantJobEntity | null>;
  abstract isConversationAiControlled(conversationId: string): Promise<boolean>;
  abstract cancelJob(jobId: string, reason: string, cancelledAt: Date): Promise<void>;
  abstract completeJob(input: {
    jobId: string;
    conversationId: string;
    responseId: string;
    body: string;
    providerMessageId: string;
    sentAt: Date;
  }): Promise<{ outboundMessageId: string }>;
  abstract failJob(input: {
    jobId: string;
    errorMessage: string;
    retryAt: Date;
    final: boolean;
  }): Promise<void>;
  abstract listAuthorizedQuotes(conversationId: string, limit: number): Promise<WhatsAppAssistantQuoteSummary[]>;
  abstract findAuthorizedQuote(conversationId: string, quoteNumber: string): Promise<WhatsAppAssistantQuoteDetails | null>;
  abstract listRejectionReasons(conversationId: string, quoteNumber: string): Promise<Array<{
    code: string;
    label: string;
    requiresComment: boolean;
  }>>;
  abstract prepareAction(input: {
    conversationId: string;
    preparedTurnId: string;
    quoteId: string;
    actionType: WhatsAppAssistantActionType;
    payload: Record<string, unknown>;
    expiresAt: Date;
  }): Promise<WhatsAppPendingActionEntity>;
  abstract findPendingAction(input: {
    conversationId: string;
    currentTurnId: string;
    quoteId: string;
    actionType: WhatsAppAssistantActionType;
    now: Date;
  }): Promise<WhatsAppPendingActionEntity | null>;
  abstract markActionExecuted(actionId: string, executedAt: Date): Promise<void>;
  abstract createChangeRequest(input: {
    conversationId: string;
    quoteId: string;
    customerContactId: string | null;
    requestedByPhone: string;
    requestedChanges: string;
  }): Promise<{ id: string; created: boolean }>;
  abstract listChangeRequests(quoteId: string): Promise<WhatsAppCustomerChangeRequestEntity[]>;
}
