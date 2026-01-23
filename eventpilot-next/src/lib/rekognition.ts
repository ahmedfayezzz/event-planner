import {
  RekognitionClient,
  CompareFacesCommand,
  CreateCollectionCommand,
  DeleteCollectionCommand,
  IndexFacesCommand,
  SearchFacesByImageCommand,
  SearchFacesCommand,
  ListFacesCommand,
  DeleteFacesCommand,
  InvalidParameterException,
  ImageTooLargeException,
  InvalidImageFormatException,
  ResourceAlreadyExistsException,
  ResourceNotFoundException,
  type FaceRecord,
  type FaceMatch,
  type BoundingBox,
} from "@aws-sdk/client-rekognition";

// Max image size for Rekognition (5MB)
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

// Rekognition Client - lazy initialization to avoid errors when env vars are missing
let rekognitionClient: RekognitionClient | null = null;

function getRekognitionClient(): RekognitionClient {
  if (!rekognitionClient) {
    if (
      !process.env.AWS_REKOGNITION_ACCESS_KEY_ID ||
      !process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY
    ) {
      throw new Error("AWS Rekognition credentials not configured");
    }

    const region = process.env.AWS_REKOGNITION_REGION ?? "us-east-1";
    const accessKeyId = process.env.AWS_REKOGNITION_ACCESS_KEY_ID!.trim();
    const secretAccessKey = process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY!.trim();

    console.log(`Initializing Rekognition client:`);
    console.log(`  Region: ${region}`);
    console.log(`  Access Key ID: ${accessKeyId.substring(0, 4)}...${accessKeyId.substring(accessKeyId.length - 4)} (length: ${accessKeyId.length})`);
    console.log(`  Secret Key length: ${secretAccessKey.length}`);

    rekognitionClient = new RekognitionClient({
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      region,
      // Explicitly set the endpoint to ensure correct routing
      endpoint: `https://rekognition.${region}.amazonaws.com`,
    });
  }
  return rekognitionClient;
}

/**
 * Check if Rekognition is configured
 */
export function isRekognitionConfigured(): boolean {
  return !!(
    process.env.AWS_REKOGNITION_ACCESS_KEY_ID &&
    process.env.AWS_REKOGNITION_SECRET_ACCESS_KEY
  );
}

export type CompareResult =
  | { isMatch: true; similarity: number }
  | { isMatch: false; similarity: 0; reason?: string };

/**
 * Compare two faces and return similarity score
 * @param sourceImageBytes - Reference image buffer
 * @param targetImageBytes - Image to search in
 * @param similarityThreshold - Minimum similarity to consider a match (default 80%)
 * @returns Object with isMatch and similarity percentage
 */
export async function compareFaces(
  sourceImageBytes: Buffer,
  targetImageBytes: Buffer,
  similarityThreshold = 80
): Promise<CompareResult> {
  // Check image sizes before sending
  if (sourceImageBytes.length > MAX_IMAGE_SIZE) {
    return { isMatch: false, similarity: 0, reason: "source_too_large" };
  }
  if (targetImageBytes.length > MAX_IMAGE_SIZE) {
    return { isMatch: false, similarity: 0, reason: "target_too_large" };
  }

  const client = getRekognitionClient();

  // Convert Buffer to Uint8Array explicitly
  const sourceUint8 = new Uint8Array(sourceImageBytes);
  const targetUint8 = new Uint8Array(targetImageBytes);

  const command = new CompareFacesCommand({
    SourceImage: { Bytes: sourceUint8 },
    TargetImage: { Bytes: targetUint8 },
    SimilarityThreshold: similarityThreshold,
  });

  try {
    const response = await client.send(command);

    // Check if any face matches
    if (response.FaceMatches && response.FaceMatches.length > 0) {
      const bestMatch = response.FaceMatches[0];
      return {
        isMatch: true,
        similarity: bestMatch.Similarity ?? 0,
      };
    }

    return { isMatch: false, similarity: 0 };
  } catch (error: unknown) {
    // Handle specific Rekognition errors
    if (error instanceof InvalidParameterException) {
      // Usually means no face detected in one of the images
      return { isMatch: false, similarity: 0, reason: "no_face_detected" };
    }
    if (error instanceof ImageTooLargeException) {
      return { isMatch: false, similarity: 0, reason: "image_too_large" };
    }
    if (error instanceof InvalidImageFormatException) {
      return { isMatch: false, similarity: 0, reason: "invalid_format" };
    }

    // Log detailed error info for debugging
    const awsError = error as { name?: string; message?: string; $metadata?: { httpStatusCode?: number } };
    console.error("Rekognition error details:", {
      name: awsError.name,
      message: awsError.message,
      httpStatusCode: awsError.$metadata?.httpStatusCode,
    });

    // Re-throw unknown errors
    throw error;
  }
}

// ============================================
// Collections API for Gallery Feature
// ============================================

/**
 * Create a new Rekognition collection for a gallery
 */
export async function createCollection(collectionId: string): Promise<void> {
  const client = getRekognitionClient();

  try {
    const command = new CreateCollectionCommand({
      CollectionId: collectionId,
    });
    await client.send(command);
    console.log(`Created Rekognition collection: ${collectionId}`);
  } catch (error) {
    if (error instanceof ResourceAlreadyExistsException) {
      console.log(`Collection already exists: ${collectionId}`);
      return;
    }
    throw error;
  }
}

/**
 * Delete a Rekognition collection
 */
export async function deleteCollection(collectionId: string): Promise<void> {
  const client = getRekognitionClient();

  try {
    const command = new DeleteCollectionCommand({
      CollectionId: collectionId,
    });
    await client.send(command);
    console.log(`Deleted Rekognition collection: ${collectionId}`);
  } catch (error) {
    if (error instanceof ResourceNotFoundException) {
      console.log(`Collection not found: ${collectionId}`);
      return;
    }
    throw error;
  }
}

export interface IndexedFace {
  faceId: string;
  boundingBox: {
    top: number;
    left: number;
    width: number;
    height: number;
  };
  confidence: number;
  brightness?: number;
  sharpness?: number;
  // Pose data for selecting best thumbnail
  pose?: {
    yaw: number;   // Left/right rotation (-180 to 180, 0 = facing camera)
    pitch: number; // Up/down rotation (-180 to 180, 0 = level)
    roll: number;  // Head tilt (-180 to 180, 0 = upright)
  };
}

/**
 * Index faces in an image using S3 object reference
 * Returns array of detected faces with their IDs
 */
export async function indexFaces(
  collectionId: string,
  s3Bucket: string,
  s3Key: string,
  externalImageId: string
): Promise<IndexedFace[]> {
  const client = getRekognitionClient();

  const command = new IndexFacesCommand({
    CollectionId: collectionId,
    Image: {
      S3Object: {
        Bucket: s3Bucket,
        Name: s3Key,
      },
    },
    ExternalImageId: externalImageId,
    DetectionAttributes: ["ALL"], // Get all attributes including pose for best thumbnail selection
    MaxFaces: 100, // Max faces to detect per image
    QualityFilter: "AUTO", // Filter low quality faces
  });

  const response = await client.send(command);

  const faces: IndexedFace[] = [];

  if (response.FaceRecords) {
    for (const record of response.FaceRecords) {
      if (record.Face?.FaceId && record.Face.BoundingBox) {
        const box = record.Face.BoundingBox;
        const pose = record.FaceDetail?.Pose;
        faces.push({
          faceId: record.Face.FaceId,
          boundingBox: {
            top: box.Top ?? 0,
            left: box.Left ?? 0,
            width: box.Width ?? 0,
            height: box.Height ?? 0,
          },
          confidence: record.Face.Confidence ?? 0,
          brightness: record.FaceDetail?.Quality?.Brightness,
          sharpness: record.FaceDetail?.Quality?.Sharpness,
          pose: pose ? {
            yaw: pose.Yaw ?? 0,
            pitch: pose.Pitch ?? 0,
            roll: pose.Roll ?? 0,
          } : undefined,
        });
      }
    }
  }

  console.log(`Indexed ${faces.length} faces from ${s3Key}`);
  return faces;
}

export interface FaceSearchMatch {
  faceId: string;
  similarity: number;
  externalImageId?: string;
}

/**
 * Search for matching faces in a collection using S3 image
 */
export async function searchFacesByImage(
  collectionId: string,
  s3Bucket: string,
  s3Key: string,
  maxFaces = 10,
  faceMatchThreshold = 80
): Promise<FaceSearchMatch[]> {
  const client = getRekognitionClient();

  const command = new SearchFacesByImageCommand({
    CollectionId: collectionId,
    Image: {
      S3Object: {
        Bucket: s3Bucket,
        Name: s3Key,
      },
    },
    MaxFaces: maxFaces,
    FaceMatchThreshold: faceMatchThreshold,
  });

  try {
    const response = await client.send(command);

    const matches: FaceSearchMatch[] = [];

    if (response.FaceMatches) {
      for (const match of response.FaceMatches) {
        if (match.Face?.FaceId) {
          matches.push({
            faceId: match.Face.FaceId,
            similarity: match.Similarity ?? 0,
            externalImageId: match.Face.ExternalImageId,
          });
        }
      }
    }

    return matches;
  } catch (error) {
    if (error instanceof InvalidParameterException) {
      // No face detected in the image
      return [];
    }
    throw error;
  }
}

/**
 * Search for matching faces using image bytes (for user avatar matching)
 */
export async function searchFacesByImageBytes(
  collectionId: string,
  imageBytes: Buffer,
  maxFaces = 10,
  faceMatchThreshold = 80
): Promise<FaceSearchMatch[]> {
  const client = getRekognitionClient();

  const command = new SearchFacesByImageCommand({
    CollectionId: collectionId,
    Image: {
      Bytes: new Uint8Array(imageBytes),
    },
    MaxFaces: maxFaces,
    FaceMatchThreshold: faceMatchThreshold,
  });

  try {
    const response = await client.send(command);

    const matches: FaceSearchMatch[] = [];

    if (response.FaceMatches) {
      for (const match of response.FaceMatches) {
        if (match.Face?.FaceId) {
          matches.push({
            faceId: match.Face.FaceId,
            similarity: match.Similarity ?? 0,
            externalImageId: match.Face.ExternalImageId,
          });
        }
      }
    }

    return matches;
  } catch (error) {
    if (error instanceof InvalidParameterException) {
      // No face detected in the image
      return [];
    }
    throw error;
  }
}

/**
 * Search for similar faces in a collection using a face ID
 * This is used for clustering - find all faces similar to a reference face
 */
export async function searchFacesByFaceId(
  collectionId: string,
  faceId: string,
  maxFaces = 100,
  faceMatchThreshold = 85
): Promise<FaceSearchMatch[]> {
  const client = getRekognitionClient();

  const command = new SearchFacesCommand({
    CollectionId: collectionId,
    FaceId: faceId,
    MaxFaces: maxFaces,
    FaceMatchThreshold: faceMatchThreshold,
  });

  try {
    const response = await client.send(command);

    const matches: FaceSearchMatch[] = [];

    if (response.FaceMatches) {
      for (const match of response.FaceMatches) {
        if (match.Face?.FaceId) {
          matches.push({
            faceId: match.Face.FaceId,
            similarity: match.Similarity ?? 0,
            externalImageId: match.Face.ExternalImageId,
          });
        }
      }
    }

    return matches;
  } catch (error) {
    if (error instanceof InvalidParameterException) {
      // Face ID not found
      return [];
    }
    throw error;
  }
}

export interface CollectionFace {
  faceId: string;
  externalImageId?: string;
}

/**
 * List all faces in a collection
 */
export async function listFaces(
  collectionId: string,
  maxResults = 1000
): Promise<CollectionFace[]> {
  const client = getRekognitionClient();
  const faces: CollectionFace[] = [];
  let nextToken: string | undefined;

  do {
    const command = new ListFacesCommand({
      CollectionId: collectionId,
      MaxResults: Math.min(maxResults - faces.length, 1000),
      NextToken: nextToken,
    });

    const response = await client.send(command);

    if (response.Faces) {
      for (const face of response.Faces) {
        if (face.FaceId) {
          faces.push({
            faceId: face.FaceId,
            externalImageId: face.ExternalImageId,
          });
        }
      }
    }

    nextToken = response.NextToken;
  } while (nextToken && faces.length < maxResults);

  return faces;
}

/**
 * Delete faces from a collection
 */
export async function deleteFaces(
  collectionId: string,
  faceIds: string[]
): Promise<void> {
  if (faceIds.length === 0) return;

  const client = getRekognitionClient();

  // Rekognition allows max 4096 faces per request
  const batchSize = 4096;
  for (let i = 0; i < faceIds.length; i += batchSize) {
    const batch = faceIds.slice(i, i + batchSize);

    const command = new DeleteFacesCommand({
      CollectionId: collectionId,
      FaceIds: batch,
    });

    await client.send(command);
  }

  console.log(`Deleted ${faceIds.length} faces from collection ${collectionId}`);
}
