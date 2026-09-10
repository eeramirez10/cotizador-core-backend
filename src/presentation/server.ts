import "dotenv/config";
import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import { Envs } from "../config/envs";
import { AppRoutes } from "./app-routes";
import { prisma } from "../infrastructure/database/prisma-client";
import { whatsAppRealtimeBus } from "../infrastructure/realtime/whatsapp-realtime.container";
import { WhatsAppWebSocketGateway } from "../infrastructure/realtime/whatsapp-websocket.gateway";

const app = express();
const server = createServer(app);
const realtimeGateway = new WhatsAppWebSocketGateway(server, whatsAppRealtimeBus);

app.use(
  cors({
    exposedHeaders: ["Content-Disposition", "Content-Type"],
  })
);
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: true }));

app.use("/api", AppRoutes.routes());

void realtimeGateway.start().catch((error) => {
  console.error("whatsapp_realtime_start_failed", error);
});

server.listen(Envs.port, "0.0.0.0", () => {
  // eslint-disable-next-line no-console
  console.log(`cotizador-core-backend running on http://localhost:${Envs.port}`);
});

let stopping = false;
const shutdown = async (signal: string): Promise<void> => {
  if (stopping) return;
  stopping = true;
  console.log(JSON.stringify({ level: "info", event: "server.stopping", signal }));
  await realtimeGateway.close();
  await whatsAppRealtimeBus.close();
  await prisma.$disconnect();
  server.close(() => process.exit(0));
};

process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));
