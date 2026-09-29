"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc, Id } from "@convex/_generated/dataModel";
import {
  X,
  Loader2,
  Camera,
  Upload,
  Star,
  Sparkles,
  Scan,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  ImageIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { slugify } from "../admin-utils";
import { ModernImageZoom } from "@/components/ModernImageZoom";
import type { OemAssistantData } from "@/lib/ai/oem-assistant";

interface ProductFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Doc<"products"> | null;
  categories: Array<Doc<"categories">> | undefined;
  brands: Array<Doc<"brands">> | undefined;
}

interface ProductFormContentProps {
  product: Doc<"products"> | null;
  categories: Array<Doc<"categories">> | undefined;
  brands: Array<Doc<"brands">> | undefined;
  onClose: () => void;
}

function ProductFormContent({
  product,
  categories,
  brands,
  onClose,
}: ProductFormContentProps) {
  // Form fields initialized directly from product prop (React key ensures clean remount)
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(Boolean(product));
  const [oemNumber, setOemNumber] = useState(product?.oemNumber ?? "");
  const [isDraft, setIsDraft] = useState(product?.isDraft ?? true);
  const [shelfCode, setShelfCode] = useState(product?.shelfCode ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "Genel Uyumlu");
  const [model, setModel] = useState(product?.model ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    product?.categoryId ?? categories?.[0]?._id ?? ""
  );
  const [condition, setCondition] = useState(product?.condition ?? "Orijinal Çıkma");
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [description, setDescription] = useState(product?.description ?? "");
  const [previewImages, setPreviewImages] = useState<string[]>(product?.images ?? []);
  const [selectedFormImageIndex, setSelectedFormImageIndex] = useState(0);
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(product?.metaDescription ?? "");
  const [metaKeywords, setMetaKeywords] = useState(product?.metaKeywords ?? "");
  const [tagsInput, setTagsInput] = useState(product?.tags ? product.tags.join(", ") : "");

  // Upload & AI states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [scanImageLoading, setScanImageLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [aiSources, setAiSources] = useState<Array<{ title: string; url: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Convex mutations & actions
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const lookupOemAction = useAction(api.oem.lookupOem);

  const populateProductForm = (data: OemAssistantData) => {
    const detectedOem = data.detectedOem || data.cleanOem;
    if (detectedOem) setOemNumber(detectedOem);
    if (data.title) {
      setTitle(data.title);
      setSlug(slugify(data.title));
      setSlugManuallyEdited(false);
    }
    const suggestedBrand = data.brand;
    if (suggestedBrand) {
      const matchedBrand = brands?.find(
        (b) => b.name.toLowerCase() === suggestedBrand.toLowerCase()
      );
      if (matchedBrand) {
        setBrand(matchedBrand.name);
      } else {
        setBrand(suggestedBrand);
      }
    }
    if (data.matchedCategoryId) {
      setSelectedCategoryId(data.matchedCategoryId);
    } else if (data.suggestedCategoryName && categories) {
      const suggestedCategoryName = data.suggestedCategoryName;
      const found = categories.find(
        (c) =>
          c.name.toLowerCase().includes(suggestedCategoryName.toLowerCase()) ||
          suggestedCategoryName.toLowerCase().includes(c.name.toLowerCase())
      );
      if (found) setSelectedCategoryId(found._id);
    }
    if (data.model) {
      setModel(data.model);
    }
    if (data.condition) {
      setCondition(data.condition);
    }
    if (data.description) {
      setDescription(data.description);
    }
    if (Array.isArray(data.tags)) {
      setTagsInput(data.tags.join(", "));
    }
    if (data.metaTitle) {
      setMetaTitle(data.metaTitle);
    }
    if (data.metaDescription) {
      setMetaDescription(data.metaDescription);
    }
    if (data.metaKeywords) {
      setMetaKeywords(data.metaKeywords);
    }
    if (Array.isArray(data.sources)) {
      setAiSources(data.sources);
    } else {
      setAiSources([]);
    }
  };

  const handleGenerateFromOem = async () => {
    const trimmed = oemNumber.trim();
    if (!trimmed) {
      setAiError("OEM kodunu girin.");
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiSuccessMessage(null);
    setAiSources([]);

    try {
      let data: OemAssistantData | null = null;

      try {
        const convexResult = await lookupOemAction({ oemNumber: trimmed });
        if (convexResult.success) {
          data = convexResult;
        } else if (
          convexResult.error?.includes("GEMINI_API_KEY") ||
          convexResult.error?.includes("ortam değişkeni")
        ) {
          data = null;
        } else {
          throw new Error(convexResult.error);
        }
      } catch {
        data = null;
      }

      if (!data) {
        const res = await fetch("/api/ai/oem-lookup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            oemNumber: trimmed,
            categories: categories?.map((c) => ({
              _id: c._id,
              name: c.name,
              slug: c.slug,
            })),
            brands: brands?.map((b) => b.name),
          }),
        });

        const json = (await res.json()) as OemAssistantData & { error?: string };
        if (!res.ok) {
          throw new Error(json.error || "OEM parça bilgileri doğrulanamadı.");
        }
        data = json;
      }

      if (!data) throw new Error("OEM parça bilgileri doğrulanamadı.");
      populateProductForm(data);
      setAiSuccessMessage("OEM bilgileri bulundu. Alanları kontrol edin.");
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "OEM analizi başarısız oldu.");
    } finally {
      setAiLoading(false);
    }
  };

  const scanAndFillFromBase64 = async (base64Data: string, mimeType: string) => {
    const res = await fetch("/api/ai/oem-from-image", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        imageBase64: base64Data,
        imageMimeType: mimeType,
        categories: categories?.map((c) => ({
          _id: c._id,
          name: c.name,
          slug: c.slug,
        })),
        brands: brands?.map((b) => b.name),
      }),
    });

    const data = (await res.json()) as OemAssistantData & { error?: string };
    if (!res.ok) {
      throw new Error(data.error || "Görselde okunabilir etiket veya OEM numarası bulunamadı.");
    }

    populateProductForm(data);
    setAiSuccessMessage("Etiket bilgileri forma aktarıldı. Kaydetmeden önce kontrol edin.");
  };

  const handleScanActivePreviewImage = async () => {
    const currentImgUrl = previewImages[selectedFormImageIndex];
    if (!currentImgUrl) {
      setAiError("Önce bir görsel seçin.");
      return;
    }

    setScanImageLoading(true);
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      let base64Data = "";
      let mimeType = "image/jpeg";

      if (currentImgUrl.startsWith("data:")) {
        base64Data = currentImgUrl;
        const mimeMatch = currentImgUrl.match(/^data:([^;]+);base64,/);
        if (mimeMatch) mimeType = mimeMatch[1];
      } else {
        const res = await fetch(currentImgUrl);
        const blob = await res.blob();
        mimeType = blob.type || "image/jpeg";
        base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      }

      await scanAndFillFromBase64(base64Data, mimeType);
    } catch (err: unknown) {
      setAiError(err instanceof Error ? err.message : "Seçili görsel taranırken bir hata oluştu.");
    } finally {
      setScanImageLoading(false);
    }
  };

  const handleSmartAutoFill = async () => {
    const trimmed = oemNumber.trim();
    if (trimmed) {
      await handleGenerateFromOem();
    } else if (previewImages[selectedFormImageIndex]) {
      await handleScanActivePreviewImage();
    } else {
      setAiError("Lütfen bir OEM kodu girin veya etiket içeren bir parça görseli yükleyin.");
    }
  };

  const handleSetCoverImage = (indexToCover: number) => {
    if (indexToCover <= 0 || indexToCover >= previewImages.length) return;
    setPreviewImages((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(indexToCover, 1);
      copy.unshift(item);
      return copy;
    });
    setSelectedFormImageIndex(0);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    setUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append("label", oemNumber.trim() || slugify(title) || "product");
        const result = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const payload = await result.json();
        if (!result.ok || !payload.url) {
          throw new Error(payload.error || payload.message || "Görsel yüklenemedi.");
        }
        uploadedUrls.push(payload.url);
      }
      if (uploadedUrls.length > 0) {
        setPreviewImages((prev) => [...prev, ...uploadedUrls]);
      }
    } catch (err) {
      console.error("Görsel yüklenemedi:", err);
      alert(err instanceof Error ? err.message : "Görsel yüklenirken bir hata oluştu.");
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !oemNumber || !brand) {
      alert("Zorunlu alanları doldurun: parça başlığı, OEM no ve marka.");
      return;
    }

    let targetCatId = selectedCategoryId;
    if (!targetCatId && categories && categories.length > 0) {
      targetCatId = categories[0]._id;
    }

    if (!targetCatId) {
      alert("Bir kategori seçin.");
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const generatedSlug = slug.trim()
      ? slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-")
      : slugify(title);

    const payload = {
      title,
      slug: generatedSlug,
      oemNumber,
      shelfCode: shelfCode.trim() ? shelfCode.trim().toUpperCase() : undefined,
      categoryId: targetCatId as Id<"categories">,
      brand,
      model: model.trim() || undefined,
      condition,
      inStock,
      description: description || `${title} orijinal oto elektronik parça.`,
      images: previewImages,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      metaKeywords: metaKeywords.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      isDraft,
    };

    if (product) {
      await updateProduct({
        id: product._id,
        ...payload,
      });
    } else {
      await createProduct(payload);
    }

    onClose();
  };

  return (
    <form onSubmit={handleSaveProduct} className="flex min-h-0 flex-1 flex-col text-xs">
      <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
        <div className="grid min-w-0 grid-cols-1 gap-6 pb-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
          {/* Sol Sütun: Görseller */}
          <section className="min-w-0 lg:sticky lg:top-0 lg:self-start">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Görseller</h3>
              <span className="text-xs text-slate-500">{previewImages.length} görsel</span>
            </div>

            <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 lg:aspect-square">
              {previewImages[selectedFormImageIndex] ? (
                <ModernImageZoom
                  src={previewImages[selectedFormImageIndex]}
                  alt="Seçili parça görseli"
                  className="h-full w-full aspect-[4/3] lg:aspect-square border-0 rounded-none bg-transparent"
                />
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-400 p-8">
                  <ImageIcon className="h-12 w-12" />
                  <span className="text-xs font-medium">Henüz görsel eklenmedi</span>
                </div>
              )}
            </div>

            <div className="mt-2 flex max-w-full gap-2 overflow-x-auto pb-1">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={uploadingImage}
                aria-label="Kamerayla fotoğraf çek"
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:cursor-wait"
              >
                {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                <span className="mt-1 text-[9px] font-bold">Kamera</span>
              </button>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                aria-label="Galeriden görsel ekle"
                className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:cursor-wait"
              >
                <Upload className="h-4 w-4" />
                <span className="mt-1 text-[9px] font-bold">Galeri</span>
              </button>
              {previewImages.map((img, i) => (
                <div
                  key={i}
                  className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-white p-1 transition-colors ${
                    i === selectedFormImageIndex ? "border-blue-600" : "border-slate-200 hover:border-slate-400"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedFormImageIndex(i)}
                    className="h-full w-full cursor-pointer"
                    title={`${i + 1}. görseli seç`}
                  >
                    <Image
                      src={img}
                      alt={`${i + 1}. parça görseli`}
                      width={64}
                      height={64}
                      unoptimized
                      className="h-full w-full rounded object-contain"
                    />
                  </button>

                  {i === 0 && (
                    <span
                      className="absolute left-1 bottom-1 px-1 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white shadow-xs leading-none"
                      title="Ana kapak görseli"
                    >
                      KAPAK
                    </span>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setPreviewImages((prev) => prev.filter((_, index) => index !== i));
                      setSelectedFormImageIndex((current) =>
                        Math.max(0, Math.min(current, previewImages.length - 2))
                      );
                    }}
                    className="absolute right-0.5 top-0.5 flex h-4.5 w-4.5 items-center justify-center rounded-full bg-red-600 text-white shadow-xs hover:bg-red-700 transition-all opacity-100 md:opacity-0 md:group-hover:opacity-100 cursor-pointer"
                    aria-label="Görseli kaldır"
                  >
                    <X className="h-2.5 w-2.5 stroke-[2.5]" />
                  </button>
                </div>
              ))}
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
            </div>

            {previewImages.length > 1 && selectedFormImageIndex !== 0 && (
              <button
                type="button"
                onClick={() => handleSetCoverImage(selectedFormImageIndex)}
                className="mt-2.5 flex h-8.5 w-full items-center justify-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 text-xs font-semibold text-amber-800 shadow-2xs hover:bg-amber-100 hover:border-amber-400 active:scale-98 transition-all cursor-pointer"
              >
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                <span>Kapak görseli yap</span>
              </button>
            )}
          </section>

          {/* Sağ Sütun: Form Alanları */}
          <section className="min-w-0 space-y-5">
            <section aria-labelledby="required-product-fields" className="min-w-0 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <h3 id="required-product-fields" className="text-sm font-bold text-slate-900">
                  Parça bilgileri
                </h3>
              </div>

              {/* Stok ve Taslak Durumu Switchleri */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/90">
                <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2 shadow-2xs">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-slate-500">Stok Durumu</span>
                    <span className={`text-xs font-bold ${inStock ? "text-emerald-700" : "text-amber-700"}`}>
                      {inStock ? "Stokta" : "Tükendi"}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={inStock}
                    onClick={() => setInStock(!inStock)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      inStock ? "bg-emerald-600" : "bg-slate-300"
                    }`}
                    title={inStock ? "Stokta (Tıklayarak Tükendi yap)" : "Tükendi (Tıklayarak Stokta yap)"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        inStock ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-center justify-between bg-white rounded-lg border border-slate-200 px-3 py-2 shadow-2xs">
                  <div className="flex flex-col">
                    <span className="text-[11px] font-medium text-slate-500">Taslak Modu</span>
                    <span className={`text-xs font-bold ${isDraft ? "text-amber-700" : "text-emerald-700"}`}>
                      {isDraft ? "Taslak" : "Yayında"}
                    </span>
                  </div>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={isDraft}
                    onClick={() => setIsDraft(!isDraft)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      isDraft ? "bg-amber-500" : "bg-emerald-600"
                    }`}
                    title={isDraft ? "Taslak (Tıklayarak Yayına al)" : "Yayında (Tıklayarak Taslağa al)"}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        isDraft ? "translate-x-5" : "translate-x-0"
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="product-oem" className="font-semibold text-slate-700">
                    OEM kodu <span className="text-red-600" aria-hidden="true">*</span>
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleSmartAutoFill}
                    disabled={aiLoading || scanImageLoading || (!oemNumber.trim() && !previewImages[selectedFormImageIndex])}
                    className="h-8 gap-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border-indigo-200 hover:bg-indigo-100 hover:text-indigo-800 transition-colors shadow-2xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                    title={
                      oemNumber.trim()
                        ? "OEM koduna göre parça bilgilerini doldur"
                        : previewImages[selectedFormImageIndex]
                          ? "Seçili görseldeki etiketi okuyup parça bilgilerini doldur"
                          : "OEM kodu girin veya bir görsel seçin"
                    }
                  >
                    {aiLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                        <span>OEM araştırılıyor...</span>
                      </>
                    ) : scanImageLoading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                        <span>Görsel okunuyor...</span>
                      </>
                    ) : oemNumber.trim() ? (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-indigo-600" />
                        <span>OEM ile doldur</span>
                      </>
                    ) : previewImages[selectedFormImageIndex] ? (
                      <>
                        <Scan className="h-3.5 w-3.5 text-indigo-600" />
                        <span>Görselden oku ve doldur</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-3.5 w-3.5 text-slate-400" />
                        <span>Otomatik doldur</span>
                      </>
                    )}
                  </Button>
                </div>
                <Input
                  id="product-oem"
                  placeholder="Örn. 0281001781 veya 8K0941003C"
                  value={oemNumber}
                  onChange={(e) => {
                    setOemNumber(e.target.value);
                    if (aiError) setAiError(null);
                  }}
                  className="h-11 min-w-0 flex-1 font-mono text-sm"
                  required
                />
                <p className="text-[11px] text-slate-400">
                  OEM kodunu girip bilgileri doldurun veya etiket fotoğrafından okuyun. Kaydetmeden önce alanları kontrol edin.
                </p>

                {aiError && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2.5 text-xs text-red-700 animate-in fade-in">
                    <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <span className="font-semibold block">OEM doğrulama uyarısı:</span>
                      {aiError}
                    </div>
                    <button
                      type="button"
                      onClick={() => setAiError(null)}
                      className="text-red-400 hover:text-red-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}

                {aiSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg space-y-1.5 text-xs text-emerald-800 animate-in fade-in">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-semibold">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>{aiSuccessMessage}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setAiSuccessMessage(null)}
                        className="text-emerald-500 hover:text-emerald-700 cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    {aiSources.length > 0 && (
                      <div className="pt-1.5 border-t border-emerald-200/60 text-[11px] flex flex-wrap gap-2 items-center text-emerald-700">
                        <span className="font-medium text-slate-600">Kaynaklar:</span>
                        {aiSources.slice(0, 3).map((source, i) => (
                          <a
                            key={i}
                            href={source.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-blue-600 underline hover:text-blue-800 max-w-[200px] truncate"
                          >
                            {source.title || "Kaynak"}
                            <ExternalLink className="w-2.5 h-2.5 shrink-0" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="product-title" className="font-semibold text-slate-700">
                  Parça başlığı <span className="text-red-600" aria-hidden="true">*</span>
                </label>
                <Input
                  id="product-title"
                  placeholder="Örn. Renault Megane motor beyni"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (!slugManuallyEdited) setSlug(slugify(e.target.value));
                  }}
                  className="h-11 min-w-0 text-sm font-semibold"
                  required
                />
              </div>

              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="product-brand" className="font-semibold text-slate-700">
                    Araç markası <span className="text-red-600" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="product-brand"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    <option value="Genel Uyumlu">Genel Uyumlu</option>
                    {brands?.map((b) => (
                      <option key={b._id} value={b.name}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="min-w-0 space-y-1.5">
                  <label htmlFor="product-category" className="font-semibold text-slate-700">
                    Kategori <span className="text-red-600" aria-hidden="true">*</span>
                  </label>
                  <select
                    id="product-category"
                    value={selectedCategoryId}
                    onChange={(e) => setSelectedCategoryId(e.target.value)}
                    className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                    required
                  >
                    {categories?.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* Diğer bilgiler */}
            <section aria-labelledby="optional-product-fields" className="min-w-0 space-y-4 border-t border-slate-200 pt-4">
              <h3 id="optional-product-fields" className="text-sm font-bold text-slate-900">
                Diğer bilgiler
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Raf / depo kodu</label>
                    <Input
                      placeholder="Örn: 201.07.0069, A12-04"
                      value={shelfCode}
                      onChange={(e) => setShelfCode(e.target.value)}
                      className="h-11 font-mono text-sm"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Uyumlu model / seri</label>
                    <Input
                      placeholder="Örn: Megane 2, Clio 3"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="h-11 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Parça durumu</label>
                  <select
                    value={condition}
                    onChange={(e) => setCondition(e.target.value)}
                    className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                  >
                    <option value="Orijinal Çıkma">Orijinal Çıkma</option>
                    <option value="Sıfır - Orijinal">Sıfır - Orijinal</option>
                    <option value="Revizyonlu">Revizyonlu</option>
                    <option value="Sıfırlanmış - Virgin">Sıfırlanmış - Virgin</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Açıklama</label>
                  <Textarea
                    rows={4}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-32 resize-y text-sm"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="font-semibold text-slate-700">Arama etiketleri</label>
                  <Input
                    placeholder="Virgülle ayırarak girin: 0281001781, Megane 2, ECU"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="h-11 text-sm"
                  />
                </div>

                <section aria-labelledby="seo-product-fields" className="space-y-3 border-t border-slate-200 pt-4">
                  <h4 id="seo-product-fields" className="text-sm font-bold text-slate-900">
                    SEO alanları
                  </h4>
                  <div className="mt-3 space-y-3">
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">URL / Slug</label>
                      <Input
                        value={slug}
                        onChange={(e) => {
                          setSlug(slugify(e.target.value));
                          setSlugManuallyEdited(true);
                        }}
                        className="h-11 min-w-0 font-mono text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">Meta başlık</label>
                      <Input
                        value={metaTitle}
                        onChange={(e) => setMetaTitle(e.target.value)}
                        className="h-11 text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">Meta açıklama</label>
                      <Textarea
                        rows={3}
                        value={metaDescription}
                        onChange={(e) => setMetaDescription(e.target.value)}
                        className="min-h-24 resize-y text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="font-semibold text-slate-700">Meta anahtar kelimeler</label>
                      <Input
                        value={metaKeywords}
                        onChange={(e) => setMetaKeywords(e.target.value)}
                        className="h-11 text-sm"
                      />
                    </div>
                  </div>
                </section>
              </div>
            </section>
          </section>
        </div>
      </div>

      {/* Form Actions */}
      <div className="relative z-10 grid shrink-0 grid-cols-2 gap-2 border-t border-slate-200 bg-white p-4 sm:flex sm:items-center sm:justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          className="h-11 w-full text-xs sm:w-auto"
        >
          Vazgeç
        </Button>
        <Button
          type="submit"
          className="h-11 w-full bg-blue-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 sm:w-auto"
        >
          {product ? "Kaydet" : "Parçayı kaydet"}
        </Button>
      </div>
    </form>
  );
}

export function ProductFormModal({
  open,
  onOpenChange,
  product,
  categories,
  brands,
}: ProductFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="fixed left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none [&>button]:right-2 [&>button]:top-2 [&>button]:h-11 [&>button]:w-11 [&>button]:opacity-100 md:left-1/2 md:top-1/2 md:h-[90dvh] md:max-h-[900px] md:w-[94vw] md:max-w-6xl md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-xl md:border md:shadow-2xl">
        <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 pr-14 text-left sm:px-6">
          <DialogTitle className="text-base sm:text-lg">
            {product ? "Parçayı düzenle" : "Yeni parça"}
          </DialogTitle>
        </DialogHeader>

        {open && (
          <ProductFormContent
            key={product?._id ?? "new"}
            product={product}
            categories={categories}
            brands={brands}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
