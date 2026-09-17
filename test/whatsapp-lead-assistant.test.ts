import assert from "node:assert/strict";
import test from "node:test";
import type { WhatsAppAssistantPrincipal } from "../src/domain/entities/whatsapp-assistant.entity";
import type { WhatsAppLeadEntity, WhatsAppLeadProfilePatch } from "../src/domain/entities/whatsapp-lead.entity";
import { WhatsAppLeadRepository } from "../src/domain/repositories/whatsapp-lead.repository";
import { WhatsAppLeadAssistantUseCase } from "../src/domain/use-cases/whatsapp-lead-assistant.use-case";

const principal: WhatsAppAssistantPrincipal = {
  audience: "UNKNOWN",
  displayName: "Usuario de WhatsApp",
  phoneE164: "+525500000001",
  userId: null,
  role: null,
  branchId: null,
  branchName: null,
  reportScope: null,
  reportBranchId: null,
  reportRange: null,
  isVerified: false,
};

class LeadRepositoryStub extends WhatsAppLeadRepository {
  lead: WhatsAppLeadEntity = {
    id: "lead-1",
    conversationId: "conversation-1",
    phoneE164: "+525500000001",
    contactName: null,
    companyName: null,
    email: null,
    location: null,
    requestSummary: null,
    status: "NEW",
    assignedSellerId: null,
    assignedSellerName: null,
    assignedBranchId: null,
    assignedBranchName: null,
    assignedAt: null,
    customerId: null,
    convertedByUserId: null,
    convertedAt: null,
    createdAt: new Date("2026-09-14T12:00:00.000Z"),
    updatedAt: new Date("2026-09-14T12:00:00.000Z"),
  };

  async findByConversationId(): Promise<WhatsAppLeadEntity> {
    return this.lead;
  }

  async updateProfile(input: { patch: WhatsAppLeadProfilePatch; status: WhatsAppLeadEntity["status"] }) {
    this.lead = { ...this.lead, ...input.patch, status: input.status, updatedAt: new Date("2026-09-14T12:01:00.000Z") };
    return this.lead;
  }

  async assign(): Promise<void> {}
  async convert(): Promise<void> {}
}

test("lead intake stores expressed data and becomes ready for assignment", async () => {
  const repository = new LeadRepositoryStub();
  const useCase = new WhatsAppLeadAssistantUseCase(repository);
  const result = await useCase.execute(principal, "conversation-1", "update_whatsapp_lead", {
    contactName: "  Ana   López ",
    companyName: "Aceros del Centro",
    email: "ANA@EJEMPLO.COM",
    location: "Monterrey, Nuevo León",
    requestSummary: "Necesita 20 metros de tubería de acero al carbón",
  }) as Record<string, unknown>;

  assert.equal(repository.lead.status, "PENDING_ASSIGNMENT");
  assert.equal(repository.lead.contactName, "Ana López");
  assert.equal(repository.lead.email, "ana@ejemplo.com");
  assert.equal(result.readyForAssignment, true);
  assert.doesNotMatch(JSON.stringify(result), /\+525500000001/);
});

test("lead intake rejects malformed email without changing the profile", async () => {
  const repository = new LeadRepositoryStub();
  const useCase = new WhatsAppLeadAssistantUseCase(repository);
  const result = await useCase.execute(principal, "conversation-1", "update_whatsapp_lead", {
    contactName: "Ana",
    email: "correo-invalido",
    requestSummary: "Solicita una cotización",
  }) as Record<string, unknown>;

  assert.equal(result.error, "INVALID_LEAD_EMAIL");
  assert.equal(repository.lead.status, "NEW");
});
