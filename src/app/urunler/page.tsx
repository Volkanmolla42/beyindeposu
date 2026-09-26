"use client";

import { Suspense, useState, useMemo, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  ChevronsRight,
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
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { generateWhatsAppLink } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SearchableCombobox, ComboboxOption } from "@/components/ui/searchable-combobox";

function ProductCatalogContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams.get("kategori") || "";
  const brandParam = searchParams.get("marka") || "";
  const queryParam = searchParams.get("q") || "";

  const [selectedCategory, setSelectedCategory] = useState<string>(categoryParam);
  const [selectedBrand, setSelectedBrand] = useState<string>(brandParam);
  const [selectedCondition, setSelectedCondition] = useState<string>("Tümü");
  const [selectedStock, setSelectedStock] = useState<string>("Tümü");
  const [oemSearch, setOemSearch] = useState<string>(queryParam);
  const [activeSearch, setActiveSearch] = useState<string>(queryParam);
  const [sortBy, setSortBy] = useState<string>("date-desc");
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(24);

  // Sync state if URL query params change
  useEffect(() => {
    if (categoryParam) setSelectedCategory(categoryParam);
    if (brandParam) setSelectedBrand(brandParam);
    if (queryParam) {
      setOemSearch(queryParam);
      setActiveSearch(queryParam);
    }
  }, [categoryParam, brandParam, queryParam]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedCategory, selectedBrand, selectedCondition, selectedStock, activeSearch, sortBy, pageSize]);

  // Fetch categories from Convex
  const categories = useQuery(api.categories.list, {});

  // Fetch paginated products from Convex
  const pageData = useQuery(api.products.getProductsPage, {
    page: currentPage,
    pageSize: pageSize,
    categorySlug: selectedCategory && selectedCategory !== "" ? selectedCategory : undefined,
    brand: selectedBrand && selectedBrand !== "Tümü" && selectedBrand !== "" ? selectedBrand : undefined,
    condition: selectedCondition && selectedCondition !== "Tümü" ? selectedCondition : undefined,
    inStockOnly: selectedStock === "Stokta" ? true : undefined,
    searchTerm: activeSearch || undefined,
    sortBy: sortBy,
  });

  const brands = useQuery(api.brands.list);
  const settings = useQuery(api.siteSettings.get);
  const whatsappNumber = settings?.whatsappNumber || "";

  const products = pageData?.items;
  const totalItems = pageData?.totalItems ?? 0;
  const totalPages = pageData?.totalPages ?? 1;

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
    if (!selectedCategory) return "TÜM ÜRÜNLER";
    const found = categories?.find((c) => c.slug === selectedCategory);
    return found ? found.name.toUpperCase() : "ÜRÜNLER";
  }, [selectedCategory, categories]);

  const categoryFirstImage = useMemo(() => {
    const firstWithImg = (products || []).find(
      (p) => p.images && p.images.length > 0 && Boolean(p.images[0])
    );
    if (firstWithImg?.images?.[0]) return firstWithImg.images[0];
    const foundCat = categories?.find((c) => c.slug === selectedCategory);
    return foundCat?.image || "/images/catalog-ecu-banner.jpg";
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
    setCurrentPage(1);
  };

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage);
      window.scrollTo({ top: 200, behavior: "smooth" });
    }
  };

  const hasActiveFilters = Boolean(
    selectedCategory ||
    selectedBrand ||
    selectedCondition !== "Tümü" ||
    selectedStock !== "Tümü" ||
    activeSearch
  );

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
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {/* 1. Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-500">
          <Link href="/" className="hover:text-blue-600 transition-colors">Ana Sayfa</Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <Link href="/urunler" onClick={handleResetFilters} className="hover:text-blue-600 transition-colors">Ürünler</Link>
          {selectedCategory && (
            <>
              <ChevronRight className="w-3 h-3 text-slate-400" />
              <span className="text-slate-900 font-semibold">{activeCategoryTitle}</span>
            </>
          )}
        </div>
      </div>

      {/* 2. Category Header Banner */}
      <div className="bg-white border-b border-slate-200 py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <h1 className="text-2xl sm:text-3xl font-black text-slate-900 uppercase tracking-tight">
                {activeCategoryTitle}
              </h1>
              <Badge variant="secondary" className="font-mono text-xs">
                {totalItems.toLocaleString("tr-TR")} Ürün
              </Badge>
            </div>
            <p className="text-xs sm:text-sm text-slate-500 max-w-2xl leading-relaxed">
              Orijinal çıkma ve sıfır oto elektronik modülleri. Test edilmiş, garantili ve stoktan aynı gün hızlı kargo imkanı.
            </p>
          </div>

          {/* Dynamic Category Preview */}
          <div className="w-36 sm:w-44 h-24 sm:h-28 rounded-xl bg-slate-50 border border-slate-200 p-2 flex items-center justify-center shrink-0 overflow-hidden shadow-2xs group">
            <img
              src={categoryFirstImage}
              alt={activeCategoryTitle}
              className="w-full h-full object-contain rounded-lg group-hover:scale-105 transition-all duration-300"
            />
          </div>
        </div>
      </div>

      {/* 3. Main Body Layout */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sticky Sidebar containing Filters */}
          <aside className="lg:col-span-3 space-y-5 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-1">
            {/* 1. DETAYLI FİLTRELER */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs space-y-4 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="font-black text-xs uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-blue-600" />
                  <span>FİLTRELER</span>
                </h3>
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
                <label className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Layers className="w-3 h-3 text-slate-400" />
                    KATEGORİ
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
                  placeholder="Tüm Kategoriler..."
                  searchPlaceholder="Kategori ara (ECU, ABS, Airbag...)"
                  allOptionLabel="Tüm Kategoriler"
                />
              </div>

              {/* ARAÇ MARKASI */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Car className="w-3 h-3 text-slate-400" />
                    ARAÇ MARKASI
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
                  placeholder="Tüm Markalar..."
                  searchPlaceholder="Marka ara (BMW, Audi, Mercedes...)"
                  allOptionLabel="Tüm Markalar"
                />
              </div>

              {/* PARÇA DURUMU */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1">
                    <Tag className="w-3 h-3 text-slate-400" />
                    PARÇA DURUMU
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
                  placeholder="Tüm Parça Durumları..."
                  searchPlaceholder="Durum ara (Çıkma, Sıfır, Revizyonlu...)"
                  allOptionLabel="Tüm Parça Durumları"
                />
              </div>

              {/* STOK DURUMU */}
              <div className="space-y-1.5">
                <label className="font-bold text-slate-700 block uppercase text-[10px] tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-slate-400" />
                  STOK DURUMU
                </label>
                <SearchableCombobox
                  options={[
                    { value: "Stokta", label: "Sadece Hazır Stoktakiler" },
                  ]}
                  value={selectedStock === "Stokta" ? "Stokta" : ""}
                  onChange={(val) => setSelectedStock(val || "Tümü")}
                  placeholder="Tüm Stok Durumları..."
                  allOptionLabel="Tüm Stok Durumları"
                  searchPlaceholder="Stok durumu ara..."
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
                  <span>Filtreleri Temizle</span>
                </Button>
              )}
            </div>

            {/* OEM NO İLE BULAMADINIZ MI? WhatsApp Card */}
            <div className="rounded-2xl bg-gradient-to-br from-blue-900 to-slate-900 text-white p-5 space-y-3 shadow-md">
              <h4 className="font-black text-xs uppercase tracking-wider text-white">
                OEM NO İLE BULAMADINIZ MI?
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                Aradığınız parça kodunu bulamadıysanız veya uyumluluk teyidi için WhatsApp destek hattımıza doğrudan sorabilirsiniz.
              </p>
              <a
                href={generateWhatsAppLink(whatsappNumber, undefined, undefined, "Merhaba Beyin Deposu, aradığım oto elektronik parçayı web sitenizde bulamadım, yardımcı olabilir misiniz?")}
                target="_blank"
                rel="noopener noreferrer"
                className="block pt-1"
              >
                <Button
                  variant="whatsapp"
                  size="sm"
                  className="w-full font-extrabold text-xs shadow-sm flex items-center justify-center gap-1.5"
                >
                  <WhatsAppIcon className="w-4 h-4 fill-white text-white" />
                  <span>WHATSAPP İLE SORUN</span>
                </Button>
              </a>
            </div>
          </aside>

          {/* Right Product Grid & Pagination */}
          <main className="lg:col-span-9 space-y-4">
            {/* 1. TOP BAR: Search, Filter, Sort & Compact Top Pagination */}
            <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 text-xs shadow-2xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search Form */}
                <form onSubmit={handleFilterSubmit} className="flex-1 max-w-lg flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="OEM veya Parça No ile Ara..."
                      value={oemSearch}
                      onChange={(e) => setOemSearch(e.target.value)}
                      className="w-full bg-slate-50 hover:bg-slate-100/60 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-mono uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all pr-7"
                    />
                    {oemSearch && (
                      <button
                        type="button"
                        onClick={() => {
                          setOemSearch("");
                          setActiveSearch("");
                        }}
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
                    <span className="text-slate-400 font-semibold text-[11px]">GÖSTER:</span>
                    <select
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
                    >
                      <option value={24}>24 Adet</option>
                      <option value={48}>48 Adet</option>
                      <option value={96}>96 Adet</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-semibold text-[11px]">SIRALAMA:</span>
                    <select
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-slate-700 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer text-xs"
                    >
                      <option value="date-desc">En Yeniler ▾</option>
                      <option value="oem-asc">OEM / Parça No (A-Z)</option>
                      <option value="title-asc">Ürün Adı (A-Z)</option>
                      <option value="title-desc">Ürün Adı (Z-A)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Active Filter Chips */}
              {hasActiveFilters && (
                <div className="flex items-center gap-1.5 flex-wrap pt-2 border-t border-slate-100">
                  <span className="text-[11px] text-slate-400 font-semibold mr-1">Aktif Filtreler:</span>

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

            {/* 2. TOP PAGINATION BAR (Immediately visible above products) */}
            {totalPages > 1 && (
              <div className="bg-gradient-to-r from-blue-50/70 via-white to-blue-50/70 border border-blue-100/80 rounded-2xl p-3 px-4 flex items-center justify-between shadow-2xs">
                <div className="text-xs font-semibold text-slate-600">
                  Sayfa <span className="font-extrabold text-blue-600">{currentPage}</span> / {totalPages}{" "}
                  <span className="text-slate-400 font-normal hidden sm:inline">
                    (Toplam {totalItems.toLocaleString("tr-TR")} Ürün)
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="h-8 px-3 text-xs font-bold bg-white border-slate-300 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Önceki Sayfa
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="h-8 px-3 text-xs font-bold bg-white border-slate-300 hover:bg-blue-50 hover:text-blue-600 disabled:opacity-40"
                  >
                    Sonraki Sayfa
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* 3. Product Grid */}
            {products && products.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {products.map((p) => (
                  <ProductCard key={p._id} product={p} />
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
                  <h4 className="font-bold text-sm text-slate-900">Kriterlere Uygun Ürün Bulunamadı</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Aradığınız OEM numarası veya filtre kriterleriyle eşleşen ürün bulunamadı. Filtreleri temizleyebilir veya bize WhatsApp üzerinden sorabilirsiniz.
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

            {/* 4. BOTTOM NUMERIC PAGINATION BAR */}
            {products && products.length > 0 && (
              <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4 mt-6">
                {/* Result count text */}
                <div className="text-xs text-slate-500 font-medium text-center sm:text-left">
                  Toplam <span className="font-bold text-slate-900">{totalItems.toLocaleString("tr-TR")}</span> üründen{" "}
                  <span className="font-bold text-blue-600">
                    {Math.min((currentPage - 1) * pageSize + 1, totalItems)}-{Math.min(currentPage * pageSize, totalItems)}
                  </span>{" "}
                  arası gösteriliyor (Sayfa {currentPage} / {totalPages})
                </div>

                {/* Numeric Pagination Buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-1.5 flex-wrap justify-center">
                    {/* First Page */}
                    <button
                      onClick={() => handlePageChange(1)}
                      disabled={currentPage === 1}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title="İlk Sayfa"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Previous Page */}
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Önceki</span>
                    </button>

                    {/* Page Numbers */}
                    {pageNumbers.map((p, idx) => (
                      typeof p === "number" ? (
                        <button
                          key={idx}
                          onClick={() => handlePageChange(p)}
                          className={`min-w-8 h-8 px-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${currentPage === p
                              ? "bg-blue-600 text-white shadow-xs font-black scale-105"
                              : "border border-slate-200 text-slate-700 hover:bg-slate-100/70"
                            }`}
                        >
                          {p}
                        </button>
                      ) : (
                        <span key={idx} className="px-1 text-xs text-slate-400 font-bold">
                          ...
                        </span>
                      )
                    ))}

                    {/* Next Page */}
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors flex items-center gap-1"
                    >
                      <span className="hidden sm:inline">Sonraki</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>

                    {/* Last Page */}
                    <button
                      onClick={() => handlePageChange(totalPages)}
                      disabled={currentPage === totalPages}
                      className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      title="Son Sayfa"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>

      <Footer />
    </div>
  );
}

export default function ProductCatalogPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
      <ProductCatalogContent />
    </Suspense>
  );
}
