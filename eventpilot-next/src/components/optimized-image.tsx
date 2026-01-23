"use client";

import { useState } from "react";
import Image from "next/image";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptimizedImageProps {
  src: string;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
  quality?: number;
  showLoadingSpinner?: boolean;
  objectFit?: "contain" | "cover" | "fill" | "none" | "scale-down";
}

/**
 * Optimized image component with loading states and blur placeholder
 * Features:
 * - Shows loading spinner/blur while image loads
 * - Automatic quality optimization
 * - CloudFront CDN integration
 * - Smooth fade-in animation
 */
export function OptimizedImage({
  src,
  alt,
  fill,
  width,
  height,
  className,
  sizes,
  priority,
  quality = 75, // Lower quality for faster loading (default 75 for Next.js is 75)
  showLoadingSpinner = true,
  objectFit = "cover",
}: OptimizedImageProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // Generate a simple blur placeholder (tiny 1x1 gray pixel)
  const blurDataURL =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/5+hHgAHggJ/PchI7wAAAABJRU5ErkJggg==";

  if (hasError) {
    return (
      <div className={cn("bg-muted flex items-center justify-center", className)}>
        <div className="text-center text-muted-foreground text-sm">
          <p>فشل تحميل الصورة</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn("relative", fill && "w-full h-full", className)}>
      {/* Loading spinner overlay */}
      {isLoading && showLoadingSpinner && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted z-10">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}

      {/* Blur background while loading */}
      {isLoading && !showLoadingSpinner && (
        <div className="absolute inset-0 bg-muted animate-pulse z-10" />
      )}

      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={width}
        height={height}
        sizes={sizes}
        priority={priority}
        quality={quality}
        placeholder="blur"
        blurDataURL={blurDataURL}
        className={cn(
          objectFit === "cover" && "object-cover",
          objectFit === "contain" && "object-contain",
          objectFit === "fill" && "object-fill",
          objectFit === "none" && "object-none",
          objectFit === "scale-down" && "object-scale-down",
          "transition-opacity duration-300",
          isLoading ? "opacity-0" : "opacity-100"
        )}
        onLoad={() => setIsLoading(false)}
        onError={() => {
          setIsLoading(false);
          setHasError(true);
        }}
      />
    </div>
  );
}
