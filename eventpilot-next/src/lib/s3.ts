import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 Client - lazy initialization to avoid errors when env vars are missing
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (
      !process.env.AWS_REGION ||
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY
    ) {
      throw new Error("AWS credentials not configured");
    }

    s3Client = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return s3Client;
}

export const S3_BUCKET = process.env.AWS_S3_BUCKET ?? "";
export const S3_REGION = process.env.AWS_REGION ?? "";
export const CLOUDFRONT_URL = process.env.AWS_CLOUDFRONT_URL;

// Image type configurations
export const IMAGE_TYPES = {
  avatar: {
    folder: "avatars",
    maxSizeBytes: 5 * 1024 * 1024, // 5MB
    allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
    dimensions: { width: 400, height: 400 },
  },
  banner: {
    folder: "sessions/banners",
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedContentTypes: ["image/jpeg", "image/png", "image/webp"],
    dimensions: { width: 1200, height: 630 },
  },
  logo: {
    folder: "sponsors/logos",
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedContentTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ],
    dimensions: { width: 300, height: 300 },
  },
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  return !!(
    process.env.AWS_REGION &&
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );
}

/**
 * Generate a presigned PUT URL for direct client upload
 */
export async function generatePresignedUploadUrl(params: {
  imageType: ImageType;
  fileName: string;
  contentType: string;
  entityId: string;
}): Promise<{ uploadUrl: string; publicUrl: string; key: string }> {
  const { imageType, fileName, contentType, entityId } = params;
  const config = IMAGE_TYPES[imageType];

  // Validate content type
  const allowedTypes: readonly string[] = config.allowedContentTypes;
  if (!allowedTypes.includes(contentType)) {
    throw new Error(
      `Invalid content type: ${contentType}. Allowed: ${config.allowedContentTypes.join(", ")}`
    );
  }

  // Generate unique key with timestamp to prevent caching issues
  const timestamp = Date.now();
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const extension = sanitizedFileName.split(".").pop() ?? "jpg";
  const key = `${config.folder}/${entityId}/${timestamp}.${extension}`;

  const command = new PutObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
    ContentType: contentType,
    CacheControl: "public, max-age=31536000, immutable",
    Metadata: {
      "entity-id": entityId,
      "image-type": imageType,
      "original-name": sanitizedFileName,
    },
  });

  // Generate presigned URL (expires in 10 minutes)
  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 600,
  });

  // Generate public URL (either CloudFront or direct S3)
  const publicUrl = CLOUDFRONT_URL
    ? `${CLOUDFRONT_URL}/${key}`
    : `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;

  return { uploadUrl, publicUrl, key };
}

/**
 * Delete an image from S3
 */
export async function deleteImage(key: string): Promise<void> {
  const command = new DeleteObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  await getS3Client().send(command);
}

/**
 * Extract S3 key from public URL
 */
export function extractKeyFromUrl(url: string): string | null {
  try {
    // Handle CloudFront URLs
    if (CLOUDFRONT_URL && url.startsWith(CLOUDFRONT_URL)) {
      return url.replace(`${CLOUDFRONT_URL}/`, "");
    }

    // Handle direct S3 URLs
    const s3Pattern = new RegExp(
      `https://${S3_BUCKET}\\.s3\\.${S3_REGION}\\.amazonaws\\.com/(.+)`
    );
    const match = url.match(s3Pattern);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
