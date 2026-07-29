import path from "node:path";
import { FileStoragePort } from "../contracts/file-storage.port";
import type { FileAttachmentActor } from "../repositories/file-attachment.repository";
import { FileAttachmentRepository } from "../repositories/file-attachment.repository";

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const ALLOWED_EXTENSIONS = new Set([".pdf", ".xls", ".xlsx", ".jpg", ".jpeg", ".png", ".webp"]);
const MIME_EXTENSIONS: Record<string, Set<string>> = {
  "application/pdf": new Set([".pdf"]),
  "application/vnd.ms-excel": new Set([".xls"]),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": new Set([".xlsx"]),
  "image/jpeg": new Set([".jpg", ".jpeg"]),
  "image/png": new Set([".png"]),
  "image/webp": new Set([".webp"]),
};

export interface UploadedFileInput {
  originalName: string;
  mimeType: string;
  content: Uint8Array;
  sizeBytes: number;
}

export class FileAttachmentsUseCase {
  constructor(
    private readonly repository: FileAttachmentRepository,
    private readonly storage: FileStoragePort,
  ) {}

  async uploadQuoteSource(clientDraftId: string, file: UploadedFileInput, actor: FileAttachmentActor) {
    return this.uploadQuote(clientDraftId, "SOURCE_DOCUMENT", [], file, actor);
  }

  async uploadSellerQuote(
    clientDraftId: string,
    clientItemIds: string[],
    file: UploadedFileInput,
    actor: FileAttachmentActor,
  ) {
    const itemIds = this.normalizeIds(clientItemIds);
    if (itemIds.length === 0) throw new Error("At least one quote item is required.");
    return this.uploadQuote(clientDraftId, "SELLER_SUPPLIER_QUOTE", itemIds, file, actor);
  }

  async uploadPurchaseOffer(
    requisitionId: string,
    purchaseOfferIds: string[],
    file: UploadedFileInput,
    actor: FileAttachmentActor,
  ) {
    const offerIds = this.normalizeIds(purchaseOfferIds);
    if (offerIds.length === 0) throw new Error("At least one supplier offer is required.");
    this.validateFile(file);
    const saved = await this.storage.save({ content: file.content, originalName: file.originalName, mimeType: file.mimeType });
    try {
      return await this.repository.createPurchaseOfferAttachment({
        requisitionId,
        purchaseOfferIds: offerIds,
        file: {
          originalName: file.originalName,
          mimeType: file.mimeType,
          ...saved,
        },
        actor,
      });
    } catch (error) {
      await this.storage.delete(saved.storageKey).catch(() => undefined);
      throw error;
    }
  }

  listQuoteDraft(clientDraftId: string, actor: FileAttachmentActor) {
    return this.repository.listQuoteDraft(clientDraftId, actor);
  }

  listQuote(quoteId: string, actor: FileAttachmentActor) {
    return this.repository.listQuote(quoteId, actor);
  }

  listPurchaseRequisition(requisitionId: string, actor: FileAttachmentActor) {
    return this.repository.listPurchaseRequisition(requisitionId, actor);
  }

  async download(fileId: string, actor: FileAttachmentActor) {
    const metadata = await this.repository.findDownload(fileId, actor);
    if (!metadata) throw new Error("Attachment not found.");
    const stored = await this.storage.read(metadata.storageKey);
    if (!stored) throw new Error("Attachment content not found.");
    return { ...metadata, content: stored.content };
  }

  async delete(fileId: string, actor: FileAttachmentActor) {
    const metadata = await this.repository.softDelete(fileId, actor);
    if (!metadata) throw new Error("Attachment not found or cannot be deleted.");
    await this.storage.delete(metadata.storageKey);
  }

  private async uploadQuote(
    clientDraftId: string,
    category: "SOURCE_DOCUMENT" | "SELLER_SUPPLIER_QUOTE",
    clientItemIds: string[],
    file: UploadedFileInput,
    actor: FileAttachmentActor,
  ) {
    const normalizedDraftId = clientDraftId.trim();
    if (!normalizedDraftId || normalizedDraftId.length > 80) throw new Error("Invalid client draft id.");
    this.validateFile(file);
    const saved = await this.storage.save({ content: file.content, originalName: file.originalName, mimeType: file.mimeType });
    try {
      return await this.repository.createQuoteAttachment({
        clientDraftId: normalizedDraftId,
        category,
        clientItemIds,
        file: {
          originalName: file.originalName,
          mimeType: file.mimeType,
          ...saved,
        },
        actor,
      });
    } catch (error) {
      await this.storage.delete(saved.storageKey).catch(() => undefined);
      throw error;
    }
  }

  private validateFile(file: UploadedFileInput): void {
    const extension = path.extname(file.originalName).toLowerCase();
    if (
      !file.originalName.trim()
      || path.basename(file.originalName) !== file.originalName
      || file.originalName.length > 255
      || !ALLOWED_EXTENSIONS.has(extension)
      || !ALLOWED_MIME_TYPES.has(file.mimeType)
      || !MIME_EXTENSIONS[file.mimeType]?.has(extension)
    ) {
      throw new Error("Unsupported attachment type.");
    }
    if (file.sizeBytes <= 0 || file.content.byteLength !== file.sizeBytes) throw new Error("Attachment is empty or incomplete.");
    if (!this.hasValidSignature(file.mimeType, file.content)) throw new Error("Attachment content does not match its file type.");
  }

  private hasValidSignature(mimeType: string, content: Uint8Array): boolean {
    const bytes = Buffer.from(content.buffer, content.byteOffset, content.byteLength);
    if (mimeType === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    if (mimeType === "application/vnd.ms-excel") return bytes.subarray(0, 8).equals(Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]));
    if (mimeType === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet") return bytes[0] === 0x50 && bytes[1] === 0x4b;
    if (mimeType === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    if (mimeType === "image/webp") return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
    return false;
  }

  private normalizeIds(ids: string[]): string[] {
    return [...new Set(ids.map((id) => id.trim()).filter((id) => id.length > 0 && id.length <= 80))];
  }
}
