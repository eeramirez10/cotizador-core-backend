import assert from "node:assert/strict";
import test from "node:test";
import type {
  WhatsAppInternalAlertDelivery,
  WhatsAppInternalAlertMessage,
} from "../src/domain/contracts/whatsapp-internal-alert-messaging.port";
import { WhatsAppInternalAlertMessagingPort } from "../src/domain/contracts/whatsapp-internal-alert-messaging.port";
import type { WhatsAppInternalAlertInput } from "../src/domain/entities/whatsapp-internal-alert.entity";
import { WhatsAppInternalAlertRepository } from "../src/domain/repositories/whatsapp-internal-alert.repository";
import { SendWhatsAppInternalAlertUseCase } from "../src/domain/use-cases/send-whatsapp-internal-alert.use-case";

class AlertRepositoryStub extends WhatsAppInternalAlertRepository {
  private readonly eventKeys = new Map<string, string>();
  status: "PENDING" | "SENT" | "FAILED" | "SKIPPED" = "PENDING";
  recipientPhone: string | null = "+525511223344";

  async findRecipient(userId: string) {
    return { id: userId, name: "Alma Martínez", whatsappPhoneE164: this.recipientPhone, isActive: true };
  }
  async findConversationSellerId() { return "seller-1"; }
  async findQuoteContext() {
    return { recipientUserId: "seller-1", customerName: "Cliente SA de CV", quoteNumber: "QT-1" };
  }
  async reserve(input: WhatsAppInternalAlertInput & { recipientUserId: string }) {
    const existing = this.eventKeys.get(input.eventKey);
    if (existing) return { id: existing, created: false };
    const id = `alert-${this.eventKeys.size + 1}`;
    this.eventKeys.set(input.eventKey, id);
    return { id, created: true };
  }
  async markSent() { this.status = "SENT"; }
  async markFailed() { this.status = "FAILED"; }
  async markSkipped() { this.status = "SKIPPED"; }
}

class AlertMessagingStub extends WhatsAppInternalAlertMessagingPort {
  messages: WhatsAppInternalAlertMessage[] = [];
  configured = true;

  isConfigured() { return this.configured; }
  async send(message: WhatsAppInternalAlertMessage): Promise<WhatsAppInternalAlertDelivery> {
    this.messages.push(message);
    return { providerMessageId: "SM-1" };
  }
}

const input: WhatsAppInternalAlertInput = {
  eventKey: "quote-request:request-1",
  type: "INFORMATION_REQUESTED",
  quoteId: "quote-1",
  reference: "QT-1",
  detail: "Confirmar tiempo de entrega de la partida 2.",
};

test("internal alerts use the reusable template payload and are idempotent", async () => {
  const repository = new AlertRepositoryStub();
  const messaging = new AlertMessagingStub();
  const useCase = new SendWhatsAppInternalAlertUseCase(repository, messaging);

  assert.deepEqual(await useCase.execute(input), { sent: true });
  assert.deepEqual(await useCase.execute(input), { sent: false, duplicate: true });
  assert.equal(repository.status, "SENT");
  assert.deepEqual(messaging.messages, [{
    recipient: "+525511223344",
    sellerName: "Alma Martínez",
    eventLabel: "Solicitud de información",
    customerName: "Cliente SA de CV",
    reference: "QT-1",
    detail: "Confirmar tiempo de entrega de la partida 2.",
  }]);
});

test("internal alerts are skipped when the seller has no WhatsApp number", async () => {
  const repository = new AlertRepositoryStub();
  repository.recipientPhone = null;
  const messaging = new AlertMessagingStub();
  const useCase = new SendWhatsAppInternalAlertUseCase(repository, messaging);

  assert.deepEqual(await useCase.execute({ ...input, eventKey: "quote-request:request-2" }), {
    sent: false,
    reason: "RECIPIENT_HAS_NO_WHATSAPP",
  });
  assert.equal(repository.status, "SKIPPED");
  assert.equal(messaging.messages.length, 0);
});
