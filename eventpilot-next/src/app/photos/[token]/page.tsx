"use client";

import { use, useState } from "react";
import Image from "next/image";
import Link from "next/link";
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
  X,
  ChevronRight,
  ChevronLeft,
  ZoomIn,
} from "lucide-react";

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
    document.body.style.overflow = "hidden";
  };

  const closeLightbox = () => {
    setSelectedImage(null);
    document.body.style.overflow = "";
  };

  const goToPrevious = () => {
    if (selectedImage !== null && selectedImage > 0) {
      setSelectedImage(selectedImage - 1);
    }
  };

  const goToNext = () => {
    if (selectedImage !== null && selectedImage < data.images.length - 1) {
      setSelectedImage(selectedImage + 1);
    }
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
                  <Image
                    src={image.imageUrl}
                    alt={`صورة ${index + 1}`}
                    fill
                    className="object-cover transition-transform group-hover:scale-105"
                    sizes="(max-width: 768px) 50vw, 33vw"
                  />
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
      {selectedImage !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center"
          onClick={closeLightbox}
        >
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white p-2 z-50"
            onClick={closeLightbox}
          >
            <X className="h-8 w-8" />
          </button>

          {/* Navigation buttons */}
          {selectedImage > 0 && (
            <button
              className="absolute right-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-50"
              onClick={(e) => {
                e.stopPropagation();
                goToPrevious();
              }}
            >
              <ChevronRight className="h-10 w-10" />
            </button>
          )}
          {selectedImage < data.images.length - 1 && (
            <button
              className="absolute left-4 top-1/2 -translate-y-1/2 text-white/70 hover:text-white p-2 z-50"
              onClick={(e) => {
                e.stopPropagation();
                goToNext();
              }}
            >
              <ChevronLeft className="h-10 w-10" />
            </button>
          )}

          {/* Image */}
          <div
            className="relative max-w-[90vw] max-h-[90vh] w-full h-full flex items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={data.images[selectedImage]!.imageUrl}
              alt={`صورة ${selectedImage + 1}`}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>

          {/* Download button */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-4">
            <span className="text-white/70 text-sm">
              {selectedImage + 1} / {data.images.length}
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                handleDownload(
                  data.images[selectedImage]!.imageUrl,
                  data.images[selectedImage]!.filename
                );
              }}
            >
              <Download className="ml-2 h-4 w-4" />
              تحميل
            </Button>
          </div>
        </div>
      )}
    </>
  );
}
