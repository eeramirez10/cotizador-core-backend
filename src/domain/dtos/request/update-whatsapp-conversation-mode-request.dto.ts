import type { WhatsAppConversationMode } from "../../../infrastructure/database/generated/enums";

export class UpdateWhatsAppConversationModeRequestDto {
  private constructor(public readonly mode: WhatsAppConversationMode) {}

  static create(input: unknown): [string?, UpdateWhatsAppConversationModeRequestDto?] {
    const value = input && typeof input === "object" ? input as Record<string, unknown> : {};
    const mode = typeof value.mode === "string" ? value.mode.trim().toUpperCase() : "";
    if (mode !== "AI" && mode !== "HUMAN") return ["mode must be AI or HUMAN."];
    return [undefined, new UpdateWhatsAppConversationModeRequestDto(mode)];
  }
}
