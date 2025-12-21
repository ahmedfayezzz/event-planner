-- Add socialMediaLinks JSON field to Sponsor
ALTER TABLE "Sponsor" ADD COLUMN "socialMediaLinks" JSONB;

-- CreateTable
CREATE TABLE "SponsorNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "sponsorId" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorNote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SponsorLabel" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "color" TEXT NOT NULL DEFAULT '#6366f1',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SponsorLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_SponsorToLabel" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_SponsorToLabel_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE INDEX "SponsorNote_sponsorId_idx" ON "SponsorNote"("sponsorId");

-- CreateIndex
CREATE INDEX "SponsorNote_createdById_idx" ON "SponsorNote"("createdById");

-- CreateIndex
CREATE UNIQUE INDEX "SponsorLabel_name_key" ON "SponsorLabel"("name");

-- CreateIndex
CREATE INDEX "SponsorLabel_name_idx" ON "SponsorLabel"("name");

-- CreateIndex
CREATE INDEX "_SponsorToLabel_B_index" ON "_SponsorToLabel"("B");

-- AddForeignKey
ALTER TABLE "SponsorNote" ADD CONSTRAINT "SponsorNote_sponsorId_fkey" FOREIGN KEY ("sponsorId") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SponsorNote" ADD CONSTRAINT "SponsorNote_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SponsorToLabel" ADD CONSTRAINT "_SponsorToLabel_A_fkey" FOREIGN KEY ("A") REFERENCES "Sponsor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_SponsorToLabel" ADD CONSTRAINT "_SponsorToLabel_B_fkey" FOREIGN KEY ("B") REFERENCES "SponsorLabel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
