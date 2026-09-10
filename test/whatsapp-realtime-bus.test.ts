import assert from "node:assert/strict";
import test from "node:test";
import type { WhatsAppRealtimeEvent } from "../src/domain/events/whatsapp-realtime.event";
import { WhatsAppRealtimeBus } from "../src/infrastructure/realtime/whatsapp-realtime.bus";

test("publishes WhatsApp realtime events through the in-process development fallback", async () => {
  const bus = new WhatsAppRealtimeBus(undefined, "test:whatsapp:realtime");
  const received: WhatsAppRealtimeEvent[] = [];
  const unsubscribe = await bus.subscribe((event) => received.push(event));
  const event: WhatsAppRealtimeEvent = {
    type: "WHATSAPP_CONVERSATION_CHANGED",
    conversationId: "conversation-1",
    reason: "MESSAGE_RECEIVED",
    occurredAt: "2026-09-09T20:00:00.000Z",
  };

  await bus.publish(event);
  assert.deepEqual(received, [event]);

  await unsubscribe();
  await bus.publish({ ...event, reason: "MESSAGE_SENT" });
  assert.equal(received.length, 1);
});
