/*
  Warnings:

  - You are about to drop the column `disputeComment` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `disputeReason` on the `Request` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "RequestItemDisputeStatus" AS ENUM ('NO_DISPUTE', 'REPORTED', 'RESOLVED_APPROVED', 'RESOLVED_REJECTED');

-- AlterTable
ALTER TABLE "Request" DROP COLUMN "disputeComment",
DROP COLUMN "disputeReason";

-- AlterTable
ALTER TABLE "RequestItem" ADD COLUMN     "itemDisputeComment" TEXT,
ADD COLUMN     "itemDisputeReason" "DisputeReason",
ADD COLUMN     "itemDisputeStatus" "RequestItemDisputeStatus" NOT NULL DEFAULT 'NO_DISPUTE';
