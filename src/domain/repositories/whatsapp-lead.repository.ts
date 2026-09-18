import type { UserRole, WhatsAppLeadStatus } from "../../infrastructure/database/generated/enums";
import type { WhatsAppLeadEntity, WhatsAppLeadProfilePatch } from "../entities/whatsapp-lead.entity";

export abstract class WhatsAppLeadRepository {
  abstract findByConversationId(conversationId: string): Promise<WhatsAppLeadEntity | null>;

  abstract updateProfile(input: {
    conversationId: string;
    patch: WhatsAppLeadProfilePatch;
    status: WhatsAppLeadStatus;
  }): Promise<WhatsAppLeadEntity | null>;

  abstract upsertActiveRequest(input: {
    conversationId: string;
    summary: string;
    startNew: boolean;
    occurredAt: Date;
  }): Promise<WhatsAppLeadEntity | null>;

  abstract closeActiveRequest(input: {
    conversationId: string;
    cancelled: boolean;
    occurredAt: Date;
  }): Promise<WhatsAppLeadEntity | null>;

  abstract assign(input: {
    conversationId: string;
    sellerId: string;
    actor: { id: string; role: UserRole; branchId: string };
    assignedAt: Date;
  }): Promise<void>;

  abstract convert(input: {
    conversationId: string;
    customerId: string;
    customerContactId: string | null;
    actor: { id: string; role: UserRole; branchId: string };
    convertedAt: Date;
  }): Promise<void>;
}
