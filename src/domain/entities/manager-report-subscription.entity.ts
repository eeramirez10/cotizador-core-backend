import type {
  ManagerReportFrequency,
  ManagerReportRange,
  ManagerReportScope,
  ManagerReportType,
  UserRole,
} from "../../infrastructure/database/generated/enums";

interface ReportUserSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  role: UserRole;
  isActive: boolean;
  branch: { id: string; code: string; name: string };
}

interface AuditUserSummary {
  id: string;
  fullName: string;
}

export interface ManagerReportSubscriptionProps {
  id: string;
  reportType: ManagerReportType;
  recipient: ReportUserSummary;
  scope: ManagerReportScope;
  branch: { id: string; code: string; name: string } | null;
  frequency: ManagerReportFrequency;
  reportRange: ManagerReportRange;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  sendHour: number;
  sendMinute: number;
  timezone: string;
  isActive: boolean;
  createdBy: AuditUserSummary;
  updatedBy: AuditUserSummary | null;
  createdAt: Date;
  updatedAt: Date;
}

export class ManagerReportSubscriptionEntity {
  constructor(private readonly props: ManagerReportSubscriptionProps) {}

  get id(): string { return this.props.id; }
  get recipientUserId(): string { return this.props.recipient.id; }
  get reportType(): ManagerReportType { return this.props.reportType; }
  get scope(): ManagerReportScope { return this.props.scope; }
  get branchId(): string | null { return this.props.branch?.id ?? null; }
  get isActive(): boolean { return this.props.isActive; }
  get recipient() { return this.props.recipient; }
  get branch() { return this.props.branch; }
  get frequency(): ManagerReportFrequency { return this.props.frequency; }
  get reportRange(): ManagerReportRange { return this.props.reportRange; }
  get timezone(): string { return this.props.timezone; }

  toJSON() {
    return {
      ...this.props,
      createdAt: this.props.createdAt.toISOString(),
      updatedAt: this.props.updatedAt.toISOString(),
    };
  }
}
