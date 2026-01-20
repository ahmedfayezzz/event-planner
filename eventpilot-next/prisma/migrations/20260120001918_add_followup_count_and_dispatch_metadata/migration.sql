-- AlterTable
ALTER TABLE "VoiceCall" ADD COLUMN     "dispatchMetadata" JSONB;

-- AlterTable
ALTER TABLE "VoiceCallBatch" ADD COLUMN     "dispatchMetadata" JSONB,
ADD COLUMN     "followUpCount" INTEGER NOT NULL DEFAULT 0;
