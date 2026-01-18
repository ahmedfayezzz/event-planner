import {
  RekognitionClient,
  CompareFacesCommand,
  InvalidParameterException,
  ImageTooLargeException,
  InvalidImageFormatException,
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
