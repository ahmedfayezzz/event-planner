import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Gallery S3 Client - uses same credentials as Rekognition
let galleryS3Client: S3Client | null = null;

export function getGalleryS3Client(): S3Client {
  if (!galleryS3Client) {
    if (
      !process.env.AWS_REKOGNITION_ACCESS_KEY_ID ||
      !process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY
    ) {
      throw new Error("AWS credentials not configured for gallery");
    }

    const region = process.env.AWS_REKOGNITION_REGION ?? "us-east-1";

    galleryS3Client = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_REKOGNITION_ACCESS_KEY_ID.trim(),
        secretAccessKey: process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY.trim(),
      },
      region,
      // Explicitly use AWS S3 endpoint (override AWS_ENDPOINT_URL which points to Railway)
      endpoint: `https://s3.${region}.amazonaws.com`,
      forcePathStyle: false,
    });
  }
  return galleryS3Client;
}

export const GALLERY_S3_BUCKET = process.env.AWS_GALLERY_S3_BUCKET ?? "";
export const GALLERY_REGION = process.env.AWS_REKOGNITION_REGION ?? "us-east-1";
export const GALLERY_CLOUDFRONT_URL = process.env.AWS_GALLERY_CLOUDFRONT_URL;

/**
 * Check if gallery S3 is configured
 */
export function isGalleryS3Configured(): boolean {
  return !!(
    process.env.AWS_REKOGNITION_ACCESS_KEY_ID &&
    process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY &&
    process.env.AWS_GALLERY_S3_BUCKET
  );
}

/**
 * Generate the S3 key for a gallery image
 */
export function generateGalleryImageKey(
  galleryId: string,
  filename: string
): string {
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  return `galleries/${galleryId}/${timestamp}-${sanitizedFilename}`;
}

/**
 * Generate the S3 key for a face thumbnail
 */
export function generateFaceThumbnailKey(
  galleryId: string,
  imageId: string,
  faceIndex: number
): string {
  return `galleries/${galleryId}/faces/${imageId}-face-${faceIndex}.jpg`;
}

/**
 * Get the public URL for a gallery image (CDN or direct S3)
 * @param s3Key - The S3 key of the image
 * @param thumbnail - If true, returns the thumbnail version (if exists)
 */
export function getGalleryImageUrl(s3Key: string, thumbnail = false): string {
  const key = thumbnail ? getThumbnailKey(s3Key) : s3Key;

  if (GALLERY_CLOUDFRONT_URL) {
    return `${GALLERY_CLOUDFRONT_URL}/${key}`;
  }
  return `https://${GALLERY_S3_BUCKET}.s3.${GALLERY_REGION}.amazonaws.com/${key}`;
}

/**
 * Generate thumbnail key from original image key
 * Converts: galleries/abc/123-image.jpg -> galleries/abc/thumbs/123-image.jpg
 */
export function getThumbnailKey(originalKey: string): string {
  const parts = originalKey.split("/");
  const filename = parts[parts.length - 1];
  const path = parts.slice(0, -1).join("/");
  return `${path}/thumbs/${filename}`;
}

/**
 * Warm CloudFront cache by making a HEAD request to the CDN URL
 * This ensures the first user request gets a cached response
 */
export async function warmCloudFrontCache(s3Key: string): Promise<void> {
  if (!GALLERY_CLOUDFRONT_URL) {
    return; // Skip if not using CloudFront
  }

  const cdnUrl = getGalleryImageUrl(s3Key);

  try {
    // Make a HEAD request to warm the cache (doesn't download the body)
    await fetch(cdnUrl, { method: "HEAD" });
  } catch (error) {
    // Don't fail the upload if cache warming fails
    console.warn(`Failed to warm CloudFront cache for ${s3Key}:`, error);
  }
}

/**
 * Generate a presigned PUT URL for direct client upload
 */
export async function generateGalleryUploadUrl(params: {
  galleryId: string;
  filename: string;
  contentType: string;
}): Promise<{ uploadUrl: string; s3Key: string; imageUrl: string }> {
  const { galleryId, filename, contentType } = params;

  // Validate content type
  const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
  if (!allowedTypes.includes(contentType)) {
    throw new Error(
      `Invalid content type: ${contentType}. Allowed: ${allowedTypes.join(", ")}`
    );
  }

  const s3Key = generateGalleryImageKey(galleryId, filename);

  const command = new PutObjectCommand({
    Bucket: GALLERY_S3_BUCKET,
    Key: s3Key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
  });

  // Generate presigned URL (expires in 10 minutes)
  const uploadUrl = await getSignedUrl(getGalleryS3Client(), command, {
    expiresIn: 600,
  });

  const imageUrl = getGalleryImageUrl(s3Key);

  return { uploadUrl, s3Key, imageUrl };
}

/**
 * Generate a presigned GET URL for reading private objects
 */
export async function generateGalleryReadUrl(
  s3Key: string,
  expiresIn = 3600 // 1 hour default
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: GALLERY_S3_BUCKET,
    Key: s3Key,
  });

  return getSignedUrl(getGalleryS3Client(), command, { expiresIn });
}

/**
 * Delete a gallery image from S3
 */
export async function deleteGalleryImage(s3Key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: GALLERY_S3_BUCKET,
    Key: s3Key,
  });

  await getGalleryS3Client().send(command);
}

/**
 * Delete multiple gallery images from S3
 */
export async function deleteGalleryImages(s3Keys: string[]): Promise<void> {
  await Promise.all(s3Keys.map((key) => deleteGalleryImage(key)));
}

/**
 * Get S3 object reference for Rekognition (bucket + key)
 */
export function getS3ObjectReference(s3Key: string) {
  return {
    Bucket: GALLERY_S3_BUCKET,
    Name: s3Key,
  };
}
