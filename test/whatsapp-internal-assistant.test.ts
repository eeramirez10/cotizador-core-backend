import assert from "node:assert/strict";
import test from "node:test";
import { WhatsAppInternalVerificationPort } from "../src/domain/contracts/whatsapp-internal-verification.port";
import type { WhatsAppAssistantPrincipal } from "../src/domain/entities/whatsapp-assistant.entity";
import { WhatsAppInternalAssistantRepository } from "../src/domain/repositories/whatsapp-internal-assistant.repository";
import { WhatsAppInternalAssistantUseCase } from "../src/domain/use-cases/whatsapp-internal-assistant.use-case";

const now = new Date("2026-09-11T18:00:00.000Z");

class InternalRepositoryStub extends WhatsAppInternalAssistantRepository {
  verification: Awaited<ReturnType<WhatsAppInternalAssistantRepository["getVerification"]>> = null;
  requested = false;
  verified = false;
  lastScope: { type: string; id: string } | null = null;

  async getVerification() { return this.verification; }
  async markVerificationRequested(userId: string, phoneE164: string, at: Date) {
    this.requested = true;
    this.verification = {
      userId,
      phoneE164,
      verificationRequestedAt: at,
      verifiedAt: null,
      verifiedUntil: null,
      failedAttempts: 0,
    };
  }
  async markVerificationFailed() {}
  async markVerified() { this.verified = true; }
  async listQuotes(input: Parameters<WhatsAppInternalAssistantRepository["listQuotes"]>[0]) {
    this.lastScope = input.scope;
    return [];
  }
  async findQuote(input: Parameters<WhatsAppInternalAssistantRepository["findQuote"]>[0]) {
    this.lastScope = input.scope;
    return null;
  }
}

class VerificationStub extends WhatsAppInternalVerificationPort {
  sentTo: string | null = null;
  approved = true;
  async sendCode(phoneE164: string) { this.sentTo = phoneE164; }
  async checkCode() { return this.approved; }
}

const dashboard = {
  period: { from: "2026-09-01", to: "2026-09-11", currency: "MXN" },
  kpis: {
    created: 1,
    quoted: 1,
    approved: 0,
    quotedAmount: 100,
    approvedAmount: 0,
    averageTicket: 0,
    conversionRate: 0,
    pending: 0,
    ordersGenerated: 0,
    orderAmount: 0,
    pendingItems: 0,
  },
  sellerRanking: [],
};

const analytics = {
  calls: [] as Array<{ scopeType: string; scopeId: string; currency: string }>,
  async getDashboard(input: { scopeType: string; scopeId: string; currency: string }) {
    this.calls.push(input);
    return { ...dashboard, period: { ...dashboard.period, currency: input.currency } };
  },
};

const principal = (overrides: Partial<WhatsAppAssistantPrincipal> = {}): WhatsAppAssistantPrincipal => ({
  audience: "INTERNAL_USER",
  displayName: "Gerente Prueba",
  phoneE164: "+525511223344",
  userId: "user-1",
  role: "MANAGER",
  branchId: "branch-1",
  branchName: "México",
  reportScope: "BRANCH",
  reportBranchId: "branch-1",
  reportRange: "MONTH_TO_DATE",
  isVerified: false,
  ...overrides,
});

test("internal analytics require a verified phone", async () => {
  const useCase = new WhatsAppInternalAssistantUseCase(
    new InternalRepositoryStub(),
    analytics as never,
    new VerificationStub(),
  );
  await assert.rejects(
    () => useCase.execute(principal(), "get_internal_performance", { reportRange: null }),
    /INTERNAL_VERIFICATION_REQUIRED/,
  );
});

test("verification sends and validates a Twilio PIN without storing it", async () => {
  const repository = new InternalRepositoryStub();
  const verification = new VerificationStub();
  const useCase = new WhatsAppInternalAssistantUseCase(
    repository,
    analytics as never,
    verification,
    30,
    60,
    "America/Mexico_City",
    () => now,
  );

  assert.deepEqual(
    await useCase.execute(principal(), "request_internal_verification", {}),
    { sent: true, channel: "SMS", expiresInMinutes: 10 },
  );
  assert.equal(verification.sentTo, "+525511223344");
  const result = await useCase.execute(principal(), "verify_internal_code", { code: "123456" });
  assert.equal((result as { verified: boolean }).verified, true);
  assert.equal(repository.verified, true);
});

test("quote visibility is derived from the verified user's role", async () => {
  const repository = new InternalRepositoryStub();
  const useCase = new WhatsAppInternalAssistantUseCase(repository, analytics as never, new VerificationStub());

  await useCase.execute(principal({ role: "SELLER", isVerified: true }), "list_internal_quotes", { limit: 5, status: null });
  assert.deepEqual(repository.lastScope, { type: "USER", id: "user-1" });

  await useCase.execute(principal({ isVerified: true }), "list_internal_quotes", { limit: 5, status: null });
  assert.deepEqual(repository.lastScope, { type: "BRANCH", id: "branch-1" });

  await useCase.execute(principal({ role: "ADMIN", isVerified: true }), "list_internal_quotes", { limit: 5, status: null });
  assert.deepEqual(repository.lastScope, { type: "GLOBAL", id: "user-1" });
});
