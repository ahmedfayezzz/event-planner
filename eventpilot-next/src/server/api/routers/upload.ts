import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure, publicProcedure, protectedProcedure } from "../trpc";
import {
  generatePresignedUploadUrl,
  generatePresignedReadUrl,
  deleteImage,
  extractKeyFromUrl,
  IMAGE_TYPES,
  isS3Configured,
  needsPresignedReadUrl,
  type ImageType,
} from "@/lib/s3";

// Zod schema for image types
const imageTypeSchema = z.enum(["avatar", "banner", "logo", "sponsorLogo", "sponsorAttachment"]);

export const uploadRouter = createTRPCRouter({
  /**
   * Get presigned URL for image upload (admin only)
   */
  getPresignedUrl: adminProcedure
    .input(
      z.object({
        imageType: imageTypeSchema,
        fileName: z.string().min(1, "اسم الملف مطلوب"),
        contentType: z.string().min(1, "نوع الملف مطلوب"),
        fileSize: z.number().positive("حجم الملف يجب أن يكون أكبر من صفر"),
        entityId: z.string().min(1, "معرف الكيان مطلوب"),
      })
    )
    .mutation(async ({ input }) => {
      const { imageType, fileName, contentType, fileSize, entityId } = input;

      // Check if S3 is configured
      if (!isS3Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "خدمة رفع الملفات غير مفعلة. يرجى تكوين AWS S3.",
        });
      }

      const config = IMAGE_TYPES[imageType];

      // Validate file size
      if (fileSize > config.maxSizeBytes) {
        const maxSizeMB = config.maxSizeBytes / (1024 * 1024);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `حجم الملف يتجاوز الحد المسموح (${maxSizeMB} ميجابايت)`,
        });
      }

      // Validate content type
      const allowedTypes: readonly string[] = config.allowedContentTypes;
      if (!allowedTypes.includes(contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `نوع الملف غير مدعوم. الأنواع المدعومة: ${config.allowedContentTypes.join(", ")}`,
        });
      }

      try {
        const { uploadUrl, publicUrl, key } = await generatePresignedUploadUrl({
          imageType,
          fileName,
          contentType,
          entityId,
        });

        return {
          uploadUrl,
          publicUrl,
          key,
          expiresIn: 600, // 10 minutes
          maxSize: config.maxSizeBytes,
          recommendedDimensions: config.dimensions,
        };
      } catch (error) {
        console.error("Failed to generate presigned URL:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل في إنشاء رابط الرفع",
        });
      }
    }),

  /**
   * Confirm upload and update entity with image URL
   */
  confirmUpload: adminProcedure
    .input(
      z.object({
        imageType: imageTypeSchema,
        entityId: z.string(),
        imageUrl: z.string().url(),
        oldImageUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { imageType, entityId, imageUrl, oldImageUrl } = input;

      try {
        // Update the appropriate entity based on image type
        switch (imageType) {
          case "avatar":
            await db.user.update({
              where: { id: entityId },
              data: { avatarUrl: imageUrl },
            });
            break;

          case "banner":
            await db.session.update({
              where: { id: entityId },
              data: { bannerUrl: imageUrl },
            });
            break;

          case "logo":
            await db.eventCatering.update({
              where: { id: entityId },
              data: { logoUrl: imageUrl },
            });
            break;

          case "sponsorLogo":
            await db.sponsor.update({
              where: { id: entityId },
              data: { logoUrl: imageUrl },
            });
            break;
        }

        // Delete old image if provided
        if (oldImageUrl) {
          const oldKey = extractKeyFromUrl(oldImageUrl);
          if (oldKey) {
            try {
              await deleteImage(oldKey);
            } catch (error) {
              // Log but don't fail - old image deletion is not critical
              console.error("Failed to delete old image:", error);
            }
          }
        }

        return { success: true, imageUrl };
      } catch (error) {
        console.error("Failed to confirm upload:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل في تحديث الصورة",
        });
      }
    }),

  /**
   * Delete an image (admin only)
   */
  deleteImage: adminProcedure
    .input(
      z.object({
        imageType: imageTypeSchema,
        entityId: z.string(),
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const { imageType, entityId, imageUrl } = input;

      const key = extractKeyFromUrl(imageUrl);
      if (!key) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "رابط الصورة غير صالح",
        });
      }

      try {
        // Delete from S3
        await deleteImage(key);

        // Clear URL from entity
        switch (imageType) {
          case "avatar":
            await db.user.update({
              where: { id: entityId },
              data: { avatarUrl: null },
            });
            break;

          case "banner":
            await db.session.update({
              where: { id: entityId },
              data: { bannerUrl: null },
            });
            break;

          case "logo":
            await db.eventCatering.update({
              where: { id: entityId },
              data: { logoUrl: null },
            });
            break;

          case "sponsorLogo":
            await db.sponsor.update({
              where: { id: entityId },
              data: { logoUrl: null },
            });
            break;
        }

        return { success: true };
      } catch (error) {
        console.error("Failed to delete image:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل في حذف الصورة",
        });
      }
    }),

  /**
   * Get presigned URL for user's own avatar upload (authenticated users)
   */
  uploadUserAvatar: protectedProcedure
    .input(
      z.object({
        fileName: z.string().min(1, "اسم الملف مطلوب"),
        contentType: z.string().min(1, "نوع الملف مطلوب"),
        fileSize: z.number().positive("حجم الملف يجب أن يكون أكبر من صفر"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { fileName, contentType, fileSize } = input;
      const userId = ctx.session.user.id;

      // Check if S3 is configured
      if (!isS3Configured()) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "خدمة رفع الملفات غير مفعلة",
        });
      }

      const config = IMAGE_TYPES.avatar;

      // Validate file size
      if (fileSize > config.maxSizeBytes) {
        const maxSizeMB = config.maxSizeBytes / (1024 * 1024);
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `حجم الملف يتجاوز الحد المسموح (${maxSizeMB} ميجابايت)`,
        });
      }

      // Validate content type
      const allowedTypes: readonly string[] = config.allowedContentTypes;
      if (!allowedTypes.includes(contentType)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `نوع الملف غير مدعوم. الأنواع المدعومة: ${config.allowedContentTypes.join(", ")}`,
        });
      }

      try {
        const { uploadUrl, publicUrl, key } = await generatePresignedUploadUrl({
          imageType: "avatar",
          fileName,
          contentType,
          entityId: userId,
        });

        return {
          uploadUrl,
          publicUrl,
          key,
          expiresIn: 600, // 10 minutes
        };
      } catch (error) {
        console.error("Failed to generate presigned URL for user avatar:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل في إنشاء رابط الرفع",
        });
      }
    }),

  /**
   * Confirm user's own avatar upload
   */
  confirmUserAvatar: protectedProcedure
    .input(
      z.object({
        imageUrl: z.string().url(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { db } = ctx;
      const userId = ctx.session.user.id;
      const { imageUrl } = input;

      try {
        // Get current user to check for old avatar
        const user = await db.user.findUnique({
          where: { id: userId },
          select: { avatarUrl: true },
        });

        const oldAvatarUrl = user?.avatarUrl;

        // Update user's avatar
        await db.user.update({
          where: { id: userId },
          data: { avatarUrl: imageUrl },
        });

        // Delete old avatar if exists
        if (oldAvatarUrl) {
          const oldKey = extractKeyFromUrl(oldAvatarUrl);
          if (oldKey) {
            try {
              await deleteImage(oldKey);
            } catch (error) {
              console.error("Failed to delete old avatar:", error);
            }
          }
        }

        return { success: true, imageUrl };
      } catch (error) {
        console.error("Failed to confirm user avatar upload:", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "فشل في تحديث الصورة الشخصية",
        });
      }
    }),

  /**
   * Remove user's own avatar
   */
  removeUserAvatar: protectedProcedure.mutation(async ({ ctx }) => {
    const { db } = ctx;
    const userId = ctx.session.user.id;

    try {
      // Get current avatar URL
      const user = await db.user.findUnique({
        where: { id: userId },
        select: { avatarUrl: true },
      });

      if (!user?.avatarUrl) {
        return { success: true };
      }

      // Delete from S3
      const key = extractKeyFromUrl(user.avatarUrl);
      if (key) {
        try {
          await deleteImage(key);
        } catch (error) {
          console.error("Failed to delete avatar from S3:", error);
        }
      }

      // Clear from database
      await db.user.update({
        where: { id: userId },
        data: { avatarUrl: null },
      });

      return { success: true };
    } catch (error) {
      console.error("Failed to remove user avatar:", error);
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "فشل في حذف الصورة الشخصية",
      });
    }
  }),

  /**
   * Get upload configuration for client
   */
  getConfig: adminProcedure
    .input(z.object({ imageType: imageTypeSchema }))
    .query(({ input }) => {
      const config = IMAGE_TYPES[input.imageType];
      return {
        maxSizeBytes: config.maxSizeBytes,
        maxSizeMB: config.maxSizeBytes / (1024 * 1024),
        allowedContentTypes: [...config.allowedContentTypes],
        recommendedDimensions: config.dimensions,
        isConfigured: isS3Configured(),
      };
    }),

  /**
   * Get presigned read URL for displaying images (Railway private buckets)
   * Public endpoint - anyone can request a read URL for stored images
   */
  getReadUrl: publicProcedure
    .input(
      z.object({
        // The stored URL or S3 key
        url: z.string().min(1),
      })
    )
    .query(async ({ input }) => {
      const { url } = input;

      // If we don't need presigned URLs (CloudFront or public bucket), return original
      if (!needsPresignedReadUrl()) {
        return { url, presigned: false };
      }

      // Extract key from stored URL
      const key = extractKeyFromUrl(url);
      if (!key) {
        // If it's already a key (not a full URL), use it directly
        // This handles cases where we store just the key
        if (!url.startsWith("http")) {
          try {
            const presignedUrl = await generatePresignedReadUrl(url);
            return { url: presignedUrl, presigned: true };
          } catch {
            return { url, presigned: false };
          }
        }
        return { url, presigned: false };
      }

      try {
        const presignedUrl = await generatePresignedReadUrl(key);
        return { url: presignedUrl, presigned: true };
      } catch (error) {
        console.error("Failed to generate presigned read URL:", error);
        return { url, presigned: false };
      }
    }),

  /**
   * Check if presigned URLs are needed for this deployment
   */
  needsPresignedUrls: publicProcedure.query(() => {
    return {
      needsPresigned: needsPresignedReadUrl(),
      isConfigured: isS3Configured(),
    };
  }),
});
