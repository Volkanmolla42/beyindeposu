"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Cpu,
  ImageIcon,
  Upload,
  X,
  Loader2,
  Eye,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Star,
} from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
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

type FolderProductGroup = {
  key: string;
  shelfCode?: string;
  files: File[];
  uploadedUrls: string[];
};

type FolderUploadProgress = {
  stage: "uploading" | "done" | "error";
  totalProducts: number;
  completedProducts: number;
  totalImages: number;
  uploadedImages: number;
  skippedProducts: number;
  error?: string;
};

function groupFolderImages(files: File[]): FolderProductGroup[] {
  const byDirectory = new Map<string, { file: File; stem: string }[]>();

  for (const file of files) {
    if (!/\.(jpe?g|png|webp|avif)$/i.test(file.name)) continue;

    const pathParts = (file.webkitRelativePath || file.name).split(/[\\/]/).filter(Boolean);
    const fileName = pathParts[pathParts.length - 1] || file.name;
    const directoryParts = pathParts.length > 1 ? pathParts.slice(1, -1) : [];
    const directory = directoryParts.join("/");
    let stem = fileName;
    while (/\.(jpe?g|png|webp|avif)$/i.test(stem)) {
      stem = stem.replace(/\.(jpe?g|png|webp|avif)$/i, "");
    }
    stem = stem.replace(/_resized$/i, "");
    const siblings = byDirectory.get(directory) || [];
    siblings.push({ file, stem });
    byDirectory.set(directory, siblings);
  }

  const groups = new Map<string, FolderProductGroup>();
  const collator = new Intl.Collator("tr", { numeric: true, sensitivity: "base" });

  for (const [directory, siblings] of byDirectory) {
    const directoryParts = directory.split("/").filter(Boolean);
    const folderName = directoryParts[directoryParts.length - 1] || "";
    const isCodeFolder = /^(?=.*\d)[a-z0-9]+(?:[._-][a-z0-9]+)+$/i.test(folderName);
    const isProductFolder = isCodeFolder && siblings.every(
      ({ stem }) => stem.replace(/[._ -]\d+$/, "") === folderName
    );
    const variantCounts = new Map<string, number>();
    for (const { stem } of siblings) {
      const base = stem.replace(/[._ -]\d+$/, "");
      if (base !== stem) variantCounts.set(base, (variantCounts.get(base) || 0) + 1);
    }

    for (const { file, stem } of siblings) {
      const base = stem.replace(/[._ -]\d+$/, "");
      const productCode = isProductFolder
        ? folderName
        : base !== stem && (variantCounts.get(base) || 0) > 1
          ? base
          : stem;
      const key = directory ? `${directory}/${productCode}` : productCode;
      const group = groups.get(key) || {
        key,
        shelfCode: /\d/.test(productCode) ? productCode : undefined,
        files: [],
        uploadedUrls: [],
      };
      group.files.push(file);
      groups.set(key, group);
    }
  }

  for (const group of groups.values()) {
    group.files.sort((a, b) => collator.compare(a.name, b.name));
  }

  return Array.from(groups.values()).sort((a, b) => collator.compare(a.key, b.key));
}

export default function AdminProductsPage() {
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [draftStatus, setDraftStatus] = useState<"all" | "draft" | "published">("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchProduct, selectedBrandFilter, selectedCategoryFilter, draftStatus, pageSize]);

  // Product Modals & Form State
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
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
  const [formImageZoom, setFormImageZoom] = useState(1);
  const [formImageZoomOrigin, setFormImageZoomOrigin] = useState("center center");
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
  const resetFormImageZoom = () => {
    setFormImageZoom(1);
    setFormImageZoomOrigin("center center");
  };
  const setFormImageZoomOriginFromPoint = (target: HTMLElement, clientX: number, clientY: number) => {
    const rect = target.getBoundingClientRect();
    const x = Math.min(100, Math.max(0, ((clientX - rect.left) / rect.width) * 100));
    const y = Math.min(100, Math.max(0, ((clientY - rect.top) / rect.height) * 100));
    setFormImageZoomOrigin(`${x}% ${y}%`);
  };
  const handleFormImageClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (formImageZoom > 1) {
      resetFormImageZoom();
      return;
    }
    setFormImageZoomOriginFromPoint(e.currentTarget, e.clientX, e.clientY);
    setFormImageZoom(2.25);
  };
  const handleFormImageWheel = (e: React.WheelEvent<HTMLButtonElement>) => {
    e.preventDefault();
    setFormImageZoomOriginFromPoint(e.currentTarget, e.clientX, e.clientY);
    setFormImageZoom((current) => Math.min(4, Math.max(1, current + (e.deltaY < 0 ? 0.25 : -0.25))));
  };
  // Hover preview (floating near cursor)
  const [hoverPreview, setHoverPreview] = useState<{ src: string; x: number; y: number } | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [metaTitle, setMetaTitle] = useState("");
  const [metaDescription, setMetaDescription] = useState("");
  const [metaKeywords, setMetaKeywords] = useState("");
  const [tagsInput, setTagsInput] = useState("");

  // AI Auto-Fill State
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiHint, setAiHint] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [folderUploading, setFolderUploading] = useState(false);
  const [folderUploadProgress, setFolderUploadProgress] = useState<FolderUploadProgress | null>(null);

  // Paginated Query
  const pageData = useQuery(api.products.getProductsPage, {
    page: currentPage,
    pageSize: pageSize,
    searchTerm: searchProduct || undefined,
    categorySlug: selectedCategoryFilter || undefined,
    brand: selectedBrandFilter || undefined,
    draftStatus,
  });

  const categories = useQuery(api.categories.list, { onlyActive: false });
  const brands = useQuery(api.brands.list);

  const products = pageData?.items;
  const totalItems = pageData?.totalItems ?? 0;
  const totalPages = pageData?.totalPages ?? 1;

  // Mutations & Actions
  const generateProductDetailsAction = useAction(api.ai.generateProductDetails);
  const createProduct = useMutation(api.products.create);
  const createDraftBatch = useMutation(api.products.createDraftBatch);
  const updateProduct = useMutation(api.products.update);
  const toggleStock = useMutation(api.products.toggleStock);
  const deleteProduct = useMutation(api.products.deleteProduct);

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
    setEditingProduct(null);
    setAiHint("");
    setAiError("");
    setAiSuccess("");
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

  const handleOpenEditProduct = (p: any) => {
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
    setAiHint("");
    setAiError("");
    setAiSuccess("");
    setAddProductModalOpen(true);
  };

  // AI Auto Fill Handler
  const handleAiAutoFill = async () => {
    if (!oemNumber.trim()) {
      setAiError("Lütfen önce OEM numarasını girin.");
      return;
    }

    setAiGenerating(true);
    setAiError("");
    setAiSuccess("");

    try {
      const hintText = [
        aiHint.trim(),
        brand !== "Genel Uyumlu" ? `Marka: ${brand}` : "",
      ]
        .filter(Boolean)
        .join(" - ");

      const result = await generateProductDetailsAction({
        oemNumber: oemNumber.trim(),
        additionalHint: hintText || undefined,
      });

      if (result) {
        if (result.title) {
          setTitle(result.title);
          if (!slugManuallyEdited) {
            setSlug(slugify(result.title));
          }
        }
        if (result.brand) setBrand(result.brand);
        if (result.model) setModel(result.model);
        if (result.description) setDescription(result.description);
        if (result.metaTitle) setMetaTitle(result.metaTitle);
        if (result.metaDescription) setMetaDescription(result.metaDescription);
        if (result.metaKeywords) setMetaKeywords(result.metaKeywords);
        if (result.tags && result.tags.length > 0) {
          setTagsInput(result.tags.join(", "));
        }

        if (result.categoryId) {
          setSelectedCategoryId(result.categoryId);
        } else if (result.categorySlug && categories) {
          const matched = categories.find((c) => c.slug === result.categorySlug);
          if (matched) {
            setSelectedCategoryId(matched._id);
          }
        }

        setAiSuccess("Ürün bilgileri dolduruldu. Kaydetmeden önce kontrol edin.");
        setTimeout(() => setAiSuccess(""), 4000);
      }
    } catch (err: any) {
      setAiError(err?.message || "Detaylar üretilirken hata oluştu.");
    } finally {
      setAiGenerating(false);
    }
  };

  // Upload image to the persistent aapanel product media directory.
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploadingImage(true);
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const formData = new FormData();
        formData.append("file", file);
        formData.append("label", oemNumber.trim() || slugify(title) || "product");
        const result = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        const payload = await result.json();
        if (!result.ok || !payload.url) {
          throw new Error(payload.message || "Görsel yüklenemedi.");
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

  const handleFolderUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || []);
    event.target.value = "";
    const groups = groupFolderImages(selectedFiles);
    const totalImages = groups.reduce((total, group) => total + group.files.length, 0);

    if (groups.length === 0) {
      alert("Seçilen klasörde desteklenen görsel bulunamadı.");
      return;
    }

    if (!window.confirm(`${groups.length.toLocaleString("tr-TR")} ürün ve ${totalImages.toLocaleString("tr-TR")} görsel taslak olarak yüklenecek. Devam edilsin mi?`)) {
      return;
    }

    const initialProgress: FolderUploadProgress = {
      stage: "uploading",
      totalProducts: groups.length,
      completedProducts: 0,
      totalImages,
      uploadedImages: 0,
      skippedProducts: 0,
    };
    let uploadedImages = 0;
    let completedProducts = 0;
    let skippedProducts = 0;
    setFolderUploadProgress(initialProgress);
    setFolderUploading(true);

    try {
      for (let start = 0; start < groups.length; start += 25) {
        const productBatch = groups.slice(start, start + 25);
        const entries = productBatch.flatMap((group) => group.files.map((file) => ({ group, file })));
        const uploadChunks: typeof entries[] = [];
        let currentChunk: typeof entries = [];
        let currentChunkBytes = 0;

        for (const entry of entries) {
          if (currentChunk.length > 0 && (currentChunk.length >= 20 || currentChunkBytes + entry.file.size > 16 * 1024 * 1024)) {
            uploadChunks.push(currentChunk);
            currentChunk = [];
            currentChunkBytes = 0;
          }
          currentChunk.push(entry);
          currentChunkBytes += entry.file.size;
        }
        if (currentChunk.length > 0) uploadChunks.push(currentChunk);

        for (const chunk of uploadChunks) {
          const formData = new FormData();
          for (const { file } of chunk) formData.append("files", file, file.name);

          const response = await fetch("/api/upload", { method: "POST", body: formData });
          const result = await response.json();
          if (!response.ok || !Array.isArray(result.urls) || result.urls.length !== chunk.length) {
            throw new Error(result.message || "Görseller yüklenemedi.");
          }

          chunk.forEach(({ group }, index) => group.uploadedUrls.push(result.urls[index]));
          uploadedImages += chunk.length;
          setFolderUploadProgress({
            stage: "uploading",
            totalProducts: groups.length,
            completedProducts,
            totalImages,
            uploadedImages,
            skippedProducts,
          });
        }

        const result = await createDraftBatch({
          products: productBatch.map((group) => ({
            shelfCode: group.shelfCode,
            images: group.uploadedUrls,
          })),
        });
        completedProducts += productBatch.length;
        skippedProducts += result.skipped;
        setFolderUploadProgress({
          stage: "uploading",
          totalProducts: groups.length,
          completedProducts,
          totalImages,
          uploadedImages,
          skippedProducts,
        });
      }

      setFolderUploadProgress({
        stage: "done",
        totalProducts: groups.length,
        completedProducts,
        totalImages,
        uploadedImages,
        skippedProducts,
      });
    } catch (error) {
      setFolderUploadProgress({
        ...initialProgress,
        stage: "error",
        completedProducts,
        uploadedImages,
        skippedProducts,
        error: error instanceof Error ? error.message : "Klasör yüklenemedi.",
      });
    } finally {
      setFolderUploading(false);
    }
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !oemNumber || !brand) {
      alert("Lütfen zorunlu alanları (Başlık, OEM No, Marka) doldurunuz.");
      return;
    }

    let targetCatId = selectedCategoryId;
    if (!targetCatId && categories && categories.length > 0) {
      targetCatId = categories[0]._id;
    }

    if (!targetCatId) {
      alert("Lütfen en az bir kategori seçiniz.");
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

    const payload: any = {
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

  const handleDeleteProduct = async (p: any) => {
    if (confirm(`'${p.oemNumber} - ${p.title}' ürününü silmek istediğinize emin misiniz?`)) {
      await deleteProduct({ id: p._id });
    }
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 100, behavior: "smooth" });
    }
  };

  // Helper for generating numeric page numbers with ellipses
  const pageNumbers = useMemo(() => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      let start = Math.max(2, currentPage - 1);
      let end = Math.min(totalPages - 1, currentPage + 1);

      if (currentPage <= 3) {
        start = 2;
        end = 4;
      } else if (currentPage >= totalPages - 2) {
        start = totalPages - 3;
        end = totalPages - 1;
      }

      if (start > 2) pages.push("...");
      for (let i = start; i <= end; i++) pages.push(i);
      if (end < totalPages - 1) pages.push("...");
      pages.push(totalPages);
    }
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="space-y-4">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Ürün Kataloğu Yönetimi</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
              {totalItems.toLocaleString("tr-TR")} Ürün
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Depo stok durumlarını, OEM kodlarını ve parça detaylarını yönetin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            ref={(element) => {
              folderInputRef.current = element;
              element?.setAttribute("webkitdirectory", "");
            }}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFolderUpload}
            className="hidden"
          />
          <Button
            type="button"
            onClick={() => folderInputRef.current?.click()}
            disabled={folderUploading}
            variant="outline"
            className="h-9 rounded-lg text-xs font-semibold"
          >
            {folderUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            <span>{folderUploading ? "Yükleniyor" : "Klasör Yükle"}</span>
          </Button>
          <Button
            onClick={handleOpenAddProduct}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 rounded-lg gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ürün Ekle</span>
          </Button>
        </div>
      </div>

      {folderUploadProgress && (
        <div className={`rounded-lg border px-3 py-2 text-xs ${folderUploadProgress.stage === "error" ? "border-red-200 bg-red-50 text-red-700" : "border-slate-200 bg-white text-slate-700"}`} aria-live="polite">
          {folderUploadProgress.stage === "error" ? (
            <span>Yükleme durdu: {folderUploadProgress.error} ({folderUploadProgress.completedProducts}/{folderUploadProgress.totalProducts} ürün)</span>
          ) : folderUploadProgress.stage === "done" ? (
            <span>{(folderUploadProgress.totalProducts - folderUploadProgress.skippedProducts).toLocaleString("tr-TR")} taslak eklendi{folderUploadProgress.skippedProducts > 0 ? ` · ${folderUploadProgress.skippedProducts.toLocaleString("tr-TR")} ürün atlandı` : ""}</span>
          ) : (
            <span>{folderUploadProgress.completedProducts.toLocaleString("tr-TR")}/{folderUploadProgress.totalProducts.toLocaleString("tr-TR")} ürün · {folderUploadProgress.uploadedImages.toLocaleString("tr-TR")}/{folderUploadProgress.totalImages.toLocaleString("tr-TR")} görsel</span>
          )}
        </div>
      )}

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
        <div className="relative sm:col-span-2">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <Input
            placeholder="OEM No, parça adı veya raf kodu ara..."
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            className="pl-9 bg-white border-slate-200 text-slate-900 text-xs h-9 rounded-lg"
          />
        </div>

        <select
          value={draftStatus}
          onChange={(e) => setDraftStatus(e.target.value as "all" | "draft" | "published")}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-medium text-slate-700 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="all">Tüm durumlar</option>
          <option value="draft">Taslak</option>
          <option value="published">Yayında</option>
        </select>

        <select
          value={selectedBrandFilter}
          onChange={(e) => setSelectedBrandFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-medium text-slate-700 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="">Tüm Markalar</option>
          {brands?.map((b) => (
            <option key={b._id} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>

        <select
          value={selectedCategoryFilter}
          onChange={(e) => setSelectedCategoryFilter(e.target.value)}
          className="h-9 rounded-lg border border-slate-200 bg-white px-3 font-medium text-slate-700 text-xs focus:outline-none focus:border-blue-500"
        >
          <option value="">Tüm Kategoriler</option>
          {categories?.map((c) => (
            <option key={c._id} value={c.slug}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Products Table Card */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-semibold uppercase text-[11px] tracking-wider border-b border-slate-200">
              <tr>
                <th className="p-3.5">Görsel</th>
                <th className="p-3.5">OEM No</th>
                <th className="p-3.5">Parça Başlığı</th>
                <th className="p-3.5">Durum</th>
                <th className="p-3.5">Stok</th>
                <th className="p-3.5 text-right">İşlem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products && products.length > 0 ? (
                products.map((p) => (
                  <tr key={p._id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="p-3.5">
                      <div className="w-10 h-10 rounded-md bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center p-1">
                        {p.images?.[0] ? (
                          <button
                            type="button"
                            onClick={() => openLightbox(p.images!, 0)}
                            onMouseEnter={(e) => setHoverPreview({ src: p.images![0], x: e.clientX, y: e.clientY })}
                            onMouseMove={(e) => setHoverPreview((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                            onMouseLeave={() => setHoverPreview(null)}
                            className="w-full h-full cursor-zoom-in"
                            title="Görseli büyüt"
                          >
                            <img src={p.images[0]} alt={p.title} className="w-full h-full object-contain" />
                          </button>
                        ) : (
                          <Cpu className="w-4 h-4 text-slate-400" />
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 font-mono font-bold text-slate-900">
                      {p.oemNumber || "—"}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{p.title || "Taslak ürün"}</div>
                      <div className="text-[11px] text-slate-500 truncate">
                        {[p.brand, p.model, p.shelfCode].filter(Boolean).join(" · ") || ""}
                      </div>
                    </td>
                    <td className="p-3.5">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${p.isDraft === true ? "bg-amber-50 text-amber-700" : "bg-emerald-50 text-emerald-700"}`}>
                        {p.isDraft === true ? "Taslak" : "Yayında"}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => toggleStock({ id: p._id, inStock: !p.inStock })}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${p.inStock
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                          : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                          }`}
                      >
                        {p.inStock ? "Stokta" : "Tükendi"}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        {p.isDraft !== true && (
                          <Link
                            href={`/urunler/${p.slug}`}
                            target="_blank"
                            className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                            title="Görüntüle"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        )}
                        <button
                          onClick={() => handleOpenEditProduct(p)}
                          className="p-1.5 text-slate-500 hover:text-blue-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Düzenle"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteProduct(p)}
                          className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-100 transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : pageData === undefined ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    Yükleniyor...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 text-xs">
                    Kayıtlı ürün bulunamadı.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Admin Pagination Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
          <div className="text-slate-500 font-medium">
            Toplam <span className="font-bold text-slate-900">{totalItems.toLocaleString("tr-TR")}</span> kayıttan{" "}
            <span className="font-bold text-blue-600">
              {totalItems > 0 ? (currentPage - 1) * pageSize + 1 : 0}-{Math.min(currentPage * pageSize, totalItems)}
            </span>{" "}
            arası gösteriliyor (Sayfa {currentPage} / {totalPages})
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 text-[11px]">Sayfa Başına:</span>
              <select
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value))}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-slate-700 font-semibold focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs cursor-pointer"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
                <option value={250}>250</option>
              </select>
            </div>

            {totalPages > 1 && (
              <div className="flex items-center gap-1">
                {/* First Page */}
                <button
                  onClick={() => handlePageChange(1)}
                  disabled={currentPage === 1}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="İlk Sayfa"
                >
                  <ChevronsLeft className="w-3.5 h-3.5" />
                </button>

                {/* Previous Page */}
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  <span>Önceki</span>
                </button>

                {/* Page Numbers */}
                {pageNumbers.map((p, idx) =>
                  typeof p === "number" ? (
                    <button
                      key={idx}
                      onClick={() => handlePageChange(p)}
                      className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === p
                        ? "bg-blue-600 text-white shadow-xs font-black"
                        : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                        }`}
                    >
                      {p}
                    </button>
                  ) : (
                    <span key={idx} className="px-1 text-xs text-slate-400 font-bold">
                      ...
                    </span>
                  )
                )}

                {/* Next Page */}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
                >
                  <span>Sonraki</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>

                {/* Last Page */}
                <button
                  onClick={() => handlePageChange(totalPages)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                  title="Son Sayfa"
                >
                  <ChevronsRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Dialog open={addProductModalOpen} onOpenChange={setAddProductModalOpen}>
        <DialogContent className="fixed left-0 top-0 z-50 flex h-[100dvh] max-h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 overflow-hidden rounded-none border-0 bg-white p-0 shadow-none [&>button]:right-2 [&>button]:top-2 [&>button]:h-11 [&>button]:w-11 [&>button]:opacity-100 md:left-1/2 md:top-1/2 md:h-[90dvh] md:max-h-[900px] md:w-[94vw] md:max-w-6xl md:translate-x-[-50%] md:translate-y-[-50%] md:rounded-xl md:border md:shadow-2xl">
          <DialogHeader className="shrink-0 border-b border-slate-200 px-4 py-4 pr-14 text-left sm:px-6">
            <DialogTitle className="text-base sm:text-lg">{editingProduct ? "Ürünü Düzenle" : "Yeni Ürün"}</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="flex min-h-0 flex-1 flex-col text-xs">
            <div className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-4 py-4 sm:px-6">
              <div className="grid min-w-0 grid-cols-1 gap-6 pb-4 lg:grid-cols-[minmax(280px,0.8fr)_minmax(0,1.2fr)]">
                <section className="min-w-0 lg:sticky lg:top-0 lg:self-start">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Görseller</h3>
                    <span className="text-xs text-slate-500">{previewImages.length} görsel</span>
                  </div>

                  <div className="relative flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50 p-3 lg:aspect-square lg:p-4">
                    {previewImages[selectedFormImageIndex] ? (
                      <>
                        <button
                          type="button"
                          onClick={handleFormImageClick}
                          onWheel={handleFormImageWheel}
                          className={`h-full w-full overflow-hidden ${formImageZoom > 1 ? "cursor-zoom-out" : "cursor-zoom-in"}`}
                          title={formImageZoom > 1 ? "Normal boyuta dönmek için tıkla" : "Yakınlaştırmak için tıkla"}
                        >
                          <img
                            src={previewImages[selectedFormImageIndex]}
                            alt="Seçili ürün görseli"
                            style={{
                              transform: `scale(${formImageZoom})`,
                              transformOrigin: formImageZoomOrigin,
                            }}
                            className="h-full w-full object-contain transition-transform duration-200"
                          />
                        </button>

                        {/* Kapak Görseli Rozeti / Butonu */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          {selectedFormImageIndex === 0 ? (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-1 text-[10px] font-bold text-white shadow-md">
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>Ana Kapak Görseli</span>
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetCoverImage(selectedFormImageIndex)}
                              className="inline-flex min-h-10 items-center gap-1.5 rounded-md bg-slate-900/90 px-3 py-2 text-[11px] font-bold text-white shadow-md transition-colors hover:bg-amber-600"
                              title="Bu görseli ana kapak görseli yap"
                            >
                              <Star className="w-3.5 h-3.5 fill-current" />
                              <span>Bu Görseli Kapak Yap</span>
                            </button>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-slate-400">
                        <ImageIcon className="h-12 w-12" />
                        <span className="text-xs font-medium">Henüz görsel eklenmedi</span>
                      </div>
                    )}
                  </div>

                  <div className="mt-2 flex max-w-full gap-2 overflow-x-auto pb-1">
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
                          <img src={img} alt={`${i + 1}. ürün görseli`} className="h-full w-full rounded object-contain" />
                        </button>

                        {/* Kapak Görseli Rozeti */}
                        {i === 0 && (
                          <span
                            className="absolute left-1 bottom-1 px-1 py-0.5 rounded text-[8px] font-black bg-amber-500 text-white shadow-xs leading-none"
                            title="Ana Kapak Görseli"
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
                          className="absolute right-0.5 top-0.5 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100"
                          aria-label="Görseli kaldır"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingImage}
                      className="flex h-16 w-16 shrink-0 flex-col items-center justify-center rounded-md border border-dashed border-slate-300 bg-white text-slate-500 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:cursor-wait"
                    >
                      {uploadingImage ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      <span className="mt-1 text-[9px] font-bold">Ekle</span>
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </div>
                </section>

                <section className="min-w-0 space-y-5">
                  <section aria-labelledby="required-product-fields" className="min-w-0 space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <h3 id="required-product-fields" className="text-sm font-bold text-slate-900">Ürün bilgileri</h3>
                      <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-xs font-medium text-slate-600">
                        <input
                          type="checkbox"
                          checked={isDraft}
                          onChange={(event) => setIsDraft(event.target.checked)}
                          className="h-4 w-4 accent-blue-600"
                        />
                        Taslak
                      </label>
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="product-oem" className="font-semibold text-slate-700">
                        OEM kodu <span className="text-red-600" aria-hidden="true">*</span>
                      </label>
                      <div className="flex min-w-0 flex-col gap-2 sm:flex-row">
                        <Input
                          id="product-oem"
                          placeholder="Örn. 0281001781"
                          value={oemNumber}
                          onChange={(e) => setOemNumber(e.target.value)}
                          className="h-11 min-w-0 flex-1 font-mono text-sm"
                          required
                        />
                        <Button
                          type="button"
                          onClick={handleAiAutoFill}
                          disabled={aiGenerating || !oemNumber.trim()}
                          className="h-11 w-full shrink-0 gap-2 bg-purple-600 text-xs font-semibold text-white hover:bg-purple-700 sm:w-auto"
                          title="OEM koduna göre ürün bilgilerini doldur"
                        >
                          {aiGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                          {aiGenerating ? "Dolduruluyor" : "AI ile doldur"}
                        </Button>
                      </div>
                      <div className="space-y-1.5 pt-1">
                        <label htmlFor="product-ai-hint" className="font-medium text-slate-600">AI ipucu</label>
                        <Input
                          id="product-ai-hint"
                          placeholder="Araç veya parça bilgisi"
                          value={aiHint}
                          onChange={(e) => setAiHint(e.target.value)}
                          className="h-11 text-sm"
                        />
                      </div>
                      {aiError && <p role="alert" className="text-xs font-medium text-red-600">{aiError}</p>}
                      {aiSuccess && <p role="status" className="text-xs font-medium text-emerald-700">{aiSuccess}</p>}
                    </div>

                    <div className="space-y-1.5">
                      <label htmlFor="product-title" className="font-semibold text-slate-700">
                        Ürün başlığı <span className="text-red-600" aria-hidden="true">*</span>
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
                          <label className="font-bold text-slate-700">Raf / Depo Kodu</label>
                          <Input
                            placeholder="Örn: 201.07.0069, A12-04"
                            value={shelfCode}
                            onChange={(e) => setShelfCode(e.target.value)}
                            className="h-11 font-mono text-sm"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Uyumlu Model / Seri</label>
                          <Input
                            placeholder="Örn: Megane 2, Clio 3"
                            value={model}
                            onChange={(e) => setModel(e.target.value)}
                            className="h-11 text-sm"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Parça Durumu</label>
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

                        <div className="space-y-1">
                          <label className="font-bold text-slate-700">Stok Durumu</label>
                          <select
                            value={inStock ? "true" : "false"}
                            onChange={(e) => setInStock(e.target.value === "true")}
                            className="h-11 w-full min-w-0 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-100"
                          >
                            <option value="true">Stokta Var (Satışa Hazır)</option>
                            <option value="false">Tükendi / Stokta Yok</option>
                          </select>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-slate-700">Açıklama</label>
                        <Textarea
                          rows={4}
                          placeholder="Ürün açıklaması"
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          className="min-h-32 resize-y text-sm"
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label className="font-semibold text-slate-700">Arama etiketleri</label>
                        <Input
                          placeholder="Virgülle ayırarak girin: 0281001781, Megane 2, ECU, Bosch"
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
                {editingProduct ? "Kaydet" : "Ürünü Kaydet"}
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
          className="w-80 h-80 rounded-2xl border-2 border-white/20 bg-slate-900 shadow-2xl overflow-hidden flex items-center justify-center p-3 ring-1 ring-black/30"
        >
          <img
            src={hoverPreview.src}
            alt="Önizleme"
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
                <img
                  key={lightbox.index}
                  src={lightbox.images[lightbox.index]}
                  alt={`Görsel ${lightbox.index + 1}`}
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
                      <img src={img} alt={`Küçük resim ${i + 1}`} className="w-full h-full object-contain" draggable={false} />
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
