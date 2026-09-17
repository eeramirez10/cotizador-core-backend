import assert from "node:assert/strict";
import test from "node:test";
import type {
  WhatsAppInboundAttachmentEntity,
} from "../src/domain/entities/whatsapp-inbound-attachment.entity";
import { WhatsAppInboundAttachmentRepository } from "../src/domain/repositories/whatsapp-inbound-attachment.repository";
import { MarkWhatsAppInboundAttachmentQuoteExtractionUseCase } from "../src/domain/use-cases/mark-whatsapp-inbound-attachment-quote-extraction.use-case";

const attachment: WhatsAppInboundAttachmentEntity = {
  id: "11111111-1111-4111-8111-111111111111",
  originalName: "materiales.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
  createdAt: new Date("2026-09-17T12:00:00.000Z"),
  quoteExtractedAt: new Date("2026-09-17T12:05:00.000Z"),
  quoteExtractionCount: 1,
  quoteExtractedByUserId: "22222222-2222-4222-8222-222222222222",
  quoteExtractedByName: "Alma Martinez",
  lastQuoteDraftId: "33333333-3333-4333-8333-333333333333",
};

class AttachmentRepositoryStub extends WhatsAppInboundAttachmentRepository {
  marked = false;
  async findByProviderMediaUrl() { return null; }
  async create() { return attachment; }
  async findDownload() { return null; }
  async markQuoteExtraction() {
    this.marked = true;
    return attachment;
  }
}

test("seller records a successful quote extraction for a WhatsApp attachment", async () => {
  const repository = new AttachmentRepositoryStub();
  const useCase = new MarkWhatsAppInboundAttachmentQuoteExtractionUseCase(repository);
  const result = await useCase.execute(
    attachment.id,
    attachment.lastQuoteDraftId!,
    { id: attachment.quoteExtractedByUserId!, role: "SELLER", branchId: "44444444-4444-4444-8444-444444444444" },
  );
  assert.equal(repository.marked, true);
  assert.equal(result.quoteExtractionCount, 1);
});

test("non seller cannot record a quote extraction", async () => {
  const useCase = new MarkWhatsAppInboundAttachmentQuoteExtractionUseCase(new AttachmentRepositoryStub());
  await assert.rejects(
    () => useCase.execute(
      attachment.id,
      attachment.lastQuoteDraftId!,
      { id: attachment.quoteExtractedByUserId!, role: "MANAGER", branchId: "44444444-4444-4444-8444-444444444444" },
    ),
    /Only SELLER/,
  );
});
