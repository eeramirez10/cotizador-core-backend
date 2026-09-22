export interface WhatsAppAssistantAgentInput {
  turnId: string;
  conversationId: string;
  participantPhone: string;
  message: string;
  mediaCount: number;
  attachments: Array<{
    id: string;
    originalName: string;
    mimeType: string;
  }>;
  previousResponseId: string | null;
  principal: WhatsAppAssistantPrincipal;
}

export interface WhatsAppAssistantAgentResult {
  responseId: string;
  text: string;
}

export abstract class WhatsAppAssistantAgentPort {
  abstract respond(input: WhatsAppAssistantAgentInput): Promise<WhatsAppAssistantAgentResult>;
}
import type { WhatsAppAssistantPrincipal } from "../entities/whatsapp-assistant.entity";
