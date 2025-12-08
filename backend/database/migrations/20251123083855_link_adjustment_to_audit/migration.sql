-- AlterTable
ALTER TABLE "StockAdjustment" ADD COLUMN     "inventoryAuditId" TEXT;

-- AddForeignKey
ALTER TABLE "StockAdjustment" ADD CONSTRAINT "StockAdjustment_inventoryAuditId_fkey" FOREIGN KEY ("inventoryAuditId") REFERENCES "InventoryAudit"("id") ON DELETE SET NULL ON UPDATE CASCADE;
