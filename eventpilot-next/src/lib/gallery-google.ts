import { google } from "googleapis";
import { getGalleryS3Client, GALLERY_S3_BUCKET, getGalleryImageUrl, warmCloudFrontCache, getThumbnailKey } from "./gallery-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

/**
 * Check if Google Drive API is configured
 */
export function isGoogleDriveConfigured(): boolean {
  return !!process.env.GOOGLE_API_KEY;
}

/**
 * Get configured Google Drive client
 */
function getDriveClient() {
  if (!process.env.GOOGLE_API_KEY) {
    throw new Error("Google API key not configured");
  }

  return google.drive({
    version: "v3",
    auth: process.env.GOOGLE_API_KEY,
  });
}

/**
 * Extract folder ID from Google Drive URL
 * Handles:
 * - https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
 * - https://drive.google.com/drive/folders/FOLDER_ID
 * - https://drive.google.com/drive/u/0/folders/FOLDER_ID
 */
export function extractFolderId(url: string): string | null {
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match?.[1] ?? null;
}

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size: number;
}

/**
 * List all image files in a public Google Drive folder
 */
export async function listFolderImages(folderId: string): Promise<DriveFile[]> {
  const drive = getDriveClient();
  const images: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/webp') and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: 100,
      pageToken,
    });

    if (response.data.files) {
      for (const file of response.data.files) {
        if (file.id && file.name && file.mimeType) {
          images.push({
            id: file.id,
            name: file.name,
            mimeType: file.mimeType,
            size: parseInt(file.size ?? "0", 10),
          });
        }
      }
    }

    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return images;
}

/**
 * Retry a function with exponential backoff
 */
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 10,
  baseDelay: number = 2000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      lastError = error;

      // Check if it's a rate limit error (403 with specific reasons)
      const isRateLimit =
        (error as { code?: number })?.code === 403 ||
        (error as { status?: number })?.status === 403 ||
        (error as { response?: { status?: number } })?.response?.status === 403;

      // Log detailed error information for 403 errors
      if (isRateLimit) {
        const errorDetails = {
          code: (error as { code?: number })?.code,
          status: (error as { status?: number })?.status,
          message: (error as { message?: string })?.message,
          errors: (error as { errors?: unknown[] })?.errors,
          response: {
            status: (error as { response?: { status?: number } })?.response?.status,
            statusText: (error as { response?: { statusText?: string } })?.response?.statusText,
            data: (error as { response?: { data?: unknown } })?.response?.data,
          },
        };
        console.error("Google Drive API 403 Error:", JSON.stringify(errorDetails, null, 2));
      }

      // Don't retry on non-rate-limit errors
      if (!isRateLimit && attempt === 0) {
        throw error;
      }

      // Don't retry after max attempts
      if (attempt === maxRetries) {
        break;
      }

      // Calculate delay with exponential backoff + jitter
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      console.log(`Rate limit hit, retrying in ${Math.round(delay)}ms (attempt ${attempt + 1}/${maxRetries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}

/**
 * Download a file from Google Drive and upload to S3 with retry logic
 */
export async function transferToS3(
  fileId: string,
  filename: string,
  mimeType: string,
  galleryId: string
): Promise<{ s3Key: string; imageUrl: string; fileSize: number }> {
  const drive = getDriveClient();

  // Download from Google Drive with retry on rate limits
  const response = await retryWithBackoff(async () => {
    return await drive.files.get(
      { fileId, alt: "media" },
      { responseType: "arraybuffer" }
    );
  });

  const buffer = Buffer.from(response.data as ArrayBuffer);
  const fileSize = buffer.length;

  // Generate S3 key
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const s3Key = `galleries/${galleryId}/${timestamp}-${sanitizedFilename}`;

  // Upload original to S3
  const s3Client = getGalleryS3Client();
  await s3Client.send(
    new PutObjectCommand({
      Bucket: GALLERY_S3_BUCKET,
      Key: s3Key,
      Body: buffer,
      ContentType: mimeType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );

  // Generate and upload thumbnail (600x600, quality 70 for faster loading)
  try {
    const thumbnailBuffer = await sharp(buffer)
      .resize(600, 600, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 70 })
      .toBuffer();

    const thumbnailKey = getThumbnailKey(s3Key);
    await s3Client.send(
      new PutObjectCommand({
        Bucket: GALLERY_S3_BUCKET,
        Key: thumbnailKey,
        Body: thumbnailBuffer,
        ContentType: "image/jpeg",
        CacheControl: "public, max-age=31536000, immutable",
      })
    );

    // Warm CloudFront cache for thumbnail
    await warmCloudFrontCache(thumbnailKey);
  } catch (error) {
    console.error("Failed to generate thumbnail:", error);
    // Continue even if thumbnail generation fails
  }

  const imageUrl = getGalleryImageUrl(s3Key);

  // Warm CloudFront cache so the first view is fast
  await warmCloudFrontCache(s3Key);

  return { s3Key, imageUrl, fileSize };
}
