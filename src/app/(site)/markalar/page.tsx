"use client";

import Link from "next/link";
import { ChevronRight, Home, ArrowRight, Cpu } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";

export default function MarkalarPage() {
  const brands = useQuery(api.brands.list);

  return (
    <>
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="container flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-blue-600 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Ana Sayfa</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-bold">Markalar</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200 py-10">
        <div className="container text-center space-y-3">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1.5 text-xs font-medium uppercase text-blue-800">
            Geniş araç uyumluluğu
          </span>
          <h1 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">
            Desteklenen araç markaları
          </h1>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Aracınıza uygun parçaları markaya göre görüntüleyin.
          </p>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="container py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {brands?.map((brand) => (
            <Link
              key={brand._id}
              href={`/urunler?marka=${encodeURIComponent(brand.name)}`}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-center transition-colors hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="mb-3 flex h-18 w-18 items-center justify-center rounded-2xl bg-slate-50 p-3 transition-colors group-hover:bg-blue-50">
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl || `/images/brands/${brand.slug}.svg`}
                    alt={`${brand.name} logosu`}
                    className="w-full h-full object-contain filter group-hover:brightness-90 transition-transform duration-300"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <Cpu className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <h3 className="text-base font-medium text-slate-900 transition-colors group-hover:text-blue-700">
                {brand.name}
              </h3>
              <span className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-slate-600 group-hover:text-blue-700">
                <span>Parçaları Gör</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
