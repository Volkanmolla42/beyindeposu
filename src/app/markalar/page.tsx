"use client";

import Link from "next/link";
import { ChevronRight, Home, ArrowRight, ShieldCheck, Cpu } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export default function MarkalarPage() {
  const brands = useQuery(api.brands.list);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-blue-600 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Ana Sayfa</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-bold">Markalar</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200 py-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center space-y-3">
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-blue-50 text-blue-700 text-xs font-bold uppercase">
            Geniş Araç Uyumluluğu
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            DESTEKLENEN ARAÇ MARKALARI
          </h1>
          <p className="text-sm text-slate-500 max-w-xl mx-auto">
            Aşağıdaki tüm binek ve hafif ticari araç markalarının orijinal motor kontrol üniteleri ve elektronik modülleri stoklarımızda yer almaktadır.
          </p>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {brands?.map((brand) => (
            <Link
              key={brand._id}
              href={`/urunler?marka=${encodeURIComponent(brand.name)}`}
              className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 shadow-xs hover:shadow-xl transition-all duration-300 hover:-translate-y-1 text-center relative overflow-hidden"
            >
              <div className="w-18 h-18 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center mb-3 group-hover:scale-105 group-hover:bg-blue-50/50 group-hover:border-blue-200 transition-all duration-300 p-3">
                {brand.logoUrl ? (
                  <img
                    src={brand.logoUrl}
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
              <h3 className="font-extrabold text-base text-slate-900 group-hover:text-blue-600 transition-colors">
                {brand.name}
              </h3>
              <span className="text-[11px] font-semibold text-slate-400 mt-1 inline-flex items-center gap-1 group-hover:text-blue-500">
                <span>Parçaları Gör</span>
                <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
              </span>
            </Link>
          ))}
        </div>
      </div>

      <Footer />
    </div>
  );
}
