"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import {
  CheckCircle2,
  Loader2,
  Trash2,
  Upload,
  Video,
  X,
} from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { slugify } from "@/app/admin/admin-utils";
import { uploadImageToConvex, uploadLocalVideo } from "@/lib/image-upload";
import { useObjectUrlPreview } from "@/lib/use-object-url-preview";
import { triggerRevalidate } from "@/lib/revalidate";

type Service = Doc<"services"> & { image: string };

interface ServiceFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
  nextOrder: number;
}

export function ServiceFormModal({
  open,
  onOpenChange,
  service,
  nextOrder,
}: ServiceFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        {open && (
          <ServiceFormModalContent
            key={service?._id ?? "new"}
            service={service}
            nextOrder={nextOrder}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function ServiceFormModalContent({
  service,
  nextOrder,
  onClose,
}: {
  service: Service | null;
  nextOrder: number;
  onClose: () => void;
}) {
  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | "">(
    service?.imageStorageId ?? "",
  );
  const [image, setImage] = useState(service?.image ?? "");
  const [videoUrl, setVideoUrl] = useState(service?.videoUrl ?? "");
  const [features, setFeatures] = useState<string[]>(
    service?.features ? [...service.features] : [],
  );
  const [newFeatureInput, setNewFeatureInput] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { create: createPreview } = useObjectUrlPreview();

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);
  const createService = useMutation(api.services.create);
  const updateService = useMutation(api.services.update);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const storageId = await uploadImageToConvex(file, generateUploadUrl);
      setImageStorageId(storageId);
      setImage(createPreview(file));
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Görsel yüklenirken bir hata oluştu.",
      );
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingVideo(true);
    setError("");
    try {
      const uploadedUrl = await uploadLocalVideo(
        file,
        service?.slug || "service",
      );
      setVideoUrl(uploadedUrl);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "Video yüklenirken bir hata oluştu.",
      );
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleRemoveVideo = () => {
    setVideoUrl("");
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const handleAddFeature = () => {
    if (newFeatureInput.trim()) {
      setFeatures([...features, newFeatureInput.trim()]);
      setNewFeatureInput("");
    }
  };

  const handleRemoveFeature = (idx: number) => {
    setFeatures(features.filter((_, i) => i !== idx));
  };

  const handleSave = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = (formData.get("title") as string)?.trim() || "";
    let slug =
      (formData.get("slug") as string)?.trim().toLowerCase() || "";
    if (!slug && title) {
      slug = slugify(title);
    }
    const shortDesc = (formData.get("shortDesc") as string)?.trim() || "";
    const fullDesc = (formData.get("fullDesc") as string)?.trim() || "";
    const order =
      parseInt((formData.get("order") as string) || "1", 10) || 1;
    const isActive = formData.get("isActive") === "on";

    if (!title) {
      setError("Servis başlığı zorunludur.");
      return;
    }
    if (!slug) {
      setError("Bağlantı adresi (slug) zorunludur.");
      return;
    }
    if (!shortDesc) {
      setError("Kısa açıklama zorunludur.");
      return;
    }
    if (!fullDesc) {
      setError("Detaylı açıklama zorunludur.");
      return;
    }
    if (!imageStorageId) {
      setError("Bir görsel yükleyin.");
      return;
    }

    setError("");

    startTransition(async () => {
      try {
        const allFeatures = [...features];
        if (newFeatureInput.trim()) {
          allFeatures.push(newFeatureInput.trim());
        }

        const payload = {
          title,
          slug,
          shortDesc,
          fullDesc,
          imageStorageId,
          videoUrl: videoUrl || undefined,
          features: allFeatures.map((f) => f.trim()).filter(Boolean),
          order,
          isActive,
        };

        if (service) {
          await updateService({
            id: service._id,
            ...payload,
          });
        } else {
          await createService(payload);
        }

        void triggerRevalidate([
          "/",
          "/tamirveservis",
          `/tamirveservis/${slug}`,
          ...(service && service.slug !== slug
            ? [`/tamirveservis/${service.slug}`]
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
      <DialogHeader>
        <DialogTitle className="text-lg font-bold text-slate-900">
          {service ? "Servisi Düzenle" : "Yeni Servis Ekle"}
        </DialogTitle>
      </DialogHeader>

      <form onSubmit={handleSave} className="space-y-4 pt-2">
        {error && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="service-title"
              className="text-xs font-semibold text-slate-700 mb-1 block"
            >
              Servis Başlığı *
            </label>
            <Input
              id="service-title"
              name="title"
              defaultValue={service?.title ?? ""}
              placeholder="Örn: ABS Tamiri"
              required
              className="rounded-xl"
            />
          </div>

          <div>
            <label
              htmlFor="service-slug"
              className="text-xs font-semibold text-slate-700 mb-1 block"
            >
              Bağlantı Adresi (Slug) *
            </label>
            <Input
              id="service-slug"
              name="slug"
              defaultValue={service?.slug ?? ""}
              placeholder="abs-tamiri"
              className="rounded-xl font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <label
            htmlFor="service-short-desc"
            className="text-xs font-semibold text-slate-700 mb-1 block"
          >
            Kısa Açıklama (Kartlarda ve SEO alanlarında görünür) *
          </label>
          <Input
            id="service-short-desc"
            name="shortDesc"
            defaultValue={service?.shortDesc ?? ""}
            placeholder="Örn: ABS beyin, sensör ve hidrolik ünitesi tamir ve onarımı"
            required
            className="rounded-xl"
          />
        </div>

        <div>
          <label
            htmlFor="service-full-desc"
            className="text-xs font-semibold text-slate-700 mb-1 block"
          >
            Detaylı Açıklama (Sayfa gövdesinde görünür) *
          </label>
          <Textarea
            id="service-full-desc"
            name="fullDesc"
            defaultValue={service?.fullDesc ?? ""}
            rows={4}
            placeholder="Aracınızda yanan ikaz ışıkları ve test aşamaları hakkında detaylı bilgi..."
            required
            className="rounded-xl text-sm"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          <div className="sm:col-span-2 space-y-2">
            <label
              htmlFor="service-image"
              className="text-xs font-semibold text-slate-700 block"
            >
              Görsel *
            </label>
            <input
              id="service-image"
              type="file"
              ref={fileInputRef}
              onChange={handleFileUpload}
              accept="image/png,image/jpeg,image/webp,image/avif"
              className="hidden"
            />
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => fileInputRef.current?.click()}
                className="rounded-xl shrink-0 gap-1.5 text-xs"
              >
                {uploading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span>
                  {uploading
                    ? "Yükleniyor..."
                    : image
                      ? "Görseli değiştir"
                      : "Görsel yükle"}
                </span>
              </Button>

              {image ? (
                <>
                  <div className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-dark-bg">
                    <Image
                      src={image}
                      alt="Önizleme"
                      fill
                      unoptimized
                      sizes="96px"
                      className="object-cover"
                    />
                  </div>
                  <span className="text-[11px] font-medium text-emerald-700">
                    Görsel yüklendi
                  </span>
                </>
              ) : (
                <span className="text-[11px] text-slate-500">
                  JPG, PNG, WebP veya AVIF. En fazla 10 MB.
                </span>
              )}
            </div>
          </div>

          <div>
            <label
              htmlFor="service-order"
              className="text-xs font-semibold text-slate-700 mb-1 block"
            >
              Sıralama No
            </label>
            <Input
              id="service-order"
              name="order"
              type="number"
              defaultValue={service?.order ?? nextOrder}
              className="rounded-xl"
            />
          </div>
        </div>

        {/* Video Yükleme Alanı */}
        <div className="space-y-2">
          <label
            htmlFor="service-video"
            className="text-xs font-semibold text-slate-700 block"
          >
            Tanıtım / İşlem Videosu (İsteğe Bağlı)
          </label>
          <input
            id="service-video"
            type="file"
            ref={videoInputRef}
            onChange={handleVideoUpload}
            accept="video/mp4,video/webm,video/quicktime,video/ogg"
            className="hidden"
          />

          {videoUrl ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    <span>Video Yüklendi</span>
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={uploadingVideo}
                    onClick={() => videoInputRef.current?.click()}
                    className="h-8 rounded-xl text-xs gap-1.5 cursor-pointer bg-white"
                  >
                    {uploadingVideo ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Upload className="h-3.5 w-3.5" />
                    )}
                    <span>
                      {uploadingVideo ? "Yükleniyor..." : "Değiştir"}
                    </span>
                  </Button>

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRemoveVideo}
                    className="h-8 rounded-xl text-xs gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200 cursor-pointer bg-white"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Kaldır</span>
                  </Button>
                </div>
              </div>

              <div className="relative aspect-video w-full max-w-sm mx-auto overflow-hidden rounded-xl border border-slate-300 bg-slate-950 shadow-xs">
                <video
                  src={videoUrl}
                  controls
                  playsInline
                  className="h-full w-full object-contain"
                />
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 p-4 transition-colors hover:border-amber-400 hover:bg-amber-50/30">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white border border-slate-200 text-amber-600 shadow-xs">
                  <Video className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-800">
                    {uploadingVideo
                      ? "Video yükleniyor..."
                      : "İşlem veya Tanıtım Videosu Ekle"}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    MP4, WebM veya MOV (Maksimum 100 MB)
                  </p>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploadingVideo}
                onClick={() => videoInputRef.current?.click()}
                className="rounded-xl text-xs gap-1.5 cursor-pointer bg-white shrink-0"
              >
                {uploadingVideo ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Upload className="h-3.5 w-3.5" />
                )}
                <span>
                  {uploadingVideo ? "Yükleniyor..." : "Video Seç"}
                </span>
              </Button>
            </div>
          )}
        </div>

        {/* Hizmet Maddeleri */}
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-1.5 block">
            Hizmet Kapsamı Maddeleri
          </div>
          <div className="flex gap-2 mb-2">
            <Input
              value={newFeatureInput}
              onChange={(e) => setNewFeatureInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleAddFeature();
                }
              }}
              placeholder="Yeni madde ekleyin ve Enter'a basın..."
              aria-label="Yeni hizmet maddesi"
              className="rounded-xl text-xs"
            />
            <Button
              type="button"
              variant="outline"
              onClick={handleAddFeature}
              className="rounded-xl shrink-0"
            >
              Ekle
            </Button>
          </div>

          {features.length > 0 && (
            <div className="space-y-1.5 mt-2">
              {features.map((feat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-800"
                >
                  <span className="flex items-center gap-1.5 min-w-0 truncate">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{feat}</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveFeature(idx)}
                    className="text-slate-400 hover:text-red-600 shrink-0 p-0.5"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="isActive"
            name="isActive"
            defaultChecked={service ? service.isActive : true}
            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
          />
          <label
            htmlFor="isActive"
            className="text-xs font-medium text-slate-800 cursor-pointer"
          >
            Sitede ve arama motorlarında aktif olarak yayınla
          </label>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="rounded-xl"
          >
            İptal
          </Button>
          <Button
            type="submit"
            disabled={isPending}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl"
          >
            {isPending
              ? "Kaydediliyor..."
              : service
                ? "Güncelle"
                : "Kaydet"}
          </Button>
        </div>
      </form>
    </>
  );
}
