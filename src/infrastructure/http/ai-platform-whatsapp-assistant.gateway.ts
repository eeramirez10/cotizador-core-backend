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
    const response = await fetch(
      `${this.baseUrl.replace(/\/+$/, "")}/api/v1/assistants/customer-whatsapp/respond`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-internal-api-key": this.internalApiKey },
        body: JSON.stringify(input),
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
