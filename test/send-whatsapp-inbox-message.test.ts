import assert from "node:assert/strict";
import test from "node:test";
import type { WhatsAppAssistantReplyResult } from "../src/domain/contracts/whatsapp-assistant-messaging.port";
import { WhatsAppAssistantMessagingPort } from "../src/domain/contracts/whatsapp-assistant-messaging.port";
import type {
  RegisterWhatsAppQuoteDeliveryInput,
  WhatsAppInboxActor,
  WhatsAppInboxConversation,
  WhatsAppInboxConversationPage,
  WhatsAppInboxMessagePage,
} from "../src/domain/entities/whatsapp-inbox.entity";
import { WhatsAppInboxRepository } from "../src/domain/repositories/whatsapp-inbox.repository";
import { SendWhatsAppInboxMessageUseCase } from "../src/domain/use-cases/send-whatsapp-inbox-message.use-case";

const now = new Date("2026-09-08T18:00:00.000Z");
const actor: WhatsAppInboxActor = {
  id: "11111111-1111-4111-8111-111111111111",
  role: "SELLER",
  branchId: "22222222-2222-4222-8222-222222222222",
};

class WhatsAppInboxRepositoryStub extends WhatsAppInboxRepository {
  conversation: WhatsAppInboxConversation | null = null;
  manualMessage: Parameters<WhatsAppInboxRepository["recordManualMessage"]>[0] | null = null;

  async listConversations(): Promise<WhatsAppInboxConversationPage> {
    return { items: [], nextCursor: null, hasMore: false };
  }

  async findConversation(): Promise<WhatsAppInboxConversation | null> {
    return this.conversation;
  }

  async listMessages(): Promise<WhatsAppInboxMessagePage> {
    return { items: [], nextCursor: null, hasMore: false };
  }

  async markRead(): Promise<boolean> {
    return true;
  }

  async setMode(): Promise<WhatsAppInboxConversation | null> {
    return this.conversation;
  }

  async recordManualMessage(input: Parameters<WhatsAppInboxRepository["recordManualMessage"]>[0]): Promise<void> {
    this.manualMessage = input;
  }

  async registerQuoteDelivery(_input: RegisterWhatsAppQuoteDeliveryInput): Promise<void> {}

  async updateOutboundStatus(): Promise<boolean> {
    return true;
  }
}

class WhatsAppMessagingStub extends WhatsAppAssistantMessagingPort {
  recipient: string | null = null;
  body: string | null = null;

  async sendReply(recipient: string, body: string): Promise<WhatsAppAssistantReplyResult> {
    this.recipient = recipient;
    this.body = body;
    return { providerMessageId: "SM-manual-1" };
  }
}

function createConversation(overrides: Partial<WhatsAppInboxConversation> = {}): WhatsAppInboxConversation {
  return {
    id: "33333333-3333-4333-8333-333333333333",
    participantPhone: "+525511223344",
    customerId: null,
    customerName: "Cliente WhatsApp",
    contactId: null,
    contactName: null,
    sellerName: "Alma Martinez",
    quote: null,
    mode: "HUMAN",
    handledByName: "Alma Martinez",
    lastMessage: "Necesito ayuda",
    lastMessageAt: now,
    lastInboundAt: new Date(now.getTime() - 60_000),
    unreadCount: 1,
    ...overrides,
  };
}

test("requires human control before sending a manual WhatsApp reply", async () => {
  const repository = new WhatsAppInboxRepositoryStub();
  repository.conversation = createConversation({ mode: "AI" });
  const messaging = new WhatsAppMessagingStub();
  const useCase = new SendWhatsAppInboxMessageUseCase(repository, messaging, () => now);

  await assert.rejects(
    () => useCase.execute({
      conversationId: repository.conversation!.id,
      clientMessageId: "44444444-4444-4444-8444-444444444444",
      body: "Hola",
      actor,
    }),
    /Toma el control/,
  );
  assert.equal(messaging.recipient, null);
});

test("rejects manual replies after the 24-hour WhatsApp window", async () => {
  const repository = new WhatsAppInboxRepositoryStub();
  repository.conversation = createConversation({
    lastInboundAt: new Date(now.getTime() - (24 * 60 * 60 * 1000)),
  });
  const messaging = new WhatsAppMessagingStub();
  const useCase = new SendWhatsAppInboxMessageUseCase(repository, messaging, () => now);

  await assert.rejects(
    () => useCase.execute({
      conversationId: repository.conversation!.id,
      clientMessageId: "44444444-4444-4444-8444-444444444444",
      body: "Hola",
      actor,
    }),
    /24 horas/,
  );
  assert.equal(messaging.recipient, null);
});

test("sends and records a manual reply during an active window", async () => {
  const repository = new WhatsAppInboxRepositoryStub();
  repository.conversation = createConversation();
  const messaging = new WhatsAppMessagingStub();
  const useCase = new SendWhatsAppInboxMessageUseCase(repository, messaging, () => now);

  const result = await useCase.execute({
    conversationId: repository.conversation.id,
    clientMessageId: "44444444-4444-4444-8444-444444444444",
    body: "  Te comparto la información.  ",
    actor,
  });

  assert.deepEqual(result, { providerMessageId: "SM-manual-1", sentAt: now });
  assert.equal(messaging.recipient, "+525511223344");
  assert.equal(messaging.body, "Te comparto la información.");
  assert.deepEqual(repository.manualMessage, {
    messageId: "44444444-4444-4444-8444-444444444444",
    conversationId: repository.conversation.id,
    providerMessageId: "SM-manual-1",
    body: "Te comparto la información.",
    sentByUserId: actor.id,
    sentAt: now,
  });
});
