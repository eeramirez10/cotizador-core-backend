import {
  QuoteDeliveryAttemptStatus,
  QuoteDeliveryChannel,
} from "../../../infrastructure/database/generated/enums";

interface RegisterQuoteDeliveryAttemptRequestDtoProps {
  channel: QuoteDeliveryChannel;
  recipient: string;
  status: QuoteDeliveryAttemptStatus;
  providerMessageId: string | null;
  errorMessage: string | null;
  note: string | null;
}

export class RegisterQuoteDeliveryAttemptRequestDto {
  public readonly channel: QuoteDeliveryChannel;
  public readonly recipient: string;
  public readonly status: QuoteDeliveryAttemptStatus;
  public readonly providerMessageId: string | null;
  public readonly errorMessage: string | null;
  public readonly note: string | null;

  constructor(props: RegisterQuoteDeliveryAttemptRequestDtoProps) {
    this.channel = props.channel;
    this.recipient = props.recipient;
    this.status = props.status;
    this.providerMessageId = props.providerMessageId;
    this.errorMessage = props.errorMessage;
    this.note = props.note;
  }

  static create(input: unknown): [string?, RegisterQuoteDeliveryAttemptRequestDto?] {
    if (!input || typeof input !== "object") {
      return ["Invalid request body."];
    }

    const body = input as Record<string, unknown>;

    const channelRaw = typeof body.channel === "string" ? body.channel.trim().toUpperCase() : "";
    if (!Object.values(QuoteDeliveryChannel).includes(channelRaw as QuoteDeliveryChannel)) {
      return ["channel is invalid."];
    }

    const recipient = typeof body.recipient === "string" ? body.recipient.trim() : "";
    if (!recipient) {
      return ["recipient is required."];
    }

    const statusRaw = typeof body.status === "string" ? body.status.trim().toUpperCase() : "SENT";
    if (!Object.values(QuoteDeliveryAttemptStatus).includes(statusRaw as QuoteDeliveryAttemptStatus)) {
      return ["status is invalid."];
    }

    const providerMessageId =
      typeof body.providerMessageId === "string" && body.providerMessageId.trim().length > 0
        ? body.providerMessageId.trim()
        : null;

    const errorMessage =
      typeof body.errorMessage === "string" && body.errorMessage.trim().length > 0
        ? body.errorMessage.trim()
        : null;

    const note = typeof body.note === "string" && body.note.trim().length > 0 ? body.note.trim() : null;

    return [
      ,
      new RegisterQuoteDeliveryAttemptRequestDto({
        channel: channelRaw as QuoteDeliveryChannel,
        recipient,
        status: statusRaw as QuoteDeliveryAttemptStatus,
        providerMessageId,
        errorMessage,
        note,
      }),
    ];
  }
}
