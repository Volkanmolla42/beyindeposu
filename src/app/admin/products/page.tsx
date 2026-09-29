"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Plus,
  Search,
  Trash2,
  Cpu,
  X,
  Eye,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Table,
  LayoutList,
  RotateCw,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ProductFormModal } from "./ProductFormModal";
import { ProductLightboxModal, type LightboxState } from "./ProductLightboxModal";

type Product = Doc<"products">;

export default function AdminProductsPage() {
  const [searchProduct, setSearchProduct] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [draftStatus, setDraftStatus] = useState<"all" | "draft" | "published">("all");
  const [stockFilter, setStockFilter] = useState<"all" | "in_stock" | "out_of_stock">("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const [viewMode, setViewMode] = useState<"table" | "list">("table");

  useEffect(() => {
    try {
      const saved = localStorage.getItem("admin_products_view_mode");
      if (saved === "table" || saved === "list") {
        setViewMode(saved);
      } else if (typeof window !== "undefined" && window.innerWidth < 768) {
        setViewMode("list");
      }
    } catch {
      // ignore localStorage errors
    }
  }, []);

  const handleSetViewMode = (mode: "table" | "list") => {
    setViewMode(mode);
    try {
      localStorage.setItem("admin_products_view_mode", mode);
    } catch {
      // ignore
    }
  };

  const [pagination, setPagination] = useState<{
    key: string;
    page: number;
    cursors: Array<string | null>;
  } | null>(null);

  const resetPage = () => {
    setPagination(null);
  };

  // Arama girdisini 300ms gecikmeli sorguya ilet (Convex query optimizasyonu)
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchProduct);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchProduct]);

  // Product Modals State
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Lightbox State
  const [lightbox, setLightbox] = useState<LightboxState | null>(null);
  const openLightbox = (images: string[], index = 0) => {
    setLightbox({ images, index });
  };

  // Hover preview (floating near cursor)
  const [hoverPreview, setHoverPreview] = useState<{ src: string; x: number; y: number } | null>(null);

  const productFilters = {
    searchTerm: debouncedSearch.trim() || undefined,
    categorySlug: selectedCategoryFilter || undefined,
    brand: selectedBrandFilter || undefined,
    draftStatus,
    stockStatus: stockFilter !== "all" ? stockFilter : undefined,
  };

  const paginationKey = JSON.stringify({ ...productFilters, pageSize });
  const currentPagination = pagination?.key === paginationKey
    ? pagination
    : { key: paginationKey, page: 1, cursors: [null] };
  const currentPage = currentPagination.page;

  const pageData = useQuery(api.products.listPaginatedAdmin, {
    ...productFilters,
    paginationOpts: {
      numItems: pageSize,
      cursor: currentPagination.cursors[currentPage - 1] ?? null,
    },
  });

  const categories = useQuery(api.categories.list, { onlyActive: false });
  const brands = useQuery(api.brands.list, { onlyActive: false });
  const productStats = useQuery(api.products.getStats);
  const syncProductStats = useMutation(api.products.syncProductStats);
  const [isSyncingStats, setIsSyncingStats] = useState(false);

  const handleSyncStats = async () => {
    try {
      setIsSyncingStats(true);
      await syncProductStats({});
    } catch (err) {
      console.error("Stats sync error:", err);
    } finally {
      setIsSyncingStats(false);
    }
  };

  const products = pageData?.page;
  const isDone = pageData?.isDone ?? true;

  // Mutations
  const deleteProduct = useMutation(api.products.deleteProduct);
  const toggleStock = useMutation(api.products.toggleStock);

  const handleToggleStock = async (p: Product) => {
    try {
      await toggleStock({ id: p._id, inStock: !p.inStock });
    } catch (err) {
      console.error("Stok güncelleme hatası:", err);
    }
  };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
    selectedCategoryFilter ||
    selectedBrandFilter ||
    draftStatus !== "all" ||
    stockFilter !== "all"
  );

  const handleClearFilters = () => {
    setSearchProduct("");
    setDebouncedSearch("");
    setSelectedCategoryFilter("");
    setSelectedBrandFilter("");
    setDraftStatus("all");
    setStockFilter("all");
    resetPage();
  };

  const handleOpenAddProduct = () => {
    setEditingProduct(null);
    setAddProductModalOpen(true);
  };

  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setAddProductModalOpen(true);
  };

  const handleDeleteProduct = async (p: Product) => {
    if (confirm(`'${p.oemNumber} - ${p.title}' parçası silinsin mi?`)) {
      await deleteProduct({ id: p._id });
    }
  };

  const handlePageChange = (direction: "previous" | "next") => {
    if (direction === "previous" && currentPage > 1) {
      setPagination({ ...currentPagination, page: currentPage - 1 });
    } else if (direction === "next" && pageData && !pageData.isDone) {
      const cursors = currentPagination.cursors.slice(0, currentPage + 1);
      cursors[currentPage] = pageData.continueCursor;
      setPagination({ ...currentPagination, page: currentPage + 1, cursors });
    } else {
      return;
    }
    window.scrollTo({ top: 120, behavior: "smooth" });
  };

  const renderPaginationBar = (position: "top" | "bottom") => {
    return (
      <div
        className={`flex flex-col md:flex-row items-stretch md:items-center justify-between gap-2 px-3 py-2 bg-slate-50/90 text-xs ${
          position === "top" ? "border-b border-slate-200" : "border-t border-slate-200"
        }`}
      >
        {position === "top" ? (
          /* Üst Çubuk - Sol: Yeni Parça, Arama ve Filtre Temizleme */
          <div className="flex items-center gap-2 min-w-0 w-full md:w-auto md:flex-1">
            <Button
              type="button"
              onClick={handleOpenAddProduct}
              size="sm"
              className="h-8 justify-center gap-1.5 rounded-lg bg-blue-600 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 px-3 transition-colors cursor-pointer shrink-0"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Yeni parça</span>
            </Button>

            <div className="relative flex-1 md:w-72 lg:w-80 xl:w-96 md:flex-none min-w-0">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400 pointer-events-none" />
              <Input
                placeholder="OEM, parça adı veya raf kodu ara..."
                value={searchProduct}
                onChange={(e) => {
                  setSearchProduct(e.target.value);
                  resetPage();
                }}
                className="h-8 w-full rounded-lg border-slate-200 bg-white pl-8 pr-2.5 text-xs text-slate-900 focus:bg-white"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearFilters}
                className="inline-flex items-center gap-1 h-8 px-2.5 rounded-lg border border-red-200 bg-red-50 text-red-700 hover:bg-red-100 text-xs font-semibold transition-colors cursor-pointer shrink-0"
              >
                <X className="w-3 h-3" />
                <span>Filtreleri Temizle</span>
              </button>
            )}
          </div>
        ) : (
          /* Alt Çubuk - Sol: Toplam Bilgisi */
          <div className="text-xs text-slate-600 font-medium">
            {productStats
              ? `Toplam ${productStats.total.toLocaleString("tr-TR")} parça`
              : products
                ? `${products.length} parça listelendi`
                : "Yükleniyor..."}
          </div>
        )}

        {/* Sağ: Sayfalama & Görünüm */}
        <div className="flex items-center justify-between md:justify-end gap-1.5 w-full md:w-auto shrink-0 md:ml-auto">
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handlePageChange("previous")}
              disabled={currentPage <= 1}
              title="Önceki sayfa"
              className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>

            <span className="px-2 py-1 text-xs font-bold text-white bg-blue-600 rounded-lg select-none min-w-[58px] text-center shadow-2xs">
              Sayfa {currentPage}
            </span>

            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => handlePageChange("next")}
              disabled={isDone}
              title="Sonraki sayfa"
              className="h-8 w-8 rounded-lg border-slate-200 bg-white text-slate-600 hover:bg-slate-100 disabled:opacity-40 cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-1.5">
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                resetPage();
              }}
              className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              title="Sayfa başına kayıt"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>

            {position === "top" && (
              <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-white shrink-0 ml-1">
                <button
                  type="button"
                  onClick={() => handleSetViewMode("table")}
                  className={`p-1 rounded text-[11px] font-bold transition-all cursor-pointer ${
                    viewMode === "table" ? "bg-blue-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
                  }`}
                  title="Tablo"
                >
                  <Table className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => handleSetViewMode("list")}
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
      </div>
    );
  };

  return (
    <div className="w-full min-w-0">
      {/* Products Table Card with Integrated Toolbar */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs w-full min-w-0">
        {/* Üst Sayfalama & Araç Çubuğu */}
        {renderPaginationBar("top")}

        {/* Tablo Görünümü */}
        <div className={`overflow-x-auto ${viewMode === "table" ? "block" : "hidden"}`}>
          <table className="w-full min-w-[950px] text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-800 font-bold text-[13px] border-b border-slate-200 select-none">
              <tr>
                <th className="p-3.5 text-center w-14">Site</th>
                <th className="p-3.5 w-20">Görsel</th>
                <th className="p-3.5 w-36">OEM no</th>
                <th className="p-3.5 min-w-[220px]">Parça başlığı</th>

                {/* Marka Sütun Filtresi */}
                <th className="p-3.5 w-40">
                  <div className="flex items-center gap-1.5">
                    <span>Marka</span>
                    <select
                      value={selectedBrandFilter}
                      onChange={(e) => {
                        setSelectedBrandFilter(e.target.value);
                        resetPage();
                      }}
                      className={`h-7 max-w-[105px] text-xs rounded-md px-1.5 border transition-colors cursor-pointer focus:outline-none truncate ${
                        selectedBrandFilter
                          ? "bg-blue-50 border-blue-400 text-blue-700 font-bold"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 font-medium"
                      }`}
                    >
                      <option value="">Tümü</option>
                      {brands?.map((b) => (
                        <option key={b._id} value={b.name}>{b.name}</option>
                      ))}
                    </select>
                  </div>
                </th>

                {/* Kategori Sütun Filtresi */}
                <th className="p-3.5 w-40">
                  <div className="flex items-center gap-1.5">
                    <span>Kategori</span>
                    <select
                      value={selectedCategoryFilter}
                      onChange={(e) => {
                        setSelectedCategoryFilter(e.target.value);
                        resetPage();
                      }}
                      className={`h-7 max-w-[105px] text-xs rounded-md px-1.5 border transition-colors cursor-pointer focus:outline-none truncate ${
                        selectedCategoryFilter
                          ? "bg-blue-50 border-blue-400 text-blue-700 font-bold"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 font-medium"
                      }`}
                    >
                      <option value="">Tümü</option>
                      {categories?.map((c) => (
                        <option key={c._id} value={c.slug}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                </th>

                {/* Stok Sütun Filtresi */}
                <th className="p-3.5 w-36">
                  <div className="flex items-center gap-1.5">
                    <span>Stok</span>
                    <select
                      value={stockFilter}
                      onChange={(e) => {
                        setStockFilter(e.target.value as "all" | "in_stock" | "out_of_stock");
                        resetPage();
                      }}
                      className={`h-7 max-w-[95px] text-xs rounded-md px-1.5 border transition-colors cursor-pointer focus:outline-none truncate ${
                        stockFilter !== "all"
                          ? "bg-blue-50 border-blue-400 text-blue-700 font-bold"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 font-medium"
                      }`}
                    >
                      <option value="all">Tümü</option>
                      <option value="in_stock">Var {productStats ? `(${(productStats.total - (productStats.outOfStock ?? 0))})` : ""}</option>
                      <option value="out_of_stock">Yok {productStats?.outOfStock !== undefined ? `(${productStats.outOfStock})` : ""}</option>
                    </select>
                  </div>
                </th>

                {/* Durum Sütun Filtresi */}
                <th className="p-3.5 w-44">
                  <div className="flex items-center gap-1.5">
                    <span>Durum</span>
                    <select
                      value={draftStatus}
                      onChange={(e) => {
                        setDraftStatus(e.target.value as "all" | "draft" | "published");
                        resetPage();
                      }}
                      className={`h-7 max-w-[115px] text-xs rounded-md px-1.5 border transition-colors cursor-pointer focus:outline-none truncate ${
                        draftStatus !== "all"
                          ? "bg-blue-50 border-blue-400 text-blue-700 font-bold"
                          : "bg-white border-slate-200 text-slate-600 hover:border-slate-300 font-medium"
                      }`}
                    >
                      <option value="all">Tümü {productStats ? `(${productStats.total})` : ""}</option>
                      <option value="published">Yayında {productStats ? `(${productStats.published})` : ""}</option>
                      <option value="draft">Taslak {productStats ? `(${productStats.drafts})` : ""}</option>
                    </select>
                    <button
                      type="button"
                      onClick={handleSyncStats}
                      disabled={isSyncingStats}
                      title="İstatistikleri yeniden senkronize et"
                      className="p-1 text-slate-400 hover:text-blue-600 rounded transition-colors cursor-pointer disabled:opacity-50"
                    >
                      <RotateCw className={`w-3.5 h-3.5 ${isSyncingStats ? "animate-spin text-blue-600" : ""}`} />
                    </button>
                  </div>
                </th>

                <th className="p-3.5 w-28">Raf kodu</th>
                <th className="p-3.5 text-center w-14">Sil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {products && products.length > 0 ? (
                products.map((p) => {
                  return (
                    <tr
                      key={p._id}
                      onClick={() => handleOpenEditProduct(p)}
                      className="hover:bg-blue-50 transition-colors cursor-pointer group"
                      title="Düzenlemek için tıklayın"
                    >
                      {/* Sitede Görüntüle (Göz) Butonu - En Sol */}
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        {p.isDraft !== true ? (
                          <Link
                            href={`/parcalar/${p.slug}`}
                            target="_blank"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-sky-200/80 bg-sky-50 text-sky-600 shadow-2xs hover:bg-sky-100 hover:text-sky-700 hover:border-sky-300 transition-colors"
                            title="Sitede Görüntüle"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                        ) : (
                          <span className="inline-flex h-8 w-8 items-center justify-center text-slate-300" title="Taslak">
                            <Eye className="w-4 h-4 opacity-25" />
                          </span>
                        )}
                      </td>

                      <td className="p-3">
                        <div className="relative w-14 h-14 sm:w-16 sm:h-16 rounded-lg bg-white border border-slate-200 overflow-hidden flex items-center justify-center p-1 shadow-2xs">
                          {p.images?.[0] ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openLightbox(p.images!, 0);
                              }}
                              onMouseEnter={(e) => setHoverPreview({ src: p.images![0], x: e.clientX, y: e.clientY })}
                              onMouseMove={(e) => setHoverPreview((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null)}
                              onMouseLeave={() => setHoverPreview(null)}
                              className="w-full h-full cursor-zoom-in flex items-center justify-center"
                              title="Görseli büyüt"
                            >
                              <Image
                                src={p.images[0]}
                                alt={p.title}
                                width={64}
                                height={64}
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
                      <td className="p-3 min-w-[220px] max-w-md">
                        <div className="font-semibold text-slate-900 text-xs sm:text-sm leading-snug break-words">
                          {p.title || "Taslak parça"}
                        </div>
                      </td>
                      <td className="p-3 text-xs font-medium text-slate-700">
                        {p.brand || "—"}
                      </td>
                      <td className="p-3 text-[11px] text-slate-600">
                        {p.categoryName || "—"}
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleToggleStock(p)}
                          title={p.inStock ? "Stokta Var (Değiştirmek için tıkla)" : "Stokta Yok (Değiştirmek için tıkla)"}
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium border transition-colors cursor-pointer ${
                            p.inStock
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200/60 hover:bg-emerald-100"
                              : "bg-amber-50 text-amber-700 border-amber-200/60 hover:bg-amber-100"
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${p.inStock ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                          {p.inStock ? "Stokta Var" : "Stokta Yok"}
                        </button>
                      </td>
                      <td className="p-3">
                        {p.isDraft === true ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                            Taslak
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                            Yayında
                          </span>
                        )}
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
                      {/* Sil Butonu - En Sağ */}
                      <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleDeleteProduct(p)}
                          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200/80 bg-red-50 text-red-600 shadow-2xs hover:bg-red-100 hover:text-red-700 hover:border-red-300 transition-colors cursor-pointer"
                          title="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : pageData === undefined ? (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
                    Yükleniyor...
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-400 text-xs">
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
              return (
                <article
                  key={p._id}
                  onClick={() => handleOpenEditProduct(p)}
                  className="group relative flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3 sm:p-3.5 shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all duration-150 cursor-pointer"
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
                    <div className="flex flex-wrap items-center gap-1.5">
                      {p.isDraft === true ? (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                          Taslak
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Yayında
                        </span>
                      )}

                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${
                        p.inStock
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200/60"
                          : "bg-amber-50 text-amber-700 border-amber-200/60"
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.inStock ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                        {p.inStock ? "Stokta Var" : "Stokta Yok"}
                      </span>

                      <span className="text-[11px] text-slate-500 ml-1">
                        {[p.brand, p.model].filter(Boolean).join(" · ") || ""}
                      </span>
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
      <ProductFormModal
        open={addProductModalOpen}
        onOpenChange={setAddProductModalOpen}
        product={editingProduct}
        categories={categories}
        brands={brands}
      />

      {/* Floating Hover Preview */}
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

      {/* Lightbox Gallery Modal */}
      <ProductLightboxModal
        lightbox={lightbox}
        onClose={() => setLightbox(null)}
      />
    </div>
  );
}
