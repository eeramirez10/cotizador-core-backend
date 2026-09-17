import type { WhatsAppAssistantPrincipal } from "../entities/whatsapp-assistant.entity";
import type { WhatsAppLeadEntity, WhatsAppLeadProfilePatch } from "../entities/whatsapp-lead.entity";
import type { WhatsAppLeadRepository } from "../repositories/whatsapp-lead.repository";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";

type ToolArguments = Record<string, unknown>;

export class WhatsAppLeadAssistantUseCase {
  constructor(
    private readonly repository: WhatsAppLeadRepository,
    private readonly realtime?: WhatsAppRealtimePublisher,
  ) {}

  async execute(
    principal: WhatsAppAssistantPrincipal,
    conversationId: string,
    name: string,
    args: ToolArguments,
  ): Promise<unknown> {
    if (principal.audience !== "UNKNOWN") throw new Error("WHATSAPP_LEAD_ASSISTANT_NOT_AUTHORIZED");
    if (name === "get_whatsapp_lead") return this.get(conversationId);
    if (name === "update_whatsapp_lead") return this.update(conversationId, args);
    throw new Error(`Unsupported WhatsApp lead assistant tool: ${name}`);
  }

  private async get(conversationId: string) {
    const lead = await this.repository.findByConversationId(conversationId);
    if (!lead) return { error: "WHATSAPP_LEAD_NOT_FOUND" };
    return this.result(lead);
  }

  private async update(conversationId: string, args: ToolArguments) {
    const current = await this.repository.findByConversationId(conversationId);
    if (!current) return { error: "WHATSAPP_LEAD_NOT_FOUND" };

    const patch: WhatsAppLeadProfilePatch = {};
    this.assignText(patch, "contactName", args.contactName, 160);
    this.assignText(patch, "companyName", args.companyName, 200);
    this.assignText(patch, "location", args.location, 180);
    this.assignText(patch, "requestSummary", args.requestSummary, 2_000);
    const email = this.optionalText(args.email, 180);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "INVALID_LEAD_EMAIL", message: "El correo no tiene un formato válido." };
    }
    if (email) patch.email = email.toLowerCase();

    const merged = { ...current, ...patch };
    const ready = Boolean(merged.contactName?.trim() && merged.requestSummary?.trim());
    const status = current.status === "ASSIGNED"
      ? "ASSIGNED"
      : ready
        ? "PENDING_ASSIGNMENT"
        : "COLLECTING_INFORMATION";
    const updated = await this.repository.updateProfile({ conversationId, patch, status });
    if (!updated) return { error: "WHATSAPP_LEAD_NOT_FOUND" };
    void this.realtime?.publish({
      type: "WHATSAPP_CONVERSATION_CHANGED",
      conversationId,
      reason: "LEAD_UPDATED",
      occurredAt: updated.updatedAt.toISOString(),
      conversation: {
        customerName: updated.companyName || updated.contactName || "Prospecto de WhatsApp",
        contactName: updated.contactName,
        lead: this.inboxLead(updated),
      },
    });
    return this.result(updated);
  }

  private inboxLead(lead: WhatsAppLeadEntity) {
    return {
      id: lead.id,
      status: lead.status,
      contactName: lead.contactName,
      companyName: lead.companyName,
      email: lead.email,
      location: lead.location,
      requestSummary: lead.requestSummary,
      assignedSellerId: lead.assignedSellerId,
      assignedSellerName: lead.assignedSellerName,
      assignedBranchId: lead.assignedBranchId,
      assignedBranchName: lead.assignedBranchName,
      assignedAt: lead.assignedAt,
      customerId: lead.customerId,
      convertedByUserId: lead.convertedByUserId,
      convertedAt: lead.convertedAt,
    };
  }

  private result(lead: WhatsAppLeadEntity) {
    const requiredMissing = [
      !lead.contactName ? "contactName" : null,
      !lead.requestSummary ? "requestSummary" : null,
    ].filter(Boolean);
    const recommendedMissing = [
      !lead.companyName ? "companyName" : null,
      !lead.email ? "email" : null,
      !lead.location ? "location" : null,
    ].filter(Boolean);
    return {
      lead: {
        contactName: lead.contactName,
        companyName: lead.companyName,
        email: lead.email,
        location: lead.location,
        requestSummary: lead.requestSummary,
        status: lead.status,
        assignedSellerName: lead.assignedSellerName,
      },
      readyForAssignment: lead.status === "PENDING_ASSIGNMENT" || lead.status === "ASSIGNED",
      requiredMissing,
      recommendedMissing,
    };
  }

  private assignText(
    target: WhatsAppLeadProfilePatch,
    key: keyof WhatsAppLeadProfilePatch,
    value: unknown,
    maxLength: number,
  ): void {
    const text = this.optionalText(value, maxLength);
    if (text) target[key] = text;
  }

  private optionalText(value: unknown, maxLength: number): string | null {
    if (typeof value !== "string") return null;
    const normalized = value.trim().replace(/\s+/g, " ");
    if (!normalized) return null;
    return normalized.slice(0, maxLength);
  }
}
