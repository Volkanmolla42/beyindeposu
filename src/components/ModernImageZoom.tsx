"use client";

import React, { useState } from "react";
import Image from "next/image";
import Lightbox from "yet-another-react-lightbox";
import Zoom from "yet-another-react-lightbox/plugins/zoom";
import Counter from "yet-another-react-lightbox/plugins/counter";
import { ZoomIn } from "lucide-react";
import { trackAnalytics } from "@/lib/analytics";
import {
  PRODUCT_IMAGE_PLACEHOLDER,
  PRODUCT_IMAGE_PLACEHOLDER_ALT,
} from "@/lib/product-images";

import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/counter.css";

export interface ModernImageZoomProps {
  src: string;
  alt?: string;
  className?: string;
  preload?: boolean;
  images?: string[];
  currentIndex?: number;
  onIndexChange?: (index: number) => void;
  zoomMode?: "side" | "inner";
}

export function ModernImageZoom({
  src,
  alt = "Parça görseli",
  className = "",
  preload = false,
  images,
  currentIndex = 0,
  onIndexChange,
  zoomMode = "side",
}: ModernImageZoomProps) {
  const [zoomActive, setZoomActive] = useState(false);
  const [zoomPos, setZoomPos] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [hasError, setHasError] = useState(false);

  const displayImages = images && images.length > 0 ? images : [src];
  const activeIndex = Math.min(Math.max(0, currentIndex), displayImages.length - 1);
  const activeSrc = hasError ? PRODUCT_IMAGE_PLACEHOLDER : (displayImages[activeIndex] || src);
  const activeAlt = hasError ? PRODUCT_IMAGE_PLACEHOLDER_ALT : alt;

  const handleMouseMove = (e: React.MouseEvent<HTMLElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setZoomPos({ x, y });
  };

  const handleOpenLightbox = () => {
    trackAnalytics("image_zoom");
    setLightboxOpen(true);
  };

  return (
    <div className={`relative ${className} ${zoomActive ? "z-30" : ""}`}>
      {/* Ana Görsel Kutusu */}
      <div
        className="relative h-full w-full overflow-hidden rounded-2xl bg-white select-none"
        onMouseEnter={() => setZoomActive(true)}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setZoomActive(false)}
      >
        <button
          type="button"
          onClick={handleOpenLightbox}
          className="relative block h-full w-full cursor-zoom-in text-left focus:outline-hidden"
          aria-label="Görseli büyüt"
        >
          <div className="relative h-full w-full">
            <Image
              src={activeSrc}
              alt={activeAlt}
              fill
              sizes="(min-width: 1024px) 50vw, 100vw"
              className={`object-contain transition-transform duration-150 ${
                zoomMode === "inner" && zoomActive ? "scale-200" : ""
              }`}
              style={
                zoomMode === "inner" && zoomActive
                  ? { transformOrigin: `${zoomPos.x}% ${zoomPos.y}%` }
                  : undefined
              }
              preload={preload}
              onError={() => setHasError(true)}
            />
          </div>

          {/* Büyüteç Lensi (Side Modunda) */}
          {zoomMode === "side" && zoomActive && !hasError && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute hidden h-32 w-32 -translate-x-1/2 -translate-y-1/2 rounded-xl border border-amber-500/30 bg-amber-500/10 shadow-sm backdrop-blur-[1px] lg:block"
              style={{
                left: `${zoomPos.x}%`,
                top: `${zoomPos.y}%`,
              }}
            />
          )}

          {/* Sağ Alt Büyüt Butonu */}
          <span className="absolute bottom-3 right-3 z-10 flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/95 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-white hover:text-slate-900">
            <ZoomIn className="h-3.5 w-3.5 text-amber-500" />
            <span className="hidden sm:inline">Büyüt</span>
          </span>
        </button>
      </div>

      {/* Sağda Gözüken Zoom Paneli (Trendyol Style) */}
      {zoomMode === "side" && zoomActive && !hasError && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-[calc(100%+16px)] top-0 z-50 hidden aspect-4/3 h-full w-[460px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl lg:block"
        >
          <div className="relative h-full w-full bg-slate-50">
            <Image
              src={activeSrc}
              alt={activeAlt}
              fill
              sizes="1200px"
              className="object-contain"
              style={{
                transform: "scale(2.5)",
                transformOrigin: `${zoomPos.x}% ${zoomPos.y}%`,
              }}
            />
          </div>
        </div>
      )}

      {/* Tam Ekran Lightbox (yet-another-react-lightbox) */}
      {lightboxOpen && (
        <Lightbox
          open={lightboxOpen}
          close={() => setLightboxOpen(false)}
          index={activeIndex}
          slides={displayImages.map((img) => ({ src: img, alt }))}
          plugins={[Zoom, Counter]}
          zoom={{ scrollToZoom: true, maxZoomPixelRatio: 4 }}
          carousel={{ finite: displayImages.length === 1, preload: 1, padding: 16 }}
          controller={{ closeOnBackdropClick: true }}
          on={{
            view: ({ index }) => {
              onIndexChange?.(index);
            },
          }}
          labels={{
            Close: "Görseli kapat",
            Next: "Sonraki görsel",
            Previous: "Önceki görsel",
            "Zoom in": "Yakınlaştır",
            "Zoom out": "Uzaklaştır",
          }}
          styles={{ container: { backgroundColor: "rgba(15, 23, 42, 0.95)" } }}
        />
      )}
    </div>
  );
}
