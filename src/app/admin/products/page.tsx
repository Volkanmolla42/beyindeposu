"use client";

import { useState, useRef, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Plus,
  Search,
  Edit2,
  Trash2,
  Cpu,
  ImageIcon,
  Upload,
  X,
  Check,
  Loader2,
  Eye,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Sparkles,
  Star,
} from "lucide-react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Doc, Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { slugify } from "../admin-utils";

type LightboxProduct = Doc<"products">;
type OemSource = "image" | "web" | "manual" | "unresolved";
type ReviewCode = {
  code: string;
  kind: "oem_candidate" | "secondary_code";
  source?: OemSource;
  confidence?: number;
};

const buildGoogleAiSearchUrl = (code: string) =>
  `https://www.google.com/search?q=${encodeURIComponent(`"${code}" kodu nedir? hangi ürüne aittir? görsellerini göster`)}&udm=50`;

export default function AdminProductsPage() {
  const [searchProduct, setSearchProduct] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [reviewFilter, setReviewFilter] = useState<"all" | "verified" | "review">("all");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchProduct, selectedBrandFilter, selectedCategoryFilter, reviewFilter, pageSize]);

  // Product Modals & Form State
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [title, setTitle] = useState("");
  const [slug, setSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [oemNumber, setOemNumber] = useState("");
  const [oemSource, setOemSource] = useState<OemSource>("manual");
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
  // Lightbox: ürün tablosundan açıldığında hızlı OEM düzenlemesi için ürünü de taşır.
  const [lightbox, setLightbox] = useState<{ images: string[]; index: number; product?: LightboxProduct } | null>(null);
  const [lightboxOemNumber, setLightboxOemNumber] = useState("");
  const [lightboxOemStatus, setLightboxOemStatus] = useState<"" | "saved" | "generated" | "error">("");
  const [savingLightboxOem, setSavingLightboxOem] = useState(false);
  const [generatingLightboxOem, setGeneratingLightboxOem] = useState(false);
  const [lightboxZoom, setLightboxZoom] = useState(1);
  const [lightboxZoomOrigin, setLightboxZoomOrigin] = useState("center center");
  const openLightbox = (images: string[], index = 0, product?: LightboxProduct) => {
    setLightbox({ images, index, product });
    setLightboxOemNumber(product?.oemNumber || "");
    setLightboxOemStatus("");
    setLightboxZoom(1);
    setLightboxZoomOrigin("center center");
  };
  const closeLightbox = () => {
    setLightbox(null);
    setLightboxOemNumber("");
    setLightboxOemStatus("");
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
  const [aiGeneratingProvider, setAiGeneratingProvider] = useState<"gateway" | null>(null);
  const [aiHint, setAiHint] = useState("");
  const [aiError, setAiError] = useState("");
  const [aiSuccess, setAiSuccess] = useState("");
  const [reviewCodeConfirmed, setReviewCodeConfirmed] = useState<string | null>(null);
  const [editableReviewCodes, setEditableReviewCodes] = useState<ReviewCode[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Paginated Query
  const pageData = useQuery(api.products.getProductsPage, {
    page: currentPage,
    pageSize: pageSize,
    searchTerm: searchProduct || undefined,
    categorySlug: selectedCategoryFilter || undefined,
    brand: selectedBrandFilter || undefined,
    includeReview: reviewFilter === "all" ? true : undefined,
    onlyReview: reviewFilter === "review" ? true : undefined,
  });

  const categories = useQuery(api.categories.list, { onlyActive: false });
  const brands = useQuery(api.brands.list);

  const products = pageData?.items;
  const totalItems = pageData?.totalItems ?? 0;
  const totalPages = pageData?.totalPages ?? 1;

  // Mutations & Actions
  const generateProductDetailsAction = useAction(api.ai.generateProductDetails);
  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);
  const toggleStock = useMutation(api.products.toggleStock);
  const deleteProduct = useMutation(api.products.deleteProduct);

  const resetProductForm = () => {
    setTitle("");
    setSlug("");
    setSlugManuallyEdited(false);
    setOemNumber("");
    setOemSource("manual");
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
    setReviewCodeConfirmed(null);
    setEditableReviewCodes([]);
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
    setReviewCodeConfirmed(null);
    setEditableReviewCodes(Array.isArray(p.reviewCodes) ? p.reviewCodes : []);
    setOemSource(p.oemSource || (p.needsReview ? "unresolved" : "manual"));
    setTitle(p.title);
    setSlug(p.slug);
    setSlugManuallyEdited(true);
    setOemNumber(p.oemNumber);
    setShelfCode(p.shelfCode || "");
    setBrand(p.brand);
    setModel(p.model || "");
    setSelectedCategoryId(p.categoryId);
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
    setAiGeneratingProvider("gateway");
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

        const modelLabel = "Vercel AI Gateway / GLM 5.3 Flash";
        setAiSuccess(`Ürün bilgileri ${modelLabel} ile başarıyla oluşturuldu.`);
        setTimeout(() => setAiSuccess(""), 4000);
      }
    } catch (err: any) {
      setAiError(err?.message || "Detaylar üretilirken hata oluştu.");
    } finally {
      setAiGenerating(false);
      setAiGeneratingProvider(null);
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

    const images = previewImages.length > 0 ? previewImages : ["/images/catalog-ecu-banner.jpg"];

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
      oemSource: oemNumber.trim().toUpperCase() === "İNCELEME GEREKLİ"
        ? (editingProduct?.oemSource === "web" ? "web" : "unresolved")
        : reviewCodeConfirmed
          ? "manual"
          : oemSource,
      ...(editingProduct?.reviewCodes || editableReviewCodes.length > 0
        ? { reviewCodes: reviewCodeConfirmed ? [] : editableReviewCodes }
        : {}),
      ...(reviewCodeConfirmed && reviewCodeConfirmed === oemNumber.trim().toUpperCase()
        ? { needsReview: false, reviewReason: "", visibleOemNumber: oemNumber.trim().toUpperCase() }
        : {}),
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

  const handleSaveLightboxOem = async (e: React.FormEvent) => {
    e.preventDefault();
    const product = lightbox?.product;
    const nextOemNumber = lightboxOemNumber.trim().toUpperCase();

    if (!product || !nextOemNumber) {
      setLightboxOemStatus("error");
      return;
    }

    setSavingLightboxOem(true);
    setLightboxOemStatus("");

    try {
      await updateProduct({
        id: product._id,
        title: product.title,
        slug: product.slug,
        oemNumber: nextOemNumber,
        shelfCode: product.shelfCode || undefined,
        categoryId: product.categoryId,
        brand: product.brand,
        model: product.model || undefined,
        condition: product.condition,
        inStock: product.inStock,
        description: product.description,
        images: product.images || [],
        metaTitle: product.metaTitle || undefined,
        metaDescription: product.metaDescription || undefined,
        metaKeywords: product.metaKeywords || undefined,
        tags: product.tags || undefined,
        oemSource: "manual",
        visibleOemNumber: nextOemNumber,
        needsReview: false,
        reviewReason: "",
        reviewCodes: [],
      });
      setLightbox((current) => {
        if (!current?.product) return current;
        return {
          ...current,
          product: { ...current.product, oemNumber: nextOemNumber },
        };
      });
      setLightboxOemNumber(nextOemNumber);
      setLightboxOemStatus("saved");
    } catch (error) {
      console.error("OEM numarası kaydedilemedi:", error);
      setLightboxOemStatus("error");
    } finally {
      setSavingLightboxOem(false);
    }
  };

  const handleSetLightboxCover = async () => {
    const product = lightbox?.product;
    if (!product || !lightbox || lightbox.index === 0) return;

    setSavingLightboxOem(true);
    setLightboxOemStatus("");
    try {
      const currentImages = [...(product.images || [])];
      const [chosenImage] = currentImages.splice(lightbox.index, 1);
      currentImages.unshift(chosenImage);

      await updateProduct({
        id: product._id,
        title: product.title,
        slug: product.slug,
        oemNumber: product.oemNumber,
        shelfCode: product.shelfCode || undefined,
        categoryId: product.categoryId,
        brand: product.brand,
        model: product.model || undefined,
        condition: product.condition,
        inStock: product.inStock,
        description: product.description,
        images: currentImages,
        metaTitle: product.metaTitle || undefined,
        metaDescription: product.metaDescription || undefined,
        metaKeywords: product.metaKeywords || undefined,
        tags: product.tags || undefined,
      });

      setLightbox((current) => {
        if (!current?.product) return current;
        return {
          ...current,
          images: currentImages,
          index: 0,
          product: {
            ...current.product,
            images: currentImages,
          },
        };
      });
      setLightboxOemStatus("saved");
    } catch (error) {
      console.error("Kapak görseli güncellenemedi:", error);
      setLightboxOemStatus("error");
    } finally {
      setSavingLightboxOem(false);
    }
  };

  const handleGenerateLightboxOem = async () => {
    const product = lightbox?.product;
    const nextOemNumber = lightboxOemNumber.trim().toUpperCase();

    if (!product || !nextOemNumber) {
      setLightboxOemStatus("error");
      return;
    }

    setGeneratingLightboxOem(true);
    setLightboxOemStatus("");

    try {
      const generated = await generateProductDetailsAction({
        oemNumber: nextOemNumber,
        additionalHint: product.brand !== "Genel Uyumlu" ? `Marka: ${product.brand}` : undefined,
      });
      const nextTitle = generated.title || product.title;
      setEditingProduct(product);
      setTitle(nextTitle);
      setSlug(slugify(nextTitle) || product.slug);
      setSlugManuallyEdited(false);
      setOemNumber(nextOemNumber);
      setOemSource("manual");
      setShelfCode(product.shelfCode || "");
      setBrand(generated.brand || product.brand);
      setModel(generated.model || "");
      setSelectedCategoryId(generated.categoryId || product.categoryId);
      setCondition(generated.condition || product.condition);
      setInStock(product.inStock);
      setDescription(generated.description || product.description);
      setPreviewImages(product.images || []);
      setMetaTitle(generated.metaTitle || product.metaTitle || "");
      setMetaDescription(generated.metaDescription || product.metaDescription || "");
      setMetaKeywords(generated.metaKeywords || product.metaKeywords || "");
      setTagsInput(generated.tags?.length ? generated.tags.join(", ") : (product.tags || []).join(", "));
      setAiError("");
      setAiSuccess("Yeni OEM ile ürün bilgileri oluşturuldu. Kontrol edip değişiklikleri kaydedin.");
      closeLightbox();
      setAddProductModalOpen(true);
    } catch (error) {
      console.error("Yeni OEM ile ürün üretilemedi:", error);
      setLightboxOemStatus("error");
    } finally {
      setGeneratingLightboxOem(false);
    }
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
          <Button
            onClick={handleOpenAddProduct}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 rounded-lg gap-1.5 cursor-pointer shadow-xs"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ürün Ekle</span>
          </Button>
        </div>
      </div>

      {/* Quick Status Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setReviewFilter("all")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
            reviewFilter === "all"
              ? "bg-slate-900 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          Tüm Parçalar
        </button>
        <button
          onClick={() => setReviewFilter("verified")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            reviewFilter === "verified"
              ? "bg-emerald-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Doğrulanmış OEM</span>
        </button>
        <button
          onClick={() => setReviewFilter("review")}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 ${
            reviewFilter === "review"
              ? "bg-amber-600 text-white"
              : "bg-white text-slate-600 hover:bg-slate-100 border border-slate-200"
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>İnceleme Gerekenler</span>
        </button>
      </div>

      {/* Filters Toolbar */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
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
                <th className="p-3.5">Marka &amp; Kategori</th>
                <th className="p-3.5">Raf</th>
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
                            onClick={() => openLightbox(p.images!, 0, p)}
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
                      <div className="flex items-center gap-1.5">
                        <span>{p.oemNumber}</span>
                        {p.oemNumber !== "İNCELEME GEREKLİ" && (
                          <a
                            href={buildGoogleAiSearchUrl(p.oemNumber)}
                            target="_blank"
                            rel="noopener noreferrer"
                            title="OEM kodunu Google'da ara"
                            className="text-slate-300 hover:text-blue-500 transition-colors flex-shrink-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Globe className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      {p.needsReview && (
                        <span className="mt-1.5 block text-[10px] text-amber-600 font-sans font-semibold">
                          ⚠️ İnceleme Gerekli · Düzenle'den aday kodu kontrol et
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 max-w-xs">
                      <div className="font-semibold text-slate-900 truncate">{p.title}</div>
                      {p.model && <div className="text-[11px] text-slate-500 truncate">{p.model}</div>}
                    </td>
                    <td className="p-3.5">
                      <div className="font-medium text-slate-800">{p.brand}</div>
                      <div className="text-[11px] text-slate-500">{p.categoryName}</div>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-500">
                      {p.shelfCode || "-"}
                    </td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {p.condition}
                      </span>
                    </td>
                    <td className="p-3.5">
                      <button
                        onClick={() => toggleStock({ id: p._id, inStock: !p.inStock })}
                        className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold cursor-pointer transition-colors ${
                          p.inStock
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                            : "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        {p.inStock ? "Stokta" : "Tükendi"}
                      </button>
                    </td>
                    <td className="p-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Link
                          href={`/urunler/${p.slug}`}
                          target="_blank"
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                          title="Görüntüle"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Link>
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
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    Yükleniyor...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
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
                      className={`min-w-7 h-7 px-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        currentPage === p
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
        <DialogContent className="flex max-h-[92vh] max-w-6xl flex-col overflow-hidden">
          <DialogHeader className="shrink-0">
            <DialogTitle>{editingProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</DialogTitle>
            <DialogDescription>
              Ürün detaylarını manuel olarak girebilir veya yapay zeka ile otomatik doldurabilirsiniz.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveProduct} className="flex min-h-0 flex-1 flex-col pt-2 text-xs">
            <div className="min-h-0 flex-1 overflow-y-auto pr-1 sm:pr-2">
              <div className="grid grid-cols-1 gap-6 pb-5 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 lg:sticky lg:top-0 lg:self-start">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-slate-900">Ürün Görselleri</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">1. görsel otomatik ana kapak görselidir. Değiştirmek için görseli kapak yapabilirsiniz.</p>
                  </div>
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-slate-500 shadow-xs">
                    {previewImages.length} görsel
                  </span>
                </div>

                <div className="relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
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
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-500 text-white text-[11px] font-bold shadow-md">
                            <Star className="w-3.5 h-3.5 fill-current" />
                            <span>Ana Kapak Görseli</span>
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleSetCoverImage(selectedFormImageIndex)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-slate-900/90 hover:bg-amber-600 text-white text-[11px] font-bold shadow-md backdrop-blur-xs transition-all cursor-pointer"
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

                <div className="mt-3 flex flex-wrap gap-2">
                  {previewImages.map((img, i) => (
                    <div
                      key={i}
                      className={`group relative h-16 w-16 overflow-hidden rounded-lg border-2 bg-white p-1 transition-all ${
                        i === selectedFormImageIndex ? "border-blue-600 shadow-sm" : "border-slate-200 hover:border-slate-400"
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

                      {/* Diğer görseller için Hızlı Kapak Yap Butonu */}
                      {i > 0 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSetCoverImage(i);
                          }}
                          className="absolute left-0.5 top-0.5 rounded-full bg-slate-900/80 hover:bg-amber-500 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer shadow-xs"
                          title="Kapak Görseli Yap"
                        >
                          <Star className="h-2.5 w-2.5 fill-current" />
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          setPreviewImages((prev) => prev.filter((_, index) => index !== i));
                          setSelectedFormImageIndex((current) => Math.max(0, Math.min(current, previewImages.length - 2)));
                          resetFormImageZoom();
                        }}
                        className="absolute -right-1 -top-1 rounded-full bg-red-600 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100 cursor-pointer"
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
                    className="flex h-16 w-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-300 bg-white text-slate-400 transition-colors hover:border-blue-500 hover:text-blue-600 disabled:cursor-wait"
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

              <section className="min-w-0 space-y-4">
            {/* Required product information */}
            <section className="overflow-hidden rounded-2xl border border-blue-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-3 border-b border-blue-100 bg-blue-50/70 px-4 py-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-blue-700">
                    <CheckCircle2 className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-bold text-slate-900">Zorunlu bilgiler</h3>
                  </div>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="rounded-xl border border-indigo-200 bg-gradient-to-br from-indigo-50/80 via-white to-purple-50/70 p-3.5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-700">
                        <Cpu className="h-4 w-4" />
                      </span>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-900">OEM kodu ile otomatik doldur</p>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                    <div className="flex min-w-0 flex-1 items-center gap-1.5">
                      <a
                        href={buildGoogleAiSearchUrl(oemNumber)}
                        target="_blank"
                        rel="noopener noreferrer"
                        role="button"
                        aria-label={`${oemNumber || "OEM kodu"} kodunu Google'da ara`}
                        aria-disabled={!oemNumber.trim() || oemNumber.trim().toUpperCase() === "İNCELEME GEREKLİ"}
                        onClick={(event) => {
                          if (!oemNumber.trim() || oemNumber.trim().toUpperCase() === "İNCELEME GEREKLİ") {
                            event.preventDefault();
                          }
                        }}
                        className="relative z-20 inline-flex h-9 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-[10px] font-bold text-blue-700 pointer-events-auto transition-colors hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 aria-disabled:pointer-events-none aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
                        title="OEM kodunu Google AI Mode'da ara"
                      >
                        <Search className="h-3.5 w-3.5" />
                        <span>Ara</span>
                      </a>
                      <Input
                        placeholder="Örn: 0281001781, 8200000000"
                        value={oemNumber}
                        onChange={(e) => {
                          setOemNumber(e.target.value);
                          setOemSource("manual");
                          if (reviewCodeConfirmed && reviewCodeConfirmed !== e.target.value.trim().toUpperCase()) {
                            setReviewCodeConfirmed(null);
                          }
                        }}
                        className="min-w-0 flex-1 font-mono text-xs"
                        required
                      />
                    </div>
                    <Button
                      type="button"
                      size="sm"
                      onClick={handleAiAutoFill}
                      disabled={aiGenerating || !oemNumber.trim()}
                      className="h-9 w-full shrink-0 gap-1.5 bg-purple-600 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 sm:w-auto"
                      title="Vercel AI Gateway üzerinden GLM 5.3 Flash ve Exa ile üretir"
                    >
                      {aiGenerating && aiGeneratingProvider === "gateway" ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="h-3.5 w-3.5" />
                      )}
                      <span>{aiGenerating && aiGeneratingProvider === "gateway" ? "Analiz ediliyor..." : "AI ile doldur"}</span>
                    </Button>
                  </div>

                </div>

                <div className="space-y-1">
                  {editingProduct?.needsReview && editableReviewCodes.length > 0 && (
                    <div className="mt-2 w-full rounded-xl border border-amber-200 bg-amber-50/70 p-2.5">
                      <div className="flex items-center">
                        <div className="flex min-w-0 items-start gap-2">
                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-100 text-amber-700">
                            <Search className="h-3 w-3" />
                          </span>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold uppercase tracking-wide text-amber-900">Muhtemel kodlar</p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-2 space-y-1">
                        {editableReviewCodes.map((candidate: ReviewCode) => (
                          <div key={`${candidate.kind}-${candidate.code}`} className="flex min-w-0 flex-wrap items-center gap-1 rounded-lg border border-amber-100 bg-white px-2 py-1.5">
                            <span className="min-w-0 flex-1 truncate font-mono text-[10px] font-bold leading-4 text-slate-900" title={candidate.code}>
                              {candidate.code}
                            </span>
                            <span
                              className="max-w-[8rem] shrink-0 truncate text-right text-[8px] font-semibold leading-3 text-slate-400 sm:max-w-[10rem]"
                              title={`${candidate.kind === "oem_candidate" ? "OEM adayı" : "Üretici"} · ${candidate.source === "web" ? "Web araması" : candidate.source === "image" ? "Görsel" : candidate.source === "manual" ? "Manuel" : "Kaynak belirsiz"}`}
                            >
                              {candidate.kind === "oem_candidate" ? "OEM adayı" : "Üretici"} · {candidate.source === "web" ? "Web" : candidate.source === "image" ? "Görsel" : candidate.source === "manual" ? "Manuel" : "Belirsiz"}
                              {typeof candidate.confidence === "number" ? ` · ${Math.round(candidate.confidence * 100)}%` : ""}
                            </span>
                            <a
                              href={buildGoogleAiSearchUrl(candidate.code)}
                              target="_blank"
                              rel="noopener noreferrer"
                              role="button"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                window.open(event.currentTarget.href, "_blank", "noopener,noreferrer");
                              }}
                              title={`Google'da ara: ${candidate.code}`}
                              aria-label={`${candidate.code} kodunu Google'da ara`}
                              className="relative z-20 inline-flex h-6 shrink-0 cursor-pointer items-center gap-1 rounded-md border border-blue-200 bg-blue-50 px-2 text-[9px] font-bold text-blue-700 pointer-events-auto transition-colors hover:border-blue-300 hover:bg-blue-100 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400"
                            >
                              <Search className="h-3 w-3" />
                              <span>Ara</span>
                            </a>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => {
                                setOemNumber(candidate.code);
                                setOemSource("manual");
                                setReviewCodeConfirmed(candidate.code.trim().toUpperCase());
                                setAiError("");
                                setAiSuccess(`OEM adayı ${candidate.code} seçildi. Google Görseller'de doğrulayıp kaydettiğinde inceleme durumu kaldırılacak.`);
                              }}
                              className="h-6 shrink-0 whitespace-nowrap bg-emerald-600 px-2 text-[9px] font-bold text-white hover:bg-emerald-700"
                            >
                              <Check className="mr-1 h-3 w-3" />
                              Bunu kullan
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditableReviewCodes((current) => current.filter((item) => (
                                  !(item.kind === candidate.kind && item.code === candidate.code)
                                )));
                                if (reviewCodeConfirmed === candidate.code.trim().toUpperCase()) {
                                  setReviewCodeConfirmed(null);
                                }
                                setAiSuccess(`OEM adayı ${candidate.code} kaldırıldı. Değişiklik ürünü kaydettiğinizde kalıcı olur.`);
                              }}
                              className="h-6 shrink-0 whitespace-nowrap border-red-200 px-2 text-[9px] font-bold text-red-600 hover:border-red-300 hover:bg-red-50 hover:text-red-700"
                            >
                              <Trash2 className="mr-1 h-3 w-3" />
                              Kaldır
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <div className="space-y-1">
                    <label className="block text-[10px] font-semibold text-slate-700">Ek ipucu <span className="font-normal text-slate-400">(isteğe bağlı)</span></label>
                    <Input
                      placeholder="Örn: Peugeot 307 ön sağ cam motoru, 1.6 HDi, 2005"
                      value={aiHint}
                      onChange={(e) => setAiHint(e.target.value)}
                      className="h-8 border-indigo-200 bg-white text-xs font-medium placeholder:text-slate-400 focus:border-indigo-500"
                    />
                  </div>
                  <div className="flex items-start gap-1.5 rounded-lg border border-amber-200/90 bg-amber-50/90 px-2.5 py-1.5 text-[10.5px] text-amber-800">
                    <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-600" />
                    <span><strong>Kontrol et:</strong> AI teknik detaylarda veya uyumlulukta hata yapabilir; kaydetmeden önce bilgileri doğrula.</span>
                  </div>
                  {aiError && <p className="text-[11px] font-medium text-red-600">{aiError}</p>}
                  {aiSuccess && <p className="text-[11px] font-medium text-emerald-600">{aiSuccess}</p>}
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Ürün Başlığı *</label>
                  <Input
                    placeholder="Örn: Renault Megane 2 Motor Beyni (ECU) Bosch 0281001781 Orijinal Çıkma"
                    value={title}
                    onChange={(e) => {
                      setTitle(e.target.value);
                      if (!slugManuallyEdited) {
                        setSlug(slugify(e.target.value));
                      }
                    }}
                    className="text-xs font-semibold"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Araç Markası *</label>
                    <select
                      value={brand}
                      onChange={(e) => setBrand(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
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

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Kategori *</label>
                    <select
                      value={selectedCategoryId}
                      onChange={(e) => setSelectedCategoryId(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
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
              </div>
            </section>

            {/* Optional product details */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center gap-2.5 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-200/80 text-slate-600">
                  <SlidersHorizontal className="h-4 w-4" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Ürün detayları</h3>
                  <p className="mt-0.5 text-[11px] text-slate-500">Uyumluluk, stok, açıklama ve arama görünürlüğünü zenginleştiren isteğe bağlı alanlar.</p>
                </div>
              </div>

              <div className="space-y-4 p-4">
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Raf / Depo Kodu</label>
                    <Input
                      placeholder="Örn: 201.07.0069, A12-04"
                      value={shelfCode}
                      onChange={(e) => setShelfCode(e.target.value)}
                      className="font-mono text-xs"
                    />
                    <p className="text-[10px] leading-4 text-slate-400">Yalnızca depo içi takip için kullanılır.</p>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Uyumlu Model / Seri</label>
                    <Input
                      placeholder="Örn: Megane 2, Clio 3"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Parça Durumu</label>
                    <select
                      value={condition}
                      onChange={(e) => setCondition(e.target.value)}
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
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
                      className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="true">Stokta Var (Satışa Hazır)</option>
                      <option value="false">Tükendi / Stokta Yok</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Detaylı Açıklama</label>
                  <Textarea
                    rows={10}
                    placeholder="Parça özellikleri, soket pin kontrolleri ve kullanım alanları..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className="min-h-[220px] resize-y text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <label className="font-bold text-slate-700">Arama Etiketleri (Tags)</label>
                  <Input
                    placeholder="Virgülle ayırarak girin: 0281001781, Megane 2, ECU, Bosch"
                    value={tagsInput}
                    onChange={(e) => setTagsInput(e.target.value)}
                    className="text-xs"
                  />
                </div>

                <div className="space-y-3 border-t border-slate-100 pt-4">
                  <div>
                    <p className="text-xs font-bold text-slate-800">SEO ve bağlantı</p>
                    <p className="mt-0.5 text-[11px] text-slate-500">Arama motoru başlık ve açıklamasını buradan kontrol edebilirsiniz.</p>
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">URL / Slug</label>
                    <Input
                      value={slug}
                      onChange={(e) => {
                        setSlug(slugify(e.target.value));
                        setSlugManuallyEdited(true);
                      }}
                      className="font-mono text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Meta Başlık</label>
                    <Input
                      value={metaTitle}
                      onChange={(e) => setMetaTitle(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Meta Açıklama</label>
                    <Textarea
                      rows={3}
                      value={metaDescription}
                      onChange={(e) => setMetaDescription(e.target.value)}
                      className="resize-y text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Meta Anahtar Kelimeler</label>
                    <Input
                      value={metaKeywords}
                      onChange={(e) => setMetaKeywords(e.target.value)}
                      className="text-xs"
                    />
                  </div>
                </div>
              </div>
            </section>
              </section>
              </div>

            </div>

            {/* Form Actions */}
            <div className="relative z-10 flex shrink-0 items-center justify-end gap-2 border-t border-slate-200 bg-white pt-3 shadow-[0_-8px_18px_-18px_rgba(15,23,42,0.45)]">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAddProductModalOpen(false)}
                className="text-xs"
              >
                Vazgeç
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-5 cursor-pointer shadow-xs"
              >
                {editingProduct ? "Değişiklikleri Kaydet" : "Ürünü Kaydet"}
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
            className="flex w-[min(94vw,1180px)] flex-col gap-4 lg:flex-row lg:items-stretch"
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
              className={`max-h-full max-w-full object-contain select-none transition-transform duration-200 ${
                lightboxZoom > 1 ? "cursor-zoom-out" : "cursor-zoom-in"
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
                  className={`relative w-14 h-14 rounded-lg border-2 overflow-hidden bg-white/10 flex-shrink-0 transition-all cursor-pointer ${
                    i === lightbox.index
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

          {lightbox.product && (
            <aside className="w-full rounded-2xl border border-white/15 bg-slate-950/95 p-4 shadow-xl lg:w-80 lg:flex-none">
              <div className="border-b border-white/10 pb-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-300">Ürün önizleme</p>
                <h2 className="mt-1 line-clamp-2 text-sm font-semibold leading-5 text-white" title={lightbox.product.title}>
                  {lightbox.product.title}
                </h2>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                  <div className="rounded-lg bg-white/5 px-2.5 py-2 text-white/55">
                    <span className="block text-white/40">Mevcut OEM</span>
                    <span className="mt-0.5 block truncate font-mono font-semibold text-white">{lightbox.product.oemNumber}</span>
                  </div>
                  <div className="rounded-lg bg-white/5 px-2.5 py-2 text-white/55">
                    <span className="block text-white/40">Raf kodu</span>
                    <span className="mt-0.5 block truncate font-mono font-semibold text-white">{lightbox.product.shelfCode || "—"}</span>
                  </div>
                </div>

                {/* Hızlı Kapak Görseli Seçimi */}
                {lightbox.images.length > 1 && (
                  <div className="mt-3 pt-3 border-t border-white/10">
                    {lightbox.index === 0 ? (
                      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-current text-amber-400 shrink-0" />
                        <span>Ana Kapak Görseli</span>
                      </div>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        onClick={handleSetLightboxCover}
                        disabled={savingLightboxOem || generatingLightboxOem}
                        className="h-8.5 w-full bg-amber-600 text-xs font-bold text-white hover:bg-amber-500 cursor-pointer shadow-md"
                        title="Bu görseli ürünün 1. (ana kapak) görseli yapar"
                      >
                        <Star className="mr-1.5 h-3.5 w-3.5 fill-current" />
                        Bu Görseli Kapak Yap
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <form onSubmit={handleSaveLightboxOem} className="pt-4">
                <label className="text-xs font-semibold text-white">Yeni OEM numarası</label>
                <Input
                  value={lightboxOemNumber}
                  onChange={(e) => {
                    setLightboxOemNumber(e.target.value);
                    setLightboxOemStatus("");
                  }}
                  placeholder="OEM numarası"
                  aria-label="Yeni OEM numarası"
                  className="mt-2 h-10 border-white/15 bg-white text-xs font-mono text-slate-900"
                  autoFocus
                />
                <p className="mt-2 text-[11px] leading-4 text-white/50">
                  Üret seçeneği tam düzenleme formunda bir taslak açar; görseller ve raf kodu korunur. Kaydetmediğiniz sürece ürün değişmez.
                </p>
                <div className="mt-4 grid gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleGenerateLightboxOem}
                    disabled={savingLightboxOem || generatingLightboxOem}
                    className="h-10 w-full bg-emerald-600 text-xs font-bold text-white hover:bg-emerald-500 cursor-pointer"
                  >
                    {generatingLightboxOem ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Cpu className="mr-1.5 h-3.5 w-3.5" />}
                    Yeni OEM ile Üret
                  </Button>
                  <Button
                    type="submit"
                    size="sm"
                    disabled={savingLightboxOem || generatingLightboxOem}
                    className="h-10 w-full bg-blue-600 text-xs font-bold text-white hover:bg-blue-500 cursor-pointer"
                  >
                    {savingLightboxOem ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                    Yalnız OEM&apos;i Kaydet
                  </Button>
                </div>
                {lightboxOemStatus === "saved" && (
                  <p className="mt-3 text-[11px] font-medium text-emerald-300">OEM numarası kaydedildi.</p>
                )}
                {lightboxOemStatus === "error" && (
                  <p className="mt-3 text-[11px] font-medium text-red-300">OEM numarası boş bırakılamaz veya işlem tamamlanamadı.</p>
                )}
              </form>
            </aside>
          )}
          </div>
        </div>
      )}
    </div>
  );
}
