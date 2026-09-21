import assert from "node:assert/strict";
import test from "node:test";
import type { WhatsAppRealtimeEvent, WhatsAppRealtimePublisher } from "../src/domain/events/whatsapp-realtime.event";
import type { QuoteRepository } from "../src/domain/repositories/quote.repository";
import type { WhatsAppInboxRepository } from "../src/domain/repositories/whatsapp-inbox.repository";
import { UpdateWhatsAppDeliveryStatusUseCase } from "../src/domain/use-cases/update-whatsapp-delivery-status.use-case";
import { describeWhatsAppDeliveryError } from "../src/domain/utils/whatsapp-delivery-error";

test("explains Twilio media download failures with an actionable message", () => {
  const message = describeWhatsAppDeliveryError(63019, "Media failed to download");

  assert.match(message || "", /descargar el archivo adjunto/i);
  assert.match(message || "", /URL pública/i);
  assert.match(message || "", /63019/);
});

test("persists and publishes a failed WhatsApp delivery callback", async () => {
  let quoteError: string | null = null;
  let inboxError: string | null = null;
  let published: WhatsAppRealtimeEvent | null = null;

  const useCase = new UpdateWhatsAppDeliveryStatusUseCase(
    {
      updateDeliveryAttemptStatus: async (input: { errorMessage: string | null }) => {
        quoteError = input.errorMessage;
        return true;
      },
    } as unknown as QuoteRepository,
    {
      updateOutboundStatus: async (input: { errorMessage: string | null }) => {
        inboxError = input.errorMessage;
        return { conversationId: "conversation-1", messageId: "message-1" };
      },
    } as unknown as WhatsAppInboxRepository,
    {
      publish: async (event: WhatsAppRealtimeEvent) => {
        published = event;
      },
    } as WhatsAppRealtimePublisher,
  );

  const updated = await useCase.execute({
    providerMessageId: "SM0001",
    providerStatus: "failed",
    errorCode: "63019",
    errorMessage: "Media failed to download",
  });

  assert.equal(updated, true);
  assert.match(quoteError || "", /URL pública/i);
  assert.equal(inboxError, quoteError);
  assert.equal(published?.reason, "MESSAGE_STATUS_CHANGED");
  assert.equal(published?.messagePatch?.status, "FAILED");
  assert.equal(published?.messagePatch?.errorMessage, quoteError);
});
