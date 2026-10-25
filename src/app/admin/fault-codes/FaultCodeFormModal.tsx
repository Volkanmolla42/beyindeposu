"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { AlertTriangle, FileText, Loader2, Star, Upload } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { uploadImageToConvex } from "@/lib/image-upload";
import { useObjectUrlPreview } from "@/lib/use-object-url-preview";
import { triggerRevalidate } from "@/lib/revalidate";

type FaultCode = Doc<"faultCodes">;

interface FaultCodeFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: FaultCode | null;
}

export function FaultCodeFormModal({
  open,
  onOpenChange,
  item,
}: FaultCodeFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-0 sm:max-w-2xl">
        {open && (
          <FaultCodeFormModalContent
            key={item?._id ?? "new"}
            item={item}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function FaultCodeFormModalContent({
  item,
  onClose,
}: {
  item: FaultCode | null;
  onClose: () => void;
}) {
  const [isPopular, setIsPopular] = useState(item?.isPopular ?? false);
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | undefined>(
    item?.imageStorageId,
  );
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const descRef = useRef<HTMLTextAreaElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const { create: createImagePreview, clear: clearImagePreview } =
    useObjectUrlPreview();

  const createFaultCode = useMutation(api.faultCodes.create);
  const updateFaultCode = useMutation(api.faultCodes.update);
  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const existingImageUrl = useQuery(
    api.storage.getUrl,
    item?.imageStorageId ? { storageId: item.imageStorageId } : "skip",
  );
  const imagePreviewSrc = imageStorageId
    ? imagePreview || existingImageUrl || ""
    : "";

  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setError("");
    try {
      const storageId = await uploadImageToConvex(file, generateUploadUrl);
      setImageStorageId(storageId);
      setImagePreview(createImagePreview(file));
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Görsel yüklenemedi.");
    } finally {
      setUploadingImage(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleRemoveImage = () => {
    clearImagePreview();
    setImagePreview("");
    setImageStorageId(undefined);
    if (imageInputRef.current) imageInputRef.current.value = "";
  };

  const handleSave = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const code =
      (formData.get("code") as string)?.trim().toUpperCase() || "";
    const title = (formData.get("title") as string)?.trim() || "";
    const description =
      (formData.get("description") as string)?.trim() || undefined;

    if (!code) {
      setError("Arıza kodu zorunludur (örn: P0100).");
      return;
    }
    if (!title) {
      setError("Arıza başlığı / anlamı zorunludur.");
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const payload = {
          code,
          title,
          description,
          isPopular,
          imageStorageId,
        };

        if (item) {
          await updateFaultCode({
            id: item._id,
            ...payload,
          });
        } else {
          await createFaultCode(payload);
        }

        void triggerRevalidate([
          "/ariza-kodlari",
          `/ariza-kodlari/${code.toLowerCase()}`,
          ...(item && item.code !== code
            ? [`/ariza-kodlari/${item.code.toLowerCase()}`]
            : []),
        ]);

        onClose();
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Kayıt sırasında bir hata oluştu.",
        );
      }
    });
  };

  return (
    <>
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 pr-14">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {item ? "Arıza Kodunu Düzenle" : "Yeni Arıza Kodu Ekle"}
          </DialogTitle>
        </DialogHeader>

        <button
          type="button"
          role="switch"
          aria-checked={isPopular}
          onClick={() => setIsPopular((value) => !value)}
          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 ${
            isPopular
              ? "bg-amber-50 text-amber-700 ring-amber-200"
              : "bg-slate-50 text-slate-500 ring-slate-200 hover:text-slate-700"
          }`}
        >
          <Star
            className={`h-3 w-3 ${isPopular ? "fill-amber-500 text-amber-500" : ""}`}
          />
          Popüler
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div className="space-y-4 px-6 pt-2">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="fault-code"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Arıza Kodu (OBD-II) <span className="text-rose-500">*</span>
              </label>
              <Input
                id="fault-code"
                name="code"
                defaultValue={item?.code ?? ""}
                placeholder="Örn: P0100"
                aria-required="true"
                className="rounded-xl border-slate-300 font-mono"
              />
            </div>

            <div>
              <label
                htmlFor="fault-title"
                className="mb-1 block text-xs font-semibold text-slate-700"
              >
                Başlık / Arıza Tanımı{" "}
                <span className="text-rose-500">*</span>
              </label>
              <Input
                id="fault-title"
                name="title"
                defaultValue={item?.title ?? ""}
                placeholder="Örn: Hava akış sensörü (MAF) devresi arızası"
                aria-required="true"
                className="rounded-xl border-slate-300"
              />
            </div>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="fault-image"
                className="text-xs font-semibold text-slate-700"
              >
                Görsel{" "}
                <span className="font-normal text-slate-400">(opsiyonel)</span>
              </label>
              {imagePreviewSrc && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => imageInputRef.current?.click()}
                    disabled={uploadingImage}
                    className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50"
                  >
                    Değiştir
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700"
                  >
                    Kaldır
                  </button>
                </div>
              )}
            </div>

            <input
              id="fault-image"
              ref={imageInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={handleImageUpload}
              className="hidden"
            />

            {imagePreviewSrc ? (
              <div className="relative mt-2 aspect-video w-full max-w-xs overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                <Image
                  src={imagePreviewSrc}
                  alt="Arıza kodu görseli"
                  fill
                  unoptimized
                  className="object-cover"
                  sizes="320px"
                />
              </div>
            ) : (
              <button
                type="button"
                onClick={() => imageInputRef.current?.click()}
                disabled={uploadingImage}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-4 text-xs font-semibold text-slate-600 transition-colors hover:border-amber-300 hover:bg-amber-50/50 disabled:cursor-wait"
              >
                {uploadingImage ? (
                  <Loader2 className="h-4 w-4 animate-spin text-amber-600" />
                ) : (
                  <Upload className="h-4 w-4 text-slate-500" />
                )}
                {uploadingImage ? "Yükleniyor..." : "Görsel yükle"}
              </button>
            )}

            <p className="mt-1.5 text-[11px] text-slate-500">
              JPG, PNG, WebP veya AVIF. En fazla 10 MB.
            </p>
          </div>

          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label
                htmlFor="fault-description"
                className="text-xs font-semibold text-slate-700"
              >
                Açıklama, Belirtiler ve Çözüm
              </label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  const template = `Genel Açıklama:
...

Belirtiler:
•

Olası Nedenler:
•

Çözüm Önerisi:
•`;
                  if (descRef.current) {
                    descRef.current.value = descRef.current.value
                      ? `${descRef.current.value}\n\n${template}`
                      : template;
                  }
                }}
                className="h-7 gap-1.5 px-2 text-[11px] font-semibold text-amber-700 hover:bg-amber-50 hover:text-amber-800"
              >
                <FileText className="h-3 w-3" />
                Şablon ekle
              </Button>
            </div>
            <textarea
              id="fault-description"
              name="description"
              ref={descRef}
              defaultValue={item?.description ?? ""}
              placeholder="Arıza açıklaması, belirtileri, olası nedenleri ve çözüm önerilerini buraya yazabilirsiniz..."
              rows={6}
              className="mt-2 w-full rounded-xl border border-slate-300 p-3 font-sans text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/60 px-6 py-4">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            İptal
          </Button>
          <Button type="submit" disabled={isPending} className="cursor-pointer">
            {isPending
              ? "Kaydediliyor..."
              : item
                ? "Güncelle"
                : "Kaydet"}
          </Button>
        </div>
      </form>
    </>
  );
}
