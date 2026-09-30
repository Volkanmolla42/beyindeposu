"use client";

import {
  useRef,
  type ChangeEventHandler,
  type Dispatch,
  type SetStateAction,
} from "react";
import Image from "next/image";
import {
  Camera,
  Upload,
  Star,
  X,
  Check,
  ImageIcon,
  Loader2,
  Scan,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ModernImageZoom } from "@/components/ModernImageZoom";

interface ProductImagePanelProps {
  previewImages: string[];
  selectedFormImageIndex: number;
  setPreviewImages: Dispatch<SetStateAction<string[]>>;
  setSelectedFormImageIndex: Dispatch<SetStateAction<number>>;
  title: string;
  visible: boolean;
  uploadingImage: boolean;
  disabled: boolean;
  canScan: boolean;
  scanning: boolean;
  handleImageUpload: ChangeEventHandler<HTMLInputElement>;
  onScan: () => void;
}

export function ProductImagePanel({
  previewImages,
  selectedFormImageIndex,
  setPreviewImages,
  setSelectedFormImageIndex,
  title,
  visible,
  uploadingImage,
  disabled,
  canScan,
  scanning,
  handleImageUpload,
  onScan,
}: ProductImagePanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const handleSetCoverImage = (index: number) => {
    if (index <= 0 || index >= previewImages.length) return;
    setPreviewImages((images) => [
      images[index],
      ...images.filter((_, i) => i !== index),
    ]);
    setSelectedFormImageIndex(0);
  };
  return (
    <section
      id="product-images-panel"
      aria-label="Parça görselleri"
      className={
        "min-h-0 min-w-0 space-y-4 overflow-y-auto overscroll-contain px-0.5 pb-1 " +
        (visible ? "" : "hidden lg:block")
      }
    >
      <div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>{previewImages.length} görsel</span>
          {previewImages.length > 0 && (
            <span>
              {selectedFormImageIndex === 0
                ? "Kapak"
                : selectedFormImageIndex + 1 + ". görsel"}
            </span>
          )}
        </div>
        <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
          {previewImages[selectedFormImageIndex] ? (
            <ModernImageZoom
              src={previewImages[selectedFormImageIndex]}
              alt={title || "Seçili parça görseli"}
              className="h-full w-full aspect-[4/3] border-0 rounded-none bg-transparent"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <ImageIcon className="h-10 w-10" />
              <span>Görsel ekleyin</span>
            </div>
          )}
        </div>
        {previewImages.length > 0 && (
          <div className="flex gap-2 overflow-x-auto overscroll-contain py-1">
            {previewImages.map((image, index) => (
              <button
                key={image + index}
                type="button"
                aria-label={index + 1 + ". görseli seç"}
                aria-pressed={selectedFormImageIndex === index}
                onClick={() => setSelectedFormImageIndex(index)}
                className={
                  "relative h-16 w-20 shrink-0 overflow-hidden rounded-xl border-2 bg-white p-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 " +
                  (selectedFormImageIndex === index
                    ? "border-blue-600"
                    : "border-slate-200")
                }
              >
                <Image
                  src={image}
                  alt={index + 1 + ". parça görseli"}
                  width={80}
                  height={60}
                  unoptimized
                  className="h-full w-full object-contain"
                />
                {index === 0 && (
                  <span className="absolute bottom-1 left-1 rounded-full bg-blue-600 p-0.5 text-white">
                    <Check className="h-3 w-3" />
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
        {previewImages.length > 0 && (
          <div className="flex gap-2">
            {selectedFormImageIndex > 0 && (
              <Button
                type="button"
                variant="outline"
                onClick={() => handleSetCoverImage(selectedFormImageIndex)}
                className="h-11 min-w-0 flex-1 gap-2 px-3"
              >
                <Star className="h-4 w-4" />
                Kapak yap
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              disabled={disabled}
              onClick={() => {
                setPreviewImages((current) =>
                  current.filter(
                    (_, index) => index !== selectedFormImageIndex,
                  ),
                );
                setSelectedFormImageIndex((current) =>
                  Math.max(0, Math.min(current, previewImages.length - 2)),
                );
              }}
              className="h-11 gap-2 rounded-full px-3 text-red-600 hover:bg-red-50 hover:text-red-700"
            >
              <X className="h-4 w-4" />
              Görseli kaldır
            </Button>
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => cameraInputRef.current?.click()}
          disabled={disabled}
          className="h-12 gap-2 bg-white"
        >
          <Camera className="h-4 w-4" />
          Kamera
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          className="h-12 gap-2 bg-white"
        >
          {uploadingImage ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Upload className="h-4 w-4" />
          )}
          Galeri
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={handleImageUpload}
        className="hidden"
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageUpload}
        className="hidden"
      />
      {previewImages[selectedFormImageIndex] && canScan && (
        <Button
          type="button"
          variant="secondary"
          onClick={onScan}
          disabled={disabled}
          className="h-12 w-full gap-2 lg:hidden"
        >
          {scanning ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Scan className="h-4 w-4" />
          )}
          Etiketten doldur
        </Button>
      )}
    </section>
  );
}
