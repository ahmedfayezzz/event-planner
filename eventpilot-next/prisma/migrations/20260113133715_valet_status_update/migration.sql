-- AlterEnum
ALTER TYPE "ValetStatus" ADD VALUE 'fetching';

-- AlterTable
ALTER TABLE "ValetRecord" ADD COLUMN     "fetchingStartedAt" TIMESTAMP(3);
