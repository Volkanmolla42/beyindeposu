"use client";

import { Suspense, useState, useMemo } from "react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  ChevronLeft,
  RotateCcw,
  Search,
  Cpu,
  X,
  SlidersHorizontal,
  Layers,
  Car,
  Tag,
  CheckCircle2,
} from "lucide-react";


import ProductCard from "@/components/ProductCard";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";

function ProductCatalogContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("kategori") || "";
  const brandParam = searchParams.get("marka") || "";
  const queryParam = searchParams.get("q") || "";

  return (
    <ProductCatalogView
      key={JSON.stringify([categoryParam, brandParam, queryParam])}
      categoryParam={categoryParam}
      brandParam={brandParam}
      queryParam={queryParam}
    />
  );
}

function ProductCatalogView({
  categoryParam,
  brandParam,
  queryParam,
}: {
  categoryParam: string;
  brandParam: string;
  queryParam: string;
}) {
  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [selectedBrand, setSelectedBrand] = useState<string>(brandParam);
  const [selectedCondition, setSelectedCondition] = useState<string>("Tümü");
  const [selectedStock, setSelectedStock] = useState<string>("Tümü");
  const [oemSearch, setOemSearch] = useState<string>(queryParam);
  const [activeSearch, setActiveSearch] = useState<string>(queryParam);
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [pageSize, setPageSize] = useState<number>(24);
  const [pagination, setPagination] = useState<{
    key: string;
    page: number;
    cursors: Array<string | null>;
  } | null>(null);

  // Fetch categories from Convex
  const categories = useQuery(api.categories.list, {});

  const productFilters = {
    categorySlug: selectedCategory && selectedCategory !== "" ? selectedCategory : undefined,
    brand: selectedBrand && selectedBrand !== "Tümü" && selectedBrand !== "" ? selectedBrand : undefined,
    condition: selectedCondition && selectedCondition !== "Tümü" ? selectedCondition : undefined,
    inStockOnly: selectedStock === "Stokta" ? true : undefined,
    searchTerm: activeSearch || undefined,
    sortBy,
  };
  const paginationKey = JSON.stringify({ ...productFilters, pageSize });
  const currentPagination = pagination?.key === paginationKey
    ? pagination
    : { key: paginationKey, page: 1, cursors: [null] };
  const currentPage = currentPagination.page;
  const pageData = useQuery(api.products.listPaginated, {
    ...productFilters,
    paginationOpts: {
      numItems: pageSize,
      cursor: currentPagination.cursors[currentPage - 1] ?? null,
    },
  });

  const brands = useQuery(api.brands.list, {});

  const products = pageData?.page;

  // Searchable Brand Options
  const brandOptions: ComboboxOption[] = useMemo(() => {
    if (!brands) return [];
    return brands.map((b) => ({
      value: b.name,
      label: b.name,
    }));
  }, [brands]);

  // Searchable Category Options (Dynamic from Convex)
  const categoryOptions: ComboboxOption[] = useMemo(() => {
    if (!categories) return [];
    return categories.map((c) => ({
      value: c.slug,
      label: c.name,
    }));
  }, [categories]);

  // Product Condition Options
  const conditionOptions: ComboboxOption[] = [
    { value: "Orijinal Çıkma", label: "Orijinal Çıkma" },
    { value: "Sıfır - Orijinal", label: "Sıfır - Orijinal" },
    { value: "Revizyonlu", label: "Revizyonlu" },
    { value: "Sıfırlanmış - Virgin", label: "Sıfırlanmış - Virgin" },
  ];

  const activeCategoryTitle = useMemo(() => {
    if (!selectedCategory) return "TÜM PARÇALAR";
    const found = categories?.find((c) => c.slug === selectedCategory);
    return found ? found.name.toUpperCase() : "PARÇALAR";
  }, [selectedCategory, categories]);

  const categoryFirstImage = useMemo(() => {
    const firstWithImg = (products || []).find(
      (p) => p.images && p.images.length > 0 && Boolean(p.images[0])
    );
    if (firstWithImg?.images?.[0]) return firstWithImg.images[0];
    const foundCat = categories?.find((c) => c.slug === selectedCategory);
    return foundCat?.image || "/images/catalog-ecu-banner.webp";
  }, [products, selectedCategory, categories]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(oemSearch.trim());
  };

  const handleResetFilters = () => {
    setSelectedCategory("");
    setSelectedBrand("");
    setSelectedCondition("Tümü");
    setSelectedStock("Tümü");
    setOemSearch("");
    setActiveSearch("");
    setSortBy("date-desc");
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
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  const hasActiveFilters = Boolean(
    selectedCategory ||
    selectedBrand ||
    selectedCondition !== "Tümü" ||
    selectedStock !== "Tümü" ||
    activeSearch
  );

  return (
    <>
      {/* 1. Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="container flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600 transition-colors">Ana sayfa</Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <Link href="/parcalar" onClick={handleResetFilters} className="hover:text-blue-600 transition-colors">Parçalar</Link>
          {selectedCategory && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-900 font-semibold">{activeCategoryTitle}</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Category Header Banner */}
      <div className="bg-white border-b border-slate-200 py-6 sm:py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
                {activeCategoryTitle}
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {products ? `${products.length} Parça` : "Parçalar"}
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              OEM numarası, marka ve stok durumuna göre filtreleyin.
            </p>
          </div>

          {/* Dynamic Category Preview */}
          <div className="relative w-36 sm:w-44 h-24 sm:h-28 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group">
            <Image
              src={categoryFirstImage}
              alt={activeCategoryTitle}
              fill
              unoptimized={categoryFirstImage.startsWith("/uploads/products/")}
              sizes="(max-width: 640px) 144px, 176px"
              className="object-contain p-2 rounded-lg group-hover:scale-105 transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Body Layout */}
      <div className="container py-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sticky Sidebar containing Filters */}
          <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
            {/* 1. DETAYLI FİLTRELER */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h2 className="font-semibold text-xs text-slate-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  <span>Filtreler</span>
                </h2>
                {hasActiveFilters && (
                  <button
                    onClick={handleResetFilters}
                    className="text-[10px] text-slate-500 hover:text-red-600 font-semibold transition-colors flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw className="w-2.5 h-2.5" />
                    <span>Sıfırla</span>
                  </button>
                )}
              </div>

              {/* KATEGORİ */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block text-[10px] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    Kategori
                  </span>
                  {selectedCategory && (
                    <button
                      onClick={() => setSelectedCategory("")}
                      className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Tümü
                    </button>
                  )}
                </label>
                <SearchableCombobox
                  options={categoryOptions}
                  value={selectedCategory}
                  onChange={(val) => setSelectedCategory(val)}
                  placeholder="Tüm kategoriler"
                  searchPlaceholder="Kategori ara"
                  allOptionLabel="Tüm kategoriler"
                />
              </div>

              {/* ARAÇ MARKASI */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block text-[10px] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Car className="w-3 h-3 text-slate-400" />
                    Araç markası
                  </span>
                  {selectedBrand && (
                    <button
                      onClick={() => setSelectedBrand("")}
                      className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Tümü
                    </button>
                  )}
                </label>
                <SearchableCombobox
                  options={brandOptions}
                  value={selectedBrand}
                  onChange={(val) => setSelectedBrand(val)}
                  placeholder="Tüm markalar"
                  searchPlaceholder="Marka ara"
                  allOptionLabel="Tüm markalar"
                />
              </div>

              {/* PARÇA DURUMU */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block text-[10px] flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    Parça durumu
                  </span>
                  {selectedCondition !== "Tümü" && (
                    <button
                      onClick={() => setSelectedCondition("Tümü")}
                      className="text-[10px] text-blue-600 font-semibold hover:underline cursor-pointer"
                    >
                      Tümü
                    </button>
                  )}
                </label>
                <SearchableCombobox
                  options={conditionOptions}
                  value={selectedCondition === "Tümü" ? "" : selectedCondition}
                  onChange={(val) => setSelectedCondition(val || "Tümü")}
                  placeholder="Tüm parça durumları"
                  searchPlaceholder="Durum ara"
                  allOptionLabel="Tüm parça durumları"
                />
              </div>

              {/* STOK DURUMU */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block text-[10px] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-slate-400" />
                  Stok durumu
                </label>
                <SearchableCombobox
                  options={[
                    { value: "Stokta", label: "Stokta olanlar" },
                  ]}
                  value={selectedStock === "Stokta" ? "Stokta" : ""}
                  onChange={(val) => setSelectedStock(val || "Tümü")}
                  placeholder="Tüm stok durumları"
                  allOptionLabel="Tüm stok durumları"
                  searchPlaceholder="Stok durumu ara"
                />
              </div>

              {hasActiveFilters && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleResetFilters}
                  className="w-full font-bold text-xs hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  <span>Filtreleri temizle</span>
                </Button>
              )}
            </div>

            {/* OEM NO İLE BULAMADINIZ MI? WhatsApp Card */}
            <div className="rounded-2xl border border-blue-100 bg-blue-50/70 p-5 space-y-3">
              <h3 className="text-sm font-medium text-slate-900">
                Parçayı bulamadınız mı?
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                OEM kodunu veya araç bilgisini gönderin.
              </p>
              <Button
                asChild
                variant="whatsapp"
                size="sm"
                className="w-full font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5 min-h-[44px]"
              >
                <a
                  href={getWhatsAppUrl({ message: "Merhaba, aradığım parça için yardımcı olur musunuz?" })}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="WhatsApp'tan yazın"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-white text-white" />
                  <span>WhatsApp&apos;tan yazın</span>
                </a>
              </Button>
            </div>
          </aside>

          {/* Right Product Grid & Pagination */}
          <div className="lg:col-span-9 space-y-4">
            {/* 1. TOP BAR: Search, Filter, Sort & Compact Top Pagination */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 text-xs shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Form */}
                <form onSubmit={handleFilterSubmit} className="flex-1 max-w-lg flex items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="parcalar-search-input"
                      name="q"
                      type="text"
                      placeholder="OEM veya parça no ara"
                      aria-label="OEM veya parça numarası ara"
                      value={oemSearch}
                      onChange={(e) => setOemSearch(e.target.value)}
                      className="h-9 bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono uppercase focus-visible:ring-blue-500 focus-visible:bg-white transition-all pr-7"
                    />
                    {oemSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setOemSearch("");
                          setActiveSearch("");
                        }}
                        aria-label="Aramayı temizle"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs cursor-pointer"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    variant="default"
                    size="sm"
                    className="h-9 px-4 font-bold text-xs rounded-xl shadow-xs shrink-0"
                  >
                    <Search className="w-3.5 h-3.5 mr-1" />
                    <span>Ara</span>
                  </Button>
                </form>

                {/* Right: Page Size & Sort Dropdowns */}
                <div className="flex items-center gap-3 shrink-0 flex-wrap">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="products-page-size" className="text-slate-500 font-semibold text-[11px]">Göster:</label>
                    <select
                      id="products-page-size"
                      name="pageSize"
                      aria-label="Sayfa başına gösterilecek parça adedi"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
                    >
                      <option value={24}>24 parça</option>
                      <option value={48}>48 parça</option>
                      <option value={96}>96 parça</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <label htmlFor="products-sort-by" className="text-slate-500 font-semibold text-[11px]">
                      {activeSearch ? "Arama sırası:" : "Sıralama:"}
                    </label>
                    <select
                      id="products-sort-by"
                      name="sortBy"
                      aria-label="Parçaları sırala"
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      disabled={Boolean(activeSearch)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <option value="date-desc">En yeni</option>
                      <option value="oem-asc">OEM / parça no, A-Z</option>
                      <option value="title-asc">Parça adı, A-Z</option>
                      <option value="title-desc">Parça adı, Z-A</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Filtreler:</span>

                  {selectedCategory && (
                    <Badge variant="info" className="gap-1 py-0.5 px-2 text-[11px] cursor-pointer" onClick={() => setSelectedCategory("")}>
                      <span>{categories?.find((c) => c.slug === selectedCategory)?.name || selectedCategory}</span>
                      <X className="w-3 h-3 hover:text-blue-900" />
                    </Badge>
                  )}

                  {selectedBrand && (
                    <Badge variant="info" className="gap-1 py-0.5 px-2 text-[11px] cursor-pointer" onClick={() => setSelectedBrand("")}>
                      <span>Marka: {selectedBrand}</span>
                      <X className="w-3 h-3 hover:text-blue-900" />
                    </Badge>
                  )}

                  {selectedCondition !== "Tümü" && (
                    <Badge variant="info" className="gap-1 py-0.5 px-2 text-[11px] cursor-pointer" onClick={() => setSelectedCondition("Tümü")}>
                      <span>Durum: {selectedCondition}</span>
                      <X className="w-3 h-3 hover:text-blue-900" />
                    </Badge>
                  )}

                  {selectedStock !== "Tümü" && (
                    <Badge variant="info" className="gap-1 py-0.5 px-2 text-[11px] cursor-pointer" onClick={() => setSelectedStock("Tümü")}>
                      <span>Stok: {selectedStock}</span>
                      <X className="w-3 h-3 hover:text-blue-900" />
                    </Badge>
                  )}

                  {activeSearch && (
                    <Badge variant="info" className="gap-1 py-0.5 px-2 text-[11px] cursor-pointer" onClick={() => { setActiveSearch(""); setOemSearch(""); }}>
                      <span>Arama: &quot;{activeSearch}&quot;</span>
                      <X className="w-3 h-3 hover:text-blue-900" />
                    </Badge>
                  )}

                  <button
                    onClick={handleResetFilters}
                    className="text-[11px] text-red-600 hover:underline font-bold ml-1 cursor-pointer"
                  >
                    Tümünü Temizle
                  </button>
                </div>
              )}
            </div>

            {/* 3. Product Grid */}
            {products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((p, idx) => (
                  <ProductCard key={p._id} product={p} priority={idx < 3} />
                ))}
              </div>
            ) : pageData === undefined ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-64 rounded-xl bg-white border border-slate-200 animate-pulse p-4" />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
                <Cpu className="w-12 h-12 text-slate-300 mx-auto" />
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-slate-900">Parça bulunamadı</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Aramanızı veya filtreleri değiştirin.
                  </p>
                </div>
                {hasActiveFilters && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={handleResetFilters}
                    className="px-5 py-2 font-bold text-xs"
                  >
                    Filtreleri Temizle
                  </Button>
                )}
              </div>
            )}

            {/* 4. Cursor pagination */}
            {products && products.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                  Sayfa <span className="font-bold text-slate-900">{currentPage}</span> · {products.length} parça gösteriliyor
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange("previous")}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs font-bold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange("next")}
                    disabled={!pageData || pageData.isDone}
                    className="h-8 px-3 text-xs font-bold"
                  >
                    Sonraki
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

export default function ProductCatalogClient() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ProductCatalogContent />
    </Suspense>
  );
}
