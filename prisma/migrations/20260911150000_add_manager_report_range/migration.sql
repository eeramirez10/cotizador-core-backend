-- CreateEnum
CREATE TYPE "ManagerReportRange" AS ENUM (
  'PREVIOUS_DAY',
  'WEEK_TO_DATE',
  'PREVIOUS_WEEK',
  'MONTH_TO_DATE',
  'PREVIOUS_MONTH',
  'LAST_7_DAYS',
  'LAST_30_DAYS'
);

-- AlterTable
ALTER TABLE "manager_report_subscriptions"
ADD COLUMN "report_range" "ManagerReportRange" NOT NULL DEFAULT 'MONTH_TO_DATE';
