import assert from "node:assert/strict";
import test from "node:test";
import { AiPlatformWhatsAppAssistantGateway } from "../src/infrastructure/http/ai-platform-whatsapp-assistant.gateway";
import type { WhatsAppAssistantAgentInput } from "../src/domain/contracts/whatsapp-assistant-agent.port";

const input = (): WhatsAppAssistantAgentInput => ({
  turnId: "turn-1",
  conversationId: "conversation-1",
  participantPhone: "+525512345678",
  message: "Hola",
  mediaCount: 0,
  hasUnsupportedAudio: false,
  attachments: [],
  previousResponseId: null,
  isFirstAssistantTurn: true,
  principal: {
    audience: "CUSTOMER",
    displayName: "Luz Vázquez",
    phoneE164: "+525512345678",
    userId: null,
    role: null,
    branchId: null,
    branchName: null,
    reportScope: null,
    reportBranchId: null,
    reportRange: null,
    isVerified: false,
    customerId: "customer-1",
    customerContactId: "contact-1",
    customerContactName: "Luz Vázquez",
  },
});

test("personalizes a first greeting locally without sending the stored contact name to AI", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody = "";
  globalThis.fetch = async (_url, options) => {
    requestBody = String(options?.body);
    return new Response(JSON.stringify({ responseId: "resp-1", text: "¡Hola, {{CONTACT_NAME}}! Soy el asistente de Tuvansa." }), { status: 200 });
  };
  try {
    const gateway = new AiPlatformWhatsAppAssistantGateway("http://localhost:4700", 1000, "test-key");
    const response = await gateway.respond(input());
    assert.equal(response.text, "¡Hola, Luz Vázquez! Soy el asistente de Tuvansa.");
    assert.equal(JSON.parse(requestBody).principal.hasKnownContactName, true);
    assert.doesNotMatch(requestBody, /Luz Vázquez/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("never supplies a contact name when the phone is shared", async () => {
  const originalFetch = globalThis.fetch;
  let requestBody = "";
  globalThis.fetch = async (_url, options) => {
    requestBody = String(options?.body);
    return new Response(JSON.stringify({ responseId: "resp-2", text: "¡Hola! Bienvenido a Tuvansa." }), { status: 200 });
  };
  try {
    const gateway = new AiPlatformWhatsAppAssistantGateway("http://localhost:4700", 1000, "test-key");
    const request = input();
    request.principal.sharedCustomerPhone = true;
    const response = await gateway.respond(request);
    assert.equal(response.text, "¡Hola! Bienvenido a Tuvansa.");
    assert.equal(JSON.parse(requestBody).principal.hasKnownContactName, false);
    assert.doesNotMatch(requestBody, /Luz Vázquez/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
