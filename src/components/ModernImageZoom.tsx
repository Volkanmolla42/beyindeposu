"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { ZoomIn, ZoomOut, RotateCcw } from "lucide-react";

interface ModernImageZoomProps {
  src: string;
  alt?: string;
  className?: string;
  overlayTopLeft?: React.ReactNode;
  overlayTopRight?: React.ReactNode;
  minZoom?: number;
  maxZoom?: number;
  defaultZoom?: number;
}

export function ModernImageZoom({
  src,
  alt = "Ürün görseli",
  className = "",
  overlayTopLeft,
  overlayTopRight,
  minZoom = 1,
  maxZoom = 4.5,
  defaultZoom = 2.2,
}: ModernImageZoomProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [isHovering, setIsHovering] = useState(false);
  const [hoverOrigin, setHoverOrigin] = useState({ x: 50, y: 50 });
  const [panPosition, setPanPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isLockedMode, setIsLockedMode] = useState(false);

  // Pinch-to-zoom for touch devices
  const touchDistanceRef = useRef<number | null>(null);

  // Drag tracking to prevent unwanted click events when panning
  const mouseDownPosRef = useRef<{ x: number; y: number } | null>(null);
  const hasDraggedRef = useRef<boolean>(false);

  // Reset function
  const handleReset = useCallback(() => {
    setZoom(1);
    setPanPosition({ x: 0, y: 0 });
    setHoverOrigin({ x: 50, y: 50 });
    setIsDragging(false);
    setIsLockedMode(false);
    hasDraggedRef.current = false;
    mouseDownPosRef.current = null;
  }, []);

  // Reset when source image changes
  useEffect(() => {
    handleReset();
  }, [src, handleReset]);

  // Global window listeners during active dragging to handle fast mouse moves & release outside
  useEffect(() => {
    if (!isDragging) return;

    const handleWindowMouseMove = (e: MouseEvent) => {
      if (mouseDownPosRef.current) {
        const dist = Math.hypot(
          e.clientX - mouseDownPosRef.current.x,
          e.clientY - mouseDownPosRef.current.y
        );
        if (dist > 3) {
          hasDraggedRef.current = true;
        }
      }
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPanPosition({ x: deltaX, y: deltaY });
    };

    const handleWindowMouseUp = () => {
      setIsDragging(false);
      // Sürükleme sonrası tarayıcının tetikleyeceği onClick olayını engellemek için
      // hasDraggedRef'i 80ms sonra sıfırla
      setTimeout(() => {
        hasDraggedRef.current = false;
        mouseDownPosRef.current = null;
      }, 80);
    };

    window.addEventListener("mousemove", handleWindowMouseMove);
    window.addEventListener("mouseup", handleWindowMouseUp);

    return () => {
      window.removeEventListener("mousemove", handleWindowMouseMove);
      window.removeEventListener("mouseup", handleWindowMouseUp);
    };
  }, [isDragging, dragStart]);

  // Handle ESC key to exit locked zoom
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && (isLockedMode || zoom > 1)) {
        handleReset();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isLockedMode, zoom, handleReset]);

  // Native non-passive wheel listener on container to intercept scroll and zoom smoothly
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleNativeWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const delta = e.deltaY < 0 ? 0.35 : -0.35;
      setZoom((prev) => {
        const next = Math.max(minZoom, Math.min(maxZoom, prev + delta));
        return Number(next.toFixed(2));
      });
      setIsLockedMode(true);
    };

    container.addEventListener("wheel", handleNativeWheel, { passive: false });
    return () => {
      container.removeEventListener("wheel", handleNativeWheel);
    };
  }, [minZoom, maxZoom]);

  // Mouse Move over Container (when not dragging, track hover origin)
  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || isDragging) return;

    // In Hover Pan mode (when not locked in drag)
    if (!isLockedMode && zoom > 1) {
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setHoverOrigin({ x, y });
    }
  };

  // Mouse Down: Start Pan Drag if zoomed
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left click

    mouseDownPosRef.current = { x: e.clientX, y: e.clientY };
    hasDraggedRef.current = false;

    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - panPosition.x,
        y: e.clientY - panPosition.y,
      });
      setIsLockedMode(true);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Toggle Zoom on Click (Modern Double/Single Click behavior)
  const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    // Sürükleme (pan) yapıldıysa tıklama/zoom-out eylemini kesinlikle iptal et!
    if (hasDraggedRef.current) {
      hasDraggedRef.current = false;
      return;
    }

    if (zoom <= 1) {
      // Calculate origin where user clicked
      const rect = containerRef.current.getBoundingClientRect();
      const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
      const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
      setHoverOrigin({ x, y });
      setZoom(defaultZoom);
      setPanPosition({ x: 0, y: 0 });
      setIsLockedMode(true);
    } else {
      // Sürüklemeden sadece sabit tek tık yapıldıysa normal boyuta dönsün
      handleReset();
    }
  };

  // Touch Handlers for Mobile Devices
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      // Pinch start
      const distance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchDistanceRef.current = distance;
    } else if (e.touches.length === 1 && zoom > 1) {
      // Pan start
      hasDraggedRef.current = false;
      setIsDragging(true);
      setDragStart({
        x: e.touches[0].clientX - panPosition.x,
        y: e.touches[0].clientY - panPosition.y,
      });
      setIsLockedMode(true);
    }
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && touchDistanceRef.current !== null) {
      // Pinch move
      const currentDistance = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const diff = (currentDistance - touchDistanceRef.current) / 100;
      const newZoom = Math.max(minZoom, Math.min(maxZoom, zoom + diff));
      setZoom(Number(newZoom.toFixed(2)));
      touchDistanceRef.current = currentDistance;
      setIsLockedMode(true);
    } else if (e.touches.length === 1 && isDragging) {
      hasDraggedRef.current = true;
      // Pan move
      const deltaX = e.touches[0].clientX - dragStart.x;
      const deltaY = e.touches[0].clientY - dragStart.y;
      setPanPosition({ x: deltaX, y: deltaY });
    }
  };

  const handleTouchEnd = () => {
    touchDistanceRef.current = null;
    setIsDragging(false);
    setTimeout(() => {
      hasDraggedRef.current = false;
    }, 80);
  };

  const zoomPercent = Math.round(zoom * 100);

  return (
    <div
      ref={containerRef}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => {
        setIsHovering(false);
        setIsDragging(false);
        if (!isLockedMode) {
          handleReset();
        }
      }}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      className={`group relative flex w-full select-none items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 touch-none ${
        zoom > 1
          ? isDragging
            ? "cursor-grabbing"
            : "cursor-grab"
          : "cursor-zoom-in"
      } ${className}`}
      style={{ WebkitUserSelect: "none" }}
    >
      {/* Render the Image with Hardware Accelerated Transform */}
      <div
        className="relative h-full w-full flex items-center justify-center overflow-hidden"
        style={{
          transform:
            zoom > 1
              ? `scale(${zoom}) translate(${panPosition.x / zoom}px, ${panPosition.y / zoom}px)`
              : "scale(1)",
          transformOrigin: `${hoverOrigin.x}% ${hoverOrigin.y}%`,
          transition: isDragging
            ? "none"
            : "transform 0.2s cubic-bezier(0.25, 1, 0.5, 1)",
          willChange: "transform",
        }}
      >
        <img
          src={src}
          alt={alt}
          draggable={false}
          className="h-full w-full object-contain pointer-events-none select-none transition-opacity duration-200"
        />
      </div>

      {/* Coordinated Top Header Overlays (Prevents mobile collision) */}
      {(overlayTopLeft || overlayTopRight) && (
        <div
          className={`absolute top-2.5 inset-x-2.5 z-10 flex flex-wrap items-center justify-between gap-1.5 pointer-events-none transition-opacity duration-200 ${
            zoom > 1 && !isHovering ? "opacity-0" : "opacity-100"
          }`}
        >
          <div
            className="pointer-events-auto flex items-center gap-1.5 max-w-full"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {overlayTopLeft}
          </div>
          <div
            className="pointer-events-auto flex items-center gap-1.5 max-w-full ml-auto"
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {overlayTopRight}
          </div>
        </div>
      )}

      {/* Zoom Hint / Status Badge (Shows on hover or zoom) */}
      {zoom === 1 && (
        <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900/75 px-3 py-1 text-[11px] font-medium text-white shadow-sm backdrop-blur-xs transition-opacity duration-200 opacity-0 group-hover:opacity-90">
          <span>Büyütmek için tıkla veya tekerleği kaydır</span>
        </div>
      )}

      {/* Interactive Floating Control Bar (when Zoomed) */}
      {zoom > 1 && (
        <div
          className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-1.5 rounded-full border border-slate-700/50 bg-slate-950/85 px-3 py-1 text-white shadow-xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150"
          onClick={(e) => e.stopPropagation()}
          onMouseDown={(e) => e.stopPropagation()}
        >
          {/* Zoom Out Button */}
          <button
            type="button"
            onClick={() => {
              const next = Math.max(minZoom, zoom - 0.4);
              setZoom(Number(next.toFixed(2)));
              if (next <= 1) handleReset();
            }}
            disabled={zoom <= minZoom}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20 transition-colors disabled:opacity-30 cursor-pointer"
            title="Uzaklaştır (-)"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </button>

          {/* Percentage Display */}
          <span className="min-w-[42px] text-center font-mono text-[11px] font-bold text-slate-200">
            %{zoomPercent}
          </span>

          {/* Zoom In Button */}
          <button
            type="button"
            onClick={() => {
              const next = Math.min(maxZoom, zoom + 0.4);
              setZoom(Number(next.toFixed(2)));
            }}
            disabled={zoom >= maxZoom}
            className="flex h-7 w-7 items-center justify-center rounded-full hover:bg-white/20 transition-colors disabled:opacity-30 cursor-pointer"
            title="Yakınlaştır (+)"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </button>

          <div className="mx-1 h-3.5 w-px bg-white/20" />

          {/* Reset Button */}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1 px-2 py-1 rounded-full hover:bg-white/20 transition-colors cursor-pointer text-slate-300 hover:text-white text-xs font-medium"
            title="Normal Boyuta Dön (1:1)"
          >
            <RotateCcw className="h-3 w-3" />
            <span>Sıfırla</span>
          </button>
        </div>
      )}
    </div>
  );
}
