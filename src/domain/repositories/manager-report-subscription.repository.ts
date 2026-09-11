import type {
  ManagerReportFrequency,
  ManagerReportRange,
  ManagerReportScope,
  ManagerReportType,
  UserRole,
} from "../../infrastructure/database/generated/enums";
import type { ManagerReportSubscriptionEntity } from "../entities/manager-report-subscription.entity";

export interface ManagerReportRecipient {
  id: string;
  role: UserRole;
  isActive: boolean;
  phone: string | null;
}

export interface ManagerReportBranch {
  id: string;
  isActive: boolean;
}

export interface SaveManagerReportSubscriptionParams {
  recipientUserId: string;
  reportType: ManagerReportType;
  scope: ManagerReportScope;
  branchId: string | null;
  frequency: ManagerReportFrequency;
  reportRange: ManagerReportRange;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  sendHour: number;
  sendMinute: number;
  timezone: string;
  actorUserId: string;
}

export interface RecordManagerReportSendParams {
  actorUserId: string;
  status: "QUEUED" | "SENT" | "FAILED";
  recipient: string;
  providerMessageId: string | null;
  deliveryMode: "FREE_FORM" | "TEMPLATE" | null;
  periodFrom: string;
  periodTo: string;
  errorMessage: string | null;
}

export abstract class ManagerReportSubscriptionRepository {
  abstract listAll(): Promise<ManagerReportSubscriptionEntity[]>;
  abstract findById(id: string): Promise<ManagerReportSubscriptionEntity | null>;
  abstract findRecipient(id: string): Promise<ManagerReportRecipient | null>;
  abstract findBranch(id: string): Promise<ManagerReportBranch | null>;
  abstract existsForRecipient(recipientUserId: string, reportType: ManagerReportType, excludeId?: string): Promise<boolean>;
  abstract create(params: SaveManagerReportSubscriptionParams): Promise<ManagerReportSubscriptionEntity>;
  abstract update(id: string, params: SaveManagerReportSubscriptionParams): Promise<ManagerReportSubscriptionEntity | null>;
  abstract setActive(id: string, isActive: boolean, actorUserId: string): Promise<ManagerReportSubscriptionEntity | null>;
  abstract recordSendAttempt(id: string, params: RecordManagerReportSendParams): Promise<void>;
}
