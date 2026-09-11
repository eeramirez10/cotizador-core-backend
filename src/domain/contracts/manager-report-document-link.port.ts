export interface ManagerReportDocumentDescriptor {
  subscriptionId: string;
  from: string;
  to: string;
}

export abstract class ManagerReportDocumentLinkPort {
  abstract createToken(descriptor: ManagerReportDocumentDescriptor): string;
  abstract verify(token: string): ManagerReportDocumentDescriptor | null;
}
