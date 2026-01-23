"use client";

import { use, useState } from "react";
import Link from "next/link";
import { OptimizedImage } from "@/components/optimized-image";
import { GalleryLightbox } from "@/components/gallery-lightbox";
import { api } from "@/trpc/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatArabicDate } from "@/lib/utils";
import { toast } from "sonner";
import {
  Download,
  Calendar,
  Images,
  User,
  ZoomIn,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

const isDev = process.env.NODE_ENV === "development";

export default function PublicPhotosPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = use(params);
  const [selectedImage, setSelectedImage] = useState<number | null>(null);

  const { data, isLoading, error } = api.gallery.getPhotosByToken.useQuery({
    token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        <div className="container max-w-5xl py-8 px-4">
          <div className="text-center mb-8 space-y-4">
            <Skeleton className="h-10 w-64 mx-auto" />
            <Skeleton className="h-6 w-48 mx-auto" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => (
              <Skeleton key={i} className="aspect-square rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/30">
        <Card className="max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
              <Images className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-xl font-bold mb-2">الصور غير متوفرة</h1>
            <p className="text-muted-foreground mb-4">
              عذراً، لم نتمكن من العثور على الصور المطلوبة
            </p>
            <Button asChild>
              <Link href="/">العودة للرئيسية</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleDownload = async (imageUrl: string, filename: string) => {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success("جاري تحميل الصورة");
    } catch {
      toast.error("فشل تحميل الصورة");
    }
  };

  const handleDownloadAll = async () => {
    toast.info(`جاري تحميل ${data.images.length} صورة...`);
    for (const image of data.images) {
      await handleDownload(image.imageUrl, image.filename);
      // Small delay between downloads
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    toast.success("تم تحميل جميع الصور");
  };

  const openLightbox = (index: number) => {
    setSelectedImage(index);
  };

  const closeLightbox = () => {
    setSelectedImage(null);
  };

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
        {/* Header */}
        <div className="bg-card border-b sticky top-0 z-40">
          <div className="container max-w-5xl py-4 px-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-xl font-bold">صورك من الفعالية</h1>
                <p className="text-sm text-muted-foreground">{data.sessionTitle}</p>
              </div>
              {data.images.length > 1 && (
                <Button onClick={handleDownloadAll} variant="outline" size="sm">
                  <Download className="ml-2 h-4 w-4" />
                  تحميل الكل
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="container max-w-5xl py-8 px-4">
          {/* Person Info */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-primary/10 mb-4">
              <User className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-2">مرحباً {data.personName}</h2>
            <div className="flex items-center justify-center gap-4 text-muted-foreground">
              {data.sessionDate && (
                <div className="flex items-center gap-1">
                  <Calendar className="h-4 w-4" />
                  <span>{formatArabicDate(new Date(data.sessionDate))}</span>
                </div>
              )}
              <div className="flex items-center gap-1">
                <Images className="h-4 w-4" />
                <span>{data.totalImages} صورة</span>
              </div>
            </div>

            {/* AI Selection Info */}
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground bg-muted/50 rounded-lg px-4 py-3 mt-4">
              <Sparkles className="h-4 w-4 text-primary/70" />
              <span>تم اختيار هذه الصور تلقائياً بناءً على التعرف على وجهك</span>
            </div>
          </div>

          {/* Images Grid */}
          {data.images.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {data.images.map((image, index) => (
                <div
                  key={image.id}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted group cursor-pointer"
                  onClick={() => openLightbox(index)}
                >
                  <OptimizedImage
                    src={image.imageUrl}
                    alt={`صورة ${index + 1}`}
                    fill
                    className="transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                    quality={70}
                    showLoadingSpinner={false}
                    objectFit="cover"
                  />
                  {/* Dev only: show match similarity */}
                  {isDev && image.matchSimilarity !== null && image.matchSimilarity !== undefined && (
                    <Badge
                      variant="outline"
                      className={`absolute top-2 left-2 text-xs font-mono ${
                        image.matchSimilarity >= 95
                          ? "bg-green-500/90 text-white border-green-600"
                          : image.matchSimilarity >= 90
                          ? "bg-yellow-500/90 text-white border-yellow-600"
                          : "bg-red-500/90 text-white border-red-600"
                      }`}
                    >
                      {image.matchSimilarity.toFixed(1)}%
                    </Badge>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          openLightbox(index);
                        }}
                      >
                        <ZoomIn className="h-5 w-5" />
                      </Button>
                      <Button
                        variant="secondary"
                        size="icon"
                        className="h-10 w-10"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownload(image.imageUrl, image.filename);
                        }}
                      >
                        <Download className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <Images className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-lg font-medium mb-2">لا توجد صور</h3>
                <p className="text-muted-foreground">
                  لم يتم العثور على صور لك في هذه الفعالية
                </p>
              </CardContent>
            </Card>
          )}

          {/* Footer */}
          <div className="mt-12 text-center text-sm text-muted-foreground">
            <p>شكراً لحضورك {data.sessionTitle}</p>
            <p className="mt-1">نتطلع لرؤيتك في الفعاليات القادمة</p>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      <GalleryLightbox
        open={selectedImage !== null}
        index={selectedImage ?? 0}
        images={data.images.map((img) => ({
          src: img.imageUrl,
          alt: img.filename,
          downloadFilename: img.filename,
        }))}
        onClose={closeLightbox}
        onIndexChange={setSelectedImage}
      />
    </>
  );
}
