ALTER TABLE "manager_report_subscriptions" ADD COLUMN "next_run_at" TIMESTAMP(3);

CREATE INDEX "manager_report_subscriptions_is_active_next_run_at_idx"
ON "manager_report_subscriptions"("is_active", "next_run_at");

CREATE TABLE "manager_report_runs" (
    "id" UUID NOT NULL,
    "subscription_id" UUID NOT NULL,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(24) NOT NULL,
    "provider_message_id" VARCHAR(100),
    "error_message" VARCHAR(1000),
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    CONSTRAINT "manager_report_runs_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "manager_report_runs_status_check" CHECK ("status" IN ('PROCESSING', 'SUBMITTED', 'FAILED', 'NEEDS_REVIEW', 'SKIPPED'))
);

CREATE UNIQUE INDEX "manager_report_runs_subscription_id_scheduled_at_key"
ON "manager_report_runs"("subscription_id", "scheduled_at");

CREATE INDEX "manager_report_runs_subscription_id_started_at_idx"
ON "manager_report_runs"("subscription_id", "started_at");

ALTER TABLE "manager_report_runs"
ADD CONSTRAINT "manager_report_runs_subscription_id_fkey"
FOREIGN KEY ("subscription_id") REFERENCES "manager_report_subscriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
