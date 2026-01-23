-- CreateEnum
CREATE TYPE "GalleryStatus" AS ENUM ('pending', 'uploading', 'processing', 'clustering', 'matching', 'ready', 'error');

-- CreateEnum
CREATE TYPE "ImageProcessingStatus" AS ENUM ('pending', 'processing', 'completed', 'failed', 'skipped');

-- CreateEnum
CREATE TYPE "ShareStatus" AS ENUM ('pending', 'shared', 'viewed');

-- CreateTable
CREATE TABLE "PhotoGallery" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "rekognitionCollectionId" TEXT,
    "status" "GalleryStatus" NOT NULL DEFAULT 'pending',
    "totalImages" INTEGER NOT NULL DEFAULT 0,
    "processedImages" INTEGER NOT NULL DEFAULT 0,
    "totalFaces" INTEGER NOT NULL DEFAULT 0,
    "totalClusters" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "processingStartedAt" TIMESTAMP(3),
    "processingCompletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PhotoGallery_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GalleryImage" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "s3Key" TEXT NOT NULL,
    "s3Bucket" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "thumbnailUrl" TEXT,
    "filename" TEXT NOT NULL,
    "width" INTEGER,
    "height" INTEGER,
    "fileSize" INTEGER NOT NULL,
    "contentType" TEXT NOT NULL,
    "status" "ImageProcessingStatus" NOT NULL DEFAULT 'pending',
    "faceCount" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DetectedFace" (
    "id" TEXT NOT NULL,
    "imageId" TEXT NOT NULL,
    "rekognitionFaceId" TEXT,
    "boundingBoxTop" DOUBLE PRECISION NOT NULL,
    "boundingBoxLeft" DOUBLE PRECISION NOT NULL,
    "boundingBoxWidth" DOUBLE PRECISION NOT NULL,
    "boundingBoxHeight" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "brightness" DOUBLE PRECISION,
    "sharpness" DOUBLE PRECISION,
    "poseYaw" DOUBLE PRECISION,
    "posePitch" DOUBLE PRECISION,
    "poseRoll" DOUBLE PRECISION,
    "faceThumbnailUrl" TEXT,
    "faceThumbnailS3Key" TEXT,
    "clusterId" TEXT,
    "clusterSimilarity" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DetectedFace_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FaceCluster" (
    "id" TEXT NOT NULL,
    "galleryId" TEXT NOT NULL,
    "userId" TEXT,
    "representativeFaceUrl" TEXT,
    "autoLabel" TEXT,
    "manualName" TEXT,
    "manualPhone" TEXT,
    "manualEmail" TEXT,
    "matchConfidence" DOUBLE PRECISION,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "faceCount" INTEGER NOT NULL DEFAULT 0,
    "publicToken" TEXT NOT NULL,
    "shareStatus" "ShareStatus" NOT NULL DEFAULT 'pending',
    "sharedVia" TEXT,
    "sharedAt" TIMESTAMP(3),
    "viewedAt" TIMESTAMP(3),
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceCluster_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PhotoGallery_rekognitionCollectionId_key" ON "PhotoGallery"("rekognitionCollectionId");

-- CreateIndex
CREATE INDEX "PhotoGallery_sessionId_idx" ON "PhotoGallery"("sessionId");

-- CreateIndex
CREATE INDEX "PhotoGallery_status_idx" ON "PhotoGallery"("status");

-- CreateIndex
CREATE INDEX "GalleryImage_galleryId_idx" ON "GalleryImage"("galleryId");

-- CreateIndex
CREATE INDEX "GalleryImage_status_idx" ON "GalleryImage"("status");

-- CreateIndex
CREATE INDEX "DetectedFace_imageId_idx" ON "DetectedFace"("imageId");

-- CreateIndex
CREATE INDEX "DetectedFace_clusterId_idx" ON "DetectedFace"("clusterId");

-- CreateIndex
CREATE INDEX "DetectedFace_rekognitionFaceId_idx" ON "DetectedFace"("rekognitionFaceId");

-- CreateIndex
CREATE UNIQUE INDEX "FaceCluster_publicToken_key" ON "FaceCluster"("publicToken");

-- CreateIndex
CREATE INDEX "FaceCluster_galleryId_idx" ON "FaceCluster"("galleryId");

-- CreateIndex
CREATE INDEX "FaceCluster_userId_idx" ON "FaceCluster"("userId");

-- CreateIndex
CREATE INDEX "FaceCluster_publicToken_idx" ON "FaceCluster"("publicToken");

-- CreateIndex
CREATE INDEX "FaceCluster_shareStatus_idx" ON "FaceCluster"("shareStatus");

-- AddForeignKey
ALTER TABLE "PhotoGallery" ADD CONSTRAINT "PhotoGallery_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "Session"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryImage" ADD CONSTRAINT "GalleryImage_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "PhotoGallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectedFace" ADD CONSTRAINT "DetectedFace_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "GalleryImage"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DetectedFace" ADD CONSTRAINT "DetectedFace_clusterId_fkey" FOREIGN KEY ("clusterId") REFERENCES "FaceCluster"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceCluster" ADD CONSTRAINT "FaceCluster_galleryId_fkey" FOREIGN KEY ("galleryId") REFERENCES "PhotoGallery"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FaceCluster" ADD CONSTRAINT "FaceCluster_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
