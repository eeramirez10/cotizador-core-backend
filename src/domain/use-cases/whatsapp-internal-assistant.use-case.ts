import type { ManagerReportRange } from "../../infrastructure/database/generated/enums";
import type { WhatsAppInternalVerificationPort } from "../contracts/whatsapp-internal-verification.port";
import type {
  WhatsAppAssistantPrincipal,
  WhatsAppInternalQuoteScope,
} from "../entities/whatsapp-assistant.entity";
import type { AnalyticsRepository } from "../repositories/analytics.repository";
import type { WhatsAppInternalAssistantRepository } from "../repositories/whatsapp-internal-assistant.repository";
import { resolveCurrentManagerReportPeriod } from "./manager-report-period";

type ToolArguments = Record<string, unknown>;

const reportRanges: ManagerReportRange[] = [
  "PREVIOUS_DAY",
  "WEEK_TO_DATE",
  "PREVIOUS_WEEK",
  "MONTH_TO_DATE",
  "PREVIOUS_MONTH",
  "LAST_7_DAYS",
  "LAST_30_DAYS",
];
const quoteStatuses = [
  "DRAFT",
  "PENDING",
  "PENDING_APPROVAL",
  "CHANGES_REQUESTED",
  "QUOTED",
  "APPROVED",
  "REJECTED",
  "CANCELLED",
  "SUPERSEDED",
] as const;

export class WhatsAppInternalAssistantUseCase {
  constructor(
    private readonly repository: WhatsAppInternalAssistantRepository,
    private readonly analyticsRepository: AnalyticsRepository,
    private readonly verification: WhatsAppInternalVerificationPort,
    private readonly verificationTtlDays = 30,
    private readonly verificationResendSeconds = 60,
    private readonly timezone = "America/Mexico_City",
    private readonly now: () => Date = () => new Date(),
  ) {}

  async execute(principal: WhatsAppAssistantPrincipal, name: string, args: ToolArguments): Promise<unknown> {
    this.assertInternal(principal);
    switch (name) {
      case "request_internal_verification":
        return this.requestVerification(principal);
      case "verify_internal_code":
        return this.verifyCode(principal, args);
      case "get_internal_performance":
        this.assertVerified(principal);
        return this.performance(principal, args);
      case "list_internal_quotes":
        this.assertVerified(principal);
        return this.listQuotes(principal, args);
      case "get_internal_quote_details":
        this.assertVerified(principal);
        return this.getQuote(principal, args);
      default:
        throw new Error(`Unsupported internal assistant tool: ${name}`);
    }
  }

  private async requestVerification(principal: WhatsAppAssistantPrincipal) {
    if (principal.isVerified) return { sent: false, alreadyVerified: true };
    const userId = principal.userId!;
    const phone = this.requiredPhone(principal);
    const state = await this.repository.getVerification(userId);
    const now = this.now();
    if (state?.verificationRequestedAt) {
      const availableAt = new Date(state.verificationRequestedAt.getTime() + this.verificationResendSeconds * 1000);
      if (availableAt > now) {
        return {
          sent: false,
          error: "VERIFICATION_RATE_LIMITED",
          retryAfterSeconds: Math.ceil((availableAt.getTime() - now.getTime()) / 1000),
        };
      }
    }
    await this.verification.sendCode(phone);
    await this.repository.markVerificationRequested(userId, phone, now);
    return { sent: true, channel: "SMS", expiresInMinutes: 10 };
  }

  private async verifyCode(principal: WhatsAppAssistantPrincipal, args: ToolArguments) {
    const code = this.requiredText(args.code, "code");
    if (code.length < 4 || code.length > 10 || [...code].some((character) => character < "0" || character > "9")) {
      return { verified: false, error: "INVALID_VERIFICATION_CODE_FORMAT" };
    }
    const userId = principal.userId!;
    const phone = this.requiredPhone(principal);
    const approved = await this.verification.checkCode(phone, code);
    if (!approved) {
      await this.repository.markVerificationFailed(userId, phone);
      return { verified: false, error: "INVALID_OR_EXPIRED_VERIFICATION_CODE" };
    }
    const now = this.now();
    const until = new Date(now.getTime() + this.verificationTtlDays * 86_400_000);
    await this.repository.markVerified(userId, phone, now, until);
    return { verified: true, verifiedUntil: until.toISOString() };
  }

  private async performance(principal: WhatsAppAssistantPrincipal, args: ToolArguments) {
    const requestedRange = this.optionalText(args.reportRange)?.toUpperCase() as ManagerReportRange | undefined;
    const reportRange = requestedRange && reportRanges.includes(requestedRange)
      ? requestedRange
      : principal.reportRange || "MONTH_TO_DATE";
    const period = resolveCurrentManagerReportPeriod(reportRange, this.timezone, this.now());
    const scope = this.analyticsScope(principal);
    const common = {
      scopeType: scope.type,
      scopeId: scope.id,
      scopeName: scope.name,
      from: period.from,
      toExclusive: period.toExclusive,
    } as const;
    const [mxn, usd] = await Promise.all([
      this.analyticsRepository.getDashboard({ ...common, currency: "MXN" }),
      this.analyticsRepository.getDashboard({ ...common, currency: "USD" }),
    ]);
    return {
      scope: { type: scope.type, name: scope.name },
      reportRange,
      period: { from: mxn.period.from, to: mxn.period.to },
      totals: {
        created: mxn.kpis.created + usd.kpis.created,
        quoted: mxn.kpis.quoted + usd.kpis.quoted,
        approved: mxn.kpis.approved + usd.kpis.approved,
        pending: mxn.kpis.pending + usd.kpis.pending,
        ordersGenerated: mxn.kpis.ordersGenerated + usd.kpis.ordersGenerated,
        quotedMxn: mxn.kpis.quotedAmount,
        quotedUsd: usd.kpis.quotedAmount,
        approvedMxn: mxn.kpis.approvedAmount,
        approvedUsd: usd.kpis.approvedAmount,
      },
      sellerRanking: this.combineSellerRanking(mxn.sellerRanking, usd.sellerRanking).slice(0, 10),
    };
  }

  private async listQuotes(principal: WhatsAppAssistantPrincipal, args: ToolArguments) {
    const limit = Math.min(Math.max(this.number(args.limit) ?? 5, 1), 20);
    const status = this.optionalText(args.status)?.toUpperCase() || null;
    if (status && !quoteStatuses.includes(status as typeof quoteStatuses[number])) {
      return { error: "INVALID_QUOTE_STATUS", availableStatuses: quoteStatuses };
    }
    const quotes = await this.repository.listQuotes({ scope: this.quoteScope(principal), limit, status });
    return { quotes, count: quotes.length };
  }

  private async getQuote(principal: WhatsAppAssistantPrincipal, args: ToolArguments) {
    const quoteNumber = this.requiredText(args.quoteNumber, "quoteNumber");
    const quote = await this.repository.findQuote({ scope: this.quoteScope(principal), quoteNumber });
    if (!quote) return { error: "QUOTE_NOT_FOUND_OR_NOT_AUTHORIZED" };
    return { quote };
  }

  private analyticsScope(principal: WhatsAppAssistantPrincipal) {
    if (principal.role === "ADMIN") return { type: "GLOBAL" as const, id: principal.userId!, name: "General" };
    if (principal.role === "MANAGER" && principal.reportScope === "GLOBAL") {
      return { type: "GLOBAL" as const, id: principal.userId!, name: "General" };
    }
    if (principal.role === "MANAGER") {
      const branchId = principal.reportBranchId || principal.branchId;
      if (!branchId) throw new Error("INTERNAL_USER_BRANCH_NOT_CONFIGURED");
      return { type: "BRANCH" as const, id: branchId, name: principal.branchName || "Sucursal" };
    }
    if (principal.role === "SELLER") {
      return { type: "USER" as const, id: principal.userId!, name: principal.displayName };
    }
    throw new Error("INTERNAL_ROLE_NOT_SUPPORTED");
  }

  private quoteScope(principal: WhatsAppAssistantPrincipal): WhatsAppInternalQuoteScope {
    if (principal.role === "ADMIN") return { type: "GLOBAL", id: principal.userId! };
    if (principal.role === "MANAGER" && principal.branchId) return { type: "BRANCH", id: principal.branchId };
    if (principal.role === "SELLER") return { type: "USER", id: principal.userId! };
    throw new Error("INTERNAL_ROLE_NOT_SUPPORTED");
  }

  private combineSellerRanking(
    mxn: Array<{ userId: string; name: string; quotes: number; approved: number; quotedAmount: number; approvedAmount: number }>,
    usd: Array<{ userId: string; name: string; quotes: number; approved: number; quotedAmount: number; approvedAmount: number }>,
  ) {
    const rows = new Map<string, {
      name: string;
      quotes: number;
      approved: number;
      quotedMxn: number;
      quotedUsd: number;
      approvedMxn: number;
      approvedUsd: number;
    }>();
    for (const [currency, source] of [["MXN", mxn], ["USD", usd]] as const) {
      for (const row of source) {
        const current = rows.get(row.userId) || {
          name: row.name,
          quotes: 0,
          approved: 0,
          quotedMxn: 0,
          quotedUsd: 0,
          approvedMxn: 0,
          approvedUsd: 0,
        };
        current.quotes += row.quotes;
        current.approved += row.approved;
        if (currency === "MXN") {
          current.quotedMxn = row.quotedAmount;
          current.approvedMxn = row.approvedAmount;
        } else {
          current.quotedUsd = row.quotedAmount;
          current.approvedUsd = row.approvedAmount;
        }
        rows.set(row.userId, current);
      }
    }
    return [...rows.values()].sort((a, b) => b.quotedMxn - a.quotedMxn || b.quotedUsd - a.quotedUsd);
  }

  private requiredPhone(principal: WhatsAppAssistantPrincipal): string {
    if (principal.phoneE164) return principal.phoneE164;
    throw new Error("INTERNAL_USER_PHONE_NOT_AVAILABLE");
  }

  private assertInternal(principal: WhatsAppAssistantPrincipal): void {
    if (principal.audience !== "INTERNAL_USER" || !principal.userId) {
      throw new Error("INTERNAL_ASSISTANT_NOT_AUTHORIZED");
    }
  }

  private assertVerified(principal: WhatsAppAssistantPrincipal): void {
    if (!principal.isVerified) throw new Error("INTERNAL_VERIFICATION_REQUIRED");
  }

  private requiredText(value: unknown, field: string): string {
    const normalized = typeof value === "string" ? value.trim() : "";
    if (!normalized) throw new Error(`${field} is required.`);
    return normalized;
  }

  private optionalText(value: unknown): string | null {
    return typeof value === "string" && value.trim() ? value.trim() : null;
  }

  private number(value: unknown): number | null {
    return typeof value === "number" && Number.isFinite(value) ? Math.trunc(value) : null;
  }
}
