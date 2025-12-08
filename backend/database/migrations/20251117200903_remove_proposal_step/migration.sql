/*
  Warnings:

  - You are about to drop the column `proposedAt` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `proposedById` on the `Request` table. All the data in the column will be lost.
  - You are about to drop the column `proposedQty` on the `RequestItem` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Request" DROP CONSTRAINT "Request_proposedById_fkey";

-- AlterTable
ALTER TABLE "Request" DROP COLUMN "proposedAt",
DROP COLUMN "proposedById";

-- AlterTable
ALTER TABLE "RequestItem" DROP COLUMN "proposedQty";
