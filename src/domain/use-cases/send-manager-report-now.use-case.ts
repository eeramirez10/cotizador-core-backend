import type { ManagerReportDocumentLinkPort } from "../contracts/manager-report-document-link.port";
import type { ManagerReportMessagingPort } from "../contracts/manager-report-messaging.port";
import type { UserRole } from "../../infrastructure/database/generated/enums";
import type { ManagerReportSubscriptionRepository } from "../repositories/manager-report-subscription.repository";
import type { GetWhatsAppConversationWindowUseCase } from "./get-whatsapp-conversation-window.use-case";
import type { BuildManagerReportUseCase } from "./build-manager-report.use-case";
import { resolveCurrentManagerReportPeriod } from "./manager-report-period";
import { WhatsAppPhone } from "../utils/whatsapp-phone";

interface SendManagerReportActor {
  id: string;
  role: UserRole;
}

export interface SendManagerReportNowResult {
  providerMessageId: string;
  status: "QUEUED" | "SENT";
  recipient: string;
  deliveryMode: "FREE_FORM" | "TEMPLATE";
  period: { from: string; to: string; label: string };
}

export class SendManagerReportNowUseCase {
  constructor(
    private readonly repository: ManagerReportSubscriptionRepository,
    private readonly buildReport: BuildManagerReportUseCase,
    private readonly messaging: ManagerReportMessagingPort,
    private readonly documentLinks: ManagerReportDocumentLinkPort,
    private readonly conversationWindow: GetWhatsAppConversationWindowUseCase,
    private readonly publicApiUrl: string,
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(subscriptionId: string, actor: SendManagerReportActor): Promise<SendManagerReportNowResult> {
    if (actor.role !== "ADMIN") throw new Error("Only ADMIN can send management reports.");
    const subscription = await this.repository.findById(subscriptionId);
    if (!subscription) throw new Error("Report subscription not found.");
    if (!subscription.isActive) throw new Error("Activate the report subscription before sending it.");
    if (!subscription.recipient.isActive) throw new Error("Report recipient is inactive.");
    const recipient = WhatsAppPhone.create(subscription.recipient.phone)?.value;
    if (!recipient) throw new Error("The report recipient must have a valid WhatsApp phone number.");

    const period = resolveCurrentManagerReportPeriod(subscription.reportRange, subscription.timezone, this.now());
    const from = period.from.toISOString();
    const to = period.toExclusive.toISOString();
    const snapshot = await this.buildReport.execute(subscription, period);
    const token = this.documentLinks.createToken({ subscriptionId, from, to });
    const fileName = `Reporte-Cotizaciones-${period.label.replace(/[^0-9a-zA-Z_-]+/g, "-")}.pdf`;
    const baseUrl = this.publicApiUrl.replace(/\/+$/, "");
    const reportMediaPath = `${encodeURIComponent(token)}/${encodeURIComponent(fileName)}`;
    const reportUrl = `${baseUrl}/api/public/manager-reports/${reportMediaPath}`;
    const window = await this.conversationWindow.execute(recipient);
    const messageBody = `Hola ${subscription.recipient.fullName}, te compartimos el reporte de rendimiento de cotizaciones correspondiente al periodo ${period.label}.`;

    let result;
    try {
      result = await this.messaging.send({
        recipient,
        recipientName: subscription.recipient.fullName,
        scopeName: snapshot.scopeName,
        periodLabel: period.label,
        generatedCount: snapshot.totals.created,
        quotedMxn: snapshot.totals.quotedMxn,
        quotedUsd: snapshot.totals.quotedUsd,
        reportUrl,
        reportMediaPath,
        messageBody,
        deliveryMode: window.deliveryMode,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message.slice(0, 1000) : "Unknown report delivery error.";
      await this.repository.recordSendAttempt(subscriptionId, {
        actorUserId: actor.id,
        status: "FAILED",
        recipient,
        providerMessageId: null,
        deliveryMode: window.deliveryMode,
        periodFrom: from,
        periodTo: to,
        errorMessage,
      }).catch(() => undefined);
      throw error;
    }

    await this.repository.recordSendAttempt(subscriptionId, {
      actorUserId: actor.id,
      status: result.status,
      recipient,
      providerMessageId: result.providerMessageId,
      deliveryMode: result.deliveryMode,
      periodFrom: from,
      periodTo: to,
      errorMessage: null,
    }).catch((error) => {
      console.error("manager_report_send_audit_failed", error);
    });
    return {
      providerMessageId: result.providerMessageId,
      status: result.status,
      recipient,
      deliveryMode: result.deliveryMode,
      period: { from, to, label: period.label },
    };
  }
}
