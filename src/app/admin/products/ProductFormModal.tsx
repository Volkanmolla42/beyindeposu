"use client";

import React, {
  useState,
  useRef,
  type ChangeEventHandler,
  type Dispatch,
  type SetStateAction,
} from "react";
import Image from "next/image";
import { useMutation, useAction } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import {
  X,
  Loader2,
  Sparkles,
  Scan,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Globe,
  FileText,
  Check,
  Camera,
  Upload,
  Star,
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
import { scanProductImage } from "./product-assistant";
import { useMobileDialogViewport } from "./use-mobile-dialog-viewport";
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
  saving: boolean;
  setSaving: React.Dispatch<React.SetStateAction<boolean>>;
}

function ProductFormContent({
  product,
  categories,
  brands,
  onClose,
  saving,
  setSaving,
}: ProductFormContentProps) {
  // Form fields initialized directly from product prop (React key ensures clean remount)
  const [title, setTitle] = useState(product?.title ?? "");
  const [slug, setSlug] = useState(product?.slug ?? "");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(
    Boolean(product),
  );
  const [oemNumber, setOemNumber] = useState(product?.oemNumber ?? "");
  const [isDraft, setIsDraft] = useState(
    product ? product.isDraft === true : true,
  );
  const [shelfCode, setShelfCode] = useState(product?.shelfCode ?? "");
  const [brand, setBrand] = useState(product?.brand ?? "Genel Uyumlu");
  const [model, setModel] = useState(product?.model ?? "");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>(
    product?.categoryId ?? categories?.[0]?._id ?? "",
  );
  const [condition, setCondition] = useState(
    product?.condition ?? "Orijinal Çıkma",
  );
  const [inStock, setInStock] = useState(product?.inStock ?? true);
  const [description, setDescription] = useState(product?.description ?? "");
  const [previewImages, setPreviewImages] = useState<string[]>(
    product?.images ?? [],
  );
  const [selectedFormImageIndex, setSelectedFormImageIndex] = useState(0);
  const [metaTitle, setMetaTitle] = useState(product?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(
    product?.metaDescription ?? "",
  );
  const [metaKeywords, setMetaKeywords] = useState(product?.metaKeywords ?? "");
  const [tagsInput, setTagsInput] = useState(
    product?.tags ? product.tags.join(", ") : "",
  );
  const pendingTask = useRef<"save" | "upload" | "ai" | null>(null);
  const [saveError, setSaveError] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const fieldClass =
    "h-12 rounded-xl border-slate-300 bg-white text-base! md:text-sm! shadow-none";

  useMobileDialogViewport(formRef);

  // Upload & AI states
  const [uploadingImage, setUploadingImage] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [scanImageLoading, setScanImageLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [aiSources, setAiSources] = useState<
    Array<{ title: string; url: string }>
  >([]);

  // Convex mutations & actions
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const lookupOemAction = useAction(api.oem.lookupOem);

  const populateProductForm = (data: OemAssistantData) => {
    const detectedOem = data.detectedOem || data.cleanOem;
    if (detectedOem) setOemNumber(detectedOem);
    if (data.title) {
      setTitle(data.title);
      if (!slugManuallyEdited) setSlug(slugify(data.title));
    }
    const suggestedBrand = data.brand;
    if (suggestedBrand) {
      const matchedBrand = brands?.find(
        (b) => b.name.toLowerCase() === suggestedBrand.toLowerCase(),
      );
      if (matchedBrand) {
        setBrand(matchedBrand.name);
      } else {
        setBrand(suggestedBrand);
      }
    }
    if (data.matchedCategoryId) {
      const category = categories?.find(
        (item) => item._id === data.matchedCategoryId,
      );
      if (category) setSelectedCategoryId(category._id);
    } else if (data.suggestedCategoryName && categories) {
      const suggestedCategoryName = data.suggestedCategoryName;
      const found = categories.find(
        (c) =>
          c.name.toLowerCase().includes(suggestedCategoryName.toLowerCase()) ||
          suggestedCategoryName.toLowerCase().includes(c.name.toLowerCase()),
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
    if (pendingTask.current) return;
    const trimmed = oemNumber.trim();
    if (!trimmed) {
      setAiError("OEM kodunu girin.");
      return;
    }

    pendingTask.current = "ai";
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

        const json = (await res.json()) as OemAssistantData & {
          error?: string;
        };
        if (!res.ok) {
          throw new Error(json.error || "OEM parça bilgileri doğrulanamadı.");
        }
        data = json;
      }

      if (!data) throw new Error("OEM parça bilgileri doğrulanamadı.");
      populateProductForm(data);
      setAiSuccessMessage("OEM bilgileri bulundu. Alanları kontrol edin.");
    } catch (err: unknown) {
      setAiError(
        err instanceof Error ? err.message : "OEM analizi başarısız oldu.",
      );
    } finally {
      pendingTask.current = null;
      setAiLoading(false);
    }
  };

  const handleScanActivePreviewImage = async () => {
    if (pendingTask.current) return;
    const currentImgUrl = previewImages[selectedFormImageIndex];
    if (!currentImgUrl) {
      setAiError("Önce bir görsel seçin.");
      return;
    }

    pendingTask.current = "ai";
    setScanImageLoading(true);
    setAiError(null);
    setAiSuccessMessage(null);

    try {
      const data = await scanProductImage(currentImgUrl, categories, brands);
      populateProductForm(data);
      setAiSuccessMessage(
        "Etiket bilgileri forma aktarıldı. Kaydetmeden önce kontrol edin.",
      );
    } catch (err: unknown) {
      setAiError(
        err instanceof Error
          ? err.message
          : "Seçili görsel taranırken bir hata oluştu.",
      );
    } finally {
      pendingTask.current = null;
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
      setAiError(
        "Lütfen bir OEM kodu girin veya etiket içeren bir parça görseli yükleyin.",
      );
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (pendingTask.current) return;
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    e.target.value = "";

    pendingTask.current = "upload";
    setUploadingImage(true);
    try {
      for (const file of files) {
        const formData = new FormData();
        formData.append("file", file);
        formData.append(
          "label",
          oemNumber.trim() || slugify(title) || "product",
        );
        const result = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const payload = await result.json();
        if (!result.ok || !payload.url) {
          throw new Error(
            payload.error || payload.message || "Görsel yüklenemedi.",
          );
        }
        setPreviewImages((prev) => [...prev, payload.url]);
      }
    } catch (err) {
      console.error("Görsel yüklenemedi:", err);
      alert(
        err instanceof Error
          ? err.message
          : "Görsel yüklenirken bir hata oluştu.",
      );
    } finally {
      pendingTask.current = null;
      setUploadingImage(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pendingTask.current) return;
    if (!title.trim() || !oemNumber.trim() || !brand.trim()) {
      setSaveError("Parça adı, OEM kodu ve marka alanlarını doldurun.");
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLInputElement>(
            !oemNumber.trim()
              ? "#product-oem"
              : !title.trim()
                ? "#product-title"
                : "#product-brand",
          )
          ?.focus(),
      );
      return;
    }

    const category = categories?.find(
      (item) => item._id === selectedCategoryId,
    );
    if (!category) {
      setSaveError("Bir kategori seçin.");
      requestAnimationFrame(() =>
        formRef.current
          ?.querySelector<HTMLSelectElement>("#product-category")
          ?.focus(),
      );
      return;
    }

    const tags = tagsInput
      .split(",")
      .map((t) => t.trim())
      .filter((t) => t.length > 0);

    const generatedSlug = slug.trim()
      ? slug
          .trim()
          .toLowerCase()
          .replace(/[^a-z0-9-]/g, "-")
      : slugify(title);
    if (!generatedSlug || !/[a-z0-9]/.test(generatedSlug)) {
      setSaveError("Geçerli bir sayfa adresi girin.");
      return;
    }

    const payload = {
      title: title.trim(),
      slug: generatedSlug,
      oemNumber: oemNumber.trim(),
      shelfCode: shelfCode.trim().toUpperCase(),
      categoryId: category._id,
      brand: brand.trim(),
      model: model.trim(),
      condition,
      inStock,
      description: description || `${title} orijinal oto elektronik parça.`,
      images: previewImages,
      metaTitle: metaTitle.trim(),
      metaDescription: metaDescription.trim(),
      metaKeywords: metaKeywords.trim(),
      tags,
      isDraft,
    };

    pendingTask.current = "save";
    setSaving(true);
    setSaveError("");
    try {
      if (product) {
        await updateProduct({ id: product._id, ...payload });
      } else {
        await createProduct(payload);
      }
      onClose();
    } catch (error) {
      console.error("Parça kaydedilemedi:", error);
      setSaveError("Parça kaydedilemedi. Tekrar deneyin.");
    } finally {
      pendingTask.current = null;
      setSaving(false);
    }
  };

  return (
    <form
      ref={formRef}
      noValidate
      onSubmit={handleSaveProduct}
      onChangeCapture={() => setSaveError("")}
      className="flex min-h-0 flex-1 flex-col text-sm"
    >
      <fieldset disabled={saving} className="contents">
        <div className="grid min-h-0 min-w-0 flex-1 grid-cols-1 gap-5 overflow-y-auto overscroll-contain bg-slate-50 px-4 py-4 sm:px-6 lg:grid-rows-[minmax(0,1fr)] lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,0.8fr)] lg:overflow-hidden">
          <div className="contents lg:col-start-2 lg:row-start-1 lg:flex lg:min-h-0 lg:flex-col">
            <ProductImagePanel
              previewImages={previewImages}
              selectedFormImageIndex={selectedFormImageIndex}
              setPreviewImages={setPreviewImages}
              setSelectedFormImageIndex={setSelectedFormImageIndex}
              title={title}
              uploadingImage={uploadingImage}
              disabled={
                saving || uploadingImage || aiLoading || scanImageLoading
              }
              handleImageUpload={handleImageUpload}
            />
            <div className="hidden shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-1 lg:flex lg:flex-col">
              {saveError && (
                <p role="alert" className="mb-3 text-sm text-red-600">
                  {saveError}
                </p>
              )}
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  disabled={saving}
                  onClick={onClose}
                  className="h-12 text-sm"
                >
                  Vazgeç
                </Button>
                <Button
                  type="submit"
                  disabled={
                    saving || uploadingImage || aiLoading || scanImageLoading
                  }
                  className="h-12 gap-2 px-6 text-sm"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Check className="h-4 w-4" />
                  )}
                  {saving ? "Kaydediliyor…" : "Kaydet"}
                </Button>
              </div>
            </div>
          </div>
          <section
            id="product-details-panel"
            aria-label="Parça bilgileri"
            className="min-w-0 space-y-4 px-0.5 pb-1 lg:col-start-1 lg:min-h-0 lg:overflow-y-auto lg:overscroll-contain"
          >
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                role="switch"
                aria-label="Stokta"
                aria-checked={inStock}
                onClick={() => setInStock(!inStock)}
                className={
                  "flex min-h-16 min-w-0 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-blue-600 " +
                  (inStock
                    ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border-slate-200 bg-white text-slate-600")
                }
              >
                <span>
                  <span className="block text-xs">Stok</span>
                  <span className="mt-1 block font-semibold">
                    {inStock ? "Stokta" : "Stokta yok"}
                  </span>
                </span>
                <span
                  className={
                    "flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 " +
                    (inStock ? "bg-emerald-700" : "bg-slate-300")
                  }
                >
                  <span
                    className={
                      "h-5 w-5 rounded-full bg-white shadow-xs " +
                      (inStock ? "translate-x-4" : "")
                    }
                  />
                </span>
              </button>
              <button
                type="button"
                role="switch"
                aria-label="Yayında"
                aria-checked={!isDraft}
                onClick={() => setIsDraft(!isDraft)}
                className={
                  "flex min-h-16 min-w-0 items-center justify-between gap-2 rounded-2xl border px-3 py-2 text-left focus-visible:outline-2 focus-visible:outline-blue-600 " +
                  (!isDraft
                    ? "border-blue-200 bg-blue-50 text-blue-800"
                    : "border-slate-200 bg-white text-slate-600")
                }
              >
                <span>
                  <span className="block text-xs">Yayın</span>
                  <span className="mt-1 block font-semibold">
                    {isDraft ? "Taslak" : "Yayında"}
                  </span>
                </span>
                <span
                  className={
                    "flex h-6 w-10 shrink-0 items-center rounded-full p-0.5 " +
                    (!isDraft ? "bg-blue-600" : "bg-slate-300")
                  }
                >
                  <span
                    className={
                      "h-5 w-5 rounded-full bg-white shadow-xs " +
                      (!isDraft ? "translate-x-4" : "")
                    }
                  />
                </span>
              </button>
            </div>
            <>
              <div className="space-y-2">
                <label
                  htmlFor="product-oem"
                  className="font-medium text-slate-700"
                >
                  OEM kodu <span className="text-red-600">*</span>
                </label>
                <Input
                  id="product-oem"
                  aria-required="true"
                  autoComplete="off"
                  placeholder="0281001781"
                  value={oemNumber}
                  onChange={(event) => {
                    setOemNumber(event.target.value);
                    setAiError(null);
                  }}
                  className={fieldClass + " font-mono"}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleSmartAutoFill}
                  disabled={
                    saving ||
                    uploadingImage ||
                    aiLoading ||
                    scanImageLoading ||
                    (!oemNumber.trim() &&
                      !previewImages[selectedFormImageIndex])
                  }
                  className="h-11 w-full gap-2"
                >
                  {aiLoading || scanImageLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : oemNumber.trim() ? (
                    <Sparkles className="h-4 w-4" />
                  ) : (
                    <Scan className="h-4 w-4" />
                  )}
                  {aiLoading
                    ? "OEM araştırılıyor…"
                    : scanImageLoading
                      ? "Etiket okunuyor…"
                      : oemNumber.trim()
                        ? "OEM ile doldur"
                        : previewImages[selectedFormImageIndex]
                          ? "Etiketten doldur"
                          : "Otomatik doldur"}
                </Button>
              </div>
              {aiError && (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-xl bg-red-50 p-3 text-sm text-red-700"
                >
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                  <p className="min-w-0 flex-1 wrap-anywhere">{aiError}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Uyarıyı kapat"
                    onClick={() => setAiError(null)}
                    className="h-11 w-11 shrink-0"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {aiSuccessMessage && (
                <div
                  role="status"
                  className="space-y-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800"
                >
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    <p className="min-w-0 flex-1">{aiSuccessMessage}</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label="Bildirimi kapat"
                      onClick={() => setAiSuccessMessage(null)}
                      className="h-11 w-11 shrink-0"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  {aiSources.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {aiSources.slice(0, 3).map((source, index) => (
                        <a
                          key={index}
                          href={source.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="max-w-full truncate text-xs text-blue-700 underline"
                        >
                          {source.title || "Kaynak"}
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="space-y-2">
                <label
                  htmlFor="product-title"
                  className="font-medium text-slate-700"
                >
                  Parça adı <span className="text-red-600">*</span>
                </label>
                <Input
                  id="product-title"
                  aria-required="true"
                  placeholder="Renault Megane motor beyni"
                  value={title}
                  onChange={(event) => {
                    setTitle(event.target.value);
                    if (!slugManuallyEdited)
                      setSlug(slugify(event.target.value));
                  }}
                  className={fieldClass}
                />
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="min-w-0 space-y-2">
                  <label
                    htmlFor="product-brand"
                    className="font-medium text-slate-700"
                  >
                    Marka <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="product-brand"
                    aria-required="true"
                    value={brand}
                    onChange={(event) => setBrand(event.target.value)}
                    className={
                      fieldClass +
                      " w-full min-w-0 border px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
                    }
                  >
                    <option value="Genel Uyumlu">Genel Uyumlu</option>
                    {brand !== "Genel Uyumlu" &&
                      !brands?.some((item) => item.name === brand) && (
                        <option value={brand}>{brand}</option>
                      )}
                    {brands?.map((item) => (
                      <option key={item._id} value={item.name}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0 space-y-2">
                  <label
                    htmlFor="product-category"
                    className="font-medium text-slate-700"
                  >
                    Kategori <span className="text-red-600">*</span>
                  </label>
                  <select
                    id="product-category"
                    aria-required="true"
                    value={selectedCategoryId}
                    onChange={(event) =>
                      setSelectedCategoryId(event.target.value)
                    }
                    className={
                      fieldClass +
                      " w-full min-w-0 border px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
                    }
                  >
                    <option value="">Kategori seçin</option>
                    {categories?.map((item) => (
                      <option key={item._id} value={item._id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="min-w-0 space-y-2">
                  <label
                    htmlFor="product-model"
                    className="font-medium text-slate-700"
                  >
                    Model / seri
                  </label>
                  <Input
                    id="product-model"
                    placeholder="Megane 2, Clio 3"
                    value={model}
                    onChange={(event) => setModel(event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="min-w-0 space-y-2">
                  <label
                    htmlFor="product-shelf"
                    className="font-medium text-slate-700"
                  >
                    Raf kodu
                  </label>
                  <Input
                    id="product-shelf"
                    placeholder="A12-04"
                    value={shelfCode}
                    onChange={(event) => setShelfCode(event.target.value)}
                    className={fieldClass + " font-mono"}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label
                  htmlFor="product-condition"
                  className="font-medium text-slate-700"
                >
                  Parça durumu
                </label>
                <select
                  id="product-condition"
                  value={condition}
                  onChange={(event) => setCondition(event.target.value)}
                  className={
                    fieldClass +
                    " w-full border px-3 text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
                  }
                >
                  <option value="Orijinal Çıkma">Orijinal Çıkma</option>
                  <option value="Sıfır - Orijinal">Sıfır - Orijinal</option>
                  <option value="Revizyonlu">Revizyonlu</option>
                  <option value="Sıfırlanmış - Virgin">
                    Sıfırlanmış - Virgin
                  </option>
                </select>
              </div>
            </>
            <details className="group rounded-2xl border border-slate-200 bg-white">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
                <FileText className="h-4 w-4 text-slate-500" />
                <span className="flex-1">Açıklama ve etiketler</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="space-y-4 border-t border-slate-100 p-4">
                <div className="space-y-2">
                  <label
                    htmlFor="product-description"
                    className="font-medium text-slate-700"
                  >
                    Açıklama
                  </label>
                  <Textarea
                    id="product-description"
                    rows={4}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    className="min-h-32 rounded-xl border-slate-300 text-base! md:text-sm!"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="product-tags"
                    className="font-medium text-slate-700"
                  >
                    Etiketler
                  </label>
                  <Input
                    id="product-tags"
                    placeholder="Megane 2, ECU"
                    value={tagsInput}
                    onChange={(event) => setTagsInput(event.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            </details>
            <details className="group rounded-2xl border border-slate-200 bg-white">
              <summary className="flex min-h-14 cursor-pointer list-none items-center gap-3 rounded-2xl px-4 font-medium text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 [&::-webkit-details-marker]:hidden">
                <Globe className="h-4 w-4 text-slate-500" />
                <span className="flex-1">Arama motorları</span>
                <ChevronDown className="h-4 w-4 transition-transform group-open:rotate-180 motion-reduce:transition-none" />
              </summary>
              <div className="space-y-4 border-t border-slate-100 p-4">
                <div className="space-y-2">
                  <label
                    htmlFor="product-slug"
                    className="font-medium text-slate-700"
                  >
                    Sayfa adresi
                  </label>
                  <Input
                    id="product-slug"
                    value={slug}
                    onChange={(event) => {
                      setSlug(slugify(event.target.value));
                      setSlugManuallyEdited(true);
                    }}
                    className={fieldClass + " font-mono"}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="product-meta-title"
                    className="font-medium text-slate-700"
                  >
                    Meta başlık
                  </label>
                  <Input
                    id="product-meta-title"
                    value={metaTitle}
                    onChange={(event) => setMetaTitle(event.target.value)}
                    className={fieldClass}
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="product-meta-description"
                    className="font-medium text-slate-700"
                  >
                    Meta açıklama
                  </label>
                  <Textarea
                    id="product-meta-description"
                    rows={3}
                    value={metaDescription}
                    onChange={(event) =>
                      setMetaDescription(event.target.value)
                    }
                    className="min-h-24 rounded-xl border-slate-300 text-base! md:text-sm!"
                  />
                </div>
                <div className="space-y-2">
                  <label
                    htmlFor="product-meta-keywords"
                    className="font-medium text-slate-700"
                  >
                    Anahtar kelimeler
                  </label>
                  <Input
                    id="product-meta-keywords"
                    value={metaKeywords}
                    onChange={(event) => setMetaKeywords(event.target.value)}
                    className={fieldClass}
                  />
                </div>
              </div>
            </details>
          </section>
        </div>
        <div className="shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6 lg:hidden">
          {saveError && (
            <p role="alert" className="mb-3 text-sm text-red-600">
              {saveError}
            </p>
          )}
          <div className="grid grid-cols-2 gap-3 sm:flex sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={saving}
              onClick={onClose}
              className="h-12 w-full text-sm sm:w-auto"
            >
              Vazgeç
            </Button>
            <Button
              type="submit"
              disabled={
                saving || uploadingImage || aiLoading || scanImageLoading
              }
              className="h-12 w-full gap-2 px-6 text-sm sm:w-auto"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Check className="h-4 w-4" />
              )}
              {saving ? "Kaydediliyor…" : "Kaydet"}
            </Button>
          </div>
        </div>
      </fieldset>
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
  const [saving, setSaving] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!saving) onOpenChange(nextOpen);
      }}
    >
      <DialogContent
        aria-describedby={undefined}
        className="fixed left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none [&>button]:right-2 [&>button]:top-2 [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-full [&>button]:opacity-100 md:left-1/2 md:top-1/2 md:h-[90dvh] md:max-h-[900px] md:w-[94vw] md:max-w-6xl md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-2xl md:border md:shadow-2xl"
      >
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
            saving={saving}
            setSaving={setSaving}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

interface ProductImagePanelProps {
  previewImages: string[];
  selectedFormImageIndex: number;
  setPreviewImages: Dispatch<SetStateAction<string[]>>;
  setSelectedFormImageIndex: Dispatch<SetStateAction<number>>;
  title: string;
  uploadingImage: boolean;
  disabled: boolean;
  handleImageUpload: ChangeEventHandler<HTMLInputElement>;
}

function ProductImagePanel({
  previewImages,
  selectedFormImageIndex,
  setPreviewImages,
  setSelectedFormImageIndex,
  title,
  uploadingImage,
  disabled,
  handleImageUpload,
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
      className="-mx-4 -mt-4 min-w-0 space-y-4 px-0.5 pb-1 sm:-mx-6 lg:mx-0 lg:mt-0 lg:min-h-0 lg:flex-1 lg:overflow-y-auto lg:overscroll-contain"
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
                  current.filter((_, index) => index !== selectedFormImageIndex),
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
    </section>
  );
}
