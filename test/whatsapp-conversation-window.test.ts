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
import type { WhatsAppParticipantResolverPort } from "../src/domain/contracts/whatsapp-participant-resolver.port";

class WhatsAppConversationRepositoryStub extends WhatsAppConversationRepository {
  conversation: WhatsAppConversationEntity | null = null;
  recorded: RecordWhatsAppInboundMessageInput | null = null;

  async findByParticipants(): Promise<WhatsAppConversationEntity | null> {
    return this.conversation;
  }

  async recordInboundMessage(input: RecordWhatsAppInboundMessageInput): Promise<RecordedWhatsAppInboundMessage> {
    this.recorded = input;
    return {
      conversationId: "conversation-1",
      inboundMessageId: "message-1",
      created: true,
      humanControlExpiresAt: null,
    };
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
    media: [],
  });

  assert.deepEqual(repository.recorded, {
    businessPhoneE164: "+525651020069",
    participantPhoneE164: "+525511223344",
    providerMessageId: "SM123",
    body: "Hola",
    mediaCount: 1,
    media: [],
    receivedAt: now,
    enqueueAssistant: false,
    participantType: "UNKNOWN",
    internalUserId: null,
    internalUserBranchId: null,
    customerId: null,
    customerContactId: null,
    customerOwnerUserId: null,
    customerOwnerBranchId: null,
    customerQuoteId: null,
    customerName: null,
    customerContactName: null,
    principalResolvedAt: now,
    humanResponseGraceMs: 5 * 60 * 1000,
    humanControlMaxDurationMs: 60 * 60 * 1000,
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
      attachments: [],
    },
    conversation: {
      lastMessage: "Hola",
      lastMessageAt: now.toISOString(),
      lastInboundAt: now.toISOString(),
      humanControlExpiresAt: null,
    },
  }]);
});

test("restores a known customer identity when a deleted conversation is recreated", async () => {
  const repository = new WhatsAppConversationRepositoryStub();
  const resolver = {
    resolve: async () => ({
      audience: "CUSTOMER" as const,
      displayName: "Luz Vázquez",
      phoneE164: "+525511223344",
      userId: null,
      role: null,
      branchId: null,
      branchName: null,
      reportScope: null,
      reportBranchId: null,
      reportRange: null,
      isVerified: false,
      customerId: "customer-1",
      customerContactId: "contact-1",
      customerOwnerUserId: "seller-1",
      customerOwnerBranchId: "branch-1",
      customerQuoteId: "quote-1",
      customerName: "PROESA, SA DE CV",
      customerContactName: "Luz Vázquez",
    }),
  } as WhatsAppParticipantResolverPort;
  const useCase = new RecordInboundWhatsAppMessageUseCase(
    repository,
    () => now,
    false,
    undefined,
    resolver,
  );

  await useCase.execute({
    from: "whatsapp:+525511223344",
    to: "whatsapp:+525651020069",
    providerMessageId: "SM-CUSTOMER",
    body: "Necesito otra cotización",
  });

  assert.equal(repository.recorded?.participantType, "CUSTOMER");
  assert.equal(repository.recorded?.customerId, "customer-1");
  assert.equal(repository.recorded?.customerContactId, "contact-1");
  assert.equal(repository.recorded?.customerOwnerUserId, "seller-1");
  assert.equal(repository.recorded?.customerOwnerBranchId, "branch-1");
  assert.equal(repository.recorded?.customerQuoteId, "quote-1");
});
