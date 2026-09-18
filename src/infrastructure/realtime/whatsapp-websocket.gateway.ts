import type { Server as HttpServer } from "node:http";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import type { WhatsAppRealtimeEvent } from "../../domain/events/whatsapp-realtime.event";
import type { WhatsAppInboxActor } from "../../domain/entities/whatsapp-inbox.entity";
import { JwtAdapter } from "../adapters/jwt.adapter";
import { prisma } from "../database/prisma-client";
import type { WhatsAppRealtimeBus } from "./whatsapp-realtime.bus";

interface ConnectedClient {
  socket: WebSocket;
  actor: WhatsAppInboxActor;
  alive: boolean;
}

const REALTIME_PROTOCOL = "tuvansa-realtime";
const AUTH_PROTOCOL_PREFIX = "auth.";
const REALTIME_PATH = "/api/whatsapp/realtime";
const ALLOWED_ROLES = new Set(["ADMIN", "MANAGER", "SELLER"]);

export class WhatsAppWebSocketGateway {
  private readonly clients = new Set<ConnectedClient>();
  private readonly server = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => protocols.has(REALTIME_PROTOCOL) ? REALTIME_PROTOCOL : false,
  });
  private heartbeat: NodeJS.Timeout | null = null;
  private unsubscribe: (() => Promise<void>) | null = null;

  constructor(
    private readonly httpServer: HttpServer,
    private readonly realtimeBus: WhatsAppRealtimeBus,
  ) {}

  async start(): Promise<void> {
    this.httpServer.on("upgrade", this.handleUpgrade);
    this.unsubscribe = await this.realtimeBus.subscribe((event) => this.broadcast(event));
    this.heartbeat = setInterval(() => this.pingClients(), 30_000);
  }

  async close(): Promise<void> {
    this.httpServer.off("upgrade", this.handleUpgrade);
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.unsubscribe) await this.unsubscribe();
    for (const client of this.clients) client.socket.close(1001, "Server shutting down");
    this.clients.clear();
    this.server.close();
  }

  private readonly handleUpgrade = async (request: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> => {
    const pathname = new URL(request.url || "/", "http://localhost").pathname;
    if (pathname !== REALTIME_PATH) return;

    try {
      const actor = await this.authenticate(request);
      this.server.handleUpgrade(request, socket, head, (webSocket) => {
        const client: ConnectedClient = { socket: webSocket, actor, alive: true };
        this.clients.add(client);
        console.log(JSON.stringify({
          level: "info",
          event: "whatsapp_realtime.connected",
          userId: actor.id,
          role: actor.role,
          clients: this.clients.size,
        }));
        webSocket.on("pong", () => { client.alive = true; });
        webSocket.on("close", (code, reason) => {
          this.clients.delete(client);
          console.log(JSON.stringify({
            level: "info",
            event: "whatsapp_realtime.closed",
            userId: actor.id,
            code,
            reason: reason.toString() || null,
            clients: this.clients.size,
          }));
        });
        webSocket.on("error", (error) => {
          this.clients.delete(client);
          console.error(JSON.stringify({
            level: "error",
            event: "whatsapp_realtime.socket_error",
            userId: actor.id,
            message: error.message,
            clients: this.clients.size,
          }));
        });
        webSocket.send(JSON.stringify({ type: "CONNECTED", occurredAt: new Date().toISOString() }));
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
    }
  };

  private async authenticate(request: IncomingMessage): Promise<WhatsAppInboxActor> {
    const protocols = `${request.headers["sec-websocket-protocol"] || ""}`
      .split(",")
      .map((value) => value.trim());
    if (!protocols.includes(REALTIME_PROTOCOL)) throw new Error("Missing realtime protocol.");
    const authProtocol = protocols.find((value) => value.startsWith(AUTH_PROTOCOL_PREFIX));
    const token = authProtocol?.slice(AUTH_PROTOCOL_PREFIX.length) || "";
    const payload = JwtAdapter.verifyAccessToken(token);
    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, role: true, branchId: true, isActive: true },
    });
    if (!user?.isActive || !ALLOWED_ROLES.has(user.role)) throw new Error("Unauthorized realtime user.");
    return { id: user.id, role: user.role, branchId: user.branchId };
  }

  private async broadcast(event: WhatsAppRealtimeEvent): Promise<void> {
    if (this.clients.size === 0) return;
    if (event.type === "QUOTE_CUSTOMER_DECISION" && event.quoteDecision && event.audience) {
      const audience = event.audience;
      const payload = JSON.stringify({ ...event, audience: undefined });
      for (const client of this.clients) {
        const canReceive = client.actor.role === "ADMIN"
          || (client.actor.role === "MANAGER" && audience.branchIds.includes(client.actor.branchId))
          || (client.actor.role === "SELLER" && audience.userIds.includes(client.actor.id));
        if (canReceive && client.socket.readyState === WebSocket.OPEN) client.socket.send(payload);
      }
      return;
    }
    if (event.reason === "CONVERSATION_DELETED" && event.deleted && event.audience) {
      const audience = event.audience;
      const payload = JSON.stringify({ ...event, audience: undefined });
      for (const client of this.clients) {
        const canReceive = client.actor.role === "ADMIN"
          || (client.actor.role === "MANAGER" && (
            audience.branchIds.includes(client.actor.branchId)
            || audience.assignedBranchId === client.actor.branchId
            || audience.visibleToUnassignedLeadManagers
          ))
          || (client.actor.role === "SELLER" && (
            audience.userIds.includes(client.actor.id)
            || audience.assignedSellerId === client.actor.id
          ));
        if (canReceive && client.socket.readyState === WebSocket.OPEN) client.socket.send(payload);
      }
      return;
    }
    const conversation = await prisma.whatsAppConversation.findUnique({
      where: { id: event.conversationId },
      select: {
        participantType: true,
        accesses: { select: { userId: true, branchId: true } },
        lead: { select: { assignedSellerId: true, assignedBranchId: true, status: true } },
      },
    });
    if (!conversation) return;

    const userIds = new Set(conversation.accesses.map((access) => access.userId));
    const branchIds = new Set(conversation.accesses.map((access) => access.branchId));
    const payload = JSON.stringify(event);
    for (const client of this.clients) {
      const isExternal = conversation.participantType !== "INTERNAL_USER";
      const unassignedLead = conversation.participantType === "UNKNOWN"
        && !conversation.lead?.assignedSellerId
        && !["CONVERTED", "DISCARDED"].includes(conversation.lead?.status || "");
      const canReceive = isExternal && (
        client.actor.role === "ADMIN"
        || (client.actor.role === "MANAGER" && (
          branchIds.has(client.actor.branchId)
          || conversation.lead?.assignedBranchId === client.actor.branchId
          || unassignedLead
        ))
        || (client.actor.role === "SELLER" && (
          userIds.has(client.actor.id)
          || conversation.lead?.assignedSellerId === client.actor.id
        ))
      );
      if (canReceive && client.socket.readyState === WebSocket.OPEN) client.socket.send(payload);
    }
  }

  private pingClients(): void {
    for (const client of this.clients) {
      if (!client.alive) {
        client.socket.terminate();
        this.clients.delete(client);
        continue;
      }
      client.alive = false;
      client.socket.ping();
    }
  }
}
