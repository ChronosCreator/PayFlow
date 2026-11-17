/*
  Warnings:

  - You are about to drop the column `webhookEventId` on the `Payment` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "Payment_webhookEventId_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "webhookEventId";
