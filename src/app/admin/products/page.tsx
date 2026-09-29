"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { AdminHeaderAction } from "../AdminHeaderContext";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Cpu,
  ImageIcon,
  Camera,
  Upload,
  X,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  SlidersHorizontal,
  Car,
  FolderTree,
  Star,
  Sparkles,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Scan,
  Table,
  LayoutList,
} from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
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
import { slugify } from "../admin-utils";
import { ModernImageZoom } from "@/components/ModernImageZoom";
import type { OemAssistantData } from "@/lib/ai/oem-assistant";

type Product = Doc<"products">;

export default function AdminProductsPage() {
  const [searchProduct, setSearchProduct] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [draftStatus, setDraftStatus] = useState<"all" | "draft" | "published">("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [viewMode, setViewMode] = useState<"table" | "list">("table");
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Arama girdisini 300ms gecikmeli sorguya ilet (Convex query optimizasyonu)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchProduct);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchProduct]);

  // Product Modals & Form State
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [oemNumber, setOemNumber] = useState("");
  const [isDraft, setIsDraft] = useState(true);
  const [shelfCode, setShelfCode] = useState("");
  const [brand, setBrand] = useState("Genel Uyumlu");
  const [model, setModel] = useState("");
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [condition, setCondition] = useState("Orijinal Çıkma");
  const [inStock, setInStock] = useState(true);
  const [description, setDescription] = useState("");
  const [previewImages, setPreviewImages] = useState<string[]>([]);
  const [selectedFormImageIndex, setSelectedFormImageIndex] = useState(0);
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number } | null>(null);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxZoomOrigin, setLightboxZoomOrigin] = useState("center center");
  const openLightbox = (images: string[], index = 0) => {
    setLightbox({ images, index });
    setLightboxZoom(1);
    setLightboxZoomOrigin("center center");
  };
  const closeLightbox = () => {
    setLightbox(null);
    setLightboxZoom(1);
    setLightboxZoomOrigin("center center");
  };
  const resetLightboxZoom = () => {
    setLightboxZoom(1);
    setLightboxZoomOrigin("center center");
  };
  const lightboxPrev = () => {
    resetLightboxZoom();
    setLightbox((lb) => lb ? { ...lb, index: (lb.index - 1 + lb.images.length) % lb.images.length } : null);
  };
  const lightboxNext = () => {
    resetLightboxZoom();
    setLightbox((lb) => lb ? { ...lb, index: (lb.index + 1) % lb.images.length } : null);
  };
  const setLightboxZoomOriginFromPoint = (target: HTMLElement, clientX: number, clientY: number) => {
    const rect = target.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setLightboxZoomOrigin(`${x}% ${y}%`);
  };
  const handleLightboxImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    if (lightboxZoom > 1) {
      resetLightboxZoom();
      return;
    }
    setLightboxZoomOriginFromPoint(e.currentTarget, e.clientX, e.clientY);
    setLightboxZoom(2.25);
  };
  const handleLightboxImageWheel = (e: React.WheelEvent<HTMLImageElement>) => {
    e.preventDefault();
    setLightboxZoomOriginFromPoint(e.currentTarget, e.clientX, e.clientY);
    setLightboxZoom((current) => Math.min(4, Math.max(1, current + (e.deltaY < 0 ? 0.25 : -0.25))));
  };
  const resetFormImageZoom = () => { };
  // Hover preview (floating near cursor)
  const [hoverPreview, setHoverPreview] = useState<{ src: string; x: number; y: number } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // AI OEM Generation State
  const [aiLoading, setAiLoading] = useState(false);
  const [scanImageLoading, setScanImageLoading] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiSuccessMessage, setAiSuccessMessage] = useState<string | null>(null);
  const [aiSources, setAiSources] = useState<Array<{ title: string; url: string }>>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const productFilters = {
    searchTerm: debouncedSearch.trim() || undefined,
    categorySlug: selectedCategoryFilter || undefined,
    brand: selectedBrandFilter || undefined,
    draftStatus,
  };

  const pageData = useQuery(api.products.listAdminWithPage, {
    page: currentPage,
    pageSize,
    ...productFilters,
  });

  const categories = useQuery(api.categories.list, { onlyActive: false });
  const brands = useQuery(api.brands.list, { onlyActive: false });

  const products = pageData?.products;
  const totalCount = pageData?.totalCount ?? 0;
  const totalPages = pageData?.totalPages ?? 1;

  // Mutations
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const deleteProduct = useMutation(api.products.deleteProduct);
  const lookupOemAction = useAction(api.oem.lookupOem);

  const resetProductForm = () => {
    setTitle("");
    setSlug("");
    setSlugManuallyEdited(false);
    setOemNumber("");
    setIsDraft(true);
    setShelfCode("");
    setBrand("Genel Uyumlu");
    setModel("");
    setSelectedCategoryId(categories?.[0]?._id || "");
    setCondition("Orijinal Çıkma");
    setInStock(true);
    setDescription("");
    setPreviewImages([]);
    setSelectedFormImageIndex(0);
    resetFormImageZoom();
    setMetaTitle("");
    setMetaDescription("");
    setMetaKeywords("");
    setTagsInput("");
    setAiLoading(false);
    setScanImageLoading(false);
    setAiError(null);
    setAiSuccessMessage(null);
    setAiSources([]);
    setEditingProduct(null);
  };

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

      // 1. Convex Action ile doğrudan dene (Convex backend standardı)
      try {
        const convexResult = await lookupOemAction({ oemNumber: trimmed });
        if (convexResult.success) {
          data = convexResult;
        } else if (
          convexResult.error?.includes("GEMINI_API_KEY") ||
          convexResult.error?.includes("ortam değişkeni")
        ) {
          data = null; // Convex env değişkeni henüz set edilmemişse Next.js API rotasına düş
        } else {
          throw new Error(convexResult.error);
        }
      } catch {
        data = null;
      }

      // 2. Convex Action sonucu yoksa Next.js API rotasından (.env.local) çek
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

        const json = await res.json() as OemAssistantData & { error?: string };
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

    const data = await res.json() as OemAssistantData & { error?: string };
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
    resetFormImageZoom();
  };

  const handleOpenAddProduct = () => {
    resetProductForm();
    setAddProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setIsDraft(p.isDraft === true);
    setTitle(p.title);
    setSlug(p.slug);
    setSlugManuallyEdited(true);
    setOemNumber(p.oemNumber);
    setShelfCode(p.shelfCode || "");
    setBrand(p.brand);
    setModel(p.model || "");
    setSelectedCategoryId(p.categoryId || categories?.[0]?._id || "");
    setCondition(p.condition);
    setInStock(p.inStock);
    setDescription(p.description);
    setPreviewImages(p.images || []);
    setSelectedFormImageIndex(0);
    resetFormImageZoom();
    setMetaTitle(p.metaTitle || "");
    setMetaDescription(p.metaDescription || "");
    setMetaKeywords(p.metaKeywords || "");
    setTagsInput(p.tags ? p.tags.join(", ") : "");
    setAiLoading(false);
    setAiError(null);
    setAiSuccessMessage(null);
    setAiSources([]);
    setAddProductModalOpen(true);
  };

  // Upload image to the persistent aapanel product media directory.
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

    const images = previewImages;

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
      images,
      metaTitle: metaTitle.trim() || undefined,
      metaDescription: metaDescription.trim() || undefined,
      metaKeywords: metaKeywords.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      isDraft,
    };

    if (editingProduct) {
      await updateProduct({
        id: editingProduct._id,
        ...payload,
      });
    } else {
      await createProduct(payload);
    }

    setAddProductModalOpen(false);
    resetProductForm();
  };

  const handleDeleteProduct = async (p: Product) => {
    if (confirm(`'${p.oemNumber} - ${p.title}' parçası silinsin mi?`)) {
      await deleteProduct({ id: p._id });
    }
  };

  const getPageNumbers = (current: number, total: number) => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    const pages: (number | "...")[] = [];
    if (current <= 4) {
      pages.push(1, 2, 3, 4, 5, "...", total);
    } else if (current >= total - 3) {
      pages.push(1, "...", total - 4, total - 3, total - 2, total - 1, total);
    } else {
      pages.push(1, "...", current - 1, current, current + 1, "...", total);
    }
    return pages;
  };

  const handlePageSelect = (targetPage: number) => {
    const valid = Math.max(1, Math.min(totalPages, targetPage));
    setCurrentPage(valid);
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const renderPaginationBar = (position: "top" | "bottom") => {
    const pageNumbers = getPageNumbers(currentPage, totalPages);

    return (
      <div
        className={`flex flex-wrap items-center justify-between gap-2.5 px-3 py-2 bg-slate-50/90 text-xs ${
          position === "top" ? "border-b border-slate-200" : "border-t border-slate-200"
        }`}
      >
        {/* Sol: Toplam Adet + Renk Kılavuzu */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 border border-blue-200/80">
            {totalCount.toLocaleString("tr-TR")} parça
          </span>

          {position === "top" && (
            <div className="hidden lg:flex items-center gap-2 text-[11px] text-slate-500 pl-1 border-l border-slate-200">
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                Taslak
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                Stokta Yok
              </span>
            </div>
          )}
        </div>

        {/* Sağ: Kompakt Numaralı Sayfalama & Görünüm */}
        <div className="flex items-center gap-1.5">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handlePageSelect(1)}
            disabled={currentPage <= 1}
            title="En baş"
            className="h-7 w-7 rounded-md p-0 text-slate-600 disabled:opacity-30"
          >
            <ChevronsLeft className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handlePageSelect(currentPage - 1)}
            disabled={currentPage <= 1}
            title="Önceki"
            className="h-7 w-7 rounded-md p-0 text-slate-600 disabled:opacity-30"
          >
            <ChevronLeft className="h-3.5 w-3.5" />
          </Button>

          <div className="flex items-center gap-1">
            {pageNumbers.map((p, idx) => {
              if (p === "...") {
                return (
                  <span key={`ellipsis-${idx}`} className="px-1 text-slate-400 font-bold select-none text-xs">
                    ...
                  </span>
                );
              }
              const isActive = p === currentPage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => handlePageSelect(p)}
                  className={`h-7 min-w-[28px] px-1.5 rounded-md text-xs font-bold transition-all cursor-pointer ${
                    isActive
                      ? "bg-blue-600 text-white shadow-2xs"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  {p}
                </button>
              );
            })}
          </div>

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handlePageSelect(currentPage + 1)}
            disabled={currentPage >= totalPages}
            title="Sonraki"
            className="h-7 w-7 rounded-md p-0 text-slate-600 disabled:opacity-30"
          >
            <ChevronRight className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={() => handlePageSelect(totalPages)}
            disabled={currentPage >= totalPages}
            title="En son"
            className="h-7 w-7 rounded-md p-0 text-slate-600 disabled:opacity-30"
          >
            <ChevronsRight className="h-3.5 w-3.5" />
          </Button>

          {/* Sayfa Başına Kayıt */}
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setCurrentPage(1);
            }}
            className="h-7 rounded-md border border-slate-200 bg-white px-1 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500 cursor-pointer ml-1"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={250}>250</option>
          </select>

          {/* Görünüm Geçişi (yalnızca üst barda) */}
          {position === "top" && (
            <div className="flex items-center bg-white border border-slate-200 rounded-md p-0.5 shadow-2xs ml-1">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                className={`p-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === "table" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Tablo"
              >
                <Table className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode("list")}
                className={`p-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                  viewMode === "list" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
                title="Liste"
              >
                <LayoutList className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-2.5 w-full min-w-0">
      <AdminHeaderAction>
        <Button
          onClick={handleOpenAddProduct}
          size="sm"
          className="h-8 md:h-9 justify-center gap-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 px-3 md:px-3.5 transition-colors cursor-pointer"
        >
          <Plus className="h-4 w-4" />
          <span>Yeni parça</span>
        </Button>
      </AdminHeaderAction>

      {/* 1. Satır: Arama ve Filtreler Tek Satır */}
      <div className="bg-white p-2.5 sm:p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
          {/* Arama Input: 5 kolon */}
          <div className="relative min-w-0 sm:col-span-5">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400 pointer-events-none" />
            <Input
              placeholder="OEM, parça adı veya raf kodu ara..."
              value={searchProduct}
              onChange={(e) => {
                setSearchProduct(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 min-w-0 rounded-lg border-slate-200 bg-slate-50/50 pl-9 text-xs text-slate-900 focus:bg-white"
            />
          </div>

          {/* Durum: 2 kolon */}
          <div className="relative min-w-0 sm:col-span-2">
            <SlidersHorizontal className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <select
              value={draftStatus}
              onChange={(e) => {
                setDraftStatus(e.target.value as "all" | "draft" | "published");
                setCurrentPage(1);
              }}
              className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="all">Tüm durumlar</option>
              <option value="draft">Taslak</option>
              <option value="published">Yayında</option>
            </select>
          </div>

          {/* Marka: 3 kolon */}
          <div className="relative min-w-0 sm:col-span-3">
            <Car className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedBrandFilter}
              onChange={(e) => {
                setSelectedBrandFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none truncate"
            >
              <option value="">Tüm markalar</option>
              {brands?.map((b) => (
                <option key={b._id} value={b.name}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Kategori: 2 kolon */}
          <div className="relative min-w-0 sm:col-span-2">
            <FolderTree className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
            <select
              value={selectedCategoryFilter}
              onChange={(e) => {
                setSelectedCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="h-9 w-full min-w-0 rounded-lg border border-slate-200 bg-white pl-7 pr-2 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none truncate"
            >
              <option value="">Tüm kategoriler</option>
              {categories?.map((c) => (
                <option key={c._id} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs w-full min-w-0">
        {/* 3. Satır: Kompakt Sayfalama, Durum Lejantı & Görünüm Seçimi */}
        {renderPaginationBar("top")}

        {/* Tablo Görünümü */}
        <div className={`overflow-x-auto ${viewMode === "table" ? "block" : "hidden"}`}>
          <table className="w-full min-w-[700px] text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5 w-24">Görsel</th>
                <th className="p-3.5 w-48">OEM no</th>
                <th className="p-3.5">Parça başlığı</th>
                <th className="p-3.5 w-32">Raf kodu</th>
                <th className="p-3.5 text-right w-28">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products && products.length > 0 ? (
                products.map((p) => {
                  const isDraft = p.isDraft === true;
                  const isOutOfStock = !p.inStock;

                  const rowClass = isDraft
                    ? "bg-red-50/70 hover:bg-red-100/70 border-l-4 border-l-red-500"
                    : isOutOfStock
                    ? "bg-amber-50/70 hover:bg-amber-100/70 border-l-4 border-l-amber-500"
                    : "bg-white hover:bg-slate-50/70 border-l-4 border-l-transparent";

                  return (
                    <tr key={p._id} className={`${rowClass} transition-colors`}>
                      <td className="p-3">
                        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-2xs">
                          {p.images?.[0] ? (
                            <button
                              type="button"
                              onClick={() => openLightbox(p.images!, 0)}
                              onMouseEnter={(e) => setHoverPreview({ src: p.images![0], x: e.clientX, y: e.clientY })}
                              onMouseMove={(e) => setHoverPreview((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                              onMouseLeave={() => setHoverPreview(null)}
                              className="w-full h-full cursor-zoom-in flex items-center justify-center"
                              title="Görseli büyüt"
                            >
                              <Image
                                src={p.images[0]}
                                alt={p.title}
                                width={80}
                                height={80}
                                unoptimized
                                className="w-full h-full object-contain"
                              />
                            </button>
                          ) : (
                            <Cpu className="w-6 h-6 text-slate-300" />
                          )}
                          {p.images && p.images.length > 1 && (
                            <span className="absolute bottom-1 right-1 rounded bg-slate-900/75 px-1 py-0.5 text-[9px] font-bold text-white leading-none">
                              +{p.images.length - 1}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-3 font-mono font-bold text-slate-900 text-sm">
                        {p.oemNumber || "—"}
                      </td>
                      <td className="p-3 max-w-md">
                        <div className="font-semibold text-slate-900 text-sm line-clamp-1">{p.title || "Taslak parça"}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                          {[p.brand, p.model].filter(Boolean).join(" · ") || ""}
                        </div>
                      </td>
                      <td className="p-3">
                        {p.shelfCode ? (
                          <span className="inline-flex items-center rounded-md bg-white border border-slate-200 px-2 py-1 font-mono text-[11px] font-bold text-slate-800 shadow-2xs">
                            {p.shelfCode}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {p.isDraft !== true && (
                            <Link
                              href={`/parcalar/${p.slug}`}
                              target="_blank"
                              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200/60 transition-colors"
                              title="Görüntüle"
                            >
                              <Eye className="w-4 h-4" />
                            </Link>
                          )}
                          <button
                            onClick={() => handleOpenEditProduct(p)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title="Düzenle"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(p)}
                            className="p-1.5 text-slate-400 hover:text-red-600 rounded-lg hover:bg-slate-200/60 transition-colors cursor-pointer"
                            title="Sil"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : pageData === undefined ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                    Yükleniyor...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                    Kayıtlı parça bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Liste / Kart Görünümü */}
        <div className={`p-3 sm:p-4 bg-slate-50/50 ${viewMode === "list" ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-3.5" : "hidden"}`}>
          {products && products.length > 0 ? (
            products.map((p) => {
              const isDraft = p.isDraft === true;
              const isOutOfStock = !p.inStock;

              const cardBorderClass = isDraft
                ? "border-red-300 bg-red-50/40 ring-1 ring-red-400/40 hover:border-red-400"
                : isOutOfStock
                ? "border-amber-300 bg-amber-50/40 ring-1 ring-amber-400/40 hover:border-amber-400"
                : "border-slate-200 bg-white hover:border-blue-300";

              return (
                <article
                  key={p._id}
                  onClick={() => handleOpenEditProduct(p)}
                  className={`group relative flex flex-col justify-between rounded-xl border p-3 sm:p-3.5 shadow-2xs hover:shadow-xs transition-all duration-150 cursor-pointer ${cardBorderClass}`}
                >
                  {/* Kart İçeriği */}
                  <div className="flex items-start gap-3">
                    <div className="relative h-18 w-18 sm:h-20 sm:w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-white p-1 flex items-center justify-center">
                      {p.images?.[0] ? (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openLightbox(p.images!, 0);
                          }}
                          aria-label={`${p.title || "Parça"} görselini büyüt`}
                          className="h-full w-full cursor-zoom-in flex items-center justify-center"
                        >
                          <Image
                            src={p.images[0]}
                            alt={p.title || "Parça"}
                            width={80}
                            height={80}
                            unoptimized
                            className="h-full w-full object-contain"
                          />
                        </button>
                      ) : (
                        <Cpu className="h-6 w-6 text-slate-300" />
                      )}
                      {p.images && p.images.length > 1 && (
                        <span className="absolute bottom-1 right-1 rounded bg-slate-900/75 px-1 py-0.5 text-[9px] font-bold text-white leading-none">
                          +{p.images.length - 1}
                        </span>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex flex-wrap items-center gap-1.5 min-w-0">
                          {p.oemNumber ? (
                            <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                              {p.oemNumber}
                            </span>
                          ) : (
                            <span className="font-mono text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                              OEM Yok
                            </span>
                          )}

                          {p.shelfCode && (
                            <span className="font-mono text-[10px] font-medium text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                              Raf: {p.shelfCode}
                            </span>
                          )}
                        </div>

                        {p.isDraft !== true && (
                          <Link
                            href={`/parcalar/${p.slug}`}
                            target="_blank"
                            onClick={(e) => e.stopPropagation()}
                            aria-label={`${p.title || "Parça"} sayfasını sitede görüntüle`}
                            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:text-slate-900 transition-all"
                            title="Sitede Görüntüle"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        )}
                      </div>

                      <h3 className="line-clamp-2 text-xs sm:text-sm font-semibold text-slate-900 leading-snug break-words pt-0.5">
                        {p.title || "İsimsiz parça"}
                      </h3>
                    </div>
                  </div>

                  {/* Alt Çubuk */}
                  <div className="mt-2.5 flex items-center justify-between border-t border-slate-100 pt-2 text-xs">
                    <div className="text-[11px] text-slate-500">
                      {[p.brand, p.model].filter(Boolean).join(" · ") || ""}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteProduct(p);
                        }}
                        aria-label={p.title ? `${p.title} parçasını sil` : "Parçayı sil"}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 shadow-2xs hover:border-red-400 hover:bg-red-50 hover:text-red-600 transition-all cursor-pointer"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })
          ) : pageData === undefined ? (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              Yükleniyor...
            </div>
          ) : (
            <div className="col-span-full rounded-xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
              Kayıtlı parça bulunamadı.
            </div>
          )}
        </div>

        {/* Alt Sayfalama Çubuğu */}
        {renderPaginationBar("bottom")}
      </div>

      {/* Add / Edit Product Modal */}
      <Dialog
        open={addProductModalOpen}
        onOpenChange={setAddProductModalOpen}
      >
        <DialogContent className="fixed left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none [&>button]:right-2 [&>button]:top-2 [&>button]:h-11 [&>button]:w-11 [&>button]:opacity-100 md:left-1/2 md:top-1/2 md:h-[90dvh] md:max-h-[900px] md:w-[94vw] md:max-w-6xl md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-xl md:border md:shadow-2xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 pr-14 text-left sm:px-6">
            <DialogTitle className="text-base sm:text-lg">{editingProduct ? "Parçayı düzenle" : "Yeni parça"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="flex min-h-0 flex-1 flex-col text-xs">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
              <div className="grid min-w-0 grid-cols-1 gap-6 pb-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
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
                        className={`group relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 bg-white p-1 transition-colors ${i === selectedFormImageIndex ? "border-blue-600" : "border-slate-200 hover:border-slate-400"
                          }`}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedFormImageIndex(i);
                            resetFormImageZoom();
                          }}
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

                        {/* Kapak Görseli Rozeti */}
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
                            setSelectedFormImageIndex((current) => Math.max(0, Math.min(current, previewImages.length - 2)));
                            resetFormImageZoom();
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

                  {/* Kapak Yap Butonu (Yalnızca 1. sıradan farklı bir görsel seçildiğinde görünür) */}
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

                <section className="min-w-0 space-y-5">
                  <section aria-labelledby="required-product-fields" className="min-w-0 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 id="required-product-fields" className="text-sm font-bold text-slate-900">Parça bilgileri</h3>
                    </div>

                    {/* Stok ve Taslak Durumu Switchleri */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50/80 rounded-xl border border-slate-200/90">
                      {/* Stok Durumu */}
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
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${inStock ? "bg-emerald-600" : "bg-slate-300"
                            }`}
                          title={inStock ? "Stokta (Tıklayarak Tükendi yap)" : "Tükendi (Tıklayarak Stokta yap)"}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${inStock ? "translate-x-5" : "translate-x-0"
                              }`}
                          />
                        </button>
                      </div>

                      {/* Taslak Durumu Switch */}
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
                          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isDraft ? "bg-amber-500" : "bg-emerald-600"
                            }`}
                          title={isDraft ? "Taslak (Tıklayarak Yayına al)" : "Yayında (Tıklayarak Taslağa al)"}
                        >
                          <span
                            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${isDraft ? "translate-x-5" : "translate-x-0"
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

                      {/* AI Error Feedback */}
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

                      {/* AI Success Feedback & Sources */}
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
                          {brands?.map((b) => <option key={b._id} value={b.name}>{b.name}</option>)}
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
                          {categories?.map((c) => <option key={c._id} value={c._id}>{c.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </section>

                  {/* Optional product details */}
                  <section aria-labelledby="optional-product-fields" className="min-w-0 space-y-4 border-t border-slate-200 pt-4">
                    <h3 id="optional-product-fields" className="text-sm font-bold text-slate-900">Diğer bilgiler</h3>
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
                        <h4 id="seo-product-fields" className="text-sm font-bold text-slate-900">SEO alanları</h4>
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
                onClick={() => setAddProductModalOpen(false)}
                className="h-11 w-full text-xs sm:w-auto"
              >
                Vazgeç
              </Button>
              <Button
                type="submit"
                className="h-11 w-full bg-blue-600 px-5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 sm:w-auto"
              >
                {editingProduct ? "Kaydet" : "Parçayı kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Floating Hover Preview ── */}
      {hoverPreview && (
        <div
          style={{
            position: "fixed",
            left: hoverPreview.x + 24,
            top: hoverPreview.y - 180,
            zIndex: 9998,
            pointerEvents: "none",
          }}
          className="relative w-80 h-80 rounded-2xl border-2 border-white/20 bg-slate-900 shadow-2xl overflow-hidden flex items-center justify-center p-3 ring-1 ring-black/30"
        >
          <Image
            src={hoverPreview.src}
            alt="Önizleme"
            width={320}
            height={320}
            unoptimized
            className="max-w-full max-h-full object-contain"
            draggable={false}
          />
        </div>
      )}

      {/* ── Lightbox Gallery Modal ── */}

      {lightbox && (
        <div
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black/90 backdrop-blur-sm"
          onClick={closeLightbox}
          onKeyDown={(e) => {
            if (e.key === "Escape") closeLightbox();
            if (e.key === "ArrowLeft") lightboxPrev();
            if (e.key === "ArrowRight") lightboxNext();
          }}
          role="dialog"
          aria-modal="true"
          tabIndex={-1}
        >
          {/* Close */}
          <button
            type="button"
            onClick={closeLightbox}
            className="absolute top-4 right-4 z-10 p-2 rounded-full bg-white/10 hover:bg-white/25 text-white transition-colors cursor-pointer"
            aria-label="Kapat"
          >
            <X className="w-6 h-6" />
          </button>

          {/* Main image */}
          <div
            className="w-[min(94vw,1180px)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="min-w-0 flex-1">
              <div
                className="relative flex h-[min(58vh,620px)] w-full items-center justify-center overflow-hidden rounded-2xl bg-black/35 shadow-2xl lg:h-[min(74vh,720px)]"
              >
                <Image
                  key={lightbox.index}
                  src={lightbox.images[lightbox.index]}
                  alt={`Görsel ${lightbox.index + 1}`}
                  fill
                  sizes="94vw"
                  unoptimized
                  onClick={handleLightboxImageClick}
                  onWheel={handleLightboxImageWheel}
                  style={{
                    transform: `scale(${lightboxZoom})`,
                    transformOrigin: lightboxZoomOrigin,
                  }}
                  className={`max-h-full max-w-full object-contain select-none transition-transform duration-200 ${lightboxZoom > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
                    }`}
                  draggable={false}
                />

                {/* Prev / Next arrows */}
                {lightbox.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); lightboxPrev(); }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
                      aria-label="Önceki"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); lightboxNext(); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/50 hover:bg-black/70 text-white transition-colors cursor-pointer"
                      aria-label="Sonraki"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnail strip */}
              {lightbox.images.length > 1 && (
                <div
                  className="flex items-center gap-2 mt-4 px-4 flex-wrap justify-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  {lightbox.images.map((img, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={(e) => { e.stopPropagation(); resetLightboxZoom(); setLightbox((lb) => lb ? { ...lb, index: i } : null); }}
                      className={`relative w-14 h-14 rounded-lg border-2 overflow-hidden bg-white/10 flex-shrink-0 transition-all cursor-pointer ${i === lightbox.index
                        ? "border-white scale-110 shadow-lg"
                        : "border-white/30 opacity-60 hover:opacity-100"
                        }`}
                    >
                      <Image
                        src={img}
                        alt={`Küçük resim ${i + 1}`}
                        fill
                        sizes="56px"
                        unoptimized
                        className="object-contain"
                        draggable={false}
                      />
                      {i === 0 && (
                        <span className="absolute bottom-0.5 left-0.5 px-1 py-0.5 rounded text-[7px] font-black bg-amber-500 text-white shadow-xs leading-none">
                          KAPAK
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Counter */}
              <p className="mt-3 text-white/50 text-xs font-medium">
                {lightbox.index + 1} / {lightbox.images.length} · Görsele tıkla: {lightboxZoom > 1 ? "uzaklaş" : "yakınlaş"}
              </p>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
