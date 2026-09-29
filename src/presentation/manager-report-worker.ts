import { Envs } from "../config/envs";
import { prisma } from "../infrastructure/database/prisma-client";
import { createManagerReportSender } from "../infrastructure/factories/manager-report-sender.factory";
import { PrismaManagerReportSchedulerRepository } from "../infrastructure/repositories/prisma-manager-report-scheduler.repository";
import { PrismaManagerReportSubscriptionRepository } from "../infrastructure/repositories/prisma-manager-report-subscription.repository";

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));
const schedules = new PrismaManagerReportSchedulerRepository();
const subscriptions = new PrismaManagerReportSubscriptionRepository();
const sender = createManagerReportSender(subscriptions);
let stopping = false;

const shutdown = async (signal: string) => {
  stopping = true;
  console.log(JSON.stringify({ event: "manager_report.worker_stopping", signal }));
  await prisma.$disconnect();
};
process.on("SIGINT", () => void shutdown("SIGINT"));
process.on("SIGTERM", () => void shutdown("SIGTERM"));

const run = async () => {
  console.log(JSON.stringify({ event: "manager_report.worker_started", enabled: Envs.managerReportSchedulerEnabled }));
  let failures = 0;
  while (!stopping) {
    try {
      if (Envs.managerReportSchedulerEnabled && Envs.twilioWhatsAppEnabled) {
        await schedules.initialize(new Date());
        const interrupted = await schedules.markInterrupted(new Date());
        if (interrupted) console.error(JSON.stringify({ event: "manager_report.runs_need_review", count: interrupted }));
        for (let count = 0; count < 20 && !stopping; count += 1) {
          const run = await schedules.claimDue(new Date());
          if (!run) break;
          if (run.skipped) {
            console.warn(JSON.stringify({ event: "manager_report.stale_run_skipped", subscriptionId: run.subscriptionId, scheduledAt: run.scheduledAt }));
            continue;
          }
          try {
            const subscription = await subscriptions.findById(run.subscriptionId);
            if (!subscription?.isActive) throw new Error("Subscription deactivated before delivery.");
            const result = await sender.dispatch(subscription, run.scheduledAt);
            await schedules.finish(run.id, "SUBMITTED", result.providerMessageId, null);
            console.log(JSON.stringify({ event: "manager_report.submitted", subscriptionId: run.subscriptionId, scheduledAt: run.scheduledAt, providerMessageId: result.providerMessageId }));
          } catch (error) {
            const message = error instanceof Error ? error.message : "Unknown delivery error.";
            // The request may have reached Twilio. Never retry this slot without review.
            await schedules.finish(run.id, "NEEDS_REVIEW", null, message);
            console.error(JSON.stringify({ event: "manager_report.delivery_needs_review", subscriptionId: run.subscriptionId, scheduledAt: run.scheduledAt, message }));
          }
        }
      }
      failures = 0;
      if (!stopping) await wait(Envs.managerReportSchedulerPollIntervalMs);
    } catch (error) {
      failures += 1;
      const retryDelayMs = Math.min(Envs.managerReportSchedulerPollIntervalMs * 2 ** Math.min(failures, 5), 300_000);
      console.error(JSON.stringify({ event: "manager_report.iteration_failed", message: error instanceof Error ? error.message : "Unknown scheduler error.", retryDelayMs }));
      if (!stopping) await wait(retryDelayMs);
    }
  }
};

void run().catch(async (error) => {
  console.error(JSON.stringify({ event: "manager_report.worker_crashed", message: error instanceof Error ? error.message : "Unknown worker error." }));
  await prisma.$disconnect();
  process.exitCode = 1;
});
