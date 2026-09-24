import type { Server as HttpServer, IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { WebSocket, WebSocketServer } from "ws";
import { JwtAdapter } from "../adapters/jwt.adapter";
import { prisma } from "../database/prisma-client";
import type { WhatsAppRealtimeBus } from "./whatsapp-realtime.bus";

const REALTIME_PATH = "/api/notifications/realtime";
const REALTIME_PROTOCOL = "tuvansa-realtime";

export class SystemNotificationsWebSocketGateway {
  private readonly clients = new Map<WebSocket, { userId: string; alive: boolean }>();
  private readonly server = new WebSocketServer({
    noServer: true,
    handleProtocols: (protocols) => protocols.has(REALTIME_PROTOCOL) ? REALTIME_PROTOCOL : false,
  });
  private unsubscribe: (() => Promise<void>) | null = null;
  private heartbeat: NodeJS.Timeout | null = null;

  constructor(private readonly httpServer: HttpServer, private readonly realtimeBus: WhatsAppRealtimeBus) {}

  async start(): Promise<void> {
    this.httpServer.on("upgrade", this.handleUpgrade);
    this.unsubscribe = await this.realtimeBus.subscribe(async (event) => {
      if (event.type !== "SYSTEM_NOTIFICATION_CREATED" || !event.systemNotification) return;
      const { recipientUserId, ...notification } = event.systemNotification;
      if (!(await prisma.user.findFirst({ where: { id: recipientUserId, isActive: true }, select: { id: true } }))) return;
      const payload = JSON.stringify({ type: event.type, occurredAt: event.occurredAt, notification });
      for (const [socket, client] of this.clients) {
        if (client.userId === recipientUserId && socket.readyState === WebSocket.OPEN) socket.send(payload);
      }
    });
    this.heartbeat = setInterval(() => this.pingClients(), 30_000);
  }

  async close(): Promise<void> {
    this.httpServer.off("upgrade", this.handleUpgrade);
    if (this.heartbeat) clearInterval(this.heartbeat);
    if (this.unsubscribe) await this.unsubscribe();
    for (const socket of this.clients.keys()) socket.close(1001, "Server shutting down");
    this.clients.clear();
    this.server.close();
  }

  private readonly handleUpgrade = async (request: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> => {
    if (new URL(request.url || "/", "http://localhost").pathname !== REALTIME_PATH) return;
    try {
      const protocols = `${request.headers["sec-websocket-protocol"] || ""}`.split(",").map((value) => value.trim());
      const token = protocols.find((value) => value.startsWith("auth."))?.slice(5);
      if (!protocols.includes(REALTIME_PROTOCOL) || !token) throw new Error("Missing credentials.");
      const payload = JwtAdapter.verifyAccessToken(token);
      const user = await prisma.user.findFirst({ where: { id: payload.sub, isActive: true }, select: { id: true } });
      if (!user) throw new Error("Unauthorized user.");
      this.server.handleUpgrade(request, socket, head, (webSocket) => {
        const client = { userId: user.id, alive: true };
        this.clients.set(webSocket, client);
        webSocket.on("pong", () => { client.alive = true; });
        webSocket.on("close", () => this.clients.delete(webSocket));
        webSocket.on("error", () => this.clients.delete(webSocket));
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\nConnection: close\r\n\r\n");
      socket.destroy();
    }
  };

  private pingClients(): void {
    for (const [socket, client] of this.clients) {
      if (!client.alive) {
        socket.terminate();
        this.clients.delete(socket);
        continue;
      }
      client.alive = false;
      socket.ping();
    }
  }
}
