/*
  Warnings:

  - The values [EN_COURS_APPRO] on the enum `RequestStatus` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "RequestStatus_new" AS ENUM ('BROUILLON', 'SOUMISE', 'TRANSMISE', 'APPROUVEE', 'REJETEE', 'LIVREE_PAR_MAGASINIER', 'RECEPTION_CONFIRMEE', 'ANNULEE', 'LITIGE_RECEPTION');
ALTER TABLE "Request" ALTER COLUMN "status" DROP DEFAULT;
ALTER TABLE "Request" ALTER COLUMN "status" TYPE "RequestStatus_new" USING ("status"::text::"RequestStatus_new");
ALTER TYPE "RequestStatus" RENAME TO "RequestStatus_old";
ALTER TYPE "RequestStatus_new" RENAME TO "RequestStatus";
DROP TYPE "RequestStatus_old";
ALTER TABLE "Request" ALTER COLUMN "status" SET DEFAULT 'BROUILLON';
COMMIT;
