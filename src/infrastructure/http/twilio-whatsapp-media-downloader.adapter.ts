import path from "node:path";
import { WhatsAppMediaDownloaderPort } from "../../domain/contracts/whatsapp-media-downloader.port";
import type { DownloadedWhatsAppMedia, WhatsAppInboundMediaReference } from "../../domain/entities/whatsapp-inbound-attachment.entity";

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-excel.sheet.macroenabled.12": ".xlsm",
  "application/vnd.ms-excel.sheet.binary.macroenabled.12": ".xlsb",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "text/plain": ".txt",
  "text/csv": ".csv",
};

export class TwilioWhatsAppMediaDownloaderAdapter extends WhatsAppMediaDownloaderPort {
  constructor(
    private readonly accountSid: string,
    private readonly authToken: string,
    private readonly maxBytes: number,
    private readonly timeoutMs = 30_000,
  ) {
    super();
  }

  async download(
    media: WhatsAppInboundMediaReference,
    providerMessageId: string,
  ): Promise<DownloadedWhatsAppMedia> {
    if (!this.accountSid || !this.authToken) throw new Error("Twilio media credentials are not configured.");
    const url = new URL(media.url);
    if (url.protocol !== "https:" || !this.isTwilioHost(url.hostname)) {
      throw new Error("Invalid Twilio media URL.");
    }
    const response = await fetch(url, {
      headers: { Authorization: `Basic ${Buffer.from(`${this.accountSid}:${this.authToken}`).toString("base64")}` },
      redirect: "follow",
      signal: AbortSignal.timeout(this.timeoutMs),
    });
    if (!response.ok) throw new Error(`Twilio media download failed (${response.status}).`);
    const contentLength = Number(response.headers.get("content-length") || 0);
    if (contentLength > this.maxBytes) throw new Error("WhatsApp attachment exceeds the configured size limit.");
    const content = new Uint8Array(await response.arrayBuffer());
    if (content.byteLength > this.maxBytes) throw new Error("WhatsApp attachment exceeds the configured size limit.");

    const responseMime = this.normalizeMime(response.headers.get("content-type") || "");
    const expectedMime = this.normalizeMime(media.mimeType);
    const mimeType = responseMime && responseMime !== "application/octet-stream" ? responseMime : expectedMime;
    return {
      content,
      mimeType,
      originalName: this.fileName(response.headers.get("content-disposition"), providerMessageId, media.index, mimeType),
    };
  }

  private normalizeMime(value: string): string {
    return value.split(";", 1)[0].trim().toLowerCase();
  }

  private isTwilioHost(hostname: string): boolean {
    return hostname === "api.twilio.com"
      || hostname.endsWith(".twilio.com")
      || hostname.endsWith(".twiliocdn.com");
  }

  private fileName(contentDisposition: string | null, messageId: string, index: number, mimeType: string): string {
    const encoded = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
    const plain = contentDisposition?.match(/filename="?([^";]+)"?/i)?.[1];
    const provided = encoded ? decodeURIComponent(encoded) : plain;
    const fallback = `whatsapp-${messageId}-${index + 1}${EXTENSION_BY_MIME[mimeType] || ""}`;
    const base = path.basename(provided || fallback).replace(/[^a-zA-Z0-9._ -]/g, "_").trim();
    return (base || fallback).slice(0, 255);
  }
}
