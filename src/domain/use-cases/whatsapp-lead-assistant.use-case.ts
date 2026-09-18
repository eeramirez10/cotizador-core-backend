import type { WhatsAppAssistantPrincipal } from "../entities/whatsapp-assistant.entity";
import type { WhatsAppLeadEntity, WhatsAppLeadProfilePatch } from "../entities/whatsapp-lead.entity";
import type { WhatsAppRealtimePublisher } from "../events/whatsapp-realtime.event";
import type { WhatsAppLeadRepository } from "../repositories/whatsapp-lead.repository";

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
    if (principal.audience !== "UNKNOWN" && principal.audience !== "CUSTOMER") {
      throw new Error("WHATSAPP_LEAD_ASSISTANT_NOT_AUTHORIZED");
    }
    if (name === "get_whatsapp_lead") return this.get(conversationId);
    if (name === "update_whatsapp_lead") {
      if (principal.audience !== "UNKNOWN") throw new Error("WHATSAPP_LEAD_PROFILE_NOT_EDITABLE");
      return this.updateProfile(conversationId, args);
    }
    if (name === "upsert_whatsapp_quote_request") return this.upsertRequest(conversationId, args);
    if (name === "close_whatsapp_quote_request") return this.closeRequest(conversationId, args);
    throw new Error(`Unsupported WhatsApp lead assistant tool: ${name}`);
  }

  private async get(conversationId: string) {
    const lead = await this.repository.findByConversationId(conversationId);
    if (!lead) return { error: "WHATSAPP_LEAD_NOT_FOUND" };
    return this.result(lead);
  }

  private async updateProfile(conversationId: string, args: ToolArguments) {
    const current = await this.repository.findByConversationId(conversationId);
    if (!current) return { error: "WHATSAPP_LEAD_NOT_FOUND" };

    const patch: WhatsAppLeadProfilePatch = {};
    this.assignText(patch, "contactName", args.contactName, 160);
    this.assignText(patch, "companyName", args.companyName, 200);
    this.assignText(patch, "location", args.location, 180);
    const email = this.optionalText(args.email, 180);
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: "INVALID_LEAD_EMAIL", message: "El correo no tiene un formato válido." };
    }
    if (email) patch.email = email.toLowerCase();

    const merged = { ...current, ...patch };
    const ready = Boolean(merged.contactName?.trim() && current.requestSummary?.trim());
    const status = current.status === "ASSIGNED"
      ? "ASSIGNED"
      : ready
        ? "PENDING_ASSIGNMENT"
        : "COLLECTING_INFORMATION";
    const updated = await this.repository.updateProfile({ conversationId, patch, status });
    if (!updated) return { error: "WHATSAPP_LEAD_NOT_FOUND" };
    this.publish(updated);
    return this.result(updated);
  }

  private async upsertRequest(conversationId: string, args: ToolArguments) {
    const summary = this.optionalText(args.summary, 2_000);
    if (!summary) return { error: "QUOTE_REQUEST_SUMMARY_REQUIRED" };
    const updated = await this.repository.upsertActiveRequest({
      conversationId,
      summary,
      startNew: args.startNew === true,
      occurredAt: new Date(),
    });
    if (!updated) return { error: "WHATSAPP_LEAD_NOT_FOUND" };
    this.publish(updated);
    return this.result(updated);
  }

  private async closeRequest(conversationId: string, args: ToolArguments) {
    const updated = await this.repository.closeActiveRequest({
      conversationId,
      cancelled: args.cancelled === true,
      occurredAt: new Date(),
    });
    if (!updated) return { error: "WHATSAPP_LEAD_NOT_FOUND" };
    this.publish(updated);
    return this.result(updated);
  }

  private publish(lead: WhatsAppLeadEntity): void {
    void this.realtime?.publish({
      type: "WHATSAPP_CONVERSATION_CHANGED",
      conversationId: lead.conversationId,
      reason: "LEAD_UPDATED",
      occurredAt: lead.updatedAt.toISOString(),
      conversation: {
        customerName: lead.companyName || lead.contactName || "Prospecto de WhatsApp",
        contactName: lead.contactName,
        lead: this.inboxLead(lead),
      },
    });
  }

  private inboxLead(lead: WhatsAppLeadEntity) {
    return {
      id: lead.id,
      status: lead.status,
      contactName: lead.contactName,
      companyName: lead.companyName,
      email: lead.email,
      location: lead.location,
      activeRequestId: lead.activeRequestId,
      requestSummary: lead.requestSummary,
      requestStatus: lead.requestStatus,
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
        activeRequestId: lead.activeRequestId,
        requestSummary: lead.requestSummary,
        requestStatus: lead.requestStatus,
        status: lead.status,
        assignedSellerName: lead.assignedSellerName,
      },
      hasActiveRequest: Boolean(lead.activeRequestId),
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
