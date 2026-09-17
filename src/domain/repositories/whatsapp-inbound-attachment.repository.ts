import type {
  FindWhatsAppInboundAttachmentInput,
  MarkWhatsAppInboundAttachmentQuoteExtractionInput,
  WhatsAppInboundAttachmentDownload,
  WhatsAppInboundAttachmentEntity,
} from "../entities/whatsapp-inbound-attachment.entity";
import type { StoredFileMetadata } from "./file-attachment.repository";

export abstract class WhatsAppInboundAttachmentRepository {
  abstract findByProviderMediaUrl(providerMediaUrl: string): Promise<WhatsAppInboundAttachmentEntity | null>;

  abstract create(input: {
    inboundMessageId: string;
    providerMediaUrl: string;
    file: StoredFileMetadata;
  }): Promise<WhatsAppInboundAttachmentEntity>;

  abstract findDownload(
    input: FindWhatsAppInboundAttachmentInput,
  ): Promise<WhatsAppInboundAttachmentDownload | null>;

  abstract markQuoteExtraction(
    input: MarkWhatsAppInboundAttachmentQuoteExtractionInput,
  ): Promise<WhatsAppInboundAttachmentEntity | null>;
}
