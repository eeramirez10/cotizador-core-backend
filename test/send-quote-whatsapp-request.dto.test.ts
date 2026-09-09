import assert from "node:assert/strict";
import test from "node:test";
import { SendQuoteWhatsAppRequestDto } from "../src/domain/dtos/request/send-quote-whatsapp-request.dto";

test("accepts and trims a WhatsApp delivery message", () => {
  const [error, dto] = SendQuoteWhatsAppRequestDto.create({
    contactId: "  contact-1  ",
    message: "  Mensaje para el cliente.  ",
  });

  assert.equal(error, undefined);
  assert.equal(dto?.contactId, "contact-1");
  assert.equal(dto?.message, "Mensaje para el cliente.");
});

test("rejects an empty WhatsApp delivery message", () => {
  const [error, dto] = SendQuoteWhatsAppRequestDto.create({ message: "   " });

  assert.equal(error, "message is required.");
  assert.equal(dto, undefined);
});

test("rejects WhatsApp delivery messages longer than 1500 characters", () => {
  const [error, dto] = SendQuoteWhatsAppRequestDto.create({ message: "a".repeat(1501) });

  assert.equal(error, "message must not exceed 1500 characters.");
  assert.equal(dto, undefined);
});
