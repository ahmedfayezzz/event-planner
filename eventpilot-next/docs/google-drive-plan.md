# Google Drive Import for Gallery

## Overview
Allow admins to import photos directly from a publicly shared Google Drive folder instead of uploading manually.

## Prerequisites
1. **Google Cloud Console** - Create project at https://console.cloud.google.com
2. **Enable Google Drive API** - In API Library
3. **Create API Key** - Credentials → Create credentials → API key
4. **No OAuth needed** - Public folders accessible with just API key

## Environment Variable
```env
GOOGLE_API_KEY=your-api-key-here
```

## Dependencies
```bash
npm install googleapis
```

## Implementation Plan

### 1. Create `src/lib/gallery-google.ts`

```typescript
import { google } from "googleapis";
import { getGalleryS3Client, GALLERY_S3_BUCKET, getGalleryImageUrl } from "./gallery-s3";
import { PutObjectCommand } from "@aws-sdk/client-s3";

const drive = google.drive({
  version: "v3",
  auth: process.env.GOOGLE_API_KEY,
});

/**
 * Extract folder ID from Google Drive URL
 */
export function extractFolderId(url: string): string | null {
  // Handles: https://drive.google.com/drive/folders/FOLDER_ID?usp=sharing
  const match = url.match(/folders\/([a-zA-Z0-9_-]+)/);
  return match?.[1] || null;
}

/**
 * List all image files in a public Google Drive folder
 */
export async function listFolderImages(folderId: string): Promise<{
  id: string;
  name: string;
  mimeType: string;
  size: string;
}[]> {
  const images: any[] = [];
  let pageToken: string | undefined;

  do {
    const response = await drive.files.list({
      q: `'${folderId}' in parents and (mimeType='image/jpeg' or mimeType='image/png' or mimeType='image/webp') and trashed=false`,
      fields: "nextPageToken, files(id, name, mimeType, size)",
      pageSize: 100,
      pageToken,
    });

    images.push(...(response.data.files || []));
    pageToken = response.data.nextPageToken || undefined;
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
): Promise<{ s3Key: string; imageUrl: string }> {
  // Download from Google Drive
  const response = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "arraybuffer" }
  );

  const buffer = Buffer.from(response.data as ArrayBuffer);

  // Generate S3 key
  const timestamp = Date.now();
  const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, "_");
  const s3Key = `galleries/${galleryId}/${timestamp}-${sanitizedFilename}`;

  // Upload to S3
  const s3Client = getGalleryS3Client();
  await s3Client.send(new PutObjectCommand({
    Bucket: GALLERY_S3_BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: mimeType,
    CacheControl: "public, max-age=31536000, immutable",
  }));

  return { s3Key, imageUrl: getGalleryImageUrl(s3Key) };
}

/**
 * Import all images from a Google Drive folder to a gallery
 */
export async function importFromGoogleDrive(
  folderId: string,
  galleryId: string,
  onProgress?: (current: number, total: number) => void
): Promise<{ imported: number; failed: number; errors: string[] }> {
  const images = await listFolderImages(folderId);

  let imported = 0;
  let failed = 0;
  const errors: string[] = [];

  for (let i = 0; i < images.length; i++) {
    const file = images[i];
    onProgress?.(i + 1, images.length);

    try {
      const { s3Key, imageUrl } = await transferToS3(
        file.id,
        file.name,
        file.mimeType,
        galleryId
      );

      // Create GalleryImage record (done in tRPC endpoint)
      // ... return s3Key for caller to create record

      imported++;

      // Rate limit: ~2 requests/second to be safe
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      failed++;
      errors.push(`${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  return { imported, failed, errors };
}
```

### 2. Add tRPC Endpoint in `gallery.ts`

```typescript
importFromGoogleDrive: adminProcedure
  .input(z.object({
    galleryId: z.string(),
    driveUrl: z.string().url(),
  }))
  .mutation(async ({ ctx, input }) => {
    const folderId = extractFolderId(input.driveUrl);
    if (!folderId) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Invalid Google Drive folder URL",
      });
    }

    // List files first to get count
    const files = await listFolderImages(folderId);

    // Update gallery status
    await ctx.db.photoGallery.update({
      where: { id: input.galleryId },
      data: { status: "uploading" },
    });

    // Import files
    let imported = 0;
    for (const file of files) {
      try {
        const { s3Key, imageUrl } = await transferToS3(
          file.id,
          file.name,
          file.mimeType,
          input.galleryId
        );

        await ctx.db.galleryImage.create({
          data: {
            galleryId: input.galleryId,
            s3Key,
            s3Bucket: GALLERY_S3_BUCKET,
            imageUrl,
            filename: file.name,
            fileSize: parseInt(file.size) || 0,
            contentType: file.mimeType,
          },
        });

        await ctx.db.photoGallery.update({
          where: { id: input.galleryId },
          data: { totalImages: { increment: 1 } },
        });

        imported++;
      } catch (error) {
        console.error(`Failed to import ${file.name}:`, error);
      }
    }

    return { imported, total: files.length };
  }),
```

### 3. Add UI Button in Gallery Page

```tsx
// In gallery detail page
const [driveUrl, setDriveUrl] = useState("");
const importMutation = api.gallery.importFromGoogleDrive.useMutation({
  onSuccess: (data) => {
    toast.success(`تم استيراد ${data.imported} من ${data.total} صورة`);
    refetch();
  },
});

// Add this in the upload section
<div className="flex gap-2 mt-4">
  <Input
    placeholder="رابط مجلد Google Drive العام"
    value={driveUrl}
    onChange={(e) => setDriveUrl(e.target.value)}
    dir="ltr"
  />
  <Button
    onClick={() => importMutation.mutate({ galleryId, driveUrl })}
    disabled={!driveUrl || importMutation.isPending}
  >
    {importMutation.isPending ? (
      <Loader2 className="h-4 w-4 animate-spin" />
    ) : (
      "استيراد"
    )}
  </Button>
</div>
```

## Rate Limits & Considerations

| Limit | Value | Handling |
|-------|-------|----------|
| Queries/day | 1,000,000,000 | Not a concern |
| Queries/100s/user | 100 | Add 500ms delay between files |
| File size | No limit | Stream large files |

## Estimated Effort
- **Code**: 2-3 hours
- **Testing**: 1 hour
- **Total**: 3-4 hours

## Files to Create/Modify
- **New**: `src/lib/gallery-google.ts` (~150 lines)
- **Modify**: `src/server/api/routers/gallery.ts` (+80 lines)
- **Modify**: `src/app/admin/sessions/[id]/gallery/[galleryId]/page.tsx` (+30 lines)
