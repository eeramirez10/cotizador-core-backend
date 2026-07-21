import { CreateQuoteItemRequestDto } from "./create-quote-item-request.dto";
import { CreateQuoteRequestDto } from "./create-quote-request.dto";

export type SaveQuoteDraftAction = "SAVE_DRAFT" | "SUBMIT_FOR_APPROVAL";

export class SaveQuoteDraftRequestDto {
  constructor(
    public readonly quote: CreateQuoteRequestDto,
    public readonly quoteId: string | null,
    public readonly action: SaveQuoteDraftAction,
    public readonly items: CreateQuoteItemRequestDto[]
  ) {}

  static create(input: unknown): [string?, SaveQuoteDraftRequestDto?] {
    if (!input || typeof input !== "object") return ["Invalid request body."];
    const body = input as Record<string, unknown>;

    const [quoteError, quote] = CreateQuoteRequestDto.create(body);
    if (quoteError || !quote) return [quoteError ?? "Invalid quote data."];

    const action = typeof body.action === "string" ? body.action.trim().toUpperCase() : "";
    if (!(["SAVE_DRAFT", "SUBMIT_FOR_APPROVAL"] as string[]).includes(action)) {
      return ["action must be SAVE_DRAFT or SUBMIT_FOR_APPROVAL."];
    }

    const quoteId = body.quoteId === null || typeof body.quoteId === "undefined"
      ? null
      : typeof body.quoteId === "string"
        ? body.quoteId.trim()
        : "";
    if (body.quoteId !== null && typeof body.quoteId !== "undefined" && !quoteId) {
      return ["quoteId is invalid."];
    }

    if (!Array.isArray(body.items)) return ["items must be an array."];
    const items: CreateQuoteItemRequestDto[] = [];
    for (let index = 0; index < body.items.length; index += 1) {
      const [itemError, item] = CreateQuoteItemRequestDto.create(body.items[index]);
      if (itemError || !item) return [`items[${index}]: ${itemError ?? "is invalid."}`];
      items.push(item);
    }

    return [
      ,
      new SaveQuoteDraftRequestDto(
        quote,
        quoteId,
        action as SaveQuoteDraftAction,
        items
      ),
    ];
  }
}
