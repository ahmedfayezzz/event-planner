import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/server/auth";
import fs from "fs";
import path from "path";
import { compareFaces, isRekognitionConfigured, MAX_IMAGE_SIZE } from "@/lib/rekognition";

export async function POST(request: NextRequest) {
  try {
    // Check authentication - admin only
    const session = await auth();
    if (
      !session?.user ||
      (session.user.role !== "ADMIN" && session.user.role !== "SUPER_ADMIN")
    ) {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }

    // Check if Rekognition is configured
    if (!isRekognitionConfigured()) {
      return NextResponse.json(
        { error: "AWS Rekognition غير مهيأ" },
        { status: 500 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const referenceImage = formData.get("image") as File | null;

    if (!referenceImage) {
      return NextResponse.json(
        { error: "الرجاء رفع صورة" },
        { status: 400 }
      );
    }

    // Convert File to Buffer
    const sourceBytes = Buffer.from(await referenceImage.arrayBuffer());

    // Check source image size
    if (sourceBytes.length > MAX_IMAGE_SIZE) {
      return NextResponse.json(
        { error: `حجم الصورة المرجعية كبير جداً (الحد الأقصى ${Math.round(MAX_IMAGE_SIZE / 1024 / 1024)}MB)` },
        { status: 400 }
      );
    }

    console.log(`Reference image size: ${(sourceBytes.length / 1024 / 1024).toFixed(2)}MB`);

    // Read all images from public/event-images/
    const eventImagesDir = path.join(process.cwd(), "public", "event-images");

    if (!fs.existsSync(eventImagesDir)) {
      return NextResponse.json(
        { error: "مجلد الصور غير موجود" },
        { status: 500 }
      );
    }

    const imageFiles = fs
      .readdirSync(eventImagesDir)
      .filter((f) => /\.(jpg|jpeg|png)$/i.test(f));

    if (imageFiles.length === 0) {
      return NextResponse.json(
        { error: "لا توجد صور في المجلد" },
        { status: 400 }
      );
    }

    console.log(`Processing ${imageFiles.length} images...`);

    // Compare against each image
    const matches: { filename: string; similarity: number }[] = [];
    const skipped: { filename: string; reason: string }[] = [];

    for (const filename of imageFiles) {
      const targetPath = path.join(eventImagesDir, filename);
      const targetBytes = fs.readFileSync(targetPath);

      const sizeMB = (targetBytes.length / 1024 / 1024).toFixed(2);
      console.log(`Processing ${filename} (${sizeMB}MB)...`);

      // Skip files that are too large
      if (targetBytes.length > MAX_IMAGE_SIZE) {
        console.log(`Skipping ${filename}: too large (${sizeMB}MB)`);
        skipped.push({ filename, reason: "too_large" });
        continue;
      }

      const result = await compareFaces(sourceBytes, targetBytes);

      if (result.isMatch) {
        console.log(`Match found: ${filename} (${result.similarity.toFixed(1)}%)`);
        matches.push({ filename, similarity: result.similarity });
      } else if ("reason" in result && result.reason) {
        console.log(`Skipped ${filename}: ${result.reason}`);
        skipped.push({ filename, reason: result.reason });
      }
    }

    // Sort by similarity (highest first)
    matches.sort((a, b) => b.similarity - a.similarity);

    console.log(`Found ${matches.length} matches, skipped ${skipped.length} images`);

    return NextResponse.json({
      matches,
      total: imageFiles.length,
      skipped: skipped.length
    });
  } catch (error) {
    console.error("Face search error:", error);
    return NextResponse.json(
      { error: "حدث خطأ أثناء البحث" },
      { status: 500 }
    );
  }
}
