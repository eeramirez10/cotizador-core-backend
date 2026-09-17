import assert from "node:assert/strict";
import test from "node:test";
import type { WhatsAppInboxActor, WhatsAppInboxConversation } from "../src/domain/entities/whatsapp-inbox.entity";
import { WhatsAppRealtimePublisher, type WhatsAppRealtimeEvent } from "../src/domain/events/whatsapp-realtime.event";
import { WhatsAppInboxRepository } from "../src/domain/repositories/whatsapp-inbox.repository";
import { WhatsAppLeadRepository } from "../src/domain/repositories/whatsapp-lead.repository";
import { AssignWhatsAppLeadUseCase } from "../src/domain/use-cases/assign-whatsapp-lead.use-case";
import { ConvertWhatsAppLeadUseCase } from "../src/domain/use-cases/convert-whatsapp-lead.use-case";

const assignedAt = new Date("2026-09-14T18:00:00.000Z");

const actor = (role: WhatsAppInboxActor["role"]): WhatsAppInboxActor => ({
  id: "10000000-0000-4000-8000-000000000001",
  role,
  branchId: "20000000-0000-4000-8000-000000000001",
});

const conversation: WhatsAppInboxConversation = {
  id: "30000000-0000-4000-8000-000000000001",
  participantType: "UNKNOWN",
  participantPhone: "+525500000001",
  customerId: null,
  customerName: "Aceros del Centro",
  contactId: null,
  contactName: "Ana López",
  sellerName: "Vendedor Prueba",
  quote: null,
  lead: {
    id: "40000000-0000-4000-8000-000000000001",
    status: "ASSIGNED",
    contactName: "Ana López",
    companyName: "Aceros del Centro",
    email: "ana@ejemplo.com",
    location: "Monterrey",
    requestSummary: "Solicita tubería de acero",
    assignedSellerId: "50000000-0000-4000-8000-000000000001",
    assignedSellerName: "Vendedor Prueba",
    assignedBranchId: "20000000-0000-4000-8000-000000000001",
    assignedBranchName: "México",
    assignedAt,
    customerId: null,
    convertedByUserId: null,
    convertedAt: null,
  },
  mode: "AI",
  handledByName: null,
  lastMessage: "Necesito una cotización",
  lastMessageAt: assignedAt,
  lastInboundAt: assignedAt,
  unreadCount: 1,
};

class LeadRepositoryStub extends WhatsAppLeadRepository {
  assignment: Parameters<WhatsAppLeadRepository["assign"]>[0] | null = null;
  conversion: Parameters<WhatsAppLeadRepository["convert"]>[0] | null = null;

  async findByConversationId() { return null; }
  async updateProfile() { return null; }
  async assign(input: Parameters<WhatsAppLeadRepository["assign"]>[0]) { this.assignment = input; }
  async convert(input: Parameters<WhatsAppLeadRepository["convert"]>[0]) { this.conversion = input; }
}

class InboxRepositoryStub extends WhatsAppInboxRepository {
  async listConversations() { return { items: [], nextCursor: null, hasMore: false }; }
  async findConversation() { return conversation; }
  async listMessages() { return { items: [], nextCursor: null, hasMore: false }; }
  async listRelatedQuotes() { return []; }
  async markRead() { return true; }
  async setMode() { return conversation; }
  async recordManualMessage(): Promise<never> { throw new Error("Not implemented"); }
  async registerQuoteDelivery() { return { conversationId: conversation.id, messageId: "message-1" }; }
  async updateOutboundStatus() { return null; }
}

class RealtimePublisherStub extends WhatsAppRealtimePublisher {
  event: WhatsAppRealtimeEvent | null = null;
  async publish(event: WhatsAppRealtimeEvent) { this.event = event; }
}

test("admin assigns a WhatsApp lead and publishes the updated seller", async () => {
  const leads = new LeadRepositoryStub();
  const realtime = new RealtimePublisherStub();
  const useCase = new AssignWhatsAppLeadUseCase(
    leads,
    new InboxRepositoryStub(),
    realtime,
    () => assignedAt,
  );

  const result = await useCase.execute(
    conversation.id,
    conversation.lead!.assignedSellerId!,
    actor("ADMIN"),
  );

  assert.equal(result.sellerName, "Vendedor Prueba");
  assert.equal(leads.assignment?.conversationId, conversation.id);
  assert.equal(leads.assignment?.assignedAt, assignedAt);
  assert.equal(realtime.event?.reason, "LEAD_ASSIGNED");
});

test("seller cannot assign a WhatsApp lead", async () => {
  const leads = new LeadRepositoryStub();
  const useCase = new AssignWhatsAppLeadUseCase(leads, new InboxRepositoryStub());

  await assert.rejects(
    () => useCase.execute(conversation.id, conversation.lead!.assignedSellerId!, actor("SELLER")),
    /Only ADMIN or MANAGER/,
  );
  assert.equal(leads.assignment, null);
});

test("assigned seller converts a WhatsApp lead and publishes its customer link", async () => {
  const leads = new LeadRepositoryStub();
  const realtime = new RealtimePublisherStub();
  const useCase = new ConvertWhatsAppLeadUseCase(
    leads,
    new InboxRepositoryStub(),
    realtime,
    () => assignedAt,
  );
  const customerId = "60000000-0000-4000-8000-000000000001";
  const customerContactId = "70000000-0000-4000-8000-000000000001";

  await useCase.execute({
    conversationId: conversation.id,
    customerId,
    customerContactId,
    actor: actor("SELLER"),
  });

  assert.equal(leads.conversion?.customerId, customerId);
  assert.equal(leads.conversion?.customerContactId, customerContactId);
  assert.equal(leads.conversion?.convertedAt, assignedAt);
  assert.equal(realtime.event?.reason, "LEAD_CONVERTED");
});

test("purchasing cannot convert a WhatsApp lead", async () => {
  const leads = new LeadRepositoryStub();
  const useCase = new ConvertWhatsAppLeadUseCase(leads, new InboxRepositoryStub());

  await assert.rejects(
    () => useCase.execute({
      conversationId: conversation.id,
      customerId: "60000000-0000-4000-8000-000000000001",
      customerContactId: null,
      actor: actor("PURCHASING"),
    }),
    /PURCHASING cannot convert/,
  );
  assert.equal(leads.conversion, null);
});
