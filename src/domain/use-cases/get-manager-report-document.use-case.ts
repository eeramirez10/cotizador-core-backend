import type { ManagerReportDocumentLinkPort } from "../contracts/manager-report-document-link.port";
import type { ManagerReportPdfPort } from "../contracts/manager-report-pdf.port";
import type { ManagerReportSubscriptionRepository } from "../repositories/manager-report-subscription.repository";
import type { BuildManagerReportUseCase } from "./build-manager-report.use-case";

export class GetManagerReportDocumentUseCase {
  constructor(
    private readonly documentLinks: ManagerReportDocumentLinkPort,
    private readonly repository: ManagerReportSubscriptionRepository,
    private readonly buildReport: BuildManagerReportUseCase,
    private readonly pdf: ManagerReportPdfPort,
  ) {}

  async execute(token: string): Promise<Buffer | null> {
    const descriptor = this.documentLinks.verify(token);
    if (!descriptor) return null;
    const subscription = await this.repository.findById(descriptor.subscriptionId);
    if (!subscription) return null;
    const from = new Date(descriptor.from);
    const toExclusive = new Date(descriptor.to);
    if (Number.isNaN(from.getTime()) || Number.isNaN(toExclusive.getTime()) || from >= toExclusive) return null;
    const snapshot = await this.buildReport.execute(subscription, { from, toExclusive });
    return this.pdf.create(snapshot);
  }
}
