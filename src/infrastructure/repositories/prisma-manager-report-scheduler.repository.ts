import { nextManagerReportRunAt } from "../../domain/use-cases/next-manager-report-run";
import { prisma } from "../database/prisma-client";

export interface ClaimedManagerReportRun {
  id: string;
  subscriptionId: string;
  scheduledAt: Date;
  skipped: boolean;
}

export class PrismaManagerReportSchedulerRepository {
  async initialize(now: Date): Promise<void> {
    const rows = await prisma.managerReportSubscription.findMany({
      where: { isActive: true, nextRunAt: null },
      take: 100,
    });
    for (const row of rows) {
      await prisma.managerReportSubscription.updateMany({
        where: { id: row.id, isActive: true, nextRunAt: null },
        data: { nextRunAt: nextManagerReportRunAt(row, now) },
      });
    }
  }

  async claimDue(now: Date): Promise<ClaimedManagerReportRun | null> {
    const row = await prisma.managerReportSubscription.findFirst({
      where: { isActive: true, nextRunAt: { lte: now } },
      orderBy: { nextRunAt: "asc" },
    });
    if (!row?.nextRunAt) return null;
    const scheduledAt = row.nextRunAt;
    const skipped = now.getTime() - scheduledAt.getTime() > 24 * 60 * 60 * 1000;
    return prisma.$transaction(async (tx) => {
      const claimed = await tx.managerReportSubscription.updateMany({
        where: { id: row.id, isActive: true, nextRunAt: scheduledAt },
        data: { nextRunAt: nextManagerReportRunAt(row, now) },
      });
      if (!claimed.count) return null;
      const run = await tx.managerReportRun.create({
        data: {
          subscriptionId: row.id,
          scheduledAt,
          status: skipped ? "SKIPPED" : "PROCESSING",
          errorMessage: skipped ? "Scheduled time was more than 24 hours ago; stale report was not sent." : null,
          finishedAt: skipped ? now : null,
        },
      });
      return { id: run.id, subscriptionId: row.id, scheduledAt, skipped };
    });
  }

  async finish(id: string, status: "SUBMITTED" | "FAILED" | "NEEDS_REVIEW", providerMessageId: string | null, errorMessage: string | null): Promise<void> {
    await prisma.managerReportRun.updateMany({
      where: { id, status: "PROCESSING" },
      data: { status, providerMessageId, errorMessage: errorMessage?.slice(0, 1000) ?? null, finishedAt: new Date() },
    });
  }

  async markInterrupted(now: Date): Promise<number> {
    const result = await prisma.managerReportRun.updateMany({
      where: { status: "PROCESSING", startedAt: { lt: new Date(now.getTime() - 60 * 60 * 1000) } },
      data: { status: "NEEDS_REVIEW", errorMessage: "Worker stopped during delivery; check Twilio before sending again.", finishedAt: now },
    });
    return result.count;
  }
}
