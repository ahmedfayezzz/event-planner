"use client";

import { use, useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { formatArabicDate } from "@/lib/utils";
import { toast } from "sonner";
import { useDropzone } from "react-dropzone";
import {
  ArrowRight,
  Upload,
  Images,
  Users,
  Play,
  Loader2,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCcw,
  Eye,
  Download,
  X,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const statusLabels: Record<string, string> = {
  pending: "في الانتظار",
  uploading: "جاري الرفع",
  processing: "جاري المعالجة",
  clustering: "تجميع الوجوه",
  matching: "مطابقة الأشخاص",
  ready: "جاهز",
  error: "خطأ",
};

const statusColors: Record<string, string> = {
  pending: "bg-gray-500/10 text-gray-600 border-gray-200",
  uploading: "bg-blue-500/10 text-blue-600 border-blue-200",
  processing: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  clustering: "bg-purple-500/10 text-purple-600 border-purple-200",
  matching: "bg-orange-500/10 text-orange-600 border-orange-200",
  ready: "bg-green-500/10 text-green-600 border-green-200",
  error: "bg-red-500/10 text-red-600 border-red-200",
};

const imageStatusIcons: Record<string, React.ReactNode> = {
  pending: <Clock className="h-4 w-4 text-gray-500" />,
  processing: <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />,
  completed: <CheckCircle className="h-4 w-4 text-green-500" />,
  failed: <XCircle className="h-4 w-4 text-red-500" />,
  skipped: <Eye className="h-4 w-4 text-gray-400" />,
};

export default function GalleryDetailPage({
  params,
}: {
  params: Promise<{ id: string; galleryId: string }>;
}) {
  const { id: sessionId, galleryId } = use(params);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 });
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const utils = api.useUtils();

  const { data: gallery, isLoading } = api.gallery.getById.useQuery({
    galleryId,
  });

  const imageCount = gallery?.images.length ?? 0;

  // Keyboard navigation for lightbox
  useEffect(() => {
    if (lightboxIndex === null) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxIndex(null);
      } else if (e.key === "ArrowLeft") {
        setLightboxIndex((prev) =>
          prev !== null && prev < imageCount - 1 ? prev + 1 : prev
        );
      } else if (e.key === "ArrowRight") {
        setLightboxIndex((prev) => (prev !== null && prev > 0 ? prev - 1 : prev));
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [lightboxIndex, imageCount]);

  const { data: processingStatus } = api.gallery.getProcessingStatus.useQuery(
    { galleryId },
    {
      refetchInterval: gallery?.status === "processing" || gallery?.status === "clustering" || gallery?.status === "matching"
        ? 2000
        : false,
    }
  );

  const generateUploadUrlMutation = api.gallery.generateUploadUrl.useMutation();
  const confirmUploadMutation = api.gallery.confirmUpload.useMutation();
  const startProcessingMutation = api.gallery.startProcessing.useMutation({
    onSuccess: async () => {
      toast.success("بدأت المعالجة");
      await utils.gallery.getById.invalidate({ galleryId });
      await utils.gallery.getProcessingStatus.invalidate({ galleryId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل بدء المعالجة");
    },
  });

  const reprocessMutation = api.gallery.reprocess.useMutation({
    onSuccess: async () => {
      toast.success("بدأت إعادة المعالجة");
      await utils.gallery.getById.invalidate({ galleryId });
      await utils.gallery.getProcessingStatus.invalidate({ galleryId });
    },
    onError: (error) => {
      toast.error(error.message || "فشل إعادة المعالجة");
    },
  });

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setUploadProgress({ current: 0, total: acceptedFiles.length });

      let successCount = 0;
      let failCount = 0;

      for (let i = 0; i < acceptedFiles.length; i++) {
        const file = acceptedFiles[i]!;
        setUploadProgress({ current: i + 1, total: acceptedFiles.length });

        try {
          // Get presigned URL
          const { uploadUrl, s3Key } = await generateUploadUrlMutation.mutateAsync({
            galleryId,
            filename: file.name,
            contentType: file.type,
          });

          // Upload to S3
          const uploadResponse = await fetch(uploadUrl, {
            method: "PUT",
            body: file,
            headers: {
              "Content-Type": file.type,
            },
          });

          if (!uploadResponse.ok) {
            throw new Error("Upload failed");
          }

          // Confirm upload in database
          await confirmUploadMutation.mutateAsync({
            galleryId,
            s3Key,
            filename: file.name,
            fileSize: file.size,
            contentType: file.type,
          });

          successCount++;
        } catch (error) {
          console.error(`Failed to upload ${file.name}:`, error);
          failCount++;
        }
      }

      setUploading(false);

      if (successCount > 0) {
        toast.success(`تم رفع ${successCount} صورة بنجاح`);
        await utils.gallery.getById.invalidate({ galleryId });
      }
      if (failCount > 0) {
        toast.error(`فشل رفع ${failCount} صورة`);
      }
    },
    [galleryId, generateUploadUrlMutation, confirmUploadMutation, utils]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/jpeg": [".jpg", ".jpeg"],
      "image/png": [".png"],
      "image/webp": [".webp"],
    },
    disabled: uploading,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <Skeleton className="h-10 w-64" />
        </div>
        <Skeleton className="h-40" />
        <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="aspect-square" />
          ))}
        </div>
      </div>
    );
  }

  if (!gallery) {
    return (
      <div className="text-center py-8">
        <h2 className="text-xl font-bold mb-4">المعرض غير موجود</h2>
        <Button asChild>
          <Link href={`/admin/sessions/${sessionId}/gallery`}>العودة للمعارض</Link>
        </Button>
      </div>
    );
  }

  const isProcessing = gallery.status === "processing" || gallery.status === "clustering" || gallery.status === "matching";
  const canStartProcessing = gallery.status === "pending" || gallery.status === "uploading" || gallery.status === "error";
  const hasImages = gallery._count.images > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href={`/admin/sessions/${sessionId}/gallery`}>
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{gallery.title || "معرض الصور"}</h1>
            <p className="text-muted-foreground">{gallery.session.title}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={statusColors[gallery.status]}>
            {statusLabels[gallery.status]}
          </Badge>
          {process.env.NODE_ENV === "development" && gallery.status === "ready" && (
            <Button
              variant="outline"
              onClick={() => reprocessMutation.mutate({ galleryId })}
              disabled={reprocessMutation.isPending}
            >
              {reprocessMutation.isPending ? (
                <Loader2 className="ml-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCcw className="ml-2 h-4 w-4" />
              )}
              إعادة المعالجة
            </Button>
          )}
          {gallery.status === "ready" && (
            <Button asChild>
              <Link href={`/admin/sessions/${sessionId}/gallery/${galleryId}/faces`}>
                <Users className="ml-2 h-4 w-4" />
                إدارة الوجوه
              </Link>
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <Images className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{gallery._count.images}</p>
                <p className="text-sm text-muted-foreground">صورة</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processingStatus?.processedImages || 0}</p>
                <p className="text-sm text-muted-foreground">تمت معالجتها</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Eye className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processingStatus?.totalFaces || 0}</p>
                <p className="text-sm text-muted-foreground">وجه مكتشف</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-orange-500/10">
                <Users className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{processingStatus?.totalClusters || 0}</p>
                <p className="text-sm text-muted-foreground">شخص</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Processing Progress */}
      {isProcessing && processingStatus && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Loader2 className="h-5 w-5 animate-spin" />
              جاري المعالجة...
            </CardTitle>
            <CardDescription>
              {statusLabels[processingStatus.status]}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>التقدم</span>
                <span>
                  {processingStatus.processedImages} / {processingStatus.totalImages}
                </span>
              </div>
              <Progress
                value={
                  processingStatus.totalImages > 0
                    ? (processingStatus.processedImages / processingStatus.totalImages) * 100
                    : 0
                }
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Error Display */}
      {gallery.status === "error" && processingStatus?.lastError && (
        <Card className="border-red-200 bg-red-50/50">
          <CardHeader>
            <CardTitle className="text-red-700 flex items-center gap-2">
              <XCircle className="h-5 w-5" />
              حدث خطأ
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600">{processingStatus.lastError}</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => startProcessingMutation.mutate({ galleryId })}
              disabled={startProcessingMutation.isPending}
            >
              <RefreshCcw className="ml-2 h-4 w-4" />
              إعادة المحاولة
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Upload Zone */}
      {!isProcessing && (
        <Card>
          <CardHeader>
            <CardTitle>رفع الصور</CardTitle>
            <CardDescription>
              اسحب وأفلت الصور أو انقر للاختيار (JPEG, PNG, WebP)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div
              {...getRootProps()}
              className={`
                border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                ${isDragActive ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-primary/50"}
                ${uploading ? "opacity-50 cursor-not-allowed" : ""}
              `}
            >
              <input {...getInputProps()} />
              {uploading ? (
                <div className="space-y-4">
                  <Loader2 className="mx-auto h-12 w-12 text-primary animate-spin" />
                  <div>
                    <p className="font-medium">جاري الرفع...</p>
                    <p className="text-sm text-muted-foreground">
                      {uploadProgress.current} / {uploadProgress.total}
                    </p>
                  </div>
                  <Progress value={(uploadProgress.current / uploadProgress.total) * 100} />
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                  {isDragActive ? (
                    <p className="text-primary font-medium">أفلت الصور هنا</p>
                  ) : (
                    <>
                      <p className="font-medium">اسحب وأفلت الصور هنا</p>
                      <p className="text-sm text-muted-foreground">أو انقر لاختيار الملفات</p>
                    </>
                  )}
                </>
              )}
            </div>

            {/* Start Processing Button */}
            {canStartProcessing && hasImages && (
              <div className="mt-4 flex justify-end gap-2">
                {process.env.NODE_ENV === "development" && gallery.status !== "pending" && (
                  <Button
                    variant="outline"
                    onClick={() => reprocessMutation.mutate({ galleryId })}
                    disabled={reprocessMutation.isPending}
                  >
                    {reprocessMutation.isPending ? (
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCcw className="ml-2 h-4 w-4" />
                    )}
                    إعادة المعالجة
                  </Button>
                )}
                <Button
                  onClick={() => startProcessingMutation.mutate({ galleryId })}
                  disabled={startProcessingMutation.isPending}
                >
                  {startProcessingMutation.isPending ? (
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Play className="ml-2 h-4 w-4" />
                  )}
                  بدء المعالجة
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Images Grid */}
      {gallery.images.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>الصور ({gallery._count.images})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {gallery.images.map((image, index) => (
                <div
                  key={image.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer"
                  onClick={() => setLightboxIndex(index)}
                >
                  <Image
                    src={image.imageUrl}
                    alt={image.filename}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 50vw, (max-width: 768px) 33vw, (max-width: 1024px) 25vw, 20vw"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors" />
                  <div className="absolute top-2 right-2">
                    {imageStatusIcons[image.status]}
                  </div>
                  {image.faceCount > 0 && (
                    <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                      {image.faceCount} وجه
                    </div>
                  )}
                  <div className="absolute bottom-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(image.imageUrl, "_blank");
                      }}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Lightbox */}
      {lightboxIndex !== null && gallery.images[lightboxIndex] && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Close button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4 text-white hover:bg-white/20 z-10"
            onClick={() => setLightboxIndex(null)}
          >
            <X className="h-6 w-6" />
          </Button>

          {/* Image counter */}
          <div className="absolute top-4 left-4 text-white text-sm bg-black/50 px-3 py-1 rounded-full">
            {lightboxIndex + 1} / {gallery.images.length}
          </div>

          {/* Download button */}
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 left-1/2 -translate-x-1/2 text-white hover:bg-white/20"
            onClick={(e) => {
              e.stopPropagation();
              window.open(gallery.images[lightboxIndex]!.imageUrl, "_blank");
            }}
          >
            <Download className="h-5 w-5" />
          </Button>

          {/* Previous button */}
          {lightboxIndex < gallery.images.length - 1 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex + 1);
              }}
            >
              <ChevronRight className="h-8 w-8" />
            </Button>
          )}

          {/* Next button */}
          {lightboxIndex > 0 && (
            <Button
              variant="ghost"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:bg-white/20 h-12 w-12"
              onClick={(e) => {
                e.stopPropagation();
                setLightboxIndex(lightboxIndex - 1);
              }}
            >
              <ChevronLeft className="h-8 w-8" />
            </Button>
          )}

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[85vh] w-full h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={gallery.images[lightboxIndex]!.imageUrl}
              alt={gallery.images[lightboxIndex]!.filename}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Face count badge */}
          {gallery.images[lightboxIndex]!.faceCount > 0 && (
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/60 text-white text-sm px-3 py-1 rounded-full">
              {gallery.images[lightboxIndex]!.faceCount} وجه مكتشف
            </div>
          )}
        </div>
      )}
    </div>
  );
}
