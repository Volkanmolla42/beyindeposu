"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  ExternalLink,
  CheckCircle2,
  X,
  ImageIcon,
  Upload,
  Loader2,
  Video,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
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
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { slugify } from "@/app/admin/admin-utils";
import { uploadImageToConvex, uploadLocalVideo } from "@/lib/image-upload";
import { useObjectUrlPreview } from "@/lib/use-object-url-preview";
import { triggerRevalidate } from "@/lib/revalidate";

type Service = Doc<"services"> & { image: string };

export default function AdminServicesPage() {
  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Service | null>(null);

  const [imageStorageId, setImageStorageId] = useState<Id<"_storage"> | "">("");
  const [image, setImage] = useState("");
  const [videoUrl, setVideoUrl] = useState("");
  const [features, setFeatures] = useState<string[]>([]);
  const [newFeatureInput, setNewFeatureInput] = useState("");

  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [uploading, setUploading] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const { create: createPreview, clear: clearPreview } = useObjectUrlPreview();

  const generateUploadUrl = useMutation(api.storage.generateUploadUrl);

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
      setError(err instanceof Error ? err.message : "Görsel yüklenirken bir hata oluştu.");
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
      const uploadedUrl = await uploadLocalVideo(file, editingItem?.slug || "service");
      setVideoUrl(uploadedUrl);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Video yüklenirken bir hata oluştu.");
    } finally {
      setUploadingVideo(false);
      if (videoInputRef.current) videoInputRef.current.value = "";
    }
  };

  const handleRemoveVideo = () => {
    setVideoUrl("");
    if (videoInputRef.current) videoInputRef.current.value = "";
  };

  const services = useQuery(api.services.listAdmin, {});
  const createService = useMutation(api.services.create);
  const updateService = useMutation(api.services.update);
  const deleteService = useMutation(api.services.deleteService);
  const toggleActive = useMutation(api.services.toggleActive);

  const resetForm = () => {
    clearPreview();
    setEditingItem(null);
    setImageStorageId("");
    setImage("");
    setVideoUrl("");
    if (videoInputRef.current) videoInputRef.current.value = "";
    setFeatures([]);
    setNewFeatureInput("");
    setError("");
  };

  const handleOpenAdd = () => {
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEdit = (item: Service) => {
    clearPreview();
    setEditingItem(item);
    setImageStorageId(item.imageStorageId);
    setImage(item.image);
    setVideoUrl(item.videoUrl ?? "");
    if (videoInputRef.current) videoInputRef.current.value = "";
    setFeatures([...item.features]);
    setNewFeatureInput("");
    setError("");
    setModalOpen(true);
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

  const handleToggleActive = async (id: Id<"services">) => {
    const item = services?.find((s) => s._id === id);
    try {
      await toggleActive({ id });
      void triggerRevalidate([
        "/",
        "/tamirveservis",
        ...(item ? [`/tamirveservis/${item.slug}`] : []),
      ]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Aktiflik durumu değiştirilemedi.");
    }
  };

  const handleDelete = async (id: Id<"services">, serviceTitle: string) => {
    if (!confirm(`"${serviceTitle}" servisini silmek istediğinize emin misiniz?`)) {
      return;
    }
    const item = services?.find((s) => s._id === id);
    try {
      await deleteService({ id });
      void triggerRevalidate([
        "/",
        "/tamirveservis",
        ...(item ? [`/tamirveservis/${item.slug}`] : []),
      ]);
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Silme işlemi başarısız oldu.");
    }
  };

  const handleSave = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const title = (formData.get("title") as string)?.trim() || "";
    let slug = (formData.get("slug") as string)?.trim().toLowerCase() || "";
    if (!slug && title) {
      slug = slugify(title);
    }
    const shortDesc = (formData.get("shortDesc") as string)?.trim() || "";
    const fullDesc = (formData.get("fullDesc") as string)?.trim() || "";
    const order = parseInt((formData.get("order") as string) || "1", 10) || 1;
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

        if (editingItem) {
          await updateService({
            id: editingItem._id,
            ...payload,
          });
        } else {
          await createService(payload);
        }

        void triggerRevalidate([
          "/",
          "/tamirveservis",
          `/tamirveservis/${slug}`,
          ...(editingItem && editingItem.slug !== slug
            ? [`/tamirveservis/${editingItem.slug}`]
            : []),
        ]);

        setModalOpen(false);
        resetForm();
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : "Kayıt sırasında bir hata oluştu.");
      }
    });
  };

  const filteredServices = (services ?? []).filter((s) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      s.title.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.shortDesc.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Tamir & Servis Yönetimi"
        badge={services ? `${services.length} Servis` : "Yükleniyor..."}
        description="Sitede yayınlanan oto elektronik, tamir ve servis hizmetlerini yönetin."
        actions={
          <Button
            onClick={handleOpenAdd}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold gap-2 rounded-xl cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            <span>Yeni Servis Ekle</span>
          </Button>
        }
      />

      {/* Arama Alanı */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative w-full max-w-md">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Başlık veya bağlantı adresi ile ara..."
            aria-label="Servis ara"
            className="pl-9 rounded-xl border-slate-200 focus-visible:ring-amber-400"
          />
        </div>
      </div>

      {/* Servis Listesi */}
      <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
        {services === undefined ? (
          <div className="p-12 text-center text-sm text-slate-500">Yükleniyor...</div>
        ) : filteredServices.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            {search.trim() ? "Aramaya uygun servis bulunamadı." : "Henüz servis kaydı bulunmuyor."}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredServices.map((service) => (
              <div
                key={service._id}
                className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 hover:bg-slate-50/80 transition-colors"
              >
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div className="relative h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-dark-bg">
                    {service.image ? (
                      <Image
                        src={service.image}
                        alt={service.title}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-slate-400">
                        <ImageIcon className="h-5 w-5" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-slate-900 text-base">{service.title}</h3>
                      <Link
                        href={`/tamirveservis/${service.slug}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700"
                      >
                        <span>/{service.slug}</span>
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                    </div>

                    <p className="text-xs text-slate-500 line-clamp-1">{service.shortDesc}</p>

                    <div className="flex items-center gap-2 pt-0.5 text-xs text-slate-600">
                      <span className="font-medium text-slate-700">Sıra: {service.order}</span>
                      <span>•</span>
                      <span>{service.features?.length || 0} Madde</span>
                      {service.videoUrl && (
                        <>
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                            <Video className="h-3 w-3" />
                            Video
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                  <button
                    type="button"
                    onClick={() => handleToggleActive(service._id)}
                    className={`px-3 py-1 text-xs font-semibold rounded-full border cursor-pointer transition-colors ${
                      service.isActive
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200"
                    }`}
                  >
                    {service.isActive ? "Yayında" : "Pasif"}
                  </button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleOpenEdit(service)}
                    className="h-8 gap-1.5 rounded-lg text-slate-700 hover:text-slate-900"
                  >
                    <Edit2 className="h-3.5 w-3.5" />
                    <span>Düzenle</span>
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDelete(service._id, service.title)}
                    className="h-8 rounded-lg text-red-600 hover:text-red-700 hover:bg-red-50 border-slate-200"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ekleme / Düzenleme Modalı */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingItem ? "Servisi Düzenle" : "Yeni Servis Ekle"}
            </DialogTitle>
          </DialogHeader>

          <form
            key={editingItem?._id ?? "new"}
            onSubmit={handleSave}
            className="space-y-4 pt-2"
          >
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
                  defaultValue={editingItem?.title ?? ""}
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
                  defaultValue={editingItem?.slug ?? ""}
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
                defaultValue={editingItem?.shortDesc ?? ""}
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
                defaultValue={editingItem?.fullDesc ?? ""}
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
                  defaultValue={editingItem?.order ?? (services?.length || 0) + 1}
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
                        <span>{uploadingVideo ? "Yükleniyor..." : "Değiştir"}</span>
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
                        {uploadingVideo ? "Video yükleniyor..." : "İşlem veya Tanıtım Videosu Ekle"}
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
                    <span>{uploadingVideo ? "Yükleniyor..." : "Video Seç"}</span>
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
                defaultChecked={editingItem ? editingItem.isActive : true}
                className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              <label htmlFor="isActive" className="text-xs font-medium text-slate-800 cursor-pointer">
                Sitede ve arama motorlarında aktif olarak yayınla
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="rounded-xl"
              >
                İptal
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold rounded-xl"
              >
                {isPending ? "Kaydediliyor..." : editingItem ? "Güncelle" : "Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
