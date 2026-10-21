"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, CheckCircle2, Cpu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import Link from "next/link";
import { ProductImage } from "@/components/ProductImage";
import { trackAnalytics, useAnalyticsConsent } from "@/lib/analytics";
import { getProductImageAlt, getProductImageSource } from "@/lib/product-images";

interface OemSearchBarProps {
  className?: string;
  variant?: "hero" | "compact";
}

export default function OemSearchBar({
  className = "",
  variant = "hero",
}: OemSearchBarProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedTerm, setDebouncedTerm] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const consent = useAnalyticsConsent();
  const analyticsEnabled = consent.enabled && consent.choice === "granted" && !consent.privacySignal;
  const lastSearch = useRef("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedTerm(searchTerm.trim());
    }, 250);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const searchResults = useQuery(
    api.products.search,
    debouncedTerm.length >= 2
      ? { query: debouncedTerm, limit: 6 }
      : "skip"
  );

  useEffect(() => {
    if (!analyticsEnabled || debouncedTerm.length < 2) { lastSearch.current = ""; return; }
    if (!isOpen || !searchResults || searchTerm.trim() !== debouncedTerm) return;
    const timer = setTimeout(() => {
      if (lastSearch.current === debouncedTerm) return;
      lastSearch.current = debouncedTerm;
      trackAnalytics("search", { value: debouncedTerm, resultCount: searchResults.length });
    }, 750);
    return () => clearTimeout(timer);
  }, [debouncedTerm, searchTerm, searchResults, isOpen, analyticsEnabled]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/parcalar?q=${encodeURIComponent(searchTerm.trim())}`);
      setIsOpen(false);
    }
  };

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={`w-full relative ${className}`}>
      <form onSubmit={handleSearchSubmit} className="relative w-full">
        <input
          id={`oem-search-${variant}`}
          name="oem-search"
          type="text"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="OEM no, parça no, araç modeli veya VIN ile arayın..."
          aria-label="OEM numarası, parça numarası, araç modeli veya VIN ile ara"
          className={
            variant === "hero"
              ? "h-14 w-full rounded-2xl border border-slate-200/90 bg-white pl-5 pr-28 text-sm sm:text-base font-medium text-slate-900 shadow-xl placeholder:font-normal placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all"
              : "h-12 w-full rounded-xl border border-slate-200 bg-white pl-4 pr-24 text-sm font-medium text-slate-900 shadow-sm placeholder:font-normal placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 transition-all"
          }
        />

        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1">
          {searchTerm && (
            <button
              type="button"
              onClick={() => {
                setSearchTerm("");
                setIsOpen(false);
              }}
              className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Aramayı temizle"
            >
              <X className="h-4 w-4" />
            </button>
          )}

          <button
            type="submit"
            className={
              variant === "hero"
                ? "flex h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:bg-amber-400 active:scale-95 cursor-pointer"
                : "flex h-8 items-center justify-center gap-1 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 transition-all hover:bg-amber-400 active:scale-95 cursor-pointer"
            }
          >
            <Search className="h-4 w-4 text-slate-950" />
            <span>Ara</span>
          </button>
        </div>
      </form>

      {isOpen && searchTerm.trim().length > 1 && (
        <div className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg animate-in fade-in-0 slide-in-from-top-2 duration-150">
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>&quot;{searchTerm}&quot; için arama sonuçları</span>
            <span className="text-amber-600 font-semibold">
              {searchResults ? `${searchResults.length} sonuç` : "Aranıyor..."}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {searchResults === undefined ? null : searchResults.length > 0 ? (
              searchResults.map((product) => (
                <Link
                  key={product._id}
                  href={`/parcalar/${product.slug}`}
                  onClick={() => { trackAnalytics("search_result_click", { path: `/parcalar/${product.slug}` }); setIsOpen(false); }}
                  className="flex items-center gap-4 p-3.5 hover:bg-amber-50/60 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                    <ProductImage
                      src={getProductImageSource(product.images)}
                      alt={getProductImageAlt(product.title, product.images)}
                      fill
                      unoptimized
                      sizes="56px"
                      className="object-contain group-hover:scale-105 transition-transform"
                    />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-amber-700 bg-amber-100/80 px-2 py-0.5 rounded">
                        OEM: {product.oemNumber}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {product.brand} {product.model}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-slate-900 truncate group-hover:text-amber-600 transition-colors">
                      {product.title}
                    </div>
                    <div className="flex items-center gap-3 text-3xs text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {product.condition}
                      </span>
                      <span>•</span>
                      <span>{product.inStock ? "Stokta" : "Stokta yok"}</span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-1 transition-all shrink-0 mr-1" />
                </Link>
              ))
            ) : (
              <div className="p-8 text-center space-y-2">
                <Cpu className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Bu aramayla eşleşen parça yok.
                </p>
                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      router.push(`/parcalar?q=${encodeURIComponent(searchTerm)}`);
                      setIsOpen(false);
                    }}
                  >
                    Katalogda ara
                  </Button>
                </div>
              </div>
            )}
          </div>

          {searchResults && searchResults.length > 0 && (
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 text-center">
              <button
                type="button"
                onClick={handleSearchSubmit}
                className="text-xs font-bold text-amber-600 hover:text-amber-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Tüm sonuçları gör</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
