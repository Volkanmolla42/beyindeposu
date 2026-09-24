"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, ArrowRight, CheckCircle2, Cpu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import Image from "next/image";

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
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const searchResults = useQuery(api.products.search, {
    query: searchTerm,
    limit: 6,
  });

  const featuredProducts = useQuery(api.products.getFeatured, { limit: 7 });
  const popularOems = (featuredProducts || []).map((p) => p.oemNumber).filter(Boolean);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/urunler?q=${encodeURIComponent(searchTerm.trim())}`);
      setIsOpen(false);
    }
  };

  const handleQuickTagClick = (tag: string) => {
    setSearchTerm(tag);
    router.push(`/urunler?q=${encodeURIComponent(tag)}`);
    setIsOpen(false);
  };

  // Close dropdown on outside click
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
      {/* Search Container */}
      <div
        className={
          variant === "hero"
            ? "glass-panel rounded-2xl p-3 sm:p-4 border border-blue-500/30 shadow-2xl backdrop-blur-xl"
            : "bg-white rounded-xl p-2 border border-slate-200 shadow-md"
        }
      >
        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="OEM, BOSCH, SIEMENS, PARÇA NO, ARAÇ MODELİ..."
              className={
                variant === "hero"
                  ? "w-full pl-12 pr-10 py-3.5 bg-slate-900/90 text-white placeholder:text-slate-400 rounded-xl text-sm sm:text-base border border-slate-700/80 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 uppercase font-mono tracking-wider font-semibold transition-all"
                  : "w-full pl-11 pr-8 py-2.5 bg-slate-50 text-slate-900 placeholder:text-slate-400 rounded-lg text-sm border border-slate-200 focus:outline-none focus:border-blue-500 font-mono uppercase font-semibold"
              }
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setIsOpen(false);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          <Button
            type="submit"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 sm:px-8 h-12 rounded-xl text-sm sm:text-base shadow-lg shadow-blue-500/30 transition-all shrink-0"
          >
            <span>ARA</span>
          </Button>
        </form>

        {/* Popular searches tag bar */}
        {variant === "hero" && (
          <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex items-center gap-2 overflow-x-auto no-scrollbar text-xs">
            <span className="text-slate-400 font-medium whitespace-nowrap">
              Popüler Aramalar:
            </span>
            <div className="flex items-center gap-1.5 flex-nowrap">
              {popularOems.map((oem) => (
                <button
                  key={oem}
                  type="button"
                  onClick={() => handleQuickTagClick(oem)}
                  className="px-2.5 py-1 rounded-md bg-slate-800/80 hover:bg-blue-600 text-slate-300 hover:text-white font-mono transition-colors text-[11px] border border-slate-700/60 cursor-pointer whitespace-nowrap"
                >
                  {oem}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Live Instant Search Dropdown */}
      {isOpen && searchTerm.trim().length > 1 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50 animate-in fade-in-0 slide-in-from-top-2 duration-150">
          <div className="p-3 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-medium">
            <span>&quot;{searchTerm}&quot; için arama sonuçları</span>
            <span className="text-blue-600">
              {searchResults ? `${searchResults.length} ürün bulundu` : "Aranıyor..."}
            </span>
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
            {searchResults && searchResults.length > 0 ? (
              searchResults.map((product) => (
                <Link
                  key={product._id}
                  href={`/urunler/${product.slug}`}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center gap-4 p-3.5 hover:bg-blue-50/60 transition-colors group"
                >
                  <div className="w-14 h-14 rounded-lg bg-slate-100 border border-slate-200 overflow-hidden shrink-0 relative flex items-center justify-center">
                    {product.images?.[0] ? (
                      <img
                        src={product.images[0]}
                        alt={product.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                      />
                    ) : (
                      <Cpu className="w-6 h-6 text-slate-400" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold text-blue-700 bg-blue-100/80 px-2 py-0.5 rounded">
                        OEM: {product.oemNumber}
                      </span>
                      <span className="text-xs text-slate-500 font-semibold">
                        {product.brand} {product.model}
                      </span>
                    </div>
                    <h5 className="text-sm font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors">
                      {product.title}
                    </h5>
                    <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5">
                      <span className="flex items-center gap-1 text-emerald-600 font-medium">
                        <CheckCircle2 className="w-3 h-3" />
                        {product.condition}
                      </span>
                      <span>•</span>
                      <span>{product.inStock ? "Stokta Var" : "Temin Edilir"}</span>
                    </div>
                  </div>

                  <ArrowRight className="w-4 h-4 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all shrink-0 mr-1" />
                </Link>
              ))
            ) : (
              <div className="p-8 text-center space-y-2">
                <Cpu className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-sm font-semibold text-slate-700">
                  Bu OEM veya parça koduna ait ürün bulunamadı.
                </p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  Stoklarımızda 15.000+ ürün bulunmaktadır. WhatsApp üzerinden hemen sorarak depomuzdan teyit alabilirsiniz.
                </p>
                <div className="pt-2">
                  <Button
                    variant="whatsapp"
                    size="sm"
                    onClick={() => {
                      router.push(`/urunler?q=${encodeURIComponent(searchTerm)}`);
                      setIsOpen(false);
                    }}
                  >
                    Tüm Katalogda Ara
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
                className="text-xs font-bold text-blue-600 hover:text-blue-800 hover:underline inline-flex items-center gap-1 cursor-pointer"
              >
                <span>Tüm sonuçları gör ({searchResults.length}+)</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
