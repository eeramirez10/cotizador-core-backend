import assert from "node:assert/strict";
import test from "node:test";
import { FileStoragePort, type SaveFileInput, type SavedFile, type StoredFileContent } from "../src/domain/contracts/file-storage.port";
import { WhatsAppMediaDownloaderPort } from "../src/domain/contracts/whatsapp-media-downloader.port";
import type { DownloadedWhatsAppMedia, WhatsAppInboundAttachmentEntity, WhatsAppInboundMediaReference } from "../src/domain/entities/whatsapp-inbound-attachment.entity";
import { WhatsAppInboundAttachmentRepository } from "../src/domain/repositories/whatsapp-inbound-attachment.repository";
import { CaptureWhatsAppInboundMediaUseCase } from "../src/domain/use-cases/capture-whatsapp-inbound-media.use-case";

const createdAt = new Date("2026-09-14T22:00:00.000Z");

class AttachmentRepositoryStub extends WhatsAppInboundAttachmentRepository {
  stored: WhatsAppInboundAttachmentEntity | null = null;
  creates = 0;

  async findByProviderMediaUrl(): Promise<WhatsAppInboundAttachmentEntity | null> {
    return this.stored;
  }

  async create(input: Parameters<WhatsAppInboundAttachmentRepository["create"]>[0]) {
    this.creates += 1;
    this.stored = {
      id: "11111111-1111-4111-8111-111111111111",
      originalName: input.file.originalName,
      mimeType: input.file.mimeType,
      sizeBytes: input.file.sizeBytes,
      createdAt,
      quoteExtractedAt: null,
      quoteExtractionCount: 0,
      quoteExtractedByUserId: null,
      quoteExtractedByName: null,
      lastQuoteDraftId: null,
    };
    return this.stored;
  }

  async findDownload() {
    return null;
  }

  async markQuoteExtraction() {
    return this.stored;
  }
}

class MediaDownloaderStub extends WhatsAppMediaDownloaderPort {
  calls = 0;

  async download(_media: WhatsAppInboundMediaReference): Promise<DownloadedWhatsAppMedia> {
    this.calls += 1;
    return {
      content: new TextEncoder().encode("%PDF-1.4\n% test"),
      originalName: "cotizacion-cliente.pdf",
      mimeType: "application/pdf",
    };
  }
}

class FileStorageStub extends FileStoragePort {
  saves = 0;

  async save(input: SaveFileInput): Promise<SavedFile> {
    this.saves += 1;
    return {
      storageKey: "whatsapp/cotizacion-cliente.pdf",
      sizeBytes: input.content.byteLength,
      checksumSha256: "a".repeat(64),
    };
  }

  async read(): Promise<StoredFileContent | null> {
    return null;
  }

  async delete(): Promise<void> {}
}

test("stores inbound WhatsApp PDF once when Twilio retries the webhook", async () => {
  const repository = new AttachmentRepositoryStub();
  const downloader = new MediaDownloaderStub();
  const storage = new FileStorageStub();
  const useCase = new CaptureWhatsAppInboundMediaUseCase(repository, downloader, storage);
  const input = {
    inboundMessageId: "22222222-2222-4222-8222-222222222222",
    providerMessageId: "SM123",
    media: [{ index: 0, url: "https://api.twilio.com/media/1", mimeType: "application/pdf" }],
  };

  const first = await useCase.execute(input);
  const repeated = await useCase.execute(input);

  assert.equal(first[0]?.originalName, "cotizacion-cliente.pdf");
  assert.deepEqual(repeated, first);
  assert.equal(downloader.calls, 1);
  assert.equal(storage.saves, 1);
  assert.equal(repository.creates, 1);
});
