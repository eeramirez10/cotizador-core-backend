import { randomUUID } from "node:crypto";
import { EventEmitter } from "node:events";
import { createClient, type RedisClientType } from "redis";
import {
  WhatsAppRealtimeEvent,
  WhatsAppRealtimePublisher,
} from "../../domain/events/whatsapp-realtime.event";

type WhatsAppRealtimeListener = (event: WhatsAppRealtimeEvent) => void | Promise<void>;

interface RedisRealtimeEnvelope {
  sourceId: string;
  event: WhatsAppRealtimeEvent;
}

export class WhatsAppRealtimeBus extends WhatsAppRealtimePublisher {
  private readonly localEmitter = new EventEmitter();
  private readonly sourceId = randomUUID();
  private publisher: RedisClientType | null = null;
  private subscriber: RedisClientType | null = null;
  private publisherConnectPromise: Promise<void> | null = null;
  private subscriberConnectPromise: Promise<void> | null = null;

  constructor(
    private readonly redisUrl: string | undefined,
    private readonly channel: string,
  ) {
    super();
  }

  async publish(event: WhatsAppRealtimeEvent): Promise<void> {
    // Deliver immediately inside the current process. Redis only bridges API/worker instances.
    this.localEmitter.emit(this.channel, event);
    if (!this.redisUrl) return;

    try {
      const publisher = await this.getPublisher();
      const envelope: RedisRealtimeEnvelope = { sourceId: this.sourceId, event };
      await publisher.publish(this.channel, JSON.stringify(envelope));
    } catch (error) {
      this.logError("publish_failed", error);
    }
  }

  async subscribe(listener: WhatsAppRealtimeListener): Promise<() => Promise<void>> {
    const localListener = (event: WhatsAppRealtimeEvent) => {
      void Promise.resolve(listener(event)).catch((error) => this.logError("listener_failed", error));
    };
    this.localEmitter.on(this.channel, localListener);

    if (!this.redisUrl) {
      return async () => {
        this.localEmitter.off(this.channel, localListener);
      };
    }

    const subscriber = await this.getSubscriber();
    await subscriber.subscribe(this.channel, (payload) => {
      try {
        const parsed = JSON.parse(payload) as RedisRealtimeEnvelope | WhatsAppRealtimeEvent;
        const sourceId = "sourceId" in parsed ? parsed.sourceId : undefined;
        if (sourceId === this.sourceId) return;
        const event = "event" in parsed ? parsed.event : parsed;
        if (event.type === "WHATSAPP_CONVERSATION_CHANGED" && event.conversationId) {
          void Promise.resolve(listener(event)).catch((error) => this.logError("listener_failed", error));
        }
      } catch (error) {
        this.logError("invalid_event", error);
      }
    });
    return async () => {
      this.localEmitter.off(this.channel, localListener);
      if (subscriber.isOpen) await subscriber.unsubscribe(this.channel);
    };
  }

  async close(): Promise<void> {
    const clients = [this.subscriber, this.publisher].filter(
      (client): client is RedisClientType => Boolean(client?.isOpen),
    );
    await Promise.allSettled(clients.map((client) => client.quit()));
  }

  private async getPublisher(): Promise<RedisClientType> {
    if (!this.publisher) {
      this.publisher = this.createRedisClient("publisher");
    }
    if (!this.publisher.isOpen) {
      this.publisherConnectPromise ??= this.publisher.connect()
        .then(() => undefined)
        .finally(() => {
          this.publisherConnectPromise = null;
        });
      await this.publisherConnectPromise;
    }
    return this.publisher;
  }

  private async getSubscriber(): Promise<RedisClientType> {
    if (!this.subscriber) {
      this.subscriber = this.createRedisClient("subscriber");
    }
    if (!this.subscriber.isOpen) {
      this.subscriberConnectPromise ??= this.subscriber.connect()
        .then(() => undefined)
        .finally(() => {
          this.subscriberConnectPromise = null;
        });
      await this.subscriberConnectPromise;
    }
    return this.subscriber;
  }

  private createRedisClient(role: string): RedisClientType {
    const client = createClient({
      url: this.redisUrl,
      socket: {
        reconnectStrategy: (retries) => Math.min(250 * 2 ** Math.min(retries, 6), 10_000),
      },
    });
    client.on("error", (error) => this.logError(`${role}_error`, error));
    return client as RedisClientType;
  }

  private logError(event: string, error: unknown): void {
    console.error(JSON.stringify({
      level: "error",
      event: `whatsapp_realtime.${event}`,
      message: error instanceof Error ? error.message : "Unknown realtime error.",
    }));
  }
}
