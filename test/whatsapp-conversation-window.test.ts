import assert from "node:assert/strict";
import test from "node:test";
import type {
  RecordWhatsAppInboundMessageInput,
  RecordedWhatsAppInboundMessage,
  WhatsAppConversationEntity,
} from "../src/domain/entities/whatsapp-conversation.entity";
import { WhatsAppConversationRepository } from "../src/domain/repositories/whatsapp-conversation.repository";
import {
  WhatsAppRealtimePublisher,
  type WhatsAppRealtimeEvent,
} from "../src/domain/events/whatsapp-realtime.event";
import { GetWhatsAppConversationWindowUseCase } from "../src/domain/use-cases/get-whatsapp-conversation-window.use-case";
import { RecordInboundWhatsAppMessageUseCase } from "../src/domain/use-cases/record-inbound-whatsapp-message.use-case";

class WhatsAppConversationRepositoryStub extends WhatsAppConversationRepository {
  conversation: WhatsAppConversationEntity | null = null;
  recorded: RecordWhatsAppInboundMessageInput | null = null;

  async findByParticipants(): Promise<WhatsAppConversationEntity | null> {
    return this.conversation;
  }

  async recordInboundMessage(input: RecordWhatsAppInboundMessageInput): Promise<RecordedWhatsAppInboundMessage> {
    this.recorded = input;
    return { conversationId: "conversation-1", inboundMessageId: "message-1", created: true };
  }
}

class WhatsAppRealtimePublisherStub extends WhatsAppRealtimePublisher {
  events: WhatsAppRealtimeEvent[] = [];

  async publish(event: WhatsAppRealtimeEvent): Promise<void> {
    this.events.push(event);
  }
}

const now = new Date("2026-09-07T18:00:00.000Z");

test("uses free-form delivery within 24 hours of the last inbound message", async () => {
  const repository = new WhatsAppConversationRepositoryStub();
  repository.conversation = {
    businessPhoneE164: "+525651020069",
    participantPhoneE164: "+525511223344",
    lastInboundAt: new Date(now.getTime() - (24 * 60 * 60 * 1000) + 1),
  };
  const useCase = new GetWhatsAppConversationWindowUseCase(repository, "+52 56 5102 0069", () => now);

  const result = await useCase.execute("55 1122 3344");

  assert.equal(result.active, true);
  assert.equal(result.deliveryMode, "FREE_FORM");
});

test("requires a template when the 24-hour window has expired", async () => {
  const repository = new WhatsAppConversationRepositoryStub();
  repository.conversation = {
    businessPhoneE164: "+525651020069",
    participantPhoneE164: "+525511223344",
    lastInboundAt: new Date(now.getTime() - (24 * 60 * 60 * 1000)),
  };
  const useCase = new GetWhatsAppConversationWindowUseCase(repository, "+525651020069", () => now);

  const result = await useCase.execute("+525511223344");

  assert.equal(result.active, false);
  assert.equal(result.deliveryMode, "TEMPLATE");
});

test("requires a template when the customer has not sent an inbound message", async () => {
  const repository = new WhatsAppConversationRepositoryStub();
  const useCase = new GetWhatsAppConversationWindowUseCase(repository, "+525651020069", () => now);

  const result = await useCase.execute("+525511223344");

  assert.equal(result.active, false);
  assert.equal(result.lastInboundAt, null);
  assert.equal(result.expiresAt, null);
});

test("normalizes and records a signed inbound WhatsApp message", async () => {
  const repository = new WhatsAppConversationRepositoryStub();
  const realtime = new WhatsAppRealtimePublisherStub();
  const useCase = new RecordInboundWhatsAppMessageUseCase(repository, () => now, false, realtime);

  await useCase.execute({
    from: "whatsapp:+5215511223344",
    to: "whatsapp:+525651020069",
    providerMessageId: "SM123",
    body: "  Hola  ",
    mediaCount: 1,
  });

  assert.deepEqual(repository.recorded, {
    businessPhoneE164: "+525651020069",
    participantPhoneE164: "+525511223344",
    providerMessageId: "SM123",
    body: "Hola",
    mediaCount: 1,
    receivedAt: now,
    enqueueAssistant: false,
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(realtime.events, [{
    type: "WHATSAPP_CONVERSATION_CHANGED",
    conversationId: "conversation-1",
    reason: "MESSAGE_RECEIVED",
    occurredAt: now.toISOString(),
    message: {
      id: "message-1",
      conversationId: "conversation-1",
      direction: "INBOUND",
      authorType: "CUSTOMER",
      authorName: "Cliente",
      body: "Hola",
      messageType: "TEXT",
      status: "RECEIVED",
      occurredAt: now.toISOString(),
      quote: null,
      fileAssetId: null,
    },
    conversation: {
      lastMessage: "Hola",
      lastMessageAt: now.toISOString(),
      lastInboundAt: now.toISOString(),
    },
  }]);
});
