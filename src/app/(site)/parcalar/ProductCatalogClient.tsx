"use client";

import { useState, useMemo, useEffect, useRef } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import {
  ChevronRight,
  ChevronLeft,
  Search,
  Cpu,
  X,
  SlidersHorizontal,
} from "lucide-react";


import ProductCard from "@/components/ProductCard";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SearchableMultiSelect, type SearchableMultiSelectOption } from "@/components/ui/searchable-multi-select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { trackAnalytics, useAnalyticsConsent } from "@/lib/analytics";

const CONDITION_OPTIONS: SearchableMultiSelectOption[] = [
  { value: "Orijinal Çıkma", label: "Orijinal çıkma" },
  { value: "Sıfır - Orijinal", label: "Sıfır · orijinal" },
  { value: "Revizyonlu", label: "Revizyonlu" },
  { value: "Sıfırlanmış - Virgin", label: "Sıfırlanmış · virgin" },
];

function readFilterValues(searchParamsKey: string, key: string) {
  return [...new Set(
    new URLSearchParams(searchParamsKey)
      .getAll(key)
      .filter((value) => value && value !== "Tümü" && value !== "all"),
  )];
}

function ProductCatalogContent() {
  return <ProductCatalogView />;
}

function ProductCatalogView() {
  const searchParams = useSearchParams();
  const searchParamsKey = searchParams.toString();
  const queryParam = searchParams.get("q") || "";
  const selectedCategories = useMemo(() => readFilterValues(searchParamsKey, "kategori"), [searchParamsKey]);
  const selectedBrands = useMemo(() => readFilterValues(searchParamsKey, "marka"), [searchParamsKey]);
  const selectedModels = useMemo(
    () => selectedBrands.length > 0 ? readFilterValues(searchParamsKey, "model") : [],
    [searchParamsKey, selectedBrands.length],
  );
  const selectedConditions = useMemo(() => readFilterValues(searchParamsKey, "durum"), [searchParamsKey]);
  const activeSearch = queryParam;
  const [searchDraft, setSearchDraft] = useState({ query: queryParam, value: queryParam });
  const oemSearch = searchDraft.query === activeSearch ? searchDraft.value : activeSearch;
  const [filterDialogOpen, setFilterDialogOpen] = useState(false);
  const pageSize = 24;
  const [pagination, setPagination] = useState<{
    key: string;
    page: number;
    cursors: Array<string | null>;
  } | null>(null);

  const updateCatalogParams = (updates: Record<string, string | string[] | null>) => {
    const nextParams = new URLSearchParams(searchParamsKey);
    for (const [key, value] of Object.entries(updates)) {
      nextParams.delete(key);
      if (Array.isArray(value)) {
        value.filter(Boolean).forEach((entry) => nextParams.append(key, entry));
      } else if (value) {
        nextParams.set(key, value);
      }
    }

    const query = nextParams.toString();
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ""}`;
    if (`${window.location.pathname}${window.location.search}` !== nextUrl) {
      window.history.pushState(null, "", nextUrl);
    }
  };

  // Fetch categories from Convex
  const categories = useQuery(api.categories.list, {});
  const availableModels = useQuery(
    api.products.listModelsByBrand,
    selectedBrands.length > 0 ? { brand: selectedBrands } : "skip",
  );

  const productFilters = {
    categorySlug: selectedCategories.length > 0 ? selectedCategories : undefined,
    brand: selectedBrands.length > 0 ? selectedBrands : undefined,
    model: selectedModels.length > 0 ? selectedModels : undefined,
    condition: selectedConditions.length > 0 ? selectedConditions : undefined,
    searchTerm: activeSearch || undefined,
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
  const productStats = useQuery(api.products.getStats, {});

  const products = pageData?.page;
  const consent = useAnalyticsConsent();
  const analyticsEnabled = consent.enabled && consent.choice === "granted" && !consent.privacySignal;
  const lastSearch = useRef("");
  const previousFilters = useRef<Record<string, string> | null>(null);
  useEffect(() => {
    if (!analyticsEnabled || !activeSearch) { lastSearch.current = ""; return; }
    if (!products || currentPage !== 1) return;
    const key = `${activeSearch}:${JSON.stringify([selectedCategories, selectedBrands, selectedModels, selectedConditions])}`;
    if (lastSearch.current === key) return;
    lastSearch.current = key;
    trackAnalytics("search", { value: activeSearch, resultCount: products.length });
  }, [activeSearch, products, currentPage, selectedCategories, selectedBrands, selectedModels, selectedConditions, analyticsEnabled]);
  useEffect(() => {
    const filters = {
      category: selectedCategories.join("|"),
      brand: selectedBrands.join("|"),
      model: selectedModels.join("|"),
      condition: selectedConditions.join("|"),
    };
    if (previousFilters.current) {
      for (const [key, value] of Object.entries(filters)) if (previousFilters.current[key] !== value) trackAnalytics("filter_change", { value: `${key}:${value}` });
    }
    previousFilters.current = filters;
  }, [selectedCategories, selectedBrands, selectedModels, selectedConditions]);

  // Searchable Brand Options
  const brandOptions: SearchableMultiSelectOption[] = useMemo(() => {
    if (!brands) return [];
    return brands.map((b) => ({
      value: b.name,
      label: b.name,
    }));
  }, [brands]);

  const modelOptions: SearchableMultiSelectOption[] = useMemo(
    () => (availableModels || []).map((model) => ({ value: model, label: model })),
    [availableModels],
  );

  // Searchable Category Options (Dynamic from Convex)
  const categoryOptions: SearchableMultiSelectOption[] = useMemo(() => {
    if (!categories) return [];
    return categories.map((c) => ({
      value: c.slug,
      label: c.name,
    }));
  }, [categories]);

  const activeCategory = categories?.find((category) => category.slug === selectedCategories[0]);
  const activeListingTitle = useMemo(() => {
    const categorySummary = selectedCategories.length === 1
      ? activeCategory?.name || "Kategori"
      : selectedCategories.length > 1
        ? `${selectedCategories.length} kategori`
        : "";
    const brandSummary = selectedBrands.length === 1
      ? selectedBrands[0]
      : selectedBrands.length > 1
        ? `${selectedBrands.length} marka`
        : "";
    const modelSummary = selectedModels.length === 1
      ? selectedModels[0]
      : selectedModels.length > 1
        ? `${selectedModels.length} model`
        : "";

    if (categorySummary) return [categorySummary, brandSummary].filter(Boolean).join(" · ");
    if (brandSummary && modelSummary) return `${brandSummary} · ${modelSummary}`;
    if (brandSummary) return `${brandSummary} parçaları`;
    if (activeSearch) return "Arama sonuçları";
    return "Parçalar";
  }, [selectedCategories, selectedBrands, selectedModels, activeSearch, activeCategory]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateCatalogParams({ q: oemSearch.trim() || null });
  };

  const handleResetFilters = () => {
    updateCatalogParams({
      kategori: null,
      marka: null,
      model: null,
      durum: null,
      stok: null,
    });
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
    trackAnalytics("catalog_page", { number: currentPage + (direction === "next" ? 1 : -1) });
    window.scrollTo({ top: 200, behavior: "smooth" });
  };

  const hasActiveFilters = Boolean(
    selectedCategories.length ||
    selectedBrands.length ||
    selectedModels.length ||
    selectedConditions.length ||
    activeSearch
  );
  const activeFilterCount = selectedCategories.length
    + selectedBrands.length
    + selectedModels.length
    + selectedConditions.length;

  const totalCatalogCount = productStats
    ? (productStats.published ?? productStats.total)
    : null;

  const partCountLabel = useMemo(() => {
    if (!hasActiveFilters && totalCatalogCount !== null) {
      return `${totalCatalogCount.toLocaleString("tr-TR")} parça`;
    }
    if (products) {
      if (currentPage > 1) return `${products.length} sonuç bu sayfada`;
      return `${products.length}${pageData?.isDone ? "" : "+"} sonuç`;
    }
    return "Parçalar";
  }, [hasActiveFilters, totalCatalogCount, products, pageData, currentPage]);

  return (
    <>
      {/* Catalogue heading */}
      <div className="border-b border-slate-200 bg-white py-5 sm:py-6">
        <div className="container flex items-center justify-between gap-3 sm:gap-6">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {activeListingTitle}
              </h1>
              <span className="text-sm font-medium text-slate-500" aria-live="polite">
                {partCountLabel}
              </span>
            </div>
          </div>
          {selectedCategories.length === 1 && activeCategory?.image && (
            <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1.5 shadow-2xs sm:h-28 sm:w-44 sm:p-2">
              <Image
                src={activeCategory.image}
                alt=""
                width={176}
                height={112}
                sizes="(max-width: 639px) 80px, 176px"
                unoptimized
                className="h-full w-full object-contain"
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Main Body Layout */}
      <div className="container py-5 sm:py-7">
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12 lg:gap-7">
          <aside className="hidden lg:col-span-3 lg:block lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:space-y-5 lg:overflow-y-auto lg:pr-1">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
              <CatalogFilterFields
                categoryOptions={categoryOptions}
                brandOptions={brandOptions}
                modelOptions={modelOptions}
                modelsLoading={Boolean(selectedBrands.length > 0 && availableModels === undefined)}
                selectedCategories={selectedCategories}
                selectedBrands={selectedBrands}
                selectedModels={selectedModels}
                selectedConditions={selectedConditions}
                idPrefix="catalog-desktop"
                hasActiveFilters={activeFilterCount > 0}
                onReset={handleResetFilters}
                onCategoryChange={(values) => updateCatalogParams({ kategori: values })}
                onBrandChange={(values) => updateCatalogParams({ marka: values, model: null })}
                onModelChange={(values) => updateCatalogParams({ model: values })}
                onConditionChange={(values) => updateCatalogParams({ durum: values })}
                title="Filtreler"
              />
            </div>

          </aside>

          {/* Right Product Grid & Pagination */}
          <section className="min-w-0 space-y-4 lg:col-span-9" aria-label="Parça sonuçları">
            {/* Search, filters and sorting */}
            <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-xs sm:p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
                {/* Search Form */}
                <div className="flex min-w-0 items-center gap-2 lg:flex-1">
                  <form onSubmit={handleFilterSubmit} className="flex min-w-0 flex-1 items-center gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="parcalar-search-input"
                      name="q"
                      type="text"
                      placeholder="OEM veya parça adı"
                      aria-label="OEM numarası, parça adı veya kod ara"
                      value={oemSearch}
                      onChange={(e) => setSearchDraft({ query: activeSearch, value: e.target.value })}
                      className="h-12 rounded-xl border-slate-300 bg-slate-50 px-4 pr-12 text-base font-mono uppercase shadow-xs placeholder:font-sans placeholder:normal-case placeholder:text-slate-500 focus-visible:bg-white focus-visible:ring-blue-500"
                    />
                    {oemSearch && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setSearchDraft({ query: activeSearch, value: "" });
                          updateCatalogParams({ q: null });
                        }}
                        aria-label="Aramayı temizle"
                        className="absolute right-1.5 top-1/2 h-9 w-9 -translate-y-1/2 text-slate-500"
                      >
                        <X className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    )}
                  </div>
                  <Button
                    type="submit"
                    variant="default"
                    size="lg"
                    aria-label="Ara"
                    className="h-12 w-12 shrink-0 rounded-xl px-0 text-sm font-semibold shadow-xs sm:w-auto sm:px-6"
                  >
                    <Search className="h-4 w-4" aria-hidden="true" />
                    <span className="sr-only sm:not-sr-only">Ara</span>
                  </Button>
                  </form>

                  <Dialog open={filterDialogOpen} onOpenChange={setFilterDialogOpen}>
                    <DialogTrigger asChild>
                      <Button
                        type="button"
                        variant="outline"
                        className="h-12 shrink-0 gap-2 rounded-xl px-2.5 text-sm font-semibold lg:hidden"
                      >
                        <SlidersHorizontal className="h-4 w-4 text-blue-700" aria-hidden="true" />
                        <span className="sr-only sm:not-sr-only">Filtreler</span>
                        {activeFilterCount > 0 && (
                          <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-700 px-1.5 text-xs font-bold text-white">
                            {activeFilterCount}
                          </span>
                        )}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="bottom-0 left-0 top-auto grid max-h-[88svh] w-full max-w-none translate-x-0 translate-y-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-0 overflow-hidden rounded-t-2xl border-slate-200 p-0 pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-h-[85dvh] sm:rounded-t-2xl lg:hidden">
                      <DialogHeader className="border-b border-slate-200 px-5 pb-4 pr-14 pt-5 text-left">
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1.5">
                            <DialogTitle>Filtreler</DialogTitle>
                            <DialogDescription>Seçimler sonuçlara hemen yansır.</DialogDescription>
                          </div>
                          {activeFilterCount > 0 && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={handleResetFilters}
                              className="h-9 shrink-0 gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
                            >
                              <X className="h-3.5 w-3.5" aria-hidden="true" />
                              Temizle
                            </Button>
                          )}
                        </div>
                      </DialogHeader>
                      <div className="min-h-0 overflow-y-auto overscroll-contain px-5 py-5">
                        <CatalogFilterFields
                          categoryOptions={categoryOptions}
                          brandOptions={brandOptions}
                          modelOptions={modelOptions}
                          modelsLoading={Boolean(selectedBrands.length > 0 && availableModels === undefined)}
                          selectedCategories={selectedCategories}
                          selectedBrands={selectedBrands}
                          selectedModels={selectedModels}
                          selectedConditions={selectedConditions}
                          idPrefix="catalog-mobile"
                          onCategoryChange={(values) => updateCatalogParams({ kategori: values })}
                          onBrandChange={(values) => updateCatalogParams({ marka: values, model: null })}
                          onModelChange={(values) => updateCatalogParams({ model: values })}
                          onConditionChange={(values) => updateCatalogParams({ durum: values })}
                          showHeader={false}
                        />
                      </div>
                      <DialogFooter className="border-t border-slate-200 bg-white px-5 pt-4">
                        <Button
                          type="button"
                          className="h-12 w-full rounded-xl"
                          onClick={() => setFilterDialogOpen(false)}
                        >
                          Sonuçları göster
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>

              </div>

            </div>

            {/* 3. Product Grid */}
            {products && products.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4">
                {products.map((p, idx) => (
                  <ProductCard key={p._id} product={p} priority={idx < 3} variant="catalog" />
                ))}
              </div>
            ) : pageData === undefined ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 sm:gap-4" aria-label="Parçalar yükleniyor">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="product-card-clean grid min-h-36 grid-cols-[6rem_minmax(0,1fr)] gap-3 p-3 sm:flex sm:min-h-80 sm:flex-col sm:p-4">
                    <div className="aspect-square animate-pulse rounded-xl bg-slate-100 sm:mb-4 sm:aspect-4/3 sm:w-full" />
                    <div className="space-y-2 self-center sm:w-full">
                      <div className="h-4 w-4/5 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
                      <div className="h-3 w-1/2 animate-pulse rounded bg-slate-100" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-4 rounded-2xl border border-slate-200 bg-white px-5 py-10 text-center shadow-xs sm:px-10 sm:py-14">
                <Cpu className="mx-auto h-10 w-10 text-blue-700" aria-hidden="true" />
                <div className="space-y-2">
                  <h2 className="text-base font-semibold text-slate-900">
                    {activeSearch ? "Bu aramayla eşleşen parça yok" : "Bu ölçütlere uygun parça yok"}
                  </h2>
                  <p className="mx-auto max-w-sm text-sm leading-6 text-slate-600">
                    Filtreleri kaldırıp tekrar arayabilir veya araç bilgilerini bize gönderebilirsiniz.
                  </p>
                </div>
                <div className="flex justify-center">
                  <Button asChild variant="whatsapp" size="sm" className="min-h-11 rounded-xl px-5 font-semibold">
                    <a
                      href={getWhatsAppUrl({ message: "Merhaba, aradığım oto elektronik parçasını bulamadım. Araç marka, model ve OEM bilgisini paylaşacağım." })}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      WhatsApp&apos;tan sor
                    </a>
                  </Button>
                </div>
              </div>
            )}

            {/* 4. Cursor pagination */}
            {products && products.length > 0 && (
              <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-slate-200 pt-5 sm:flex-row">
                <div className="text-sm font-medium text-slate-600 text-center sm:text-left">
                  Sayfa <span className="font-bold text-slate-900">{currentPage}</span> · {products.length} parça gösteriliyor
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange("previous")}
                    disabled={currentPage === 1}
                    className="h-11 rounded-xl px-4 font-semibold"
                  >
                    <ChevronLeft className="w-3.5 h-3.5 mr-1" />
                    Önceki
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handlePageChange("next")}
                    disabled={!pageData || pageData.isDone}
                    className="h-11 rounded-xl px-4 font-semibold"
                  >
                    Sonraki
                    <ChevronRight className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </section>
        </div>
      </div>
    </>
  );
}

type CheckboxFilterGroupProps = {
  options: SearchableMultiSelectOption[];
  values: string[];
  onChange: (values: string[]) => void;
  idPrefix: string;
  groupName: string;
  label: string;
  className: string;
};

function CheckboxFilterGroup({
  options,
  values,
  onChange,
  idPrefix,
  groupName,
  label,
  className,
}: CheckboxFilterGroupProps) {
  const toggleOption = (value: string, checked: boolean) => {
    onChange(
      checked
        ? values.includes(value) ? values : [...values, value]
        : values.filter((selectedValue) => selectedValue !== value),
    );
  };

  return (
    <fieldset className="min-w-0 space-y-2 border-0 p-0">
      <legend className="text-sm font-semibold text-slate-800">{label}</legend>
      <div className={`grid gap-2 ${className}`}>
        {options.map((option, index) => {
          const inputId = `${idPrefix}-${groupName}-${index}`;
          const isChecked = values.includes(option.value);

          return (
            <label
              key={option.value}
              htmlFor={inputId}
              className={`flex min-h-11 cursor-pointer items-center gap-2.5 rounded-xl border px-3 py-2 text-sm font-medium leading-tight transition-colors ${isChecked ? "border-blue-300 bg-blue-50 text-blue-900" : "border-slate-300 bg-white text-slate-700 hover:border-blue-300 hover:bg-slate-50"}`}
            >
              <input
                id={inputId}
                name={`${idPrefix}-${groupName}`}
                type="checkbox"
                value={option.value}
                checked={isChecked}
                onChange={(event) => toggleOption(option.value, event.target.checked)}
                className="h-4 w-4 shrink-0 rounded border-slate-300 accent-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
              />
              <span className="min-w-0">{option.label}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

type CatalogFilterFieldsProps = {
  categoryOptions: SearchableMultiSelectOption[];
  brandOptions: SearchableMultiSelectOption[];
  modelOptions: SearchableMultiSelectOption[];
  modelsLoading: boolean;
  selectedCategories: string[];
  selectedBrands: string[];
  selectedModels: string[];
  selectedConditions: string[];
  idPrefix: string;
  hasActiveFilters?: boolean;
  showHeader?: boolean;
  title?: string;
  onReset?: () => void;
  onCategoryChange: (values: string[]) => void;
  onBrandChange: (values: string[]) => void;
  onModelChange: (values: string[]) => void;
  onConditionChange: (values: string[]) => void;
};

function CatalogFilterFields({
  categoryOptions,
  brandOptions,
  modelOptions,
  modelsLoading,
  selectedCategories,
  selectedBrands,
  selectedModels,
  selectedConditions,
  idPrefix,
  hasActiveFilters = false,
  showHeader = true,
  title = "Filtreler",
  onReset,
  onCategoryChange,
  onBrandChange,
  onModelChange,
  onConditionChange,
}: CatalogFilterFieldsProps) {
  const modelPlaceholder = !selectedBrands.length
    ? "Önce araç markası seçin"
    : modelsLoading
      ? "Modeller yükleniyor"
      : modelOptions.length > 0
        ? "Tüm modeller"
        : "Model bilgisi bulunamadı";

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
            <SlidersHorizontal className="h-4 w-4 text-blue-700" aria-hidden="true" />
            {title}
          </h2>
          {hasActiveFilters && onReset && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              className="h-9 shrink-0 gap-1 rounded-lg px-2 text-xs font-semibold text-blue-700 hover:bg-blue-50"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              Temizle
            </Button>
          )}
        </div>
      )}

      <fieldset className="min-w-0 space-y-2 border-0 p-0">
        <legend className="text-sm font-semibold text-slate-800">Kategori</legend>
        <SearchableMultiSelect
          options={categoryOptions}
          values={selectedCategories}
          onChange={onCategoryChange}
          ariaLabel="Kategori"
          placeholder="Tüm kategoriler"
          searchPlaceholder="Kategori ara"
          emptyText="Bu aramayla eşleşen kategori yok."
        />
      </fieldset>

      <fieldset className="min-w-0 space-y-2 border-0 p-0">
        <legend className="text-sm font-semibold text-slate-800">Araç markası</legend>
        <SearchableMultiSelect
          options={brandOptions}
          values={selectedBrands}
          onChange={onBrandChange}
          ariaLabel="Araç markası"
          placeholder="Tüm markalar"
          searchPlaceholder="Marka ara"
          emptyText="Bu aramayla eşleşen marka yok."
        />
      </fieldset>

      <fieldset className="min-w-0 space-y-2 border-0 p-0">
        <legend className="text-sm font-semibold text-slate-800">Araç modeli</legend>
        <SearchableMultiSelect
          options={modelOptions}
          values={selectedModels}
          onChange={onModelChange}
          ariaLabel="Araç modeli"
          placeholder={modelPlaceholder}
          searchPlaceholder="Model ara"
          emptyText="Bu aramayla eşleşen model yok."
          disabled={!selectedBrands.length || modelsLoading || modelOptions.length === 0}
        />
      </fieldset>

      <CheckboxFilterGroup
        options={CONDITION_OPTIONS}
        values={selectedConditions}
        onChange={onConditionChange}
        idPrefix={idPrefix}
        groupName="condition"
        label="Parça durumu"
        className="grid-cols-2"
      />

    </div>
  );
}

export default function ProductCatalogClient() {
  return <ProductCatalogContent />;
}
