/*
  Warnings:

  - You are about to drop the column `providerPaymentId` on the `Payment` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[providerOrderId]` on the table `Payment` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Payment_providerPaymentId_key";

-- AlterTable
ALTER TABLE "Payment" DROP COLUMN "providerPaymentId",
ADD COLUMN     "providerOrderId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerOrderId_key" ON "Payment"("providerOrderId");
