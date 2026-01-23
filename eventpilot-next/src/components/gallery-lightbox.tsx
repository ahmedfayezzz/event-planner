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
  renderInfo?: (index: number) => React.ReactNode;
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
  renderInfo,
}: GalleryLightboxProps) {
  // Convert images to lightbox format
  const slides = images.map((img) => ({
    src: img.src,
    alt: img.alt,
    width: img.width,
    height: img.height,
    download: img.downloadFilename,
  }));

  return (
    <>
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
        // RTL support
        dir="rtl"
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
        // Download configuration
        download={{
          download: async ({ slide }) => {
            if (slide.download) {
              // Use custom download filename if provided
              const link = document.createElement("a");
              link.href = slide.src;
              link.download = slide.download;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }
          },
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
        // Render custom info badge
        render={{
          buttonPrev: () => null, // Hide default buttons, they'll be shown automatically
          buttonNext: () => null,
          iconClose: () => (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 24, height: 24 }}
            >
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          ),
          iconDownload: () => (
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ width: 24, height: 24 }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1={12} x2={12} y1={15} y2={3} />
            </svg>
          ),
          // Custom slide content to show info badge
          slide: renderInfo
            ? ({ slide, offset, rect }) => {
                const isCurrentSlide = offset === 0;
                return (
                  <>
                    {/* Default image rendering */}
                    <div
                      style={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <img
                        src={slide.src}
                        alt={slide.alt}
                        style={{
                          maxWidth: "100%",
                          maxHeight: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                    {/* Custom info badge */}
                    {isCurrentSlide && (
                      <div
                        style={{
                          position: "absolute",
                          bottom: "80px",
                          left: "50%",
                          transform: "translateX(-50%)",
                          zIndex: 10,
                        }}
                      >
                        {renderInfo(index)}
                      </div>
                    )}
                  </>
                );
              }
            : undefined,
        }}
        // Styles for RTL
        styles={{
          container: {
            backgroundColor: "rgba(0, 0, 0, 0.95)",
          },
          thumbnail: {
            border: "2px solid transparent",
          },
          thumbnailCurrent: {
            border: "2px solid white",
          },
        }}
      />
    </>
  );
}
