import { google } from "googleapis";
import { getGalleryS3Client, GALLERY_S3_BUCKET, getGalleryImageUrl } from "./gallery-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

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
 * Download a file from Google Drive and upload to S3
 */
export async function transferToS3(
  fileId: string,
  filename: string,
  mimeType: string,
  galleryId: string
): Promise<{ s3Key: string; imageUrl: string; fileSize: number }> {
  const drive = getDriveClient();

  // Download from Google Drive
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  const buffer = Buffer.from(response.data as ArrayBuffer);
  const fileSize = buffer.length;

  // Generate S3 key
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const s3Key = `galleries/${galleryId}/${timestamp}-${sanitizedFilename}`;

  // Upload to S3
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

  return { s3Key, imageUrl: getGalleryImageUrl(s3Key), fileSize };
}
