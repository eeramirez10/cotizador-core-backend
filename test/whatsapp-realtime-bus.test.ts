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

test("delivers system notifications to both realtime consumers without duplicate events", async () => {
  const bus = new WhatsAppRealtimeBus(undefined, "test:system:realtime");
  const inboxEvents: WhatsAppRealtimeEvent[] = [];
  const systemEvents: WhatsAppRealtimeEvent[] = [];
  const stopInbox = await bus.subscribe((event) => inboxEvents.push(event));
  const stopSystem = await bus.subscribe((event) => systemEvents.push(event));
  const event: WhatsAppRealtimeEvent = {
    type: "SYSTEM_NOTIFICATION_CREATED",
    conversationId: "",
    reason: "SYSTEM_NOTIFICATION_CREATED",
    occurredAt: "2026-09-23T20:00:00.000Z",
    systemNotification: {
      id: "alert-1",
      recipientUserId: "seller-1",
      type: "CUSTOMER_ONBOARDING_ERP_LINKED",
      title: "Cliente vinculado en ERP",
      message: "Cliente vinculado en Proscai.",
      targetPath: "/clients?onboarding=onboarding-1",
    },
  };
  await bus.publish(event);
  assert.deepEqual(inboxEvents, [event]);
  assert.deepEqual(systemEvents, [event]);
  await stopInbox();
  await bus.publish(event);
  assert.equal(inboxEvents.length, 1);
  assert.equal(systemEvents.length, 2);
  await stopSystem();
});
