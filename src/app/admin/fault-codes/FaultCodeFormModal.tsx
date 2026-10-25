"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { AlertTriangle, Bot, Loader2, Star, Upload } from "lucide-react";
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
import { AdminMarkdownEditorField } from "@/components/admin/AdminMarkdownEditorField";
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
      <DialogContent className="flex max-h-[92vh] flex-col overflow-hidden p-0 sm:max-w-3xl">
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
  const [description, setDescription] = useState(item?.description ?? "");
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | undefined>(
    item?.imageStorageId,
  );
  const [imagePreview, setImagePreview] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const codeRef = useRef<HTMLInputElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
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
    const finalDescription = description.trim() || undefined;

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
          description: finalDescription,
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

  const handleGenerateAi = async () => {
    const rawCode = codeRef.current?.value.trim().toUpperCase() || "";
    if (!rawCode) {
      setError("Lütfen önce arıza kodunu girin (Örn: P0100).");
      codeRef.current?.focus();
      return;
    }

    setError("");
    setIsGeneratingAi(true);

    try {
      const res = await fetch("/api/ai/generate-fault-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: rawCode,
          title: titleRef.current?.value.trim() || undefined,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Arıza kodu içeriği üretilemedi.");
      }

      if (result.data) {
        if (titleRef.current && result.data.title) {
          titleRef.current.value = result.data.title;
        }
        if (result.data.description) {
          setDescription(result.data.description);
        }
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Yapay zeka içeriği oluşturulurken bir hata oluştu.",
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4 pr-14">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold text-slate-900">
            {item ? "Arıza Kodunu Düzenle" : "Yeni Arıza Kodu Ekle"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isGeneratingAi}
            onClick={handleGenerateAi}
            className="h-8 gap-1.5 rounded-full border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-900 shadow-2xs hover:bg-amber-100 cursor-pointer disabled:opacity-60"
          >
            {isGeneratingAi ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-700" />
                <span>AI Hazırlıyor...</span>
              </>
            ) : (
              <>
                <Bot className="h-3.5 w-3.5 text-amber-700" />
                <span>Yapay Zeka ile Doldur</span>
              </>
            )}
          </Button>

          <button
            type="button"
            role="switch"
            aria-checked={isPopular}
            onClick={() => setIsPopular((value) => !value)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 cursor-pointer ${
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
      </div>

      <form onSubmit={handleSave} className="flex min-h-0 flex-1 flex-col justify-between">
        <div className="flex-1 overflow-y-auto space-y-4.5 px-6 py-4">
          {error && (
            <div
              role="alert"
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700"
            >
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Üst Kısım: Solda 2 Input (Alt alta), Sağda Görsel */}
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-12 sm:items-start">
            {/* Sol: Alt alta 2 Input */}
            <div className="sm:col-span-7 flex flex-col justify-between gap-3 sm:pt-0.5">
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
                  ref={codeRef}
                  defaultValue={item?.code ?? ""}
                  placeholder="Örn: P0100"
                  aria-required="true"
                  className="rounded-xl border-slate-300 font-mono text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="fault-title"
                  className="mb-1 block text-xs font-semibold text-slate-700"
                >
                  Başlık / Arıza Tanımı <span className="text-rose-500">*</span>
                </label>
                <Input
                  id="fault-title"
                  name="title"
                  ref={titleRef}
                  defaultValue={item?.title ?? ""}
                  placeholder="Örn: Hava akış sensörü (MAF) devresi arızası"
                  aria-required="true"
                  className="rounded-xl border-slate-300 text-sm"
                />
              </div>
            </div>

            {/* Sağ: Görsel */}
            <div className="sm:col-span-5 flex flex-col">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <label
                  htmlFor="fault-image"
                  className="text-xs font-semibold text-slate-700"
                >
                  Görsel <span className="font-normal text-slate-400">(opsiyonel)</span>
                </label>
                {imagePreviewSrc && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => imageInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="text-[11px] font-semibold text-amber-700 hover:text-amber-800 disabled:opacity-50 cursor-pointer"
                    >
                      Değiştir
                    </button>
                    <button
                      type="button"
                      onClick={handleRemoveImage}
                      className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 cursor-pointer"
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
                <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl border border-slate-200 bg-slate-100 shadow-2xs">
                  <Image
                    src={imagePreviewSrc}
                    alt="Arıza kodu görseli"
                    fill
                    unoptimized
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 320px"
                  />
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingImage}
                  className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-xs font-semibold text-slate-600 transition-colors hover:border-amber-300 hover:bg-amber-50/50 disabled:cursor-wait cursor-pointer"
                >
                  {uploadingImage ? (
                    <Loader2 className="h-5 w-5 animate-spin text-amber-600" />
                  ) : (
                    <Upload className="h-5 w-5 text-slate-400" />
                  )}
                  <span>{uploadingImage ? "Yükleniyor..." : "Görsel yükle"}</span>
                </button>
              )}

              <p className="mt-1 text-[11px] text-slate-400">
                JPG, PNG, WebP veya AVIF. En fazla 10 MB.
              </p>
            </div>
          </div>

          <AdminMarkdownEditorField
            label="Açıklama, Belirtiler ve Çözüm"
            value={description}
            onChange={setDescription}
            rows={11}
            minHeightClass="min-h-[260px]"
            placeholder="Arıza açıklaması, belirtileri, olası nedenleri ve çözüm önerilerini buraya yazabilirsiniz..."
          />
        </div>

        <div className="flex shrink-0 items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-6 py-3.5">
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
