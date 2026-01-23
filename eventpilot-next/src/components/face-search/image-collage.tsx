"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";

interface ImageCollageProps {
  matches: { filename: string; similarity: number }[];
}

export function ImageCollage({ matches }: ImageCollageProps) {
  if (matches.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        لم يتم العثور على صور مطابقة
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {matches.map((match) => (
        <div key={match.filename} className="relative group">
          <Image
            src={`/event-images/${match.filename}`}
            alt={match.filename}
            width={300}
            height={200}
            className="rounded-lg object-cover aspect-[4/3] w-full"
          />
          <Badge
            className="absolute top-2 left-2"
            variant="secondary"
          >
            {Math.round(match.similarity)}%
          </Badge>
          <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2 rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity truncate">
            {match.filename}
          </div>
        </div>
      ))}
    </div>
  );
}
