-- CreateEnum
CREATE TYPE "InventoryAuditStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'RECONCILIATION_PENDING', 'CLOSED');

-- CreateTable
CREATE TABLE "InventoryAudit" (
    "id" TEXT NOT NULL,
    "auditNumber" TEXT NOT NULL,
    "status" "InventoryAuditStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "InventoryAudit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InventoryAuditItem" (
    "id" TEXT NOT NULL,
    "auditId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "systemQuantity" INTEGER NOT NULL,
    "countedQuantity" INTEGER,
    "discrepancy" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryAuditItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAudit_auditNumber_key" ON "InventoryAudit"("auditNumber");

-- CreateIndex
CREATE UNIQUE INDEX "InventoryAuditItem_auditId_productId_key" ON "InventoryAuditItem"("auditId", "productId");

-- AddForeignKey
ALTER TABLE "InventoryAudit" ADD CONSTRAINT "InventoryAudit_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAuditItem" ADD CONSTRAINT "InventoryAuditItem_auditId_fkey" FOREIGN KEY ("auditId") REFERENCES "InventoryAudit"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InventoryAuditItem" ADD CONSTRAINT "InventoryAuditItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
