import assert from "node:assert/strict";
import test from "node:test";
import type { QuoteDocumentLinkPort } from "../src/domain/contracts/quote-document-link.port";
import type { QuoteMessagingPort, SendQuoteWhatsAppMessage } from "../src/domain/contracts/quote-messaging.port";
import type { QuoteEntity } from "../src/domain/entities/quote.entity";
import type { CustomerRepository } from "../src/domain/repositories/customer.repository";
import type { QuoteRepository } from "../src/domain/repositories/quote.repository";
import type { WhatsAppInboxRepository } from "../src/domain/repositories/whatsapp-inbox.repository";
import type { FileAttachmentsUseCase } from "../src/domain/use-cases/file-attachments.use-case";
import type { GetWhatsAppConversationWindowUseCase } from "../src/domain/use-cases/get-whatsapp-conversation-window.use-case";
import { SendQuoteWhatsAppUseCase } from "../src/domain/use-cases/send-quote-whatsapp.use-case";

test("uses the quote contact name instead of the customer company when sending WhatsApp", async () => {
  const quote = {
    id: "10000000-0000-4000-8000-000000000001",
    quoteNumber: "QT-TEST-001",
    status: "QUOTED",
    archivedAt: null,
    nextRevision: null,
    customerId: "20000000-0000-4000-8000-000000000001",
    customerContactId: "30000000-0000-4000-8000-000000000001",
    branchId: "40000000-0000-4000-8000-000000000001",
    createdByUserId: "50000000-0000-4000-8000-000000000001",
    customer: {
      id: "20000000-0000-4000-8000-000000000001",
      displayName: "PROESA, SA DE CV",
      legalName: "PROESA, SA DE CV",
      email: null,
      phone: null,
      whatsapp: "+525500000000",
    },
    customerContact: {
      id: "30000000-0000-4000-8000-000000000001",
      name: "Luz Vázquez",
      email: "luz@proesa.mx",
      phone: null,
      mobile: "+525511112222",
    },
    createdByUser: {
      id: "50000000-0000-4000-8000-000000000001",
      firstName: "Alma",
      lastName: "Martínez",
      branchId: "40000000-0000-4000-8000-000000000001",
      branchCode: "01",
      branchName: "México",
    },
  } as unknown as QuoteEntity;
  let sentMessage: SendQuoteWhatsAppMessage | null = null;
  let recordedContactId: string | null = null;

  const useCase = new SendQuoteWhatsAppUseCase(
    {
      findById: async () => quote,
      recordDeliveryAttempt: async (params: { data: { customerContactId: string | null } }) => {
        recordedContactId = params.data.customerContactId;
        return quote;
      },
    } as unknown as QuoteRepository,
    { findContacts: async () => [] } as unknown as CustomerRepository,
    {
      uploadCustomerQuotePdf: async () => ({ id: "attachment-1" }),
    } as unknown as FileAttachmentsUseCase,
    {
      sendWhatsAppQuote: async (message: SendQuoteWhatsAppMessage) => {
        sentMessage = message;
        return {
          providerMessageId: "SM0001",
          status: "QUEUED" as const,
          errorMessage: null,
          templateSid: "HX0001",
          deliveryMode: "TEMPLATE" as const,
        };
      },
    } as QuoteMessagingPort,
    {
      createToken: () => "signed-token",
    } as QuoteDocumentLinkPort,
    {
      execute: async () => ({
        active: false,
        deliveryMode: "TEMPLATE" as const,
        lastInboundAt: null,
        expiresAt: null,
      }),
    } as GetWhatsAppConversationWindowUseCase,
    {} as WhatsAppInboxRepository,
    "",
  );

  await useCase.execute({
    quoteId: quote.id,
    message: "Te comparto tu cotización.",
    file: {
      originalName: "Cotizacion-QT-TEST-001.pdf",
      mimeType: "application/pdf",
      content: Buffer.from("%PDF-1.4"),
      sizeBytes: 8,
    },
    actor: {
      id: quote.createdByUserId,
      role: "SELLER",
      branchId: quote.branchId,
    },
  });

  assert.ok(sentMessage);
  assert.equal(sentMessage.contactName, "Luz Vázquez");
  assert.equal(sentMessage.recipient, "+525511112222");
  assert.equal(recordedContactId, quote.customerContactId);
});
