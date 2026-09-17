import path from "node:path";
import { FileStoragePort } from "../contracts/file-storage.port";
import { WhatsAppMediaDownloaderPort } from "../contracts/whatsapp-media-downloader.port";
import type {
  CaptureWhatsAppInboundMediaInput,
  WhatsAppInboundAttachmentEntity,
} from "../entities/whatsapp-inbound-attachment.entity";
import { WhatsAppInboundAttachmentRepository } from "../repositories/whatsapp-inbound-attachment.repository";
import { hasValidAttachmentSignature } from "./file-attachments.use-case";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/vnd.ms-excel.sheet.macroenabled.12",
  "application/vnd.ms-excel.sheet.binary.macroenabled.12",
  "image/jpeg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
]);

const VALID_EXTENSIONS = new Set([".pdf", ".doc", ".docx", ".xls", ".xlsx", ".xlsm", ".xlsb", ".csv", ".jpg", ".jpeg", ".png", ".webp", ".txt"]);

export class CaptureWhatsAppInboundMediaUseCase {
  constructor(
    private readonly repository: WhatsAppInboundAttachmentRepository,
    private readonly downloader: WhatsAppMediaDownloaderPort,
    private readonly storage: FileStoragePort,
  ) {}

  async execute(input: CaptureWhatsAppInboundMediaInput): Promise<WhatsAppInboundAttachmentEntity[]> {
    const attachments: WhatsAppInboundAttachmentEntity[] = [];
    for (const media of input.media) {
      const existing = await this.repository.findByProviderMediaUrl(media.url);
      if (existing) {
        attachments.push(existing);
        continue;
      }

      try {
        const downloaded = await this.downloader.download(media, input.providerMessageId);
        this.validate(downloaded.originalName, downloaded.mimeType, downloaded.content);
        const saved = await this.storage.save(downloaded);
        try {
          attachments.push(await this.repository.create({
            inboundMessageId: input.inboundMessageId,
            providerMediaUrl: media.url,
            file: {
              originalName: downloaded.originalName,
              mimeType: downloaded.mimeType,
              ...saved,
            },
          }));
        } catch (error) {
          await this.storage.delete(saved.storageKey).catch(() => undefined);
          throw error;
        }
      } catch (error) {
        console.error("whatsapp_inbound_attachment_failed", {
          inboundMessageId: input.inboundMessageId,
          mediaIndex: media.index,
          message: error instanceof Error ? error.message : "Unknown media error",
        });
      }
    }
    return attachments;
  }

  private validate(originalName: string, mimeType: string, content: Uint8Array): void {
    const extension = path.extname(originalName).toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType) || !VALID_EXTENSIONS.has(extension)) {
      throw new Error(`Unsupported WhatsApp attachment type: ${mimeType}.`);
    }
    if (content.byteLength === 0) throw new Error("WhatsApp attachment is empty.");
    if (mimeType !== "text/plain" && !hasValidAttachmentSignature(mimeType, content)) {
      throw new Error("WhatsApp attachment content does not match its file type.");
    }
  }
}
