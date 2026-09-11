-- CreateEnum
CREATE TYPE "ManagerReportType" AS ENUM ('QUOTE_PERFORMANCE');

-- CreateEnum
CREATE TYPE "ManagerReportScope" AS ENUM ('GLOBAL', 'BRANCH');

-- CreateEnum
CREATE TYPE "ManagerReportFrequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY');

-- CreateTable
CREATE TABLE "manager_report_subscriptions" (
    "id" UUID NOT NULL,
    "report_type" "ManagerReportType" NOT NULL DEFAULT 'QUOTE_PERFORMANCE',
    "recipient_user_id" UUID NOT NULL,
    "scope" "ManagerReportScope" NOT NULL,
    "branch_id" UUID,
    "frequency" "ManagerReportFrequency" NOT NULL,
    "day_of_week" INTEGER,
    "day_of_month" INTEGER,
    "send_hour" INTEGER NOT NULL,
    "send_minute" INTEGER NOT NULL DEFAULT 0,
    "timezone" VARCHAR(80) NOT NULL DEFAULT 'America/Mexico_City',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_user_id" UUID NOT NULL,
    "updated_by_user_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "manager_report_subscriptions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "manager_report_subscriptions_scope_check" CHECK (
      ("scope" = 'GLOBAL' AND "branch_id" IS NULL)
      OR ("scope" = 'BRANCH' AND "branch_id" IS NOT NULL)
    ),
    CONSTRAINT "manager_report_subscriptions_schedule_check" CHECK (
      ("frequency" = 'DAILY' AND "day_of_week" IS NULL AND "day_of_month" IS NULL)
      OR ("frequency" = 'WEEKLY' AND "day_of_week" BETWEEN 1 AND 7 AND "day_of_month" IS NULL)
      OR ("frequency" = 'MONTHLY' AND "day_of_week" IS NULL AND "day_of_month" BETWEEN 1 AND 28)
    ),
    CONSTRAINT "manager_report_subscriptions_time_check" CHECK (
      "send_hour" BETWEEN 0 AND 23 AND "send_minute" BETWEEN 0 AND 59
    )
);

-- CreateIndex
CREATE UNIQUE INDEX "manager_report_subscriptions_recipient_user_id_report_type_key"
ON "manager_report_subscriptions"("recipient_user_id", "report_type");

-- CreateIndex
CREATE INDEX "manager_report_subscriptions_is_active_frequency_idx"
ON "manager_report_subscriptions"("is_active", "frequency");

-- CreateIndex
CREATE INDEX "manager_report_subscriptions_branch_id_idx"
ON "manager_report_subscriptions"("branch_id");

-- AddForeignKey
ALTER TABLE "manager_report_subscriptions"
ADD CONSTRAINT "manager_report_subscriptions_recipient_user_id_fkey"
FOREIGN KEY ("recipient_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_report_subscriptions"
ADD CONSTRAINT "manager_report_subscriptions_branch_id_fkey"
FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_report_subscriptions"
ADD CONSTRAINT "manager_report_subscriptions_created_by_user_id_fkey"
FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "manager_report_subscriptions"
ADD CONSTRAINT "manager_report_subscriptions_updated_by_user_id_fkey"
FOREIGN KEY ("updated_by_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
