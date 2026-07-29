import type { UserRole } from "../../infrastructure/database/generated/enums";
import type { FileAttachmentEntity, DownloadableFileEntity } from "../entities/file-attachment.entity";

export interface FileAttachmentActor {
  id: string;
  role: UserRole;
  branchId: string;
}

export interface StoredFileMetadata {
  originalName: string;
  storageKey: string;
  mimeType: string;
  sizeBytes: number;
  checksumSha256: string;
}

export abstract class FileAttachmentRepository {
  abstract createQuoteAttachment(input: {
    clientDraftId: string;
    category: "SOURCE_DOCUMENT" | "SELLER_SUPPLIER_QUOTE";
    clientItemIds: string[];
    file: StoredFileMetadata;
    actor: FileAttachmentActor;
  }): Promise<FileAttachmentEntity>;
  abstract createPurchaseOfferAttachment(input: {
    requisitionId: string;
    purchaseOfferIds: string[];
    file: StoredFileMetadata;
    actor: FileAttachmentActor;
  }): Promise<FileAttachmentEntity>;
  abstract listQuoteDraft(clientDraftId: string, actor: FileAttachmentActor): Promise<FileAttachmentEntity[]>;
  abstract listQuote(quoteId: string, actor: FileAttachmentActor): Promise<FileAttachmentEntity[]>;
  abstract listPurchaseRequisition(requisitionId: string, actor: FileAttachmentActor): Promise<FileAttachmentEntity[]>;
  abstract findDownload(fileId: string, actor: FileAttachmentActor): Promise<DownloadableFileEntity | null>;
  abstract softDelete(fileId: string, actor: FileAttachmentActor): Promise<DownloadableFileEntity | null>;
}
