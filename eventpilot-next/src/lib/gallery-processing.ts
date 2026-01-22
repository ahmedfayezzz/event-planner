import { db } from "@/server/db";
import {
  createCollection,
  deleteCollection,
  indexFaces,
  searchFacesByImageBytes,
  searchFacesByFaceId,
  type IndexedFace,
} from "./rekognition";
import {
  GALLERY_S3_BUCKET,
  getGalleryImageUrl,
  generateFaceThumbnailKey,
  getGalleryS3Client,
} from "./gallery-s3";
import { GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";

/**
 * Generate a unique collection ID for a gallery
 */
export function generateCollectionId(galleryId: string): string {
  return `eventpilot-gallery-${galleryId}`;
}

/**
 * Generate a face thumbnail by cropping from the original image
 */
async function generateFaceThumbnail(
  face: {
    boundingBoxTop: number;
    boundingBoxLeft: number;
    boundingBoxWidth: number;
    boundingBoxHeight: number;
  },
  image: { s3Key: string; s3Bucket: string; galleryId: string; id: string },
  faceIndex: number
): Promise<{ thumbnailUrl: string; thumbnailS3Key: string }> {
  const s3Client = getGalleryS3Client();

  // 1. Fetch the original image from S3
  const getCommand = new GetObjectCommand({
    Bucket: image.s3Bucket,
    Key: image.s3Key,
  });
  const response = await s3Client.send(getCommand);
  const imageBuffer = Buffer.from(await response.Body!.transformToByteArray());

  // 2. Get image dimensions
  const metadata = await sharp(imageBuffer).metadata();
  const imgWidth = metadata.width || 1;
  const imgHeight = metadata.height || 1;

  // 3. Convert normalized bounding box (0-1) to pixels with 20% padding
  const padding = 0.2;
  const left = Math.max(
    0,
    Math.floor((face.boundingBoxLeft - padding * face.boundingBoxWidth) * imgWidth)
  );
  const top = Math.max(
    0,
    Math.floor((face.boundingBoxTop - padding * face.boundingBoxHeight) * imgHeight)
  );
  const width = Math.min(
    imgWidth - left,
    Math.floor(face.boundingBoxWidth * (1 + 2 * padding) * imgWidth)
  );
  const height = Math.min(
    imgHeight - top,
    Math.floor(face.boundingBoxHeight * (1 + 2 * padding) * imgHeight)
  );

  // 4. Crop and resize the face region to a square thumbnail
  const thumbnailBuffer = await sharp(imageBuffer)
    .extract({ left, top, width, height })
    .resize(200, 200, { fit: "cover" })
    .jpeg({ quality: 85 })
    .toBuffer();

  // 5. Upload to S3
  const thumbnailS3Key = generateFaceThumbnailKey(image.galleryId, image.id, faceIndex);
  const putCommand = new PutObjectCommand({
    Bucket: GALLERY_S3_BUCKET,
    Key: thumbnailS3Key,
    Body: thumbnailBuffer,
    ContentType: "image/jpeg",
    CacheControl: "public, max-age=31536000, immutable",
  });
  await s3Client.send(putCommand);

  const thumbnailUrl = getGalleryImageUrl(thumbnailS3Key);
  return { thumbnailUrl, thumbnailS3Key };
}

/**
 * Initialize processing for a gallery
 * Creates the Rekognition collection and updates status
 */
export async function initializeGalleryProcessing(
  galleryId: string
): Promise<void> {
  const collectionId = generateCollectionId(galleryId);

  // Create Rekognition collection
  await createCollection(collectionId);

  // Update gallery with collection ID and status
  await db.photoGallery.update({
    where: { id: galleryId },
    data: {
      rekognitionCollectionId: collectionId,
      status: "processing",
      processingStartedAt: new Date(),
      lastError: null,
    },
  });
}

/**
 * Process a single image - detect and index faces
 */
export async function processGalleryImage(
  imageId: string
): Promise<IndexedFace[]> {
  const image = await db.galleryImage.findUnique({
    where: { id: imageId },
    include: { gallery: true },
  });

  if (!image || !image.gallery.rekognitionCollectionId) {
    throw new Error("Image or gallery collection not found");
  }

  // Update image status
  await db.galleryImage.update({
    where: { id: imageId },
    data: { status: "processing" },
  });

  try {
    // Index faces in the image
    const faces = await indexFaces(
      image.gallery.rekognitionCollectionId,
      image.s3Bucket,
      image.s3Key,
      imageId // Use imageId as externalImageId for tracking
    );

    // Create DetectedFace records and generate thumbnails
    let faceIndex = 0;
    for (const face of faces) {
      const detectedFace = await db.detectedFace.create({
        data: {
          imageId: imageId,
          rekognitionFaceId: face.faceId,
          boundingBoxTop: face.boundingBox.top,
          boundingBoxLeft: face.boundingBox.left,
          boundingBoxWidth: face.boundingBox.width,
          boundingBoxHeight: face.boundingBox.height,
          confidence: face.confidence,
          brightness: face.brightness,
          sharpness: face.sharpness,
        },
      });

      // Generate face thumbnail
      try {
        const { thumbnailUrl, thumbnailS3Key } = await generateFaceThumbnail(
          {
            boundingBoxTop: face.boundingBox.top,
            boundingBoxLeft: face.boundingBox.left,
            boundingBoxWidth: face.boundingBox.width,
            boundingBoxHeight: face.boundingBox.height,
          },
          {
            s3Key: image.s3Key,
            s3Bucket: image.s3Bucket,
            galleryId: image.galleryId,
            id: imageId,
          },
          faceIndex
        );

        await db.detectedFace.update({
          where: { id: detectedFace.id },
          data: {
            faceThumbnailUrl: thumbnailUrl,
            faceThumbnailS3Key: thumbnailS3Key,
          },
        });
      } catch (thumbnailError) {
        console.error(`Failed to generate thumbnail for face ${detectedFace.id}:`, thumbnailError);
        // Continue processing - thumbnails are nice-to-have
      }

      faceIndex++;
    }

    // Update image status
    await db.galleryImage.update({
      where: { id: imageId },
      data: {
        status: faces.length > 0 ? "completed" : "skipped",
        faceCount: faces.length,
        processedAt: new Date(),
      },
    });

    // Update gallery counters
    await db.photoGallery.update({
      where: { id: image.galleryId },
      data: {
        processedImages: { increment: 1 },
        totalFaces: { increment: faces.length },
      },
    });

    return faces;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    await db.galleryImage.update({
      where: { id: imageId },
      data: {
        status: "failed",
        errorMessage,
        processedAt: new Date(),
      },
    });

    // Still increment processed count
    await db.photoGallery.update({
      where: { id: image.galleryId },
      data: {
        processedImages: { increment: 1 },
      },
    });

    throw error;
  }
}

/**
 * Process all pending images in a gallery
 */
export async function processAllGalleryImages(
  galleryId: string
): Promise<{ processed: number; failed: number }> {
  const images = await db.galleryImage.findMany({
    where: {
      galleryId,
      status: "pending",
    },
  });

  let processed = 0;
  let failed = 0;

  for (const image of images) {
    try {
      await processGalleryImage(image.id);
      processed++;
    } catch (error) {
      console.error(`Failed to process image ${image.id}:`, error);
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Cluster faces by similarity using AWS Rekognition SearchFacesByFaceId
 * Groups faces that belong to the same person
 */
export async function clusterGalleryFaces(galleryId: string): Promise<number> {
  // Update status
  await db.photoGallery.update({
    where: { id: galleryId },
    data: { status: "clustering" },
  });

  const gallery = await db.photoGallery.findUnique({
    where: { id: galleryId },
  });

  if (!gallery?.rekognitionCollectionId) {
    throw new Error("Gallery collection not found");
  }

  // Get all unassigned faces with rekognitionFaceId
  const faces = await db.detectedFace.findMany({
    where: {
      image: { galleryId },
      clusterId: null,
      rekognitionFaceId: { not: null },
    },
    include: {
      image: true,
    },
  });

  if (faces.length === 0) {
    return 0;
  }

  // Build lookup map: rekognitionFaceId → DetectedFace
  const faceMap = new Map<string, (typeof faces)[0]>();
  for (const face of faces) {
    if (face.rekognitionFaceId) {
      faceMap.set(face.rekognitionFaceId, face);
    }
  }

  // Track processed Rekognition face IDs
  const processedRekognitionFaceIds = new Set<string>();
  let clusterCount = 0;

  for (const face of faces) {
    if (!face.rekognitionFaceId || processedRekognitionFaceIds.has(face.rekognitionFaceId)) {
      continue;
    }

    // Search for similar faces in the collection using Rekognition
    let similarFaces: { faceId: string; similarity: number }[] = [];
    try {
      similarFaces = await searchFacesByFaceId(
        gallery.rekognitionCollectionId,
        face.rekognitionFaceId,
        100, // max faces to return
        90   // 90% similarity threshold
      );
    } catch (error) {
      console.error(`Error searching for similar faces:`, error);
    }

    // Collect all faces in this cluster with their similarity scores
    // The seed face has 100% similarity (to itself)
    const clusterFaces: { id: string; similarity: number }[] = [
      { id: face.id, similarity: 100 }
    ];
    processedRekognitionFaceIds.add(face.rekognitionFaceId);

    // Add similar faces to the cluster with their similarity scores
    for (const match of similarFaces) {
      if (processedRekognitionFaceIds.has(match.faceId)) continue;

      const matchedFace = faceMap.get(match.faceId);
      if (matchedFace) {
        clusterFaces.push({ id: matchedFace.id, similarity: match.similarity });
        processedRekognitionFaceIds.add(match.faceId);
      }
    }

    // Create cluster with all matched faces
    clusterCount++;
    const cluster = await db.faceCluster.create({
      data: {
        galleryId,
        autoLabel: `شخص ${clusterCount}`, // "Person X" in Arabic
        faceCount: clusterFaces.length,
        representativeFaceUrl: face.faceThumbnailUrl || face.image.imageUrl,
      },
    });

    // Assign all faces to this cluster with their similarity scores
    for (const clusterFace of clusterFaces) {
      await db.detectedFace.update({
        where: { id: clusterFace.id },
        data: {
          clusterId: cluster.id,
          clusterSimilarity: clusterFace.similarity,
        },
      });
    }

    console.log(`Created cluster ${clusterCount} with ${clusterFaces.length} faces`);
  }

  // Update gallery
  await db.photoGallery.update({
    where: { id: galleryId },
    data: { totalClusters: clusterCount },
  });

  return clusterCount;
}

/**
 * Match face clusters to user profiles based on avatar
 */
export async function matchClustersToUsers(
  galleryId: string
): Promise<{ matched: number; unmatched: number }> {
  // Update status
  await db.photoGallery.update({
    where: { id: galleryId },
    data: { status: "matching" },
  });

  const gallery = await db.photoGallery.findUnique({
    where: { id: galleryId },
    include: { session: true },
  });

  if (!gallery?.rekognitionCollectionId) {
    throw new Error("Gallery collection not found");
  }

  // Get all users who attended this session and have avatars
  const registrations = await db.registration.findMany({
    where: {
      sessionId: gallery.sessionId,
      attendance: { attended: true },
    },
    include: {
      user: true,
    },
  });

  const usersWithAvatars = registrations
    .filter((r) => r.user?.avatarUrl)
    .map((r) => r.user!);

  let matched = 0;
  let unmatched = 0;

  // Get unassigned clusters
  const clusters = await db.faceCluster.findMany({
    where: {
      galleryId,
      userId: null,
    },
    include: {
      faces: {
        include: { image: true },
        take: 1,
      },
    },
  });

  for (const cluster of clusters) {
    if (cluster.faces.length === 0) continue;

    // Try to match with user avatars
    let bestMatch: { userId: string; similarity: number } | null = null;

    for (const user of usersWithAvatars) {
      if (!user.avatarUrl) continue;

      try {
        // Download avatar and search in collection
        const avatarResponse = await fetch(user.avatarUrl);
        if (!avatarResponse.ok) continue;

        const avatarBuffer = Buffer.from(await avatarResponse.arrayBuffer());

        const matches = await searchFacesByImageBytes(
          gallery.rekognitionCollectionId,
          avatarBuffer,
          5,
          80 // 80% similarity threshold
        );

        // Check if any match belongs to this cluster's faces
        for (const match of matches) {
          const matchingFace = cluster.faces.find(
            (f) => f.rekognitionFaceId === match.faceId
          );

          if (matchingFace && (!bestMatch || match.similarity > bestMatch.similarity)) {
            bestMatch = { userId: user.id, similarity: match.similarity };
          }
        }
      } catch (error) {
        console.error(`Error matching user ${user.id}:`, error);
      }
    }

    if (bestMatch) {
      await db.faceCluster.update({
        where: { id: cluster.id },
        data: {
          userId: bestMatch.userId,
          matchConfidence: bestMatch.similarity,
        },
      });
      matched++;
    } else {
      unmatched++;
    }
  }

  return { matched, unmatched };
}

/**
 * Complete gallery processing
 */
export async function completeGalleryProcessing(
  galleryId: string
): Promise<void> {
  await db.photoGallery.update({
    where: { id: galleryId },
    data: {
      status: "ready",
      processingCompletedAt: new Date(),
    },
  });
}

/**
 * Mark gallery as failed
 */
export async function failGalleryProcessing(
  galleryId: string,
  error: string
): Promise<void> {
  await db.photoGallery.update({
    where: { id: galleryId },
    data: {
      status: "error",
      lastError: error,
      processingCompletedAt: new Date(),
    },
  });
}

/**
 * Run the full processing pipeline for a gallery
 */
export async function runGalleryProcessingPipeline(
  galleryId: string
): Promise<void> {
  try {
    console.log(`Starting gallery processing for ${galleryId}`);

    // 1. Initialize (create collection)
    await initializeGalleryProcessing(galleryId);
    console.log("Initialized processing");

    // 2. Process all images
    const { processed, failed } = await processAllGalleryImages(galleryId);
    console.log(`Processed ${processed} images, ${failed} failed`);

    // 3. Cluster faces
    const clusterCount = await clusterGalleryFaces(galleryId);
    console.log(`Created ${clusterCount} face clusters`);

    // 4. Match to users
    const { matched, unmatched } = await matchClustersToUsers(galleryId);
    console.log(`Matched ${matched} clusters, ${unmatched} unmatched`);

    // 5. Complete
    await completeGalleryProcessing(galleryId);
    console.log("Gallery processing complete");
  } catch (error) {
    console.error("Gallery processing failed:", error);
    await failGalleryProcessing(
      galleryId,
      error instanceof Error ? error.message : "Unknown error"
    );
    throw error;
  }
}

/**
 * Clean up a gallery (delete collection and all data)
 */
export async function cleanupGallery(galleryId: string): Promise<void> {
  const gallery = await db.photoGallery.findUnique({
    where: { id: galleryId },
  });

  if (gallery?.rekognitionCollectionId) {
    await deleteCollection(gallery.rekognitionCollectionId);
  }

  // Prisma cascade will handle deleting related records
  await db.photoGallery.delete({
    where: { id: galleryId },
  });
}
