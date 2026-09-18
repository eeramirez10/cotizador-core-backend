export interface WhatsAppInternalAlertMessage {
  recipient: string;
  sellerName: string;
  eventLabel: string;
  customerName: string;
  reference: string;
  detail: string;
}

export interface WhatsAppInternalAlertDelivery {
  providerMessageId: string;
}

export abstract class WhatsAppInternalAlertMessagingPort {
  abstract isConfigured(): boolean;
  abstract send(message: WhatsAppInternalAlertMessage): Promise<WhatsAppInternalAlertDelivery>;
}
