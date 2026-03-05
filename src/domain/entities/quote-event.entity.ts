import type { QuoteStatus } from "../../infrastructure/database/generated/enums";

export interface QuoteEventActorSummary {
  id: string;
  firstName: string;
  lastName: string;
}

export interface QuoteEventEntity {
  id: string;
  quoteId: string;
  status: QuoteStatus;
  note: string | null;
  actorUserId: string | null;
  createdAt: Date;
  actorUser: QuoteEventActorSummary | null;
}
