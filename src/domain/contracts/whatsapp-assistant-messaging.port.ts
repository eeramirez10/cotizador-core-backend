export interface WhatsAppAssistantReplyResult {
  providerMessageId: string;
}

export abstract class WhatsAppAssistantMessagingPort {
  abstract sendReply(recipient: string, body: string): Promise<WhatsAppAssistantReplyResult>;
}
