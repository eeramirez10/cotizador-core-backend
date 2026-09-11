export interface SendManagerReportMessage {
  recipient: string;
  recipientName: string;
  periodLabel: string;
  reportUrl: string;
  messageBody: string;
  deliveryMode: "FREE_FORM" | "TEMPLATE";
}

export interface ManagerReportMessageResult {
  providerMessageId: string;
  status: "QUEUED" | "SENT";
  templateSid: string | null;
  deliveryMode: "FREE_FORM" | "TEMPLATE";
}

export abstract class ManagerReportMessagingPort {
  abstract send(message: SendManagerReportMessage): Promise<ManagerReportMessageResult>;
}
