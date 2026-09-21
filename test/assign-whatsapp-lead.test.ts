import assert from "node:assert/strict";
import test from "node:test";
import type { WhatsAppAssistantReplyResult } from "../src/domain/contracts/whatsapp-assistant-messaging.port";
import { WhatsAppAssistantMessagingPort } from "../src/domain/contracts/whatsapp-assistant-messaging.port";
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
    activeRequestId: "41000000-0000-4000-8000-000000000001",
    requestSummary: "Solicita tubería de acero",
    requestStatus: "ASSIGNED",
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
  handledByUserId: null,
  handledByName: null,
  humanControlExpiresAt: null,
  humanLastActivityAt: null,
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
  async upsertActiveRequest() { return null; }
  async closeActiveRequest() { return null; }
  async assign(input: Parameters<WhatsAppLeadRepository["assign"]>[0]) { this.assignment = input; }
  async convert(input: Parameters<WhatsAppLeadRepository["convert"]>[0]) { this.conversion = input; }
}

class InboxRepositoryStub extends WhatsAppInboxRepository {
  systemMessage: Parameters<WhatsAppInboxRepository["recordSystemMessage"]>[0] | null = null;
  async listConversations() { return { items: [], nextCursor: null, hasMore: false }; }
  async findConversation() { return conversation; }
  async listMessages() { return { items: [], nextCursor: null, hasMore: false }; }
  async listRelatedQuotes() { return []; }
  async markRead() { return true; }
  async setMode() { return conversation; }
  async renewHumanControl() { return null; }
  async recordManualMessage(): Promise<never> { throw new Error("Not implemented"); }
  async recordSystemMessage(input: Parameters<WhatsAppInboxRepository["recordSystemMessage"]>[0]) {
    this.systemMessage = input;
    return {
      id: "80000000-0000-4000-8000-000000000001",
      conversationId: input.conversationId,
      direction: "OUTBOUND" as const,
      authorType: "SYSTEM" as const,
      authorName: "Tuvansa",
      body: input.body,
      messageType: "TEXT" as const,
      status: "QUEUED" as const,
      occurredAt: input.sentAt,
      quote: null,
      fileAssetId: null,
      attachments: [],
    };
  }
  async registerQuoteDelivery() { return { conversationId: conversation.id, messageId: "message-1" }; }
  async updateOutboundStatus() { return null; }
}

class MessagingStub extends WhatsAppAssistantMessagingPort {
  recipient: string | null = null;
  body: string | null = null;
  shouldFail = false;

  async sendReply(recipient: string, body: string): Promise<WhatsAppAssistantReplyResult> {
    this.recipient = recipient;
    this.body = body;
    if (this.shouldFail) throw new Error("Twilio unavailable");
    return { providerMessageId: "SM-assignment-1" };
  }
}

class RealtimePublisherStub extends WhatsAppRealtimePublisher {
  event: WhatsAppRealtimeEvent | null = null;
  async publish(event: WhatsAppRealtimeEvent) { this.event = event; }
}

test("admin assigns a WhatsApp lead and publishes the updated seller", async () => {
  const leads = new LeadRepositoryStub();
  const inbox = new InboxRepositoryStub();
  const realtime = new RealtimePublisherStub();
  const messaging = new MessagingStub();
  const useCase = new AssignWhatsAppLeadUseCase(
    leads,
    inbox,
    realtime,
    () => assignedAt,
    messaging,
  );

  const result = await useCase.execute(
    conversation.id,
    conversation.lead!.assignedSellerId!,
    actor("ADMIN"),
  );

  assert.equal(result.sellerName, "Vendedor Prueba");
  assert.equal(leads.assignment?.conversationId, conversation.id);
  assert.equal(leads.assignment?.assignedAt, assignedAt);
  assert.equal(messaging.recipient, conversation.participantPhone);
  assert.match(messaging.body || "", /Vendedor Prueba/);
  assert.match(messaging.body || "", /Ana López/);
  assert.equal(inbox.systemMessage?.providerMessageId, "SM-assignment-1");
  assert.equal(realtime.event?.reason, "MESSAGE_SENT");
});

test("keeps the lead assigned when the customer WhatsApp notice fails", async () => {
  const leads = new LeadRepositoryStub();
  const inbox = new InboxRepositoryStub();
  const messaging = new MessagingStub();
  messaging.shouldFail = true;
  const originalError = console.error;
  console.error = () => undefined;
  try {
    const useCase = new AssignWhatsAppLeadUseCase(
      leads,
      inbox,
      undefined,
      () => assignedAt,
      messaging,
    );
    const result = await useCase.execute(
      conversation.id,
      conversation.lead!.assignedSellerId!,
      actor("MANAGER"),
    );

    assert.equal(result.lead?.assignedSellerId, conversation.lead?.assignedSellerId);
    assert.equal(leads.assignment?.conversationId, conversation.id);
    assert.equal(inbox.systemMessage, null);
  } finally {
    console.error = originalError;
  }
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
