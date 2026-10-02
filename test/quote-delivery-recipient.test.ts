import assert from "node:assert/strict";
import test from "node:test";
import type { QuoteEntity } from "../src/domain/entities/quote.entity";
import type { QuoteRepository } from "../src/domain/repositories/quote.repository";
import type { CustomerRepository } from "../src/domain/repositories/customer.repository";
import type { FileAttachmentsUseCase } from "../src/domain/use-cases/file-attachments.use-case";
import type { QuoteMessagingPort, SendQuoteWhatsAppMessage } from "../src/domain/contracts/quote-messaging.port";
import type { QuoteDocumentLinkPort } from "../src/domain/contracts/quote-document-link.port";
import type { GetWhatsAppConversationWindowUseCase } from "../src/domain/use-cases/get-whatsapp-conversation-window.use-case";
import type { WhatsAppInboxRepository } from "../src/domain/repositories/whatsapp-inbox.repository";
import type { QuoteDeliveryAttemptRepository } from "../src/domain/repositories/quote-delivery-attempt.repository";
import { ListQuoteDeliveryAttemptsUseCase } from "../src/domain/use-cases/list-quote-delivery-attempts.use-case";
import { SendQuoteWhatsAppUseCase } from "../src/domain/use-cases/send-quote-whatsapp.use-case";
import { WhatsAppPhone } from "../src/domain/utils/whatsapp-phone";
import { CreateCustomerRequestDto } from "../src/domain/dtos/request/create-customer-request.dto";
import { UpdateCustomerRequestDto } from "../src/domain/dtos/request/update-customer-request.dto";
import { CreateCustomerContactRequestDto } from "../src/domain/dtos/request/create-customer-contact-request.dto";
import { UpdateCustomerContactRequestDto } from "../src/domain/dtos/request/update-customer-contact-request.dto";

const quote = {
  id: "quote-1",
  quoteNumber: "QT-TEST-1",
  status: "QUOTED",
  archivedAt: null,
  nextRevision: null,
  customerId: "customer-1",
  customerContactId: "contact-1",
  branchId: "branch-1",
  createdByUserId: "seller-1",
  customer: { whatsapp: "5544443333", displayName: "Cliente de prueba" },
  customerContact: { id: "contact-1", name: "Otro contacto", mobile: "+525511112222", phone: null },
  createdByUser: { firstName: "Alma", lastName: "Martínez" },
} as unknown as QuoteEntity;

const actor = { id: "seller-1", role: "SELLER" as const, branchId: "branch-1" };

test("normalizes a ten-digit Mexican WhatsApp number", () => {
  assert.equal(WhatsAppPhone.create("5544443333")?.value, "+525544443333");
  assert.equal(WhatsAppPhone.create("+52 55 4444 3333")?.value, "+525544443333");
});

test("normalizes manually entered customer and contact WhatsApp numbers", () => {
  const [customerError, customer] = CreateCustomerRequestDto.create({
    firstName: "Luz", lastName: "Vazquez", whatsapp: "5541142762",
  });
  assert.equal(customerError, undefined);
  assert.equal(customer?.whatsapp, "+525541142762");

  const [withContactError, withContact] = CreateCustomerRequestDto.create({
    firstName: "Luz", lastName: "Vazquez", contacts: [{ name: "Compras", mobile: "5541142762" }],
  });
  assert.equal(withContactError, undefined);
  assert.equal(withContact?.contacts[0]?.mobile, "+525541142762");

  const [updateError, update] = UpdateCustomerRequestDto.create({ whatsapp: "55 4114 2762" });
  assert.equal(updateError, undefined);
  assert.equal(update?.whatsapp, "+525541142762");

  const [contactError, contact] = CreateCustomerContactRequestDto.create({ name: "Luz", mobile: "5541142762" });
  assert.equal(contactError, undefined);
  assert.equal(contact?.mobile, "+525541142762");

  const [contactUpdateError, contactUpdate] = UpdateCustomerContactRequestDto.create({ mobile: "5541142762" });
  assert.equal(contactUpdateError, undefined);
  assert.equal(contactUpdate?.mobile, "+525541142762");
});

test("sends to the explicitly selected customer number, not the quote's other contact", async () => {
  let sent: SendQuoteWhatsAppMessage | null = null;
  let recordedContactId: string | null = "unexpected";
  const useCase = new SendQuoteWhatsAppUseCase(
    {
      findById: async () => quote,
      recordDeliveryAttempt: async (params: { data: { customerContactId: string | null } }) => {
        recordedContactId = params.data.customerContactId;
        return quote;
      },
    } as unknown as QuoteRepository,
    { findContacts: async () => [] } as unknown as CustomerRepository,
    { uploadCustomerQuotePdf: async () => ({ id: "file-1" }) } as unknown as FileAttachmentsUseCase,
    { sendWhatsAppQuote: async (message: SendQuoteWhatsAppMessage) => {
      sent = message;
      return { providerMessageId: "SMtest", status: "DELIVERED" as const, errorMessage: null, templateSid: null, deliveryMode: "FREE_FORM" as const };
    } } as QuoteMessagingPort,
    { createToken: () => "token" } as QuoteDocumentLinkPort,
    { execute: async () => ({ deliveryMode: "FREE_FORM" as const }) } as GetWhatsAppConversationWindowUseCase,
    {} as WhatsAppInboxRepository,
    "",
  );

  const result = await useCase.execute({
    quoteId: quote.id,
    recipient: "5544443333",
    message: "Tu cotización",
    file: { originalName: "quote.pdf", mimeType: "application/pdf", content: Buffer.from("%PDF"), sizeBytes: 4 },
    actor,
  });

  assert.equal(sent?.recipient, "+525544443333");
  assert.equal(result.recipient, "+525544443333");
  assert.equal(recordedContactId, null);
});

test("rejects a recipient that is not the customer's selected number before uploading", async () => {
  let uploaded = false;
  const useCase = new SendQuoteWhatsAppUseCase(
    { findById: async () => quote } as unknown as QuoteRepository,
    { findContacts: async () => [] } as unknown as CustomerRepository,
    { uploadCustomerQuotePdf: async () => { uploaded = true; return { id: "file-1" }; } } as unknown as FileAttachmentsUseCase,
    {} as QuoteMessagingPort,
    {} as QuoteDocumentLinkPort,
    {} as GetWhatsAppConversationWindowUseCase,
    {} as WhatsAppInboxRepository,
    "",
  );
  await assert.rejects(() => useCase.execute({
    quoteId: quote.id,
    recipient: "5588887777",
    message: "Tu cotización",
    file: { originalName: "quote.pdf", mimeType: "application/pdf", content: Buffer.from("%PDF"), sizeBytes: 4 },
    actor,
  }), /selected WhatsApp number changed/);
  assert.equal(uploaded, false);
});

test("does not expose delivery attempts when the quote is outside the actor scope", async () => {
  let listed = false;
  const useCase = new ListQuoteDeliveryAttemptsUseCase(
    { findById: async () => null } as unknown as QuoteRepository,
    { listRecent: async () => { listed = true; return []; } } as QuoteDeliveryAttemptRepository,
  );
  await assert.rejects(() => useCase.execute("quote-1", actor), /Quote not found/);
  assert.equal(listed, false);
});
