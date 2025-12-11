import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, adminProcedure } from "../trpc";
import {
  generatePresignedUploadUrl,
  deleteImage,
  extractKeyFromUrl,
  IMAGE_TYPES,
  isS3Configured,
  type ImageType,
} from "@/lib/s3";

// Zod schema for image types
const imageTypeSchema = z.enum(["avatar", "banner", "logo"]);

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
      if (
        !config.allowedContentTypes.includes(
          contentType as (typeof config.allowedContentTypes)[number]
        )
      ) {
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
});
