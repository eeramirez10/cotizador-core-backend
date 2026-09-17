import { FileStoragePort } from "../contracts/file-storage.port";
import type { WhatsAppInboxActor } from "../entities/whatsapp-inbox.entity";
import { WhatsAppInboundAttachmentRepository } from "../repositories/whatsapp-inbound-attachment.repository";

export class DownloadWhatsAppInboundAttachmentUseCase {
  constructor(
    private readonly repository: WhatsAppInboundAttachmentRepository,
    private readonly storage: FileStoragePort,
  ) {}

  async execute(attachmentId: string, actor: WhatsAppInboxActor) {
    const id = attachmentId.trim();
    if (!id) throw new Error("Attachment id is required.");
    const metadata = await this.repository.findDownload({ attachmentId: id, actor });
    if (!metadata) throw new Error("WhatsApp attachment not found.");
    const stored = await this.storage.read(metadata.storageKey);
    if (!stored) throw new Error("WhatsApp attachment content not found.");
    return { ...metadata, content: stored.content };
  }
}
