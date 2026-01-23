import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, publicProcedure } from "../trpc";
import {
  generateGalleryUploadUrl,
  getGalleryImageUrl,
  deleteGalleryImages,
  GALLERY_S3_BUCKET,
  isGalleryS3Configured,
} from "@/lib/gallery-s3";
import {
  runGalleryProcessingPipeline,
  cleanupGallery,
} from "@/lib/gallery-processing";
import { deleteCollection } from "@/lib/rekognition";
import {
  isGoogleDriveConfigured,
  extractFolderId,
  listFolderImages,
  transferToS3,
} from "@/lib/gallery-google";
import {
  startImportProgress,
  updateImportProgress,
  completeImportProgress,
  failImportProgress,
  getImportProgress,
  cancelImportProgress,
  isImportCancelled,
} from "@/lib/import-progress";

export const galleryRouter = createTRPCRouter({
  /**
   * Check if gallery feature is configured
   */
  isConfigured: adminProcedure.query(() => {
    return {
      configured: isGalleryS3Configured(),
      bucket: GALLERY_S3_BUCKET || null,
      googleDriveConfigured: isGoogleDriveConfigured(),
    };
  }),

  /**
   * Create a new gallery for a session
   */
  create: adminProcedure
    .input(
      z.object({
        sessionId: z.string(),
        title: z.string().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Check if session exists
      const session = await ctx.db.session.findUnique({
        where: { id: input.sessionId },
      });

      if (!session) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Session not found",
        });
      }

      // Create gallery
      const gallery = await ctx.db.photoGallery.create({
        data: {
          sessionId: input.sessionId,
          title: input.title || `معرض صور ${session.title}`,
        },
      });

      return gallery;
    }),

  /**
   * Delete a gallery and all associated data
   */
  delete: adminProcedure
    .input(z.object({ galleryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const gallery = await ctx.db.photoGallery.findUnique({
        where: { id: input.galleryId },
        include: { images: true },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      // Delete from S3 and Rekognition
      try {
        await cleanupGallery(input.galleryId);
      } catch (error) {
        console.error("Error cleaning up gallery:", error);
        // Continue with database deletion even if cleanup fails
      }

      // Delete S3 images
      const s3Keys = gallery.images.map((img) => img.s3Key);
      if (s3Keys.length > 0) {
        try {
          await deleteGalleryImages(s3Keys);
        } catch (error) {
          console.error("Error deleting S3 images:", error);
        }
      }

      return { success: true };
    }),

  /**
   * List galleries for a session
   */
  listBySession: adminProcedure
    .input(z.object({ sessionId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.photoGallery.findMany({
        where: { sessionId: input.sessionId },
        orderBy: { createdAt: "desc" },
        include: {
          _count: {
            select: {
              images: true,
              faceClusters: true,
            },
          },
        },
      });
    }),

  /**
   * Get gallery by ID with full details
   */
  getById: adminProcedure
    .input(z.object({ galleryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const gallery = await ctx.db.photoGallery.findUnique({
        where: { id: input.galleryId },
        include: {
          session: true,
          images: {
            orderBy: { createdAt: "desc" },
            take: 20, // Limit for initial load
          },
          _count: {
            select: {
              images: true,
              faceClusters: true,
            },
          },
        },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      return gallery;
    }),

  /**
   * Get all images for a gallery with pagination
   */
  getImages: adminProcedure
    .input(
      z.object({
        galleryId: z.string(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      const images = await ctx.db.galleryImage.findMany({
        where: { galleryId: input.galleryId },
        take: input.limit + 1,
        cursor: input.cursor ? { id: input.cursor } : undefined,
        orderBy: { createdAt: "desc" },
        include: {
          faces: {
            include: {
              cluster: true,
            },
          },
        },
      });

      let nextCursor: string | undefined;
      if (images.length > input.limit) {
        const nextItem = images.pop();
        nextCursor = nextItem?.id;
      }

      return { images, nextCursor };
    }),

  /**
   * Generate presigned URL for image upload
   */
  generateUploadUrl: adminProcedure
    .input(
      z.object({
        galleryId: z.string(),
        filename: z.string(),
        contentType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const gallery = await ctx.db.photoGallery.findUnique({
        where: { id: input.galleryId },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      const { uploadUrl, s3Key, imageUrl } = await generateGalleryUploadUrl({
        galleryId: input.galleryId,
        filename: input.filename,
        contentType: input.contentType,
      });

      return { uploadUrl, s3Key, imageUrl };
    }),

  /**
   * Confirm image upload and create database record
   */
  confirmUpload: adminProcedure
    .input(
      z.object({
        galleryId: z.string(),
        s3Key: z.string(),
        filename: z.string(),
        fileSize: z.number(),
        contentType: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const gallery = await ctx.db.photoGallery.findUnique({
        where: { id: input.galleryId },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      // Check if image with same filename already exists
      const existingImage = await ctx.db.galleryImage.findFirst({
        where: {
          galleryId: input.galleryId,
          filename: input.filename,
        },
      });

      if (existingImage) {
        throw new TRPCError({
          code: "CONFLICT",
          message: `Image with filename "${input.filename}" already exists in this gallery`,
        });
      }

      // Create image record
      const image = await ctx.db.galleryImage.create({
        data: {
          galleryId: input.galleryId,
          s3Key: input.s3Key,
          s3Bucket: GALLERY_S3_BUCKET,
          imageUrl: getGalleryImageUrl(input.s3Key),
          filename: input.filename,
          fileSize: input.fileSize,
          contentType: input.contentType,
        },
      });

      // Update gallery image count
      await ctx.db.photoGallery.update({
        where: { id: input.galleryId },
        data: {
          totalImages: { increment: 1 },
          status: "uploading",
        },
      });

      return image;
    }),

  /**
   * Preview images in a Google Drive folder before importing
   */
  previewGoogleDriveFolder: adminProcedure
    .input(
      z.object({
        driveUrl: z.string(),
      }),
    )
    .query(async ({ input }) => {
      if (!isGoogleDriveConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Drive API is not configured",
        });
      }

      const folderId = extractFolderId(input.driveUrl);
      if (!folderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid Google Drive folder URL. Please use a public folder link.",
        });
      }

      // List files
      let files;
      try {
        files = await listFolderImages(folderId);
      } catch (error) {
        console.error("Failed to list Google Drive folder:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Could not access the Google Drive folder. Make sure it's publicly shared.",
        });
      }

      if (files.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No images found in the Google Drive folder",
        });
      }

      // Calculate total size
      const totalSize = files.reduce((sum, file) => sum + file.size, 0);

      return {
        folderId,
        files: files.map((file) => ({
          id: file.id,
          name: file.name,
          size: file.size,
          mimeType: file.mimeType,
        })),
        totalFiles: files.length,
        totalSize,
      };
    }),

  /**
   * Import images from a public Google Drive folder
   */
  importFromGoogleDrive: adminProcedure
    .input(
      z.object({
        galleryId: z.string(),
        driveUrl: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      if (!isGoogleDriveConfigured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Google Drive API is not configured",
        });
      }

      const gallery = await ctx.db.photoGallery.findUnique({
        where: { id: input.galleryId },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      const folderId = extractFolderId(input.driveUrl);
      if (!folderId) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Invalid Google Drive folder URL. Please use a public folder link.",
        });
      }

      // List files first
      let files;
      try {
        files = await listFolderImages(folderId);
      } catch (error) {
        console.error("Failed to list Google Drive folder:", error);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message:
            "Could not access the Google Drive folder. Make sure it's publicly shared.",
        });
      }

      if (files.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No images found in the Google Drive folder",
        });
      }

      // Update gallery status
      await ctx.db.photoGallery.update({
        where: { id: input.galleryId },
        data: { status: "uploading" },
      });

      // Get existing filenames to check for duplicates
      const existingImages = await ctx.db.galleryImage.findMany({
        where: { galleryId: input.galleryId },
        select: { filename: true },
      });
      const existingFilenames = new Set(
        existingImages.map((img) => img.filename),
      );

      // Filter out duplicates
      const filesToImport = files.filter(
        (file) => !existingFilenames.has(file.name),
      );
      const skippedCount = files.length - filesToImport.length;

      if (skippedCount > 0) {
        console.log(`Skipping ${skippedCount} duplicate files`);
      }

      // Start progress tracking
      startImportProgress(input.galleryId, filesToImport.length);

      // Import files in background to avoid timeout
      const importFiles = async () => {
        let imported = 0;
        let failed = 0;
        let currentDelay = 50; // Start with 50ms between files (fast for Service Account)
        let consecutiveErrors = 0;

        for (const file of filesToImport) {
          // Check if import was cancelled
          if (isImportCancelled(input.galleryId)) {
            console.log(
              `Google Drive import cancelled for gallery ${input.galleryId}`,
            );
            break;
          }

          try {
            const { s3Key, imageUrl, fileSize } = await transferToS3(
              file.id,
              file.name,
              file.mimeType,
              input.galleryId,
            );

            await ctx.db.galleryImage.create({
              data: {
                galleryId: input.galleryId,
                s3Key,
                s3Bucket: GALLERY_S3_BUCKET,
                imageUrl,
                filename: file.name,
                fileSize,
                contentType: file.mimeType,
              },
            });

            await ctx.db.photoGallery.update({
              where: { id: input.galleryId },
              data: { totalImages: { increment: 1 } },
            });

            imported++;
            consecutiveErrors = 0; // Reset error counter on success
            updateImportProgress(input.galleryId, { imported });

            // Adaptive rate limiting: slow down between files
            await new Promise((resolve) => setTimeout(resolve, currentDelay));
          } catch (error) {
            console.error(`Failed to import ${file.name}:`, error);
            failed++;
            consecutiveErrors++;
            updateImportProgress(input.galleryId, { failed });

            // Adaptive backoff: if we're hitting errors, slow down significantly
            if (consecutiveErrors >= 3) {
              currentDelay = Math.min(currentDelay * 2, 10000); // Double delay, max 10s
              console.log(
                `Increasing delay to ${currentDelay}ms due to consecutive errors`,
              );
            }

            // Wait longer after errors before trying next file
            await new Promise((resolve) =>
              setTimeout(resolve, currentDelay * 2),
            );
          }
        }

        // Complete or mark as cancelled
        if (isImportCancelled(input.galleryId)) {
          console.log(
            `Google Drive import cancelled: ${imported} imported, ${failed} failed, ${skippedCount} skipped (duplicates)`,
          );
          // Reset gallery status
          await ctx.db.photoGallery.update({
            where: { id: input.galleryId },
            data: { status: "pending" },
          });
        } else {
          console.log(
            `Google Drive import complete: ${imported} imported, ${failed} failed, ${skippedCount} skipped (duplicates)`,
          );
          // Reset gallery status to pending BEFORE marking progress complete
          // This ensures UI sees updated status when it refetches
          await ctx.db.photoGallery.update({
            where: { id: input.galleryId },
            data: { status: "pending" },
          });
          // Now mark progress as complete, which triggers UI refetch
          completeImportProgress(input.galleryId);
        }
      };

      // Run import in background
      importFiles().catch((error) => {
        console.error("Google Drive import failed:", error);
      });

      const message =
        skippedCount > 0
          ? `بدء استيراد ${filesToImport.length} صورة (تم تخطي ${skippedCount} صورة مكررة)`
          : `بدء استيراد ${filesToImport.length} صورة من Google Drive`;

      return {
        success: true,
        message,
        totalFiles: files.length,
        filesToImport: filesToImport.length,
        skippedDuplicates: skippedCount,
      };
    }),

  /**
   * Get import progress for a gallery
   */
  getImportProgress: adminProcedure
    .input(z.object({ galleryId: z.string() }))
    .query(({ input }) => {
      const progress = getImportProgress(input.galleryId);
      return progress;
    }),

  /**
   * Cancel ongoing import for a gallery
   */
  cancelImport: adminProcedure
    .input(z.object({ galleryId: z.string() }))
    .mutation(({ input }) => {
      cancelImportProgress(input.galleryId);
      return { success: true, message: "Import cancelled" };
    }),

  /**
   * Start processing the gallery (face detection, clustering, matching)
   */
  startProcessing: adminProcedure
    .input(z.object({ galleryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const gallery = await ctx.db.photoGallery.findUnique({
        where: { id: input.galleryId },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      if (
        gallery.status === "processing" ||
        gallery.status === "clustering" ||
        gallery.status === "matching"
      ) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Gallery is already being processed",
        });
      }

      // Start processing in background (don't await)
      runGalleryProcessingPipeline(input.galleryId).catch((error) => {
        console.error("Gallery processing pipeline failed:", error);
      });

      return { success: true, message: "Processing started" };
    }),

  /**
   * Reprocess a gallery (dev only) - clears existing data and reruns pipeline
   */
  reprocess: adminProcedure
    .input(z.object({ galleryId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Only allow in development
      if (process.env.NODE_ENV !== "development") {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Reprocessing is only available in development mode",
        });
      }

      const gallery = await ctx.db.photoGallery.findUnique({
        where: { id: input.galleryId },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      // Delete existing Rekognition collection
      if (gallery.rekognitionCollectionId) {
        try {
          await deleteCollection(gallery.rekognitionCollectionId);
        } catch (error) {
          console.error("Failed to delete Rekognition collection:", error);
        }
      }

      // Delete all face clusters for this gallery
      await ctx.db.faceCluster.deleteMany({
        where: { galleryId: input.galleryId },
      });

      // Delete all detected faces for images in this gallery
      await ctx.db.detectedFace.deleteMany({
        where: {
          image: { galleryId: input.galleryId },
        },
      });

      // Reset all images to pending status
      await ctx.db.galleryImage.updateMany({
        where: { galleryId: input.galleryId },
        data: {
          status: "pending",
          faceCount: 0,
          processedAt: null,
          errorMessage: null,
        },
      });

      // Reset gallery processing state
      await ctx.db.photoGallery.update({
        where: { id: input.galleryId },
        data: {
          status: "pending",
          rekognitionCollectionId: null,
          processedImages: 0,
          totalFaces: 0,
          totalClusters: 0,
          lastError: null,
          processingStartedAt: null,
          processingCompletedAt: null,
        },
      });

      // Start reprocessing in background
      runGalleryProcessingPipeline(input.galleryId).catch((error) => {
        console.error("Gallery reprocessing pipeline failed:", error);
      });

      return { success: true, message: "Reprocessing started" };
    }),

  /**
   * Get processing status for a gallery
   */
  getProcessingStatus: adminProcedure
    .input(z.object({ galleryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const gallery = await ctx.db.photoGallery.findUnique({
        where: { id: input.galleryId },
        select: {
          status: true,
          totalImages: true,
          processedImages: true,
          totalFaces: true,
          totalClusters: true,
          lastError: true,
          processingStartedAt: true,
          processingCompletedAt: true,
        },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      return gallery;
    }),

  /**
   * Get face clusters for a gallery
   */
  getClusters: adminProcedure
    .input(
      z.object({
        galleryId: z.string(),
        filter: z.enum(["all", "assigned", "unassigned"]).default("all"),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Build dynamic where clause
      const baseWhere = { galleryId: input.galleryId };

      let clusters;
      if (input.filter === "assigned") {
        // Has userId (not null)
        clusters = await ctx.db.faceCluster.findMany({
          where: {
            ...baseWhere,
            userId: { not: null },
          },
          orderBy: { faceCount: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            faces: {
              include: {
                image: true,
              },
              orderBy: { clusterSimilarity: "desc" },
            },
          },
        });
      } else if (input.filter === "unassigned") {
        clusters = await ctx.db.faceCluster.findMany({
          where: {
            ...baseWhere,
            userId: null,
            manualName: null,
          },
          orderBy: { faceCount: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            faces: {
              include: {
                image: true,
              },
              orderBy: { clusterSimilarity: "desc" },
            },
          },
        });
      } else {
        clusters = await ctx.db.faceCluster.findMany({
          where: baseWhere,
          orderBy: { faceCount: "desc" },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                avatarUrl: true,
              },
            },
            faces: {
              include: {
                image: true,
              },
              orderBy: { clusterSimilarity: "desc" },
            },
          },
        });
      }

      return clusters;
    }),

  /**
   * Assign a cluster to a registered user
   */
  assignClusterToUser: adminProcedure
    .input(
      z.object({
        clusterId: z.string(),
        userId: z.string(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cluster = await ctx.db.faceCluster.findUnique({
        where: { id: input.clusterId },
      });

      if (!cluster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cluster not found",
        });
      }

      const user = await ctx.db.user.findUnique({
        where: { id: input.userId },
      });

      if (!user) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "User not found",
        });
      }

      await ctx.db.faceCluster.update({
        where: { id: input.clusterId },
        data: {
          userId: input.userId,
          manualName: null,
          manualPhone: null,
          manualEmail: null,
          isVerified: true,
        },
      });

      return { success: true };
    }),

  /**
   * Assign a cluster to a non-registered person (manual entry)
   */
  assignClusterManually: adminProcedure
    .input(
      z.object({
        clusterId: z.string(),
        name: z.string().min(1),
        phone: z.string().optional(),
        email: z.string().email().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cluster = await ctx.db.faceCluster.findUnique({
        where: { id: input.clusterId },
      });

      if (!cluster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cluster not found",
        });
      }

      await ctx.db.faceCluster.update({
        where: { id: input.clusterId },
        data: {
          userId: null,
          manualName: input.name,
          manualPhone: input.phone,
          manualEmail: input.email,
          isVerified: true,
        },
      });

      return { success: true };
    }),

  /**
   * Share a cluster's photos via WhatsApp or email
   */
  shareCluster: adminProcedure
    .input(
      z.object({
        clusterId: z.string(),
        via: z.enum(["whatsapp", "email"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const cluster = await ctx.db.faceCluster.findUnique({
        where: { id: input.clusterId },
        include: {
          user: true,
          gallery: {
            include: { session: true },
          },
        },
      });

      if (!cluster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Cluster not found",
        });
      }

      // Get contact info
      const phone = cluster.user?.phone || cluster.manualPhone;
      const email = cluster.user?.email || cluster.manualEmail;
      const name = cluster.user?.name || cluster.manualName || "ضيف";

      // Build the public URL
      const baseUrl =
        process.env.NEXT_PUBLIC_BASE_URL ||
        process.env.BASE_URL ||
        "http://localhost:3000";
      const publicUrl = `${baseUrl}/photos/${cluster.publicToken}`;

      if (input.via === "whatsapp") {
        if (!phone) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No phone number available for WhatsApp sharing",
          });
        }

        // WhatsApp message
        const sessionTitle = cluster.gallery.session?.title || "الفعالية";
        const message = `مرحباً ${name}،\n\nيسعدنا مشاركة صورك من ${sessionTitle}!\n\nشاهد وحمّل صورك من هنا:\n${publicUrl}`;

        // Return WhatsApp deep link
        const cleanPhone = phone.replace(/\D/g, "");
        const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;

        // Update share status
        await ctx.db.faceCluster.update({
          where: { id: input.clusterId },
          data: {
            shareStatus: "shared",
            sharedVia: "whatsapp",
            sharedAt: new Date(),
          },
        });

        return { success: true, whatsappUrl, publicUrl };
      } else {
        // Email sharing
        if (!email) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "No email available for email sharing",
          });
        }

        // TODO: Implement email sending using the existing email service
        // For now, just update the status and return the URL

        await ctx.db.faceCluster.update({
          where: { id: input.clusterId },
          data: {
            shareStatus: "shared",
            sharedVia: "email",
            sharedAt: new Date(),
          },
        });

        return { success: true, publicUrl };
      }
    }),

  /**
   * Get share status summary for a gallery
   */
  getShareStatus: adminProcedure
    .input(z.object({ galleryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const [total, shared, viewed, pending] = await Promise.all([
        ctx.db.faceCluster.count({ where: { galleryId: input.galleryId } }),
        ctx.db.faceCluster.count({
          where: { galleryId: input.galleryId, shareStatus: "shared" },
        }),
        ctx.db.faceCluster.count({
          where: { galleryId: input.galleryId, shareStatus: "viewed" },
        }),
        ctx.db.faceCluster.count({
          where: { galleryId: input.galleryId, shareStatus: "pending" },
        }),
      ]);

      return { total, shared, viewed, pending };
    }),

  /**
   * Get users who attended the session (for assignment dropdown)
   */
  getSessionAttendees: adminProcedure
    .input(z.object({ galleryId: z.string() }))
    .query(async ({ ctx, input }) => {
      const gallery = await ctx.db.photoGallery.findUnique({
        where: { id: input.galleryId },
        select: { sessionId: true },
      });

      if (!gallery) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Gallery not found",
        });
      }

      // Get all registered users for this session (not just attendees)
      const registrations = await ctx.db.registration.findMany({
        where: {
          sessionId: gallery.sessionId,
          user: { isNot: null },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
              avatarUrl: true,
            },
          },
          attendance: {
            select: {
              attended: true,
            },
          },
        },
        orderBy: {
          registeredAt: "desc",
        },
      });

      // Return users with attendance status, prioritizing those who attended
      const usersWithAttendance = registrations
        .filter((r) => r.user !== null)
        .map((r) => ({
          id: r.user!.id,
          name: r.user!.name,
          email: r.user!.email,
          phone: r.user!.phone,
          avatarUrl: r.user!.avatarUrl,
          attended: r.attendance?.attended ?? false,
        }))
        .sort((a, b) => {
          // Attendees first
          return (b.attended ? 1 : 0) - (a.attended ? 1 : 0);
        });

      return usersWithAttendance;
    }),

  // ==========================================
  // Public endpoints (no auth required)
  // ==========================================

  /**
   * Get photos by public token (for public viewing page)
   */
  getPhotosByToken: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ ctx, input }) => {
      const cluster = await ctx.db.faceCluster.findUnique({
        where: { publicToken: input.token },
        include: {
          gallery: {
            include: {
              session: {
                select: {
                  id: true,
                  title: true,
                  date: true,
                },
              },
            },
          },
          faces: {
            select: {
              clusterSimilarity: true,
              image: {
                select: {
                  id: true,
                  imageUrl: true,
                  filename: true,
                },
              },
            },
          },
          user: {
            select: {
              name: true,
            },
          },
        },
      });

      if (!cluster) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Photos not found",
        });
      }

      // Update view status on first view
      if (cluster.shareStatus !== "viewed") {
        await ctx.db.faceCluster.update({
          where: { id: cluster.id },
          data: {
            shareStatus: "viewed",
            viewedAt: cluster.viewedAt || new Date(),
            viewCount: { increment: 1 },
          },
        });
      } else {
        // Just increment view count
        await ctx.db.faceCluster.update({
          where: { id: cluster.id },
          data: {
            viewCount: { increment: 1 },
          },
        });
      }

      // Get unique images from the faces, with their match similarity
      const imageMap = new Map<
        string,
        {
          id: string;
          imageUrl: string;
          filename: string;
          matchSimilarity: number | null;
        }
      >();
      for (const face of cluster.faces) {
        if (face.image && !imageMap.has(face.image.id)) {
          imageMap.set(face.image.id, {
            ...face.image,
            matchSimilarity: face.clusterSimilarity,
          });
        }
      }

      return {
        personName: cluster.user?.name || cluster.manualName || "ضيف",
        sessionTitle: cluster.gallery.session?.title || "الفعالية",
        sessionDate: cluster.gallery.session?.date,
        images: Array.from(imageMap.values()),
        totalImages: imageMap.size,
        matchConfidence: cluster.matchConfidence,
      };
    }),
});
