"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  FolderUp,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Layers,
  FileText,
  Search,
  Check,
  Eye,
  Loader2,
  Info,
} from "lucide-react";
import Link from "next/link";

interface ProductFileGroup {
  id: string;
  shelfCode: string;
  categoryHint: string;
  brandHint: string;
  folderPath: string;
  files: File[];
  status: "idle" | "processing" | "success" | "skipped" | "error";
  error?: string;
  result?: {
    productId?: string;
    oemNumber?: string;
    title?: string;
    categoryName?: string;
    brand?: string;
    model?: string;
    imageUrl?: string;
    slug?: string;
  };
}

export default function BatchImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex Data
  const categories = useQuery(api.categories.list, { onlyActive: false }) || [];
  const brands = useQuery(api.brands.list) || [];
  const existingProductsRes = useQuery(api.products.getProductsPage, {
    draftStatus: "all",
    pageSize: 500,
  });

  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);

  // State
  const [productGroups, setProductGroups] = useState<ProductFileGroup[]>([]);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [currentIndex, setCurrentIndex] = useState<number>(-1);
  const [saveAsDraft, setSaveAsDraft] = useState(false);
  const [skipExisting, setSkipExisting] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "success" | "error" | "pending">("all");

  // Keep a ref to isRunning / isPaused to break out of processing loops instantly
  const shouldStopRef = useRef(false);

  // Toplu yükleme devam ederken sayfadan ayrılma / yenileme uyarısı
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isRunning) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    const handleAnchorClick = (e: MouseEvent) => {
      if (!isRunning) return;
      const target = (e.target as HTMLElement).closest("a");
      if (target && target.href && !target.href.startsWith("javascript:")) {
        const confirmLeave = window.confirm(
          "Toplu ürün yükleme işlemi devam ediyor. Sayfadan ayrılırsanız işlem duracaktır. Çıkmak istediğinize emin misiniz?"
        );
        if (!confirmLeave) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    document.addEventListener("click", handleAnchorClick, true);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      document.removeEventListener("click", handleAnchorClick, true);
    };
  }, [isRunning]);

  // Map of existing products by shelfCode
  const existingProductsByShelf = useMemo(() => {
    const map = new Map<string, any>();
    if (existingProductsRes?.items) {
      for (const p of existingProductsRes.items) {
        if (p.shelfCode) {
          map.set(p.shelfCode.trim().toLowerCase(), p);
        }
      }
    }
    return map;
  }, [existingProductsRes]);

  // Handle Directory Selection
  const handleDirectorySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const groupsMap = new Map<string, { files: File[]; relPath: string }>();

    let rootName = "Seçilen Klasör";

    for (const file of files) {
      const relPath = file.webkitRelativePath || file.name;
      const parts = relPath.split("/");

      if (parts.length > 1) {
        rootName = parts[0];
        // Dosyanın bulunduğu klasör ve raf kodu tespiti
        const dirParts = parts.slice(0, parts.length - 1);
        const shelfMatch = file.name.match(/^(\d{3}(?:\.\d{2})?\.\d{3,4})/);
        const isShelfFolder = shelfMatch && dirParts[dirParts.length - 1] === shelfMatch[1];
        const effectiveParts = !isShelfFolder && shelfMatch ? [...dirParts, shelfMatch[1]] : dirParts;
        const folderKey = effectiveParts.join("/");

        // Sadece görsel dosyalarını al
        if (/\.(webp|jpg|jpeg|png)$/i.test(file.name)) {
          if (!groupsMap.has(folderKey)) {
            groupsMap.set(folderKey, { files: [], relPath: folderKey });
          }
          groupsMap.get(folderKey)!.files.push(file);
        }
      }
    }

    setSelectedFolderName(rootName);

    // Grupları ProductFileGroup array'ine çevir
    const newGroups: ProductFileGroup[] = [];

    groupsMap.forEach((val, key) => {
      if (val.files.length === 0) return;

      const segments = key.split("/");
      const shelfCode = segments[segments.length - 1] || "GENEL";
      const categoryHint = segments.length > 2 ? segments[1] : "Oto Elektronik";
      const brandHint = segments.length > 3 ? segments[2].replace(/^[0-9.]+\s*/, "") : "Genel";

      // Görselleri doğal sıraya göre diz (.1_ veya .1. önce gelsin)
      val.files.sort((a, b) => {
        const aFirst = a.name.includes(".1.") || a.name.includes(".1_");
        const bFirst = b.name.includes(".1.") || b.name.includes(".1_");
        if (aFirst && !bFirst) return -1;
        if (!aFirst && bFirst) return 1;
        return a.name.localeCompare(b.name, undefined, { numeric: true });
      });

      newGroups.push({
        id: key,
        shelfCode,
        categoryHint,
        brandHint,
        folderPath: key,
        files: val.files,
        status: "idle",
      });
    });

    setProductGroups(newGroups);
    setCurrentIndex(-1);
    setIsRunning(false);
    setIsPaused(false);
    shouldStopRef.current = false;
  };

  // Helper: Slugify
  const slugify = (text: string) => {
    const trMap: Record<string, string> = {
      ç: "c", Ç: "c", ğ: "g", Ğ: "g", ı: "i", İ: "i",
      ö: "o", Ö: "o", ş: "s", Ş: "s", ü: "u", Ü: "u",
    };
    return text
      .toLowerCase()
      .split("")
      .map((c) => trMap[c] || c)
      .join("")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  // Helper: Category Matching
  const matchCategory = (
    categoryHint: string,
    aiCategoryId?: string,
    aiCategoryName?: string
  ) => {
    if (aiCategoryId) {
      const found = categories.find((c) => c._id === aiCategoryId);
      if (found) return found;
    }
    if (aiCategoryName) {
      const cleanAiName = aiCategoryName.toLowerCase();
      const found = categories.find((c) =>
        c.name.toLowerCase().includes(cleanAiName) || cleanAiName.includes(c.name.toLowerCase())
      );
      if (found) return found;
    }
    const hint = categoryHint.toLowerCase();
    if (hint.includes("ecu") || hint.includes("motor")) {
      return categories.find((c) => c.slug === "motor-beyinleri-ecu") || categories[0];
    }
    if (hint.includes("abs") || hint.includes("esp")) {
      return categories.find((c) => c.slug === "abs-esp-beyinleri") || categories[0];
    }
    if (hint.includes("airbag") || hint.includes("srs")) {
      return categories.find((c) => c.slug === "airbag-beyinleri") || categories[0];
    }
    if (hint.includes("sigorta")) {
      return categories.find((c) => c.slug === "sigorta-kutulari") || categories[0];
    }
    if (hint.includes("modül") || hint.includes("bcm") || hint.includes("bsi")) {
      return (
        categories.find((c) => c.slug === "bcm-bsi-sam-modulleri") ||
        categories.find((c) => c.slug === "konfor-modulleri") ||
        categories[0]
      );
    }
    return categories[0];
  };

  // Single Item Processor
  const processItem = async (index: number) => {
    const item = productGroups[index];
    if (!item) return;

    // Check if already completed and skipExisting is true
    const existing = existingProductsByShelf.get(item.shelfCode.trim().toLowerCase());
    const isAlreadyFull = existing && existing.oemNumber && existing.title && existing.oemNumber.trim() !== "";

    if (skipExisting && isAlreadyFull) {
      setProductGroups((prev) =>
        prev.map((g, i) =>
          i === index
            ? {
                ...g,
                status: "skipped",
                result: {
                  productId: existing._id,
                  oemNumber: existing.oemNumber,
                  title: existing.title,
                  categoryName: existing.categoryName,
                  brand: existing.brand,
                  model: existing.model,
                  imageUrl: existing.images?.[0],
                  slug: existing.slug,
                },
              }
            : g
        )
      );
      return;
    }

    // Set processing state
    setProductGroups((prev) =>
      prev.map((g, i) => (i === index ? { ...g, status: "processing", error: undefined } : g))
    );

    try {
      // 1. Prepare FormData to send to backend API
      const formData = new FormData();
      formData.append("shelfCode", item.shelfCode);
      formData.append("categoryHint", item.categoryHint);
      formData.append("brandHint", item.brandHint);
      formData.append("categories", JSON.stringify(categories));
      formData.append("brands", JSON.stringify(brands));

      for (const file of item.files) {
        formData.append("files", file);
      }

      // 2. Call backend batch processor
      const res = await fetch("/api/admin/batch-process-product", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Sunucu hatası: ${res.statusText}`);
      }

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || "Yapay zeka analizi başarısız oldu.");
      }

      // 3. Match Category
      const matchedCat = matchCategory(
        item.categoryHint,
        data.matchedCategoryId,
        data.suggestedCategoryName
      );

      const baseSlug = slugify(data.title || item.shelfCode);
      const finalSlug = `${baseSlug}-${Date.now().toString().slice(-4)}`;

      // 4. Save to Convex (Update existing draft or Create new)
      const isDraft = Boolean(data.isDraft || saveAsDraft);
      const payload = {
        title: data.title,
        slug: finalSlug,
        oemNumber: data.oemNumber,
        shelfCode: item.shelfCode,
        categoryId: matchedCat?._id,
        brand: data.brand || item.brandHint,
        model: data.model,
        condition: data.condition || "Orijinal Çıkma",
        inStock: true,
        description: data.description,
        images: existing?.images?.length ? existing.images : data.images,
        metaTitle: data.metaTitle,
        metaDescription: data.metaDescription,
        metaKeywords: data.metaKeywords,
        tags: data.tags,
        isDraft,
      };

      const finalProductId = existing
        ? (await updateProduct({ id: existing._id, ...payload }), existing._id)
        : await createProduct(payload);

      // 5. Update UI with Success
      setProductGroups((prev) =>
        prev.map((g, i) =>
          i === index
            ? {
                ...g,
                status: "success",
                result: {
                  productId: finalProductId,
                  oemNumber: data.oemNumber,
                  title: data.title,
                  categoryName: matchedCat?.name,
                  brand: data.brand,
                  model: data.model,
                  imageUrl: data.images?.[0],
                  slug: finalSlug,
                },
              }
            : g
        )
      );
    } catch (err: any) {
      console.error("Error processing item:", err);
      setProductGroups((prev) =>
        prev.map((g, i) =>
          i === index
            ? {
                ...g,
                status: "error",
                error: err.message || "Bilinmeyen hata",
              }
            : g
        )
      );
    }
  };

  // Main Loop Handler
  const startProcessing = async () => {
    setIsRunning(true);
    setIsPaused(false);
    shouldStopRef.current = false;

    // Start from either current index or first pending item
    let startIndex = currentIndex >= 0 ? currentIndex : 0;
    if (productGroups[startIndex]?.status === "success" || productGroups[startIndex]?.status === "skipped") {
      const nextPending = productGroups.findIndex((g) => g.status === "idle" || g.status === "error");
      startIndex = nextPending !== -1 ? nextPending : startIndex;
    }

    for (let i = startIndex; i < productGroups.length; i++) {
      if (shouldStopRef.current) {
        setIsPaused(true);
        setIsRunning(false);
        break;
      }

      // If already done, skip to next
      if (productGroups[i].status === "success" || productGroups[i].status === "skipped") {
        continue;
      }

      setCurrentIndex(i);
      await processItem(i);

      // Brief delay between calls to preserve rate limits
      if (i < productGroups.length - 1 && !shouldStopRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    }

    if (!shouldStopRef.current) {
      setIsRunning(false);
      setIsPaused(false);
    }
  };

  // Pause Handler
  const handlePause = () => {
    shouldStopRef.current = true;
    setIsPaused(true);
    setIsRunning(false);
  };

  // Reset Handler
  const handleReset = () => {
    shouldStopRef.current = true;
    setIsRunning(false);
    setIsPaused(false);
    setCurrentIndex(-1);
    setProductGroups((prev) =>
      prev.map((g) => ({
        ...g,
        status: "idle",
        error: undefined,
        result: undefined,
      }))
    );
  };

  // Counts & Progress
  const totalCount = productGroups.length;
  const successCount = productGroups.filter((g) => g.status === "success").length;
  const skippedCount = productGroups.filter((g) => g.status === "skipped").length;
  const errorCount = productGroups.filter((g) => g.status === "error").length;
  const completedCount = successCount + skippedCount + errorCount;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  // Filtered List
  const filteredGroups = useMemo(() => {
    return productGroups.filter((item) => {
      // Status filter
      if (statusFilter === "success" && item.status !== "success") return false;
      if (statusFilter === "error" && item.status !== "error") return false;
      if (statusFilter === "pending" && (item.status === "success" || item.status === "skipped")) return false;

      // Search term
      if (searchFilter.trim()) {
        const term = searchFilter.toLowerCase();
        const matchesShelf = item.shelfCode.toLowerCase().includes(term);
        const matchesOem = item.result?.oemNumber?.toLowerCase().includes(term);
        const matchesTitle = item.result?.title?.toLowerCase().includes(term);
        const matchesBrand = item.brandHint.toLowerCase().includes(term);
        return matchesShelf || matchesOem || matchesTitle || matchesBrand;
      }
      return true;
    });
  }, [productGroups, statusFilter, searchFilter]);

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
                Toplu Ürün Aktarımı & AI OEM Analizi
              </h1>
              <p className="text-xs text-slate-500">
                Görsellerden yapay zeka ile otomatik OEM okuma, 100/100 SEO açıklaması üretme ve kontrollü içe aktarma
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/admin/products"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50 transition-colors"
          >
            <span>Ürün Listesine Dön</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* 2. Klasör Seçim Kutusu (Dropzone) */}
      {productGroups.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white p-10 text-center transition-all hover:border-blue-500 hover:bg-blue-50/20">
          <input
            ref={fileInputRef}
            type="file"
            // @ts-expect-error webkitdirectory is standard in browsers but missing from React default types
            webkitdirectory=""
            directory=""
            multiple
            onChange={handleDirectorySelect}
            className="hidden"
          />

          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-100 text-blue-600 shadow-inner">
            <FolderUp className="h-8 w-8" />
          </div>

          <h3 className="mt-4 text-base font-bold text-slate-900">
            Bilgisayarınızdan Ürün Klasörünü Seçin
          </h3>
          <p className="mx-auto mt-1.5 max-w-md text-xs text-slate-500 leading-relaxed">
            İçinde ürün alt klasörleri ve .webp / .jpg fotoğrafları bulunan ana klasörü seçin (Örn: <code>data.test-10</code> veya <code>data</code>).
          </p>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
            >
              <FolderUp className="h-4 w-4" />
              <span>Klasör Seç ve Tara</span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 border-t border-slate-100 pt-6 text-[11px] text-slate-400">
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>Çoklu Görsel Desteği (Ön & Arka Etiket)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>Durdurma & Devam Etme Kontrolü</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Check className="h-3.5 w-3.5 text-emerald-500" />
              <span>100/100 SEO & Uyumlu Araç Tablosu</span>
            </div>
          </div>
        </div>
      ) : (
        /* 3. Aktif Klasör & Kontrol Paneli */
        <div className="space-y-6">
          {/* Dashboard Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Klasör Bilgisi */}
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <Layers className="h-6 w-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm font-bold text-slate-900">{selectedFolderName}</span>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">
                      {totalCount} Ürün Klasörü
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Toplam {productGroups.reduce((acc, g) => acc + g.files.length, 0)} görsel yüklendi
                  </p>
                </div>
              </div>

              {/* Kontrol Butonları */}
              <div className="flex flex-wrap items-center gap-2">
                {!isRunning ? (
                  <button
                    type="button"
                    onClick={startProcessing}
                    className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-blue-500/25 hover:bg-blue-700 active:scale-95 transition-all cursor-pointer"
                  >
                    <Play className="h-4 w-4 fill-current" />
                    <span>{isPaused ? "Kaldığı Yerden Devam Et" : "İşlemi Başlat"}</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handlePause}
                    className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-4 py-2.5 text-xs font-bold text-white shadow-md shadow-amber-500/25 hover:bg-amber-600 active:scale-95 transition-all cursor-pointer"
                  >
                    <Pause className="h-4 w-4 fill-current" />
                    <span>Durdur / Duraklat</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleReset}
                  disabled={isRunning}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                  title="Durumu Sıfırla"
                >
                  <RotateCcw className="h-4 w-4" />
                  <span>Sıfırla</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    handleReset();
                    setProductGroups([]);
                    setSelectedFolderName(null);
                  }}
                  disabled={isRunning}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <FolderUp className="h-4 w-4" />
                  <span>Farklı Klasör</span>
                </button>
              </div>
            </div>

            {/* İlerleme Çubuğu */}
            <div className="mt-6 border-t border-slate-100 pt-5">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-700 mb-2">
                <span className="flex items-center gap-2">
                  <span>İlerleme Durumu</span>
                  {isRunning && (
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 animate-pulse">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      <span>Ürün {currentIndex + 1} işleniyor...</span>
                    </span>
                  )}
                  {isPaused && (
                    <span className="text-[11px] font-medium text-amber-600">Duraklatıldı</span>
                  )}
                </span>
                <span className="font-mono">{completedCount} / {totalCount} (%{progressPercent})</span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Ayarlar ve Filtreler */}
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-4 text-xs">
              <div className="flex flex-wrap items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={skipExisting}
                    onChange={(e) => setSkipExisting(e.target.checked)}
                    disabled={isRunning}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                  />
                  <span>Zaten Kayıtlı Olanları Atla</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={saveAsDraft}
                    onChange={(e) => setSaveAsDraft(e.target.checked)}
                    disabled={isRunning}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 accent-blue-600"
                  />
                  <span>Taslak Olarak Kaydet</span>
                </label>
              </div>

              {/* İstatistik Rozetleri */}
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-emerald-700 font-bold">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>{successCount} Başarılı</span>
                </span>
                <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-1 text-slate-600 font-bold">
                  <span>{skippedCount} Atlandı</span>
                </span>
                {errorCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-rose-700 font-bold">
                    <AlertCircle className="h-3 w-3" />
                    <span>{errorCount} Hata</span>
                  </span>
                )}
                <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2 py-1 text-blue-700 font-bold">
                  <Clock className="h-3 w-3" />
                  <span>{totalCount - completedCount} Kalan</span>
                </span>
              </div>
            </div>
          </div>

          {/* 4. Canlı Ürün Listesi ve Arama */}
          <div className="space-y-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">İşlem Listesi</h3>
                <span className="text-xs text-slate-500 font-mono">({filteredGroups.length} gösteriliyor)</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Arama Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="OEM, Raf Kodu veya Model ara..."
                    className="h-8 w-56 rounded-lg border border-slate-300 pl-8 pr-3 text-xs placeholder:text-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Filtre Butonları */}
                <div className="flex rounded-lg border border-slate-300 bg-white p-0.5 text-xs">
                  <button
                    type="button"
                    onClick={() => setStatusFilter("all")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      statusFilter === "all" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Tümü
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("success")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      statusFilter === "success" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Başarılı
                  </button>
                  <button
                    type="button"
                    onClick={() => setStatusFilter("pending")}
                    className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                      statusFilter === "pending" ? "bg-slate-900 text-white" : "text-slate-600 hover:text-slate-900"
                    }`}
                  >
                    Bekleyen
                  </button>
                </div>
              </div>
            </div>

            {/* Liste Kartları */}
            <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
              {filteredGroups.map((item, idx) => {
                const isCurrent = currentIndex === productGroups.findIndex((g) => g.id === item.id);

                return (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between gap-4 p-4 transition-colors ${
                      isCurrent
                        ? "bg-blue-50/50"
                        : item.status === "success"
                        ? "hover:bg-slate-50"
                        : item.status === "error"
                        ? "bg-rose-50/20"
                        : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      {/* Sıra & Durum İkonu */}
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-mono text-xs font-bold text-slate-700">
                        {item.status === "processing" ? (
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                        ) : item.status === "success" ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : item.status === "skipped" ? (
                          <Check className="h-4 w-4 text-slate-400" />
                        ) : item.status === "error" ? (
                          <AlertCircle className="h-5 w-5 text-rose-600" />
                        ) : (
                          <span>{idx + 1}</span>
                        )}
                      </div>

                      {/* Ürün & OEM Detayları */}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900">
                            {item.shelfCode}
                          </span>
                          {item.result?.oemNumber && (
                            <span className="rounded-md bg-blue-100 px-2 py-0.5 font-mono text-[11px] font-bold text-blue-800">
                              OEM: {item.result.oemNumber}
                            </span>
                          )}
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                            {item.files.length} Görsel
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {item.categoryHint} &bull; {item.brandHint}
                          </span>
                        </div>

                        <p className="mt-0.5 truncate text-xs text-slate-600">
                          {item.result?.title ? (
                            item.result.title
                          ) : (
                            <span className="text-slate-400 italic">
                              {item.status === "processing"
                                ? "Gemini Vision ile görsel analiz ediliyor..."
                                : "İşlem sırası bekliyor..."}
                            </span>
                          )}
                        </p>

                        {item.error && (
                          <p className="mt-1 text-[11px] font-medium text-rose-600">
                            Hata: {item.error}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sağ Taraf: Kategori & Aksiyon */}
                    <div className="flex shrink-0 items-center gap-3">
                      {item.result?.categoryName && (
                        <span className="hidden sm:inline-block rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-slate-700">
                          {item.result.categoryName}
                        </span>
                      )}

                      {item.result?.slug ? (
                        <Link
                          href={`/urunler/${item.result.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>İncele</span>
                          <ExternalLink className="h-3 w-3 text-slate-400" />
                        </Link>
                      ) : item.status === "idle" && !isRunning ? (
                        <button
                          type="button"
                          onClick={() => {
                            const realIdx = productGroups.findIndex((g) => g.id === item.id);
                            if (realIdx !== -1) processItem(realIdx);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-blue-600 hover:text-white transition-colors cursor-pointer"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Tekli İşle</span>
                        </button>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
