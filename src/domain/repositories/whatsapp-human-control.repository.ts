export interface ReleasedWhatsAppHumanControl {
  conversationId: string;
  assistantJobQueued: boolean;
}

export abstract class WhatsAppHumanControlRepository {
  abstract releaseExpired(input: {
    now: Date;
    assistantEnabled: boolean;
  }): Promise<ReleasedWhatsAppHumanControl[]>;
}
