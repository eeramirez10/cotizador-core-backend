import { Envs } from "../../config/envs";
import { WhatsAppRealtimeBus } from "./whatsapp-realtime.bus";

export const whatsAppRealtimeBus = new WhatsAppRealtimeBus(
  Envs.realtimeRedisUrl,
  Envs.realtimeRedisChannel,
);
