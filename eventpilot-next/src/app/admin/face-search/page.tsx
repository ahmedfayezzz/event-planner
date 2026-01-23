"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FaceSearchForm } from "@/components/face-search/face-search-form";
import { ImageCollage } from "@/components/face-search/image-collage";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageIcon } from "lucide-react";

export default function FaceSearchPage() {
  const [matches, setMatches] = useState<
    { filename: string; similarity: number }[] | null
  >(null);
  const [totalImages, setTotalImages] = useState(0);
  const [isSearching, setIsSearching] = useState(false);

  const handleSearch = (
    results: { filename: string; similarity: number }[],
    total: number
  ) => {
    setMatches(results);
    setTotalImages(total);
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            البحث عن الصور بالوجه
          </CardTitle>
          <CardDescription>
            ارفع صورة شخص للبحث عن جميع صوره في صور الفعالية
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FaceSearchForm
            onSearch={handleSearch}
            isLoading={isSearching}
            onLoadingChange={setIsSearching}
          />
        </CardContent>
      </Card>

      {isSearching && (
        <Card>
          <CardHeader>
            <CardTitle>جاري البحث...</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {[...Array(8)].map((_, i) => (
                <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {!isSearching && matches !== null && (
        <Card>
          <CardHeader>
            <CardTitle>النتائج</CardTitle>
            <CardDescription>
              تم العثور على {matches.length} صورة مطابقة من أصل {totalImages} صورة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ImageCollage matches={matches} />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
