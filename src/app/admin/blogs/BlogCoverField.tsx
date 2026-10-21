"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Loader2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImageToConvex } from "@/lib/image-upload";
import { useObjectUrlPreview } from "@/lib/use-object-url-preview";
import {
  BLOG_HINT,
  BLOG_LABEL,
  BLOG_PANEL,
  toErrorMessage,
} from "./blog-editor-shared";

interface BlogCoverFieldProps {
  coverImage: string;
  onChange: (storageId: Id<"_storage"> | "", previewUrl: string) => void;
  onError: (message: string) => void;
}

export default function BlogCoverField({
  coverImage,
  onChange,
  onError,
}: BlogCoverFieldProps) {
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const { create: createPreview, clear: clearPreview } = useObjectUrlPreview();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setUploading(true);
    onError("");
    try {
      const storageId = await uploadImageToConvex(file, generateUploadUrl);
      onChange(storageId, createPreview(file));
    } catch (error) {
      onError(
        toErrorMessage(
          error,
          "Kapak görseli yüklenemedi. Bağlantıyı kontrol edin.",
        ),
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <section className={`${BLOG_PANEL} p-5`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 className={BLOG_LABEL}>Kapak görseli</h2>
          <p className={`mt-1 ${BLOG_HINT}`}>
            Blog kartında ve yazının başında görünür.
          </p>
        </div>
        {coverImage && (
          <button
            type="button"
            onClick={() => {
              clearPreview();
              if (fileInputRef.current) fileInputRef.current.value = "";
              onChange("", "");
            }}
            className="text-[11px] font-semibold text-rose-600 transition-colors hover:text-rose-700"
          >
            Kaldır
          </button>
        )}
      </div>

      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
        }}
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="hidden"
      />

      <div className="mt-4">
        {coverImage ? (
          <div className="relative mx-auto aspect-video w-full max-w-3xl overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
            <Image
              src={coverImage}
              alt="Kapak önizlemesi"
              fill
              unoptimized
              className="object-cover"
              sizes="(max-width: 1024px) 100vw, 768px"
            />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={(e) => {
              if (!e.currentTarget.contains(e.relatedTarget as Node)) {
                setDragging(false);
              }
            }}
            onDrop={async (e) => {
              e.preventDefault();
              setDragging(false);
              const file = e.dataTransfer.files?.[0];
              if (file) await upload(file);
            }}
            className={`mx-auto flex aspect-video w-full max-w-3xl flex-col items-center justify-center rounded-xl border-2 border-dashed px-4 text-center transition-colors ${
              dragging
                ? "border-amber-400 bg-amber-50"
                : "border-slate-200 bg-slate-50/60 hover:border-amber-300 hover:bg-amber-50/50"
            }`}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-500">
              {uploading ? (
                <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
              ) : (
                <Upload className="h-5 w-5" />
              )}
            </span>
            <span className="mt-3 text-sm font-semibold text-slate-800">
              {uploading ? "Yükleniyor..." : "Kapak görseli yükle"}
            </span>
            <span className={`mt-1 ${BLOG_HINT}`}>
              veya sürükleyip bırakın
            </span>
          </button>
        )}

        <div className="mx-auto mt-3 flex max-w-3xl flex-wrap items-center justify-between gap-2">
          <p className={BLOG_HINT}>16:9 oranı. JPG, PNG, WebP veya AVIF.</p>
          {coverImage && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="h-8 text-xs"
            >
              {uploading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? "Yükleniyor..." : "Görseli değiştir"}
            </Button>
          )}
        </div>
      </div>
    </section>
  );
}
