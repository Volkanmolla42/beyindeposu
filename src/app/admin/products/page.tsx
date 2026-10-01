"use client";

import { useState, useEffect, useRef, useSyncExternalStore } from "react";
import { ProductImage } from "@/components/ProductImage";
import {
  Plus,
  Search,
  ChevronLeft,
  ChevronRight,
  Table,
  LayoutList,
  X,
  SlidersHorizontal,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  subscribeToViewMode,
  getSavedViewMode,
  setViewMode as handleSetViewMode,
  type ViewMode,
} from "./product-view-mode";
import { ProductViews, type HoverPreview } from "./ProductViews";
import { ProductFormModal } from "./ProductFormModal";
import {
  ProductLightboxModal,
  type LightboxState,
} from "./ProductLightboxModal";

type Product = Doc<"products">;
export default function AdminProductsPage() {
  const [searchProduct, setSearchProduct] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [selectedBrandFilter, setSelectedBrandFilter] = useState("");
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("");
  const [draftStatus, setDraftStatus] = useState<"all" | "draft" | "published">(
    "all",
  );
  const [stockFilter, setStockFilter] = useState<
    "all" | "in_stock" | "out_of_stock"
  >("all");
  const [pageSize, setPageSize] = useState<number>(25);
  const viewMode = useSyncExternalStore<ViewMode>(
    subscribeToViewMode,
    getSavedViewMode,
    () => "table",
  );
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filterButtonRef = useRef<HTMLButtonElement>(null);
  const [stockUpdatingIds, setStockUpdatingIds] = useState<string[]>([]);
  const [deletingIds, setDeletingIds] = useState<string[]>([]);
  const pendingStockIds = useRef(new Set<string>());
  const pendingDeleteIds = useRef(new Set<string>());
  const [actionError, setActionError] = useState("");
  const contentRef = useRef<HTMLDivElement>(null);

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
  const [hoverPreview, setHoverPreview] = useState<HoverPreview>(null);

  const productFilters = {
    searchTerm: debouncedSearch.trim() || undefined,
    categorySlug: selectedCategoryFilter || undefined,
    brand: selectedBrandFilter || undefined,
    draftStatus,
    stockStatus: stockFilter !== "all" ? stockFilter : undefined,
  };

  const paginationKey = JSON.stringify({ ...productFilters, pageSize });
  const currentPagination =
    pagination?.key === paginationKey
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

  const products = pageData?.page;
  const isDone = pageData?.isDone ?? true;

  // Mutations
  const deleteProduct = useMutation(api.products.deleteProduct);
  const toggleStock = useMutation(api.products.toggleStock);

  const handleToggleStock = async (p: Product) => {
    if (pendingStockIds.current.has(p._id)) return;
    pendingStockIds.current.add(p._id);
    setStockUpdatingIds((ids) => [...ids, p._id]);
    setActionError("");
    try {
      await toggleStock({ id: p._id, inStock: !p.inStock });
    } catch (err) {
      console.error("Stok güncelleme hatası:", err);
      setActionError("Stok güncellenemedi. Tekrar deneyin.");
    } finally {
      pendingStockIds.current.delete(p._id);
      setStockUpdatingIds((ids) => ids.filter((id) => id !== p._id));
    }
  };

  const hasActiveFilters = Boolean(
    debouncedSearch.trim() ||
      selectedCategoryFilter ||
      selectedBrandFilter ||
      draftStatus !== "all" ||
      stockFilter !== "all",
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
    if (pendingDeleteIds.current.has(p._id)) return;
    if (!confirm(`'${p.oemNumber} - ${p.title}' parçası silinsin mi?`)) return;
    pendingDeleteIds.current.add(p._id);
    setDeletingIds((ids) => [...ids, p._id]);
    setActionError("");
    try {
      await deleteProduct({ id: p._id });
    } catch (error) {
      console.error("Parça silinemedi:", error);
      setActionError("Parça silinemedi. Tekrar deneyin.");
    } finally {
      pendingDeleteIds.current.delete(p._id);
      setDeletingIds((ids) => ids.filter((id) => id !== p._id));
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
    contentRef.current?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  };

  const activeFilterCount =
    Number(!!selectedBrandFilter) +
    Number(!!selectedCategoryFilter) +
    Number(stockFilter !== "all") +
    Number(draftStatus !== "all");
  const activeFilterChips = [
    ...(draftStatus !== "all"
      ? [
          {
            label: draftStatus === "draft" ? "Taslak" : "Yayında",
            clear: () => {
              setDraftStatus("all");
              resetPage();
            },
          },
        ]
      : []),
    ...(selectedBrandFilter
      ? [
          {
            label: selectedBrandFilter,
            clear: () => {
              setSelectedBrandFilter("");
              resetPage();
            },
          },
        ]
      : []),
    ...(selectedCategoryFilter
      ? [
          {
            label:
              categories?.find(
                (category) => category.slug === selectedCategoryFilter,
              )?.name || selectedCategoryFilter,
            clear: () => {
              setSelectedCategoryFilter("");
              resetPage();
            },
          },
        ]
      : []),
    ...(stockFilter !== "all"
      ? [
          {
            label: stockFilter === "in_stock" ? "Stokta" : "Stokta yok",
            clear: () => {
              setStockFilter("all");
              resetPage();
            },
          },
        ]
      : []),
  ];

  const renderPaginationBar = (position: "top" | "bottom") => (
    <nav
      aria-label={position === "top" ? "Üst sayfalama" : "Alt sayfalama"}
      className={
        position === "top"
          ? "flex w-full basis-full items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-3 py-2 lg:ml-auto lg:w-auto lg:basis-auto lg:rounded-none lg:border-0 lg:bg-transparent lg:px-0 lg:py-0"
          : "flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-4 py-3"
      }
    >
      <span
        aria-live="polite"
        className="whitespace-nowrap text-sm text-slate-500"
      >
        {products
          ? products.length.toLocaleString("tr-TR") + " parça"
          : "Yükleniyor…"}
      </span>
      <div className="flex shrink-0 items-center gap-2">
        <select
          aria-label="Sayfa başına parça"
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            resetPage();
          }}
          className="h-11 rounded-xl border border-slate-200 bg-white px-2 text-base text-slate-700 lg:text-sm focus-visible:outline-2 focus-visible:outline-blue-600"
        >
          <option value={25}>25 / sayfa</option>
          <option value={50}>50 / sayfa</option>
          <option value={100}>100 / sayfa</option>
        </select>
        <Button
          variant="outline"
          size="icon"
          aria-label="Önceki sayfa"
          onClick={() => handlePageChange("previous")}
          disabled={currentPage <= 1 || pageData === undefined}
          className="h-11 w-11 rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>
        <span
          aria-current="page"
          aria-live="polite"
          className="whitespace-nowrap text-sm font-medium text-slate-700"
        >
          <span className="sr-only">Sayfa </span>
          {currentPage}
        </span>
        <Button
          variant="outline"
          size="icon"
          aria-label="Sonraki sayfa"
          onClick={() => handlePageChange("next")}
          disabled={isDone || pageData === undefined}
          className="h-11 w-11 rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </nav>
  );
  return (
    <div ref={contentRef} className="w-full min-w-0 space-y-4">
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2 lg:flex-nowrap">
          <Button
            onClick={handleOpenAddProduct}
            className="h-11 w-full shrink-0 basis-full justify-center gap-2 px-4 lg:w-auto lg:basis-auto"
          >
            <Plus className="h-4 w-4" />
            Yeni parça
          </Button>
          <div className="relative min-w-0 w-full flex-1 basis-0 lg:w-auto lg:basis-0">
            <Search
              aria-hidden="true"
              className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500 pointer-events-none"
            />
            <Input
              type="search"
              aria-label="OEM, parça adı veya raf kodu ara"
              placeholder={
                productStats
                  ? `${productStats.total.toLocaleString("tr-TR")} parça · OEM, ad veya raf ara`
                  : "OEM, ad veya raf ara"
              }
              value={searchProduct}
              onChange={(event) => {
                setSearchProduct(event.target.value);
                resetPage();
              }}
              className="h-12 rounded-full border-slate-200 bg-white pl-12 pr-12 text-base shadow-xs lg:text-sm [&::-webkit-search-cancel-button]:hidden"
            />
            {searchProduct && (
              <Button
                variant="ghost"
                size="icon"
                aria-label="Aramayı temizle"
                onClick={() => {
                  setSearchProduct("");
                  setDebouncedSearch("");
                  resetPage();
                }}
                className="absolute right-1 top-1 h-10 w-10 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
          <Button
            variant="outline"
            aria-label={
              activeFilterCount
                ? `Filtreler, ${activeFilterCount} seçili`
                : "Filtreler"
            }
            ref={filterButtonRef}
            onClick={() => setFiltersOpen(true)}
            className={`h-12 shrink-0 gap-2 rounded-full px-4 ${activeFilterCount ? "border-blue-200 bg-blue-50 text-blue-700" : "bg-white"}`}
          >
            <SlidersHorizontal className="h-5 w-5" />
            <span className="hidden sm:inline">Filtreler</span>
            {activeFilterCount > 0 && (
              <span className="text-xs font-semibold">{activeFilterCount}</span>
            )}
          </Button>
          <div
            role="group"
            aria-label="Görünüm"
            className="hidden lg:flex shrink-0 gap-1 rounded-full border border-slate-200 bg-white p-1"
          >
            <Button
              variant={viewMode === "table" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Tablo görünümü"
              aria-pressed={viewMode === "table"}
              onClick={() => handleSetViewMode("table")}
              className="h-10 w-10 rounded-full"
            >
              <Table className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "secondary" : "ghost"}
              size="icon"
              aria-label="Kart görünümü"
              aria-pressed={viewMode === "list"}
              onClick={() => handleSetViewMode("list")}
              className="h-10 w-10 rounded-full"
            >
              <LayoutList className="h-4 w-4" />
            </Button>
          </div>
          {renderPaginationBar("top")}
        </div>
        {activeFilterChips.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {activeFilterChips.map((filter) => (
              <button
                type="button"
                key={filter.label}
                aria-label={`${filter.label} filtresini kaldır`}
                onClick={filter.clear}
                className="inline-flex min-h-11 max-w-full items-center gap-2 rounded-full border border-blue-100 bg-blue-50 px-3 text-sm text-blue-800 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <span className="truncate">{filter.label}</span>
                <X className="h-3.5 w-3.5 shrink-0" />
              </button>
            ))}
          </div>
        )}
        {actionError && (
          <p role="alert" className="text-sm text-red-600">
            {actionError}
          </p>
        )}
      </div>
      {/* Products Table Card with Integrated Toolbar */}
      <div className="space-y-3 lg:space-y-0 lg:bg-white lg:rounded-2xl lg:border lg:border-slate-200 lg:overflow-hidden lg:shadow-xs w-full min-w-0">
        <ProductViews
          products={products}
          viewMode={viewMode}
          isLoading={pageData === undefined}
          hasActiveFilters={hasActiveFilters}
          stockUpdatingIds={stockUpdatingIds}
          deletingIds={deletingIds}
          onEdit={handleOpenEditProduct}
          onDelete={handleDeleteProduct}
          onToggleStock={handleToggleStock}
          onOpenImages={openLightbox}
          onClearFilters={handleClearFilters}
          setHoverPreview={setHoverPreview}
        />

        {/* Alt Sayfalama Çubuğu */}
        {renderPaginationBar("bottom")}
      </div>

      {/* Add / Edit Product Modal */}
      <Dialog open={filtersOpen} onOpenChange={setFiltersOpen}>
        <DialogContent
          aria-describedby={undefined}
          onCloseAutoFocus={(event) => {
            event.preventDefault();
            filterButtonRef.current?.focus();
          }}
          className="left-0 top-auto bottom-0 flex max-h-[90dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-t-3xl rounded-b-none border-0 p-0 [&>button]:right-3 [&>button]:top-3 [&>button]:h-11 [&>button]:w-11 [&>button]:rounded-full sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%_-_2rem)] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl"
        >
          <DialogHeader className="shrink-0 border-b border-slate-200 px-5 py-5 text-left">
            <DialogTitle>Filtreler</DialogTitle>
          </DialogHeader>
          <div className="min-h-0 overflow-y-auto overscroll-contain space-y-5 p-5">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">
                Yayın durumu
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "all", label: "Tümü" },
                    { value: "published", label: "Yayında" },
                    { value: "draft", label: "Taslak" },
                  ] as const
                ).map((filter) => (
                  <label
                    key={filter.value}
                    className={
                      "flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600 " +
                      (draftStatus === filter.value
                        ? "border-blue-200 bg-blue-50 text-blue-800"
                        : "border-slate-200 bg-white text-slate-600")
                    }
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="product-publication-filter"
                      value={filter.value}
                      checked={draftStatus === filter.value}
                      onChange={() => {
                        setDraftStatus(filter.value);
                        resetPage();
                      }}
                    />
                    {filter.label}
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="space-y-2">
              <label
                htmlFor="mobile-brand-filter"
                className="text-sm font-medium text-slate-700"
              >
                Marka
              </label>
              <select
                id="mobile-brand-filter"
                value={selectedBrandFilter}
                onChange={(event) => {
                  setSelectedBrandFilter(event.target.value);
                  resetPage();
                }}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <option value="">Tüm markalar</option>
                {brands?.map((brand) => (
                  <option key={brand._id} value={brand.name}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label
                htmlFor="mobile-category-filter"
                className="text-sm font-medium text-slate-700"
              >
                Kategori
              </label>
              <select
                id="mobile-category-filter"
                value={selectedCategoryFilter}
                onChange={(event) => {
                  setSelectedCategoryFilter(event.target.value);
                  resetPage();
                }}
                className="h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
              >
                <option value="">Tüm kategoriler</option>
                {categories?.map((category) => (
                  <option key={category._id} value={category.slug}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium text-slate-700">
                Stok
              </legend>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    { value: "all", label: "Tümü" },
                    { value: "in_stock", label: "Stokta" },
                    { value: "out_of_stock", label: "Stokta yok" },
                  ] as const
                ).map((filter) => (
                  <label
                    key={filter.value}
                    className={`flex min-h-12 cursor-pointer items-center justify-center rounded-xl border px-2 text-sm font-medium has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-blue-600 ${stockFilter === filter.value ? "border-blue-200 bg-blue-50 text-blue-800" : "border-slate-200 bg-white text-slate-600"}`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name="product-stock-filter"
                      value={filter.value}
                      checked={stockFilter === filter.value}
                      onChange={() => {
                        setStockFilter(filter.value);
                        resetPage();
                      }}
                    />
                    {filter.label}
                  </label>
                ))}
              </div>
            </fieldset>
          </div>
          <div className="flex shrink-0 gap-3 border-t border-slate-200 px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
            <Button
              variant="outline"
              onClick={handleClearFilters}
              className="h-12 flex-1"
            >
              Temizle
            </Button>
            <Button
              onClick={() => setFiltersOpen(false)}
              className="h-12 flex-1"
            >
              Sonuçları göster
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
          <ProductImage
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
