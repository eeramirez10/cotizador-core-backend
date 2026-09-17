import type { DownloadedWhatsAppMedia, WhatsAppInboundMediaReference } from "../entities/whatsapp-inbound-attachment.entity";

export abstract class WhatsAppMediaDownloaderPort {
  abstract download(
    media: WhatsAppInboundMediaReference,
    providerMessageId: string,
  ): Promise<DownloadedWhatsAppMedia>;
}
