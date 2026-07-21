import type { QuoteStatus } from "../../../infrastructure/database/generated/enums";

interface SaveQuoteDraftResponseProps {
  id: string;
  quoteNumber: string;
  clientDraftId: string;
  status: QuoteStatus;
}

export class SaveQuoteDraftResponseDto {
  constructor(private readonly result: SaveQuoteDraftResponseProps) {}

  toJSON() {
    return { ...this.result };
  }
}
