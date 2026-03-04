/*
  Warnings:

  - A unique constraint covering the columns `[erp_user_code]` on the table `users` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "users" ADD COLUMN     "erp_user_code" VARCHAR(80);

-- CreateIndex
CREATE UNIQUE INDEX "users_erp_user_code_key" ON "users"("erp_user_code");
