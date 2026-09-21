import assert from "node:assert/strict";
import test from "node:test";
import type { WhatsAppRealtimeEvent } from "../src/domain/events/whatsapp-realtime.event";
import { WhatsAppRealtimePublisher } from "../src/domain/events/whatsapp-realtime.event";
import {
  WhatsAppHumanControlRepository,
  type ReleasedWhatsAppHumanControl,
} from "../src/domain/repositories/whatsapp-human-control.repository";
import { ReleaseExpiredWhatsAppHumanControlsUseCase } from "../src/domain/use-cases/release-expired-whatsapp-human-controls.use-case";

class HumanControlRepositoryStub extends WhatsAppHumanControlRepository {
  input: { now: Date; assistantEnabled: boolean } | null = null;
  released: ReleasedWhatsAppHumanControl[] = [];

  async releaseExpired(input: { now: Date; assistantEnabled: boolean }) {
    this.input = input;
    return this.released;
  }
}

class RealtimePublisherStub extends WhatsAppRealtimePublisher {
  events: WhatsAppRealtimeEvent[] = [];

  async publish(event: WhatsAppRealtimeEvent): Promise<void> {
    this.events.push(event);
  }
}

test("returns expired human conversations to AI and publishes the lease change", async () => {
  const now = new Date("2026-09-21T18:00:00.000Z");
  const repository = new HumanControlRepositoryStub();
  repository.released = [{ conversationId: "conversation-1", assistantJobQueued: true }];
  const realtime = new RealtimePublisherStub();
  const useCase = new ReleaseExpiredWhatsAppHumanControlsUseCase(
    repository,
    true,
    realtime,
    () => now,
  );

  assert.equal(await useCase.execute(), 1);
  assert.deepEqual(repository.input, { now, assistantEnabled: true });
  assert.deepEqual(realtime.events, [{
    type: "WHATSAPP_CONVERSATION_CHANGED",
    conversationId: "conversation-1",
    reason: "CONVERSATION_MODE_CHANGED",
    occurredAt: now.toISOString(),
    conversation: {
      mode: "AI",
      handledByUserId: null,
      handledByName: null,
      humanControlExpiresAt: null,
      humanLastActivityAt: null,
    },
  }]);
});
