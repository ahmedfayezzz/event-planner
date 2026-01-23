"use client";

import Lightbox from "yet-another-react-lightbox";
import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Download from "yet-another-react-lightbox/plugins/download";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css";

interface GalleryLightboxProps {
  images: Array<{
    src: string;
    alt?: string;
    width?: number;
    height?: number;
    downloadFilename?: string;
  }>;
  open: boolean;
  index: number;
  onClose: () => void;
  onIndexChange?: (index: number) => void;
}

/**
 * Gallery lightbox using yet-another-react-lightbox
 * Features:
 * - Mobile swipe gestures (built-in)
 * - Thumbnail strip
 * - Zoom & pinch-to-zoom
 * - Download button
 * - RTL support for Arabic
 * - Keyboard navigation
 */
export function GalleryLightbox({
  images,
  open,
  index,
  onClose,
  onIndexChange,
}: GalleryLightboxProps) {
  // Convert images to lightbox format
  const slides = images.map((img) => ({
    src: img.src,
    alt: img.alt,
    width: img.width,
    height: img.height,
    downloadFilename: img.downloadFilename,
  }));

  return (
    <Lightbox
      open={open}
      close={onClose}
      index={index}
      slides={slides}
      plugins={[Thumbnails, Zoom, Download]}
      on={{
        view: ({ index: newIndex }) => {
          onIndexChange?.(newIndex);
        },
      }}
      // Arabic labels
      labels={{
        Previous: "السابق",
        Next: "التالي",
        Close: "إغلاق",
        Download: "تحميل",
        "Zoom in": "تكبير",
        "Zoom out": "تصغير",
      }}
      // Thumbnails configuration
      thumbnails={{
        position: "bottom",
        width: 80,
        height: 80,
        border: 2,
        borderRadius: 4,
        padding: 4,
        gap: 8,
        vignette: true,
      }}
      // Zoom configuration
      zoom={{
        maxZoomPixelRatio: 3,
        zoomInMultiplier: 2,
        doubleTapDelay: 300,
        doubleClickDelay: 300,
        doubleClickMaxStops: 2,
        keyboardMoveDistance: 50,
        wheelZoomDistanceFactor: 100,
        pinchZoomDistanceFactor: 100,
        scrollToZoom: true,
      }}
      // Animation settings
      animation={{
        fade: 250,
        swipe: 250,
        easing: {
          fade: "ease",
          swipe: "ease-out",
          navigation: "ease-in-out",
        },
      }}
      // Carousel settings
      carousel={{
        finite: false,
        preload: 2,
        padding: "16px",
        spacing: "0px",
        imageFit: "contain",
      }}
      // Controller settings
      controller={{
        closeOnBackdropClick: true,
        closeOnPullDown: true,
        closeOnPullUp: false,
      }}
      // Styles
      styles={{
        container: {
          backgroundColor: "rgba(0, 0, 0, 0.95)",
        },
      }}
    />
  );
}
