-- CreateEnum
CREATE TYPE "DisputeReason" AS ENUM ('QUANTITE_INCORRECTE', 'ARTICLE_ENDOMMAGE', 'MAUVAIS_ARTICLE', 'AUTRE');

-- AlterTable
ALTER TABLE "Request" ADD COLUMN     "disputeComment" TEXT,
ADD COLUMN     "disputeReason" "DisputeReason";
