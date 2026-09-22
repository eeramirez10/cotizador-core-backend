import {
  WhatsAppAssistantAgentPort,
  type WhatsAppAssistantAgentInput,
  type WhatsAppAssistantAgentResult,
} from "../../domain/contracts/whatsapp-assistant-agent.port";

export class AiPlatformWhatsAppAssistantGateway extends WhatsAppAssistantAgentPort {
  constructor(
    private readonly baseUrl: string,
    private readonly timeoutMs: number,
    private readonly internalApiKey: string,
  ) {
    super();
  }

  async respond(input: WhatsAppAssistantAgentInput): Promise<WhatsAppAssistantAgentResult> {
    const capabilities = input.principal.audience === "CUSTOMER"
      ? input.principal.sharedCustomerPhone
        ? ["CUSTOMER_QUOTES", "CUSTOMER_QUOTE_ACTIONS"]
        : ["CUSTOMER_QUOTES", "CUSTOMER_QUOTE_ACTIONS", "QUOTE_REQUESTS", ...(input.principal.customerSource === "LOCAL" ? ["CUSTOMER_ONBOARDING"] : [])]
      : input.principal.audience === "INTERNAL_USER" && input.principal.isVerified && input.principal.role !== "PURCHASING"
        ? ["INTERNAL_REPORTS", "INTERNAL_QUOTES"]
        : input.principal.audience === "INTERNAL_USER"
          ? ["INTERNAL_VERIFICATION"]
          : input.principal.audience === "UNKNOWN"
            ? ["LEAD_INTAKE", "QUOTE_REQUESTS"]
            : [];
    const response = await fetch(
      `${this.baseUrl.replace(/\/+$/, "")}/api/v1/assistants/whatsapp/respond`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-api-key": this.internalApiKey },
        body: JSON.stringify({
          turnId: input.turnId,
          conversationId: input.conversationId,
          message: input.message,
          mediaCount: input.mediaCount,
          attachments: input.attachments,
          previousResponseId: input.previousResponseId,
          principal: {
            audience: input.principal.audience,
            isVerified: input.principal.isVerified,
            sharedCustomerPhone: input.principal.sharedCustomerPhone === true,
            capabilities,
          },
        }),
        signal: AbortSignal.timeout(this.timeoutMs),
      },
    );
    const payload = await response.json().catch(() => ({})) as Record<string, unknown>;
    if (!response.ok) {
      throw new Error(typeof payload.error === "string" ? payload.error : `AI Platform failed (${response.status}).`);
    }
    const responseId = typeof payload.responseId === "string" ? payload.responseId : "";
    const text = typeof payload.text === "string" ? payload.text.trim() : "";
    if (!responseId || !text) throw new Error("AI Platform returned an incomplete assistant response.");
    return { responseId, text };
  }
}
