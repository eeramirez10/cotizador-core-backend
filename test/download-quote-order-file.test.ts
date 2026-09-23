import assert from "node:assert/strict";
import test from "node:test";
import type { QuoteEntity } from "../src/domain/entities/quote.entity";
import type { QuoteRepository } from "../src/domain/repositories/quote.repository";
import type { OrderGenerationRepository } from "../src/domain/repositories/order-generation.repository";
import { DownloadQuoteOrderFileUseCase } from "../src/domain/use-cases/download-quote-order-file.use-case";

test("cancelled quote cannot download a previously generated TXT", async () => {
  const quote = {
    quoteNumber: "QT-123", status: "CANCELLED", captureMethod: "SYSTEM",
    orderStatus: "GENERATED", orderReference: "ORDER-123",
  } as QuoteEntity;
  let fileRead = false;
  const quotes = { findById: async () => quote } as QuoteRepository;
  const files = {
    getOrderFileByFileName: async () => { fileRead = true; return null; },
  } as unknown as OrderGenerationRepository;
  const useCase = new DownloadQuoteOrderFileUseCase(quotes, files);
  await assert.rejects(
    useCase.execute("quote-1", { id: "seller-1", role: "SELLER", branchId: "branch-1" }),
    /cancelled or unapproved/,
  );
  assert.equal(fileRead, false);
});
