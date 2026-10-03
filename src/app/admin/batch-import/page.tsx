"use client";

import React, { useState, useRef, useMemo, useEffect } from "react";
import { useQuery, useMutation, useConvex } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  FolderUp,
  Play,
  Pause,
  CheckCircle2,
  AlertCircle,
  File,
  Search,
  Check,
  Loader2,
  Zap,
} from "lucide-react";
import {
  importSlug,
  groupProductFiles,
  type ProductFileGroup,
} from "./import-files";
import { sanitizeTurkishText } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import AdminPageHeader from "@/components/admin/AdminPageHeader";

type StatusFilter = "all" | "success" | "skipped" | "error" | "pending";

export default function BatchImportPage() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Convex Data
  const categories = useQuery(api.categories.list, { onlyActive: false }) || [];
  const brands = useQuery(api.brands.list, { onlyActive: false }) || [];
  const convex = useConvex();

  const createProduct = useMutation(api.products.create);
  const updateProduct = useMutation(api.products.update);

  // State
  const [productGroups, setProductGroups] = useState<ProductFileGroup[]>([]);
  const [selectedFolderName, setSelectedFolderName] = useState<string | null>(
    null,
  );
  const [phase, setPhase] = useState<"idle" | "running" | "pausing" | "paused">(
    "idle",
  );
  const isRunning = phase === "running" || phase === "pausing";
  const isPaused = phase === "paused";
  const [runMode, setRunMode] = useState<"ai" | "draft">("ai");
  const [skipExisting, setSkipExisting] = useState(true);
  const [searchFilter, setSearchFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  // Her zaman varsayılan en yüksek performans: 8x Ultra Mod
  const ULTRA_CONCURRENCY = 8;

  // Keep a ref to isRunning / isPaused to break out of processing loops instantly
  const shouldStopRef = useRef(false);
  const poolActiveRef = useRef(false);

  useEffect(
    () => () => {
      shouldStopRef.current = true;
    },
    [],
  );

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
          "Toplu yükleme sürüyor. Ayrılırsanız işlem durur. Çıkılsın mı?",
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

  // Handle Directory Selection
  const handleDirectorySelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (poolActiveRef.current) return;
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const files = Array.from(fileList);
    const { rootName, groups: newGroups } = groupProductFiles(files);
    setSelectedFolderName(rootName);

    setProductGroups(newGroups);
    setPhase("idle");
    shouldStopRef.current = false;
  };

  // Helper: Category Matching
  const matchCategory = (
    categoryHint: string,
    aiCategoryId?: string,
    aiCategoryName?: string,
  ) => {
    if (aiCategoryId) {
      const found = categories.find((c) => c._id === aiCategoryId);
      if (found) return found;
    }
    if (aiCategoryName) {
      const cleanAiName = aiCategoryName.toLowerCase();
      const found = categories.find(
        (c) =>
          c.name.toLowerCase().includes(cleanAiName) ||
          cleanAiName.includes(c.name.toLowerCase()),
      );
      if (found) return found;
    }
    const hint = categoryHint.toLowerCase();
    if (hint.includes("ecu") || hint.includes("motor")) {
      return (
        categories.find((c) => c.slug === "motor-beyinleri-ecu") ||
        categories[0]
      );
    }
    if (hint.includes("abs") || hint.includes("esp")) {
      return (
        categories.find((c) => c.slug === "abs-esp-beyinleri") || categories[0]
      );
    }
    if (hint.includes("airbag") || hint.includes("srs")) {
      return (
        categories.find((c) => c.slug === "airbag-beyinleri") || categories[0]
      );
    }
    if (hint.includes("sigorta")) {
      return (
        categories.find((c) => c.slug === "sigorta-kutulari") || categories[0]
      );
    }
    if (
      hint.includes("modül") ||
      hint.includes("bcm") ||
      hint.includes("bsi")
    ) {
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

    // Set processing state
    setProductGroups((prev) =>
      prev.map((g, i) =>
        i === index ? { ...g, status: "processing", error: undefined } : g,
      ),
    );

    try {
      const shelfCode = item.shelfCode.trim();
      const existing = shelfCode
        ? await convex.query(api.products.getByShelfCode, { shelfCode })
        : null;
      // Disk üzerindeki görsel dosyasının gerçekten var olup olmadığını (silinip silinmediğini) kontrol et
      let hasValidImages = false;
      if (existing?.images && existing.images.length > 0) {
        try {
          const checkRes = await fetch(existing.images[0], { method: "HEAD" });
          hasValidImages = checkRes.ok;
        } catch {
          hasValidImages = false;
        }
      }

      const isAlreadyComplete = Boolean(
        existing?.oemNumber && existing.title && existing.oemNumber.trim() && hasValidImages,
      );

      // Eğer ürünün her şeyi tamsa ve görselleri de diskte gerçekten mevcutsa AI çalıştırmadan atla
      if (skipExisting && isAlreadyComplete && existing) {
        setProductGroups((prev) =>
          prev.map((group, groupIndex) =>
            groupIndex === index
              ? {
                  ...group,
                  status: "skipped",
                  result: {
                    productId: existing._id,
                    oemNumber: existing.oemNumber,
                    title: existing.title,
                    brand: existing.brand,
                    model: existing.model,
                    imageUrl: existing.images?.[0],
                  },
                }
              : group,
          ),
        );
        return;
      }

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
        throw new Error(data.error || "OEM analizi başarısız oldu.");
      }

      // 3. AI okumasından sonra: OEM veya Raf Kodu ile eşleşen ürün varsa YALNIZCA görselleri güncelle, bilgileri değiştirme!
      const matchedOemProduct = await convex.mutation(api.products.appendImagesByOem, {
        oemNumbers: data.oemNumber ? [data.oemNumber, data.cleanOemNumber || data.oemNumber] : [],
        images: data.images,
        shelfCode: item.shelfCode,
      });

      if (matchedOemProduct) {
        setProductGroups((prev) =>
          prev.map((group, groupIndex) =>
            groupIndex === index
              ? {
                  ...group,
                  status: "success",
                  result: {
                    productId: matchedOemProduct.productId,
                    oemNumber: matchedOemProduct.oemNumber,
                    title: matchedOemProduct.title,
                    brand: matchedOemProduct.brand,
                    model: matchedOemProduct.model,
                    imageUrl: matchedOemProduct.imageUrl,
                    updatedOnlyImages: true,
                  },
                }
              : group,
          ),
        );
        return;
      }

      // 3. Match Category
      const matchedCat = matchCategory(
        item.categoryHint,
        data.matchedCategoryId,
        data.suggestedCategoryName,
      );
      if (!matchedCat) throw new Error("Aktarım için bir kategori ekleyin.");

      // 4. Save to Convex (Update existing draft or Create new)
      const isDraft = Boolean(data.isDraft);
      const cleanCatName = matchedCat.name;
      const resolvedTitle = isDraft
        ? `${data.brand || item.brandHint} ${cleanCatName} - Raf: ${item.shelfCode} (İNCELEME GEREKLİ)`
        : data.title;
      const finalTitle = sanitizeTurkishText(resolvedTitle);

      const baseSlug = importSlug(finalTitle || item.shelfCode);
      const finalSlug = isDraft
        ? ""
        : `${baseSlug}-${Date.now().toString().slice(-4)}`;
      const payload = {
        title: finalTitle,
        slug: finalSlug,
        oemNumber: data.oemNumber,
        shelfCode: item.shelfCode,
        categoryId: matchedCat._id,
        brand: sanitizeTurkishText(data.brand || item.brandHint),
        model: sanitizeTurkishText(data.model || ""),
        condition: data.condition || "Orijinal Çıkma",
        inStock: true,
        description: data.description,
        images: data.images?.length ? data.images : (existing?.images || []),
        metaTitle: isDraft
          ? ""
          : sanitizeTurkishText(data.metaTitle || finalTitle.slice(0, 60)),
        metaDescription: data.metaDescription,
        metaKeywords: data.metaKeywords,
        tags: isDraft ? [] : data.tags,
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
                  title: finalTitle,
                  brand: sanitizeTurkishText(data.brand || item.brandHint),
                  model: sanitizeTurkishText(data.model || ""),
                  imageUrl: data.images?.[0],
                },
              }
            : g,
        ),
      );
    } catch (err: unknown) {
      console.error("Error processing item:", err);
      setProductGroups((prev) =>
        prev.map((g, i) =>
          i === index
            ? {
                ...g,
                status: "error",
                error: err instanceof Error ? err.message : "Bilinmeyen hata",
              }
            : g,
        ),
      );
    }
  };

  // Doğrudan Taslak Olarak Kaydeden Tekil İşleyici (AI çalıştırmadan hızlı yükler)
  const processDraftItem = async (index: number) => {
    const item = productGroups[index];
    if (!item) return;

    setProductGroups((prev) =>
      prev.map((g, i) =>
        i === index ? { ...g, status: "processing", error: undefined } : g,
      ),
    );

    try {
      const shelfCode = item.shelfCode.trim();
      const existing = shelfCode
        ? await convex.query(api.products.getByShelfCode, { shelfCode })
        : null;

      let hasValidImages = false;
      if (existing?.images && existing.images.length > 0) {
        try {
          const checkRes = await fetch(existing.images[0], { method: "HEAD" });
          hasValidImages = checkRes.ok;
        } catch {
          hasValidImages = false;
        }
      }

      if (skipExisting && existing && hasValidImages) {
        setProductGroups((prev) =>
          prev.map((group, groupIndex) =>
            groupIndex === index
              ? {
                  ...group,
                  status: "skipped",
                  result: {
                    productId: existing._id,
                    oemNumber: existing.oemNumber,
                    title: existing.title,
                    brand: existing.brand,
                    model: existing.model,
                    imageUrl: existing.images?.[0],
                  },
                }
              : group,
          ),
        );
        return;
      }

      // 1. Görselleri yükle
      const uploadedUrls: string[] = [];
      const formData = new FormData();
      for (const file of item.files) {
        formData.append("files", file, file.name);
      }

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Görseller yüklenemedi.");
      }

      const uploadData = await uploadRes.json();
      if (Array.isArray(uploadData.urls)) {
        uploadedUrls.push(...uploadData.urls);
      }

      // 2. Eğer ürün zaten sistemde varsa yalnızca görsellerini ekle
      if (existing) {
        const updated = await convex.mutation(api.products.appendImagesByOem, {
          oemNumbers: existing.oemNumber ? [existing.oemNumber] : [],
          images: uploadedUrls,
          shelfCode: item.shelfCode,
        });

        if (updated) {
          setProductGroups((prev) =>
            prev.map((g, i) =>
              i === index
                ? {
                    ...g,
                    status: "success",
                    result: {
                      productId: updated.productId,
                      oemNumber: updated.oemNumber,
                      title: updated.title,
                      brand: updated.brand,
                      model: updated.model,
                      imageUrl: updated.imageUrl,
                      updatedOnlyImages: true,
                    },
                  }
                : g,
            ),
          );
          return;
        }
      }

      // 3. Kategori eşleştir
      const matchedCat = matchCategory(item.categoryHint);
      if (!matchedCat) throw new Error("Aktarım için bir kategori ekleyin.");

      // 4. Yeni Taslak Ürünü Kaydet
      const fallbackTitle =
        item.shelfCode && item.shelfCode !== "GENEL"
          ? `${item.shelfCode} Oto Elektronik Parça`
          : "Taslak Parça";
      const generatedSlug = importSlug(
        `${item.shelfCode || "taslak"}-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`,
      );

      const payload = {
        title: fallbackTitle,
        slug: generatedSlug,
        oemNumber:
          item.shelfCode && item.shelfCode !== "GENEL" ? item.shelfCode : "",
        shelfCode:
          item.shelfCode && item.shelfCode !== "GENEL"
            ? item.shelfCode
            : undefined,
        categoryId: matchedCat._id,
        brand:
          item.brandHint && item.brandHint !== "Genel"
            ? item.brandHint
            : "Genel Uyumlu",
        condition: "Orijinal Çıkma",
        inStock: true,
        isDraft: true,
        images: uploadedUrls,
        description: `${fallbackTitle} orijinal çıkma oto elektronik parça.`,
      };

      const finalProductId = await createProduct(payload);

      setProductGroups((prev) =>
        prev.map((g, i) =>
          i === index
            ? {
                ...g,
                status: "success",
                result: {
                  productId: finalProductId,
                  oemNumber: payload.oemNumber,
                  title: payload.title,
                  brand: payload.brand,
                  imageUrl: uploadedUrls[0],
                },
              }
            : g,
        ),
      );
    } catch (err: unknown) {
      console.error("Error processing draft item:", err);
      setProductGroups((prev) =>
        prev.map((g, i) =>
          i === index
            ? {
                ...g,
                status: "error",
                error: err instanceof Error ? err.message : "Bilinmeyen hata",
              }
            : g,
        ),
      );
    }
  };

  // Main Concurrency Worker Pool Handler (Hem AI hem Taslak modunu destekler)
  const startProcessing = async (
    mode: "ai" | "draft" = runMode,
    onlyIndex?: number,
  ) => {
    if (poolActiveRef.current || categories.length === 0) return;
    setRunMode(mode);
    shouldStopRef.current = false;

    // İşlenmeyi bekleyen (idle veya error) parçaların indeks listesi
    const pendingIndices: number[] = [];
    productGroups.forEach((g, idx) => {
      if (
        (onlyIndex === undefined || idx === onlyIndex) &&
        (g.status === "idle" || g.status === "error")
      ) {
        pendingIndices.push(idx);
      }
    });

    if (pendingIndices.length === 0) {
      return;
    }
    poolActiveRef.current = true;
    setPhase("running");

    let nextQueueIdx = 0;
    const workerCount = Math.max(
      1,
      Math.min(ULTRA_CONCURRENCY, pendingIndices.length),
    );

    const runWorker = async () => {
      while (nextQueueIdx < pendingIndices.length) {
        if (shouldStopRef.current) break;

        const currentItemIndex = pendingIndices[nextQueueIdx++];
        if (currentItemIndex === undefined) break;

        if (mode === "ai") {
          await processItem(currentItemIndex);
        } else {
          await processDraftItem(currentItemIndex);
        }

        if (!shouldStopRef.current && nextQueueIdx < pendingIndices.length) {
          // UI render ve akıcılık için kısa bekleme
          await new Promise((resolve) =>
            setTimeout(resolve, mode === "ai" ? 150 : 80),
          );
        }
      }
    };

    try {
      await Promise.all(Array.from({ length: workerCount }, () => runWorker()));
    } finally {
      poolActiveRef.current = false;
      setPhase(shouldStopRef.current ? "paused" : "idle");
    }
  };

  // Pause Handler
  const handlePause = () => {
    shouldStopRef.current = true;
    setPhase("pausing");
  };

  // Reset Handler
  const handleReset = () => {
    if (poolActiveRef.current) return;
    shouldStopRef.current = true;
    setPhase("idle");
    setProductGroups((prev) =>
      prev.map((g) => ({
        ...g,
        status: "idle",
        error: undefined,
        result: undefined,
      })),
    );
  };

  // Counts & Progress
  const totalCount = productGroups.length;
  const processingCount = productGroups.filter(
    (g) => g.status === "processing",
  ).length;
  const successCount = productGroups.filter(
    (g) => g.status === "success",
  ).length;
  const skippedCount = productGroups.filter(
    (g) => g.status === "skipped",
  ).length;
  const errorCount = productGroups.filter((g) => g.status === "error").length;
  const completedCount = successCount + skippedCount + errorCount;
  const pendingCount = totalCount - completedCount;
  const progressPercent =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;
  const statusFilters: {
    value: StatusFilter;
    label: string;
    count?: number;
  }[] = [
    { value: "all", label: "Tümü" },
    { value: "success", label: "Başarılı", count: successCount },
    { value: "skipped", label: "Atlandı", count: skippedCount },
    { value: "pending", label: "Bekleyen", count: pendingCount },
  ];
  if (errorCount > 0) {
    statusFilters.push({ value: "error", label: "Hata", count: errorCount });
  }

  // Filtered List
  const filteredGroups = useMemo(() => {
    return productGroups.filter((item) => {
      // Status filter
      if (statusFilter === "success" && item.status !== "success") return false;
      if (statusFilter === "skipped" && item.status !== "skipped") return false;
      if (statusFilter === "error" && item.status !== "error") return false;
      if (
        statusFilter === "pending" &&
        item.status !== "idle" &&
        item.status !== "processing"
      )
        return false;

      // Search term
      if (searchFilter.trim()) {
        const term = searchFilter.trim().toLocaleLowerCase("tr-TR");
        return [
          item.shelfCode,
          item.result?.oemNumber,
          item.result?.title,
          item.brandHint,
          item.result?.brand,
          item.result?.model,
        ].some((value) => value?.toLocaleLowerCase("tr-TR").includes(term));
      }
      return true;
    });
  }, [productGroups, statusFilter, searchFilter]);

  return (
    <div className="min-w-0 space-y-5 sm:space-y-6">
      {/* Header */}
      <AdminPageHeader
        title="Toplu Aktarım"
        badge={
          productGroups.length > 0
            ? `${productGroups.length} parça grubu`
            : undefined
        }
        description="Parça görsellerini klasör yapısıyla önizleyip sisteme toplu aktarın."
        actions={
          productGroups.length > 0 ? (
            <Button
              type="button"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 w-full gap-2 rounded-full px-5 sm:w-auto"
            >
              <FolderUp className="h-4 w-4" />
              <span>Farklı klasör seç</span>
            </Button>
          ) : (
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="h-12 w-full gap-2 rounded-full px-5 sm:w-auto"
            >
              <FolderUp className="h-4 w-4" />
              <span>Klasör seç</span>
            </Button>
          )
        }
      />
      {/* 2. Klasör Seçim Kutusu (Dropzone) */}
      {productGroups.length === 0 ? (
        <div className="relative overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-white p-6 text-center transition-colors hover:border-blue-500 hover:bg-blue-50/20 sm:p-10">
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

          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-700 sm:h-16 sm:w-16">
            <FolderUp className="h-7 w-7 sm:h-8 sm:w-8" />
          </div>

          <h2 className="mt-4 text-lg font-semibold text-slate-900 sm:text-xl">
            Parça klasörlerini seçin
          </h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
            Parça alt klasörlerini içeren ana klasörü seçin. Seçtiğinizde parça
            listesi önizlenecek; ister yapay zeka ile analiz edebilir, ister
            doğrudan hızlı taslak olarak aktarabilirsiniz.
          </p>

          <div className="mt-6 flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-5 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 sm:w-auto"
            >
              <FolderUp className="h-4 w-4" />
              <span>Klasör seç ve önizle</span>
            </button>
          </div>
        </div>
      ) : (
        /* 3. Aktif Klasör & Kontrol Paneli */
        <div className="min-w-0 space-y-5 sm:space-y-6">
          {/* Dashboard Bar */}
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              {/* Klasör Bilgisi */}
              <div className="min-w-0 flex items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                  <File className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="max-w-full truncate font-mono text-sm font-semibold text-slate-900">
                      {selectedFolderName}
                    </span>
                    <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700">
                      {totalCount} parça
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {productGroups.reduce((acc, g) => acc + g.files.length, 0)}{" "}
                    görsel
                  </p>
                </div>
              </div>

              {/* Kontrol Butonları */}
              <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap sm:items-center">
                {!isRunning ? (
                  <>
                    <button
                      type="button"
                      onClick={() => startProcessing("ai")}
                      disabled={categories.length === 0}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-blue-600 px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 sm:w-auto"
                      title="Yapay zeka ile görselleri tarayıp OEM, başlık ve marka bilgilerini otomatik çıkartır"
                    >
                      <Play className="h-4 w-4 fill-current" />
                      <span>
                        {isPaused && runMode === "ai"
                          ? "Devam et (AI)"
                          : "AI ile Başlat"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => startProcessing("draft")}
                      disabled={categories.length === 0}
                      className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-emerald-700 px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-emerald-800 sm:w-auto"
                      title="AI analizi yapmadan görselleri hızlıca yükleyip doğrudan taslak ürünler oluşturur"
                    >
                      <Zap className="h-4 w-4 fill-current" />
                      <span>
                        {isPaused && runMode === "draft"
                          ? "Devam et (Taslak)"
                          : "Taslak Olarak Başlat"}
                      </span>
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handlePause}
                    disabled={phase === "pausing"}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-amber-600 px-4 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-amber-700 sm:w-auto"
                  >
                    <Pause className="h-4 w-4 fill-current" />
                    <span>
                      {phase === "pausing" ? "Duraklatılıyor…" : "Duraklat"}
                    </span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => {
                    handleReset();
                    setProductGroups([]);
                    setSelectedFolderName(null);
                  }}
                  disabled={isRunning}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full border border-slate-300 bg-white px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50 sm:w-auto"
                >
                  <FolderUp className="h-4 w-4" />
                  <span>Klasör değiştir</span>
                </button>
              </div>
            </div>

            {/* İlerleme Çubuğu */}
            <div className="mt-5 border-t border-slate-100 pt-4 sm:mt-6 sm:pt-5">
              <div className="mb-3 flex flex-col gap-2 text-sm font-medium text-slate-700 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span>İlerleme</span>
                  {isRunning && (
                    <span className="inline-flex flex-wrap items-center gap-1.5 text-xs font-medium text-blue-700">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold border ${
                          runMode === "ai"
                            ? "bg-blue-50 text-blue-700 border-blue-200"
                            : "bg-emerald-50 text-emerald-700 border-emerald-200"
                        }`}
                      >
                        <Zap
                          className={`h-3 w-3 ${runMode === "ai" ? "fill-blue-600 text-blue-600" : "fill-emerald-600 text-emerald-600"}`}
                        />
                        {runMode === "ai" ? "8x AI Modu" : "Hızlı Taslak Modu"}
                      </span>
                      <span>
                        (
                        {processingCount > 0
                          ? `${processingCount} parça`
                          : "parçalar"}{" "}
                        işleniyor)
                      </span>
                    </span>
                  )}
                  {isPaused && (
                    <span className="text-[11px] font-medium text-amber-600">
                      Duraklatıldı
                    </span>
                  )}
                </span>
                <span className="font-mono text-xs text-slate-600 sm:text-right">
                  {completedCount} / {totalCount} (%{progressPercent})
                </span>
              </div>

              <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-blue-600 transition-all duration-300 ease-out"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
            </div>

            {/* Yükleme Ayarı & Ultra Mod Göstergesi */}
            <div className="mt-5 flex flex-col gap-3 border-t border-slate-100 pt-4 text-sm sm:flex-row sm:items-center sm:justify-between">
              <label className="flex w-fit items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={skipExisting}
                  onChange={(e) => setSkipExisting(e.target.checked)}
                  disabled={isRunning}
                  className="h-5 w-5 rounded border-slate-300 text-blue-600 accent-blue-600"
                />
                <span>Kayıtlı parçaları atla</span>
              </label>

              {/* Sabit Ultra Mod Rozeti */}
              <div className="inline-flex w-fit max-w-full items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 py-2 text-xs font-medium text-blue-700">
                <Zap className="h-4 w-4 shrink-0 fill-blue-600 text-blue-600" />
                <span>Ultra Mod Aktif (8x Eşzamanlı Tarama)</span>
              </div>
            </div>
          </div>

          {/* 4. Canlı Parça Listesi ve Arama */}
          <div className="min-w-0 space-y-3">
            <div className="flex flex-col gap-3 lg:flex-row-reverse lg:items-center lg:justify-between">
              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center">
                <h3 className="text-sm font-bold text-slate-900">
                  İşlem listesi
                </h3>
                <span className="text-xs text-slate-500 font-mono">
                  ({filteredGroups.length} kayıt)
                </span>
              </div>

              <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                {/* Arama Input */}
                <div className="relative w-full sm:w-64">
                  <Search
                    aria-hidden="true"
                    className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500"
                  />
                  <input
                    type="text"
                    aria-label="Toplu aktarım kayıtlarında ara"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="OEM, raf kodu veya model ara"
                    className="h-12 w-full rounded-full border border-slate-300 bg-white pl-11 pr-4 text-base! text-slate-900 placeholder:text-slate-500 focus:border-blue-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-200 sm:text-sm!"
                  />
                </div>

                {/* Filtre Butonları */}
                <div
                  role="group"
                  aria-label="Duruma göre filtrele"
                  className="flex max-w-full overflow-x-auto rounded-full border border-slate-200 bg-white p-1 text-sm"
                >
                  {statusFilters.map((filter) => (
                    <button
                      key={filter.value}
                      type="button"
                      aria-pressed={statusFilter === filter.value}
                      onClick={() => setStatusFilter(filter.value)}
                      className={`inline-flex h-10 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full px-3 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
                        statusFilter === filter.value
                          ? "bg-blue-50 text-blue-800"
                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                    >
                      <span>{filter.label}</span>
                      {filter.count !== undefined && (
                        <span className="font-mono text-[10px] opacity-70">
                          {filter.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Liste Kartları */}
            <div className="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              {filteredGroups.map((item, idx) => {
                const isCurrent = item.status === "processing";

                return (
                  <div
                    key={item.id}
                    className={`flex flex-col gap-3 p-3 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-4 ${
                      isCurrent
                        ? "bg-blue-50/50"
                        : item.status === "success"
                          ? "hover:bg-slate-50"
                          : item.status === "error"
                            ? "bg-rose-50/20"
                            : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex min-w-0 items-start gap-3">
                      {/* Sıra & Durum İkonu */}
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 font-mono text-xs font-bold text-slate-700">
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

                      {/* Parça & OEM Detayları */}
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-mono text-xs font-semibold text-slate-900 [overflow-wrap:anywhere]">
                            {item.shelfCode}
                          </span>
                          {item.result?.oemNumber && (
                            <span className="max-w-full rounded-full bg-blue-50 px-2.5 py-1 font-mono text-xs font-medium text-blue-800 [overflow-wrap:anywhere]">
                              OEM: {item.result.oemNumber}
                            </span>
                          )}
                          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                            {item.files.length} Görsel
                          </span>
                          <span className="text-xs text-slate-500">
                            {item.categoryHint} &bull; {item.brandHint}
                          </span>
                        </div>

                        <p className="mt-1 truncate text-sm text-slate-700">
                          {item.result?.title ? (
                            item.result.title
                          ) : (
                            <span className="text-slate-400 italic">
                              {item.status === "processing"
                                ? "Görsel analiz ediliyor..."
                                : "Sırada..."}
                            </span>
                          )}
                        </p>

                        {item.error && (
                          <p className="mt-1 text-xs font-medium text-rose-700 [overflow-wrap:anywhere]">
                            Hata: {item.error}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Sağ Taraf: Durum Bilgisi & Aksiyon */}
                    <div className="ml-13 flex shrink-0 items-center justify-end gap-2 sm:ml-0">
                      {item.status === "skipped" && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-100/90 px-3.5 py-1.5 text-xs font-semibold text-slate-600 shadow-2xs">
                          <Check className="h-3.5 w-3.5 text-slate-500" />
                          <span>Zaten kayıtlı · Atlandı</span>
                        </div>
                      )}

                      {item.status === "success" && (
                        item.result?.updatedOnlyImages ? (
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3.5 py-1.5 text-xs font-semibold text-emerald-800 shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>Görseller güncellendi</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-800 shadow-2xs">
                            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
                            <span>Yeni parça eklendi</span>
                          </div>
                        )
                      )}

                      {item.status === "processing" && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-blue-50 px-3.5 py-1.5 text-xs font-semibold text-blue-800 shadow-2xs">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-blue-600" />
                          <span>İşleniyor…</span>
                        </div>
                      )}

                      {item.status === "error" && (
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3.5 py-1.5 text-xs font-semibold text-rose-800 shadow-2xs">
                          <AlertCircle className="h-3.5 w-3.5 text-rose-600" />
                          <span>İşlem başarısız</span>
                        </div>
                      )}

                      {item.status === "idle" && (
                        !isRunning ? (
                          <button
                            type="button"
                            onClick={() => {
                              const realIdx = productGroups.findIndex(
                                (g) => g.id === item.id,
                              );
                              if (realIdx !== -1) {
                                void startProcessing(runMode, realIdx);
                              }
                            }}
                            className="inline-flex h-11 items-center justify-center gap-2 rounded-full bg-slate-100 px-4 text-sm font-medium text-slate-700 transition-colors hover:bg-blue-50 hover:text-blue-800"
                          >
                            <Play className="h-3 w-3 fill-current" />
                            <span>
                              {runMode === "draft"
                                ? "Taslak kaydet"
                                : "AI ile işle"}
                            </span>
                          </button>
                        ) : (
                          <span className="text-xs font-medium text-slate-400">
                            Sırada bekliyor
                          </span>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredGroups.length === 0 && (
                <div className="p-8 text-center text-sm text-slate-500">
                  Filtreye uygun kayıt bulunamadı.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
