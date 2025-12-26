-- CreateTable
CREATE TABLE "Attachment" (
    "id" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Attachment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorAttachment" (
    "id" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "attachmentId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SponsorAttachment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SponsorAttachment_sponsorId_idx" ON "SponsorAttachment"("sponsorId");

-- CreateIndex
CREATE INDEX "SponsorAttachment_attachmentId_idx" ON "SponsorAttachment"("attachmentId");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorAttachment_sponsorId_attachmentId_key" ON "SponsorAttachment"("sponsorId", "attachmentId");

-- AddForeignKey
ALTER TABLE "SponsorAttachment" ADD CONSTRAINT "SponsorAttachment_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorAttachment" ADD CONSTRAINT "SponsorAttachment_attachmentId_fkey" FOREIGN KEY ("attachmentId") REFERENCES "Attachment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
