export type AttachmentCategory =
  | "SOURCE_DOCUMENT"
  | "SELLER_SUPPLIER_QUOTE"
  | "PURCHASE_SUPPLIER_PROPOSAL";

export interface FileAttachmentEntity {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
  category: AttachmentCategory;
  clientDraftId: string | null;
  quoteId: string | null;
  clientItemIds: string[];
  purchaseOfferIds: string[];
  uploadedByUserId: string;
  uploadedByName: string;
  createdAt: Date;
}

export interface DownloadableFileEntity {
  id: string;
  originalName: string;
  storageKey: string;
  mimeType: string;
}
