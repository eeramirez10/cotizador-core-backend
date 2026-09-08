export interface WhatsAppAssistantAgentInput {
  turnId: string;
  conversationId: string;
  participantPhone: string;
  message: string;
  mediaCount: number;
  previousResponseId: string | null;
}

export interface WhatsAppAssistantAgentResult {
  responseId: string;
  text: string;
}

export abstract class WhatsAppAssistantAgentPort {
  abstract respond(input: WhatsAppAssistantAgentInput): Promise<WhatsAppAssistantAgentResult>;
}
