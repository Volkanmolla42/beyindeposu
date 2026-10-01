"use client";

import { useState, useEffect } from "react";
import { ProductImage } from "@/components/ProductImage";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

export interface LightboxState {
  images: string[];
  index: number;
}

interface ProductLightboxModalProps {
  lightbox: LightboxState | null;
  onClose: () => void;
}

export function ProductLightboxModal({ lightbox, onClose }: ProductLightboxModalProps) {
  if (!lightbox) return null;
  return (
    <LightboxContent
      key={`${lightbox.images.join(",")}-${lightbox.index}`}
      lightbox={lightbox}
      onClose={onClose}
    />
  );
}

function LightboxContent({
  lightbox,
  onClose,
}: {
  lightbox: LightboxState;
  onClose: () => void;
}) {
  const [zoom, setZoom] = useState(1);
  const [zoomOrigin, setZoomOrigin] = useState("center center");
  const [currentIndex, setCurrentIndex] = useState(lightbox.index);

  const imagesCount = lightbox.images.length;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowLeft") {
        setZoom(1);
        setCurrentIndex((prev) => (prev - 1 + imagesCount) % imagesCount);
      } else if (e.key === "ArrowRight") {
        setZoom(1);
        setCurrentIndex((prev) => (prev + 1) % imagesCount);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [imagesCount, onClose]);

  const resetZoom = () => {
    setZoom(1);
    setZoomOrigin("center center");
  };

  const handlePrev = () => {
    resetZoom();
    setCurrentIndex((prev) => (prev - 1 + imagesCount) % imagesCount);
  };

  const handleNext = () => {
    resetZoom();
    setCurrentIndex((prev) => (prev + 1) % imagesCount);
  };

  const setZoomOriginFromPoint = (target: HTMLElement, clientX: number, clientY: number) => {
    const rect = target.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setZoomOrigin(`${x}% ${y}%`);
  };

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (zoom > 1) {
      resetZoom();
      return;
    }
    setZoomOriginFromPoint(e.currentTarget, e.clientX, e.clientY);
    setZoom(2.25);
  };

  const handleImageWheel = (e: React.WheelEvent<HTMLImageElement>) => {
    e.preventDefault();
    setZoomOriginFromPoint(e.currentTarget, e.clientX, e.clientY);
    setZoom((current) => Math.min(4, Math.max(1, current + (e.deltaY < 0 ? 0.25 : -0.25))));
  };

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200"
      onClick={onClose}
      tabIndex={-1}
    >
      {/* Close button */}
      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
        aria-label="Kapat"
      >
        <X className="w-6 h-6" />
      </button>

      {/* Main image container */}
      <div className="w-[min(94vw,1180px)]" onClick={(e) => e.stopPropagation()}>
        <div className="min-w-0 flex-1">
          <div className="relative flex h-[min(58vh,620px)] w-full items-center justify-center overflow-hidden rounded-2xl bg-black/35 shadow-2xl lg:h-[min(74vh,720px)]">
            <ProductImage
              key={currentIndex}
              src={lightbox.images[currentIndex]}
              alt={`Görsel ${currentIndex + 1}`}
              fill
              sizes="94vw"
              unoptimized
              onClick={handleImageClick}
              onWheel={handleImageWheel}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: zoomOrigin,
              }}
              className={`max-h-full max-w-full object-contain select-none transition-transform duration-200 ${
                zoom > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
              }`}
              draggable={false}
            />

            {/* Prev / Next buttons */}
            {imagesCount > 1 && (
              <>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrev();
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
                  aria-label="Önceki"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNext();
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
                  aria-label="Sonraki"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>

          {/* Thumbnail strip */}
          {imagesCount > 1 && (
            <div
              className="flex items-center gap-2 mt-4 px-4 flex-wrap justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              {lightbox.images.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    resetZoom();
                    setCurrentIndex(i);
                  }}
                  className={`relative w-14 h-14 rounded-lg border-2 overflow-hidden bg-white/10 flex-shrink-0 transition-all cursor-pointer ${
                    i === currentIndex
                      ? "border-white scale-110 shadow-lg"
                      : "border-white/30 opacity-60 hover:opacity-100"
                  }`}
                >
                  <ProductImage
                    src={img}
                    alt={`Küçük resim ${i + 1}`}
                    fill
                    sizes="56px"
                    unoptimized
                    className="object-contain"
                    draggable={false}
                  />
                  {i === 0 && (
                    <span className="absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded text-[7px] font-black bg-amber-500 text-white shadow-xs leading-none">
                      KAPAK
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Counter text */}
          <p className="mt-3 text-white/50 text-xs font-medium text-center">
            {currentIndex + 1} / {imagesCount} · Görsele tıkla: {zoom > 1 ? "uzaklaş" : "yakınlaş"}
          </p>
        </div>
      </div>
    </div>
  );
}
