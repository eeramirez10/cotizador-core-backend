import type { WhatsAppInboxActor } from "./whatsapp-inbox.entity";

export interface WhatsAppInboundMediaReference {
  url: string;
  mimeType: string;
  index: number;
}

export interface DownloadedWhatsAppMedia {
  content: Uint8Array;
  originalName: string;
  mimeType: string;
}

export interface WhatsAppInboundAttachmentEntity {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: Date;
  quoteExtractedAt: Date | null;
  quoteExtractionCount: number;
  quoteExtractedByUserId: string | null;
  quoteExtractedByName: string | null;
  lastQuoteDraftId: string | null;
}

export interface WhatsAppInboundAttachmentDownload {
  id: string;
  originalName: string;
  mimeType: string;
  storageKey: string;
}

export interface CaptureWhatsAppInboundMediaInput {
  inboundMessageId: string;
  providerMessageId: string;
  media: WhatsAppInboundMediaReference[];
}

export interface FindWhatsAppInboundAttachmentInput {
  attachmentId: string;
  actor: WhatsAppInboxActor;
}

export interface MarkWhatsAppInboundAttachmentQuoteExtractionInput {
  attachmentId: string;
  clientDraftId: string;
  actor: WhatsAppInboxActor;
  extractedAt: Date;
}
