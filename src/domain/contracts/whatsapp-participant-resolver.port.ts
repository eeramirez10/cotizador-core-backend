import type { WhatsAppAssistantPrincipal } from "../entities/whatsapp-assistant.entity";

export abstract class WhatsAppParticipantResolverPort {
  abstract resolve(participantPhoneE164: string): Promise<WhatsAppAssistantPrincipal>;
}
