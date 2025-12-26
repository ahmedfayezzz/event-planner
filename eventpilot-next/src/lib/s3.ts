import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// S3 Client - lazy initialization to avoid errors when env vars are missing
let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    if (
      !process.env.AWS_ACCESS_KEY_ID ||
      !process.env.AWS_SECRET_ACCESS_KEY
    ) {
      throw new Error("AWS credentials not configured");
    }

    const config: ConstructorParameters<typeof S3Client>[0] = {
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    };

    // Support custom S3-compatible endpoints (Railway, MinIO, etc.)
    if (process.env.AWS_ENDPOINT_URL) {
      config.endpoint = process.env.AWS_ENDPOINT_URL;
      config.forcePathStyle = true; // Required for S3-compatible services
      config.region = process.env.AWS_REGION ?? "auto";
    } else if (process.env.AWS_REGION) {
      config.region = process.env.AWS_REGION;
    }

    s3Client = new S3Client(config);
  }
  return s3Client;
}

export const S3_BUCKET = process.env.AWS_S3_BUCKET ?? "";
export const S3_REGION = process.env.AWS_REGION ?? "";
export const S3_ENDPOINT = process.env.AWS_ENDPOINT_URL;
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
    folder: "catering/logos",
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedContentTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ],
    dimensions: { width: 300, height: 300 },
  },
  sponsorLogo: {
    folder: "sponsors/logos",
    maxSizeBytes: 2 * 1024 * 1024, // 2MB
    allowedContentTypes: [
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/svg+xml",
    ],
    dimensions: { width: 400, height: 400 },
  },
  sponsorAttachment: {
    folder: "sponsors/attachments",
    maxSizeBytes: 10 * 1024 * 1024, // 10MB
    allowedContentTypes: [
      // Documents
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      // Images
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ],
    dimensions: null, // No dimension restrictions for attachments
  },
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;

/**
 * Check if S3 is configured
 */
export function isS3Configured(): boolean {
  const hasCredentials = !!(
    process.env.AWS_ACCESS_KEY_ID &&
    process.env.AWS_SECRET_ACCESS_KEY &&
    process.env.AWS_S3_BUCKET
  );

  // Either custom endpoint OR AWS region is required
  const hasEndpoint = !!(process.env.AWS_ENDPOINT_URL || process.env.AWS_REGION);

  return hasCredentials && hasEndpoint;
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

  // Generate public URL (CloudFront > Custom Endpoint > AWS S3)
  let publicUrl: string;
  if (CLOUDFRONT_URL) {
    publicUrl = `${CLOUDFRONT_URL}/${key}`;
  } else if (S3_ENDPOINT) {
    // For S3-compatible services (Railway, MinIO), use path-style URLs
    publicUrl = `${S3_ENDPOINT}/${S3_BUCKET}/${key}`;
  } else {
    // Standard AWS S3 virtual-hosted style URL
    publicUrl = `https://${S3_BUCKET}.s3.${S3_REGION}.amazonaws.com/${key}`;
  }

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
 * Generate a presigned GET URL for reading private objects
 * Railway buckets are private by default - use presigned URLs for access
 * @param key - S3 object key
 * @param expiresIn - URL expiration in seconds (default 7 days, max 90 days on Railway)
 */
export async function generatePresignedReadUrl(
  key: string,
  expiresIn = 604800 // 7 days default
): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: S3_BUCKET,
    Key: key,
  });

  return getSignedUrl(getS3Client(), command, { expiresIn });
}

/**
 * Check if we need presigned URLs for reading (Railway/private buckets)
 * Returns true if using S3_ENDPOINT without CloudFront
 */
export function needsPresignedReadUrl(): boolean {
  return !!(S3_ENDPOINT && !CLOUDFRONT_URL);
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

    // Handle S3-compatible endpoint URLs (Railway, MinIO)
    if (S3_ENDPOINT && url.startsWith(S3_ENDPOINT)) {
      const pathAfterEndpoint = url.replace(`${S3_ENDPOINT}/`, "");
      // Remove bucket name from path (path-style URLs: endpoint/bucket/key)
      if (pathAfterEndpoint.startsWith(`${S3_BUCKET}/`)) {
        return pathAfterEndpoint.replace(`${S3_BUCKET}/`, "");
      }
      return pathAfterEndpoint;
    }

    // Handle direct AWS S3 URLs (virtual-hosted style)
    const s3Pattern = new RegExp(
      `https://${S3_BUCKET}\\.s3\\.${S3_REGION}\\.amazonaws\\.com/(.+)`
    );
    const match = url.match(s3Pattern);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
