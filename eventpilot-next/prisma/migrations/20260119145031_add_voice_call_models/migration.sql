-- CreateTable
CREATE TABLE "VoiceCall" (
    "id" TEXT NOT NULL,
    "registrationId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "batchId" TEXT,
    "phoneNumber" TEXT NOT NULL,
    "recipientName" TEXT,
    "agentsaCallId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "confirmationResponse" TEXT,
    "recordingUrl" TEXT,
    "conversationHistory" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 3,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "initiatedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VoiceCall_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCallBatch" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "totalCalls" INTEGER NOT NULL DEFAULT 0,
    "completedCalls" INTEGER NOT NULL DEFAULT 0,
    "confirmedCount" INTEGER NOT NULL DEFAULT 0,
    "declinedCount" INTEGER NOT NULL DEFAULT 0,
    "noResponseCount" INTEGER NOT NULL DEFAULT 0,
    "triggeredByAdminId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dispatchedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "VoiceCallBatch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VoiceCallLog" (
    "id" TEXT NOT NULL,
    "voiceCallId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "eventData" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "VoiceCallLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "VoiceCall_registrationId_idx" ON "VoiceCall"("registrationId");

-- CreateIndex
CREATE INDEX "VoiceCall_sessionId_idx" ON "VoiceCall"("sessionId");

-- CreateIndex
CREATE INDEX "VoiceCall_batchId_idx" ON "VoiceCall"("batchId");

-- CreateIndex
CREATE INDEX "VoiceCall_status_idx" ON "VoiceCall"("status");

-- CreateIndex
CREATE INDEX "VoiceCallBatch_sessionId_idx" ON "VoiceCallBatch"("sessionId");

-- CreateIndex
CREATE INDEX "VoiceCallBatch_triggeredByAdminId_idx" ON "VoiceCallBatch"("triggeredByAdminId");

-- CreateIndex
CREATE INDEX "VoiceCallBatch_status_idx" ON "VoiceCallBatch"("status");

-- CreateIndex
CREATE INDEX "VoiceCallLog_voiceCallId_idx" ON "VoiceCallLog"("voiceCallId");

-- CreateIndex
CREATE INDEX "VoiceCallLog_eventType_idx" ON "VoiceCallLog"("eventType");

-- CreateIndex
CREATE INDEX "VoiceCallLog_createdAt_idx" ON "VoiceCallLog"("createdAt");

-- AddForeignKey
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_registrationId_fkey" FOREIGN KEY ("registrationId") REFERENCES "Registration"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCall" ADD CONSTRAINT "VoiceCall_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "VoiceCallBatch"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCallBatch" ADD CONSTRAINT "VoiceCallBatch_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCallBatch" ADD CONSTRAINT "VoiceCallBatch_triggeredByAdminId_fkey" FOREIGN KEY ("triggeredByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VoiceCallLog" ADD CONSTRAINT "VoiceCallLog_voiceCallId_fkey" FOREIGN KEY ("voiceCallId") REFERENCES "VoiceCall"("id") ON DELETE CASCADE ON UPDATE CASCADE;
