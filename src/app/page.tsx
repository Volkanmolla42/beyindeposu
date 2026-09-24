"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  CheckCircle2,
  Headphones,
  Truck,
  ArrowRight,
  Cpu,
  Search,
  Award,
  Wrench,
  Layers,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { generateWhatsAppLink } from "@/lib/utils";

export default function HomePage() {
  const [searchInput, setSearchInput] = useState("");

  const categories = useQuery(api.categories.list, {});
  const brands = useQuery(api.brands.list);
  const settings = useQuery(api.siteSettings.get);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      window.location.href = `/urunler?q=${encodeURIComponent(searchInput.trim())}`;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-white">
      <Header />

      {/* 1. HERO SECTION with full 16:9 background image */}
      <section className="relative w-full text-white pt-14 pb-16 sm:pt-20 sm:pb-20 lg:pt-24 lg:pb-24 overflow-hidden border-b border-slate-900 bg-[#090e17]">
        {/* Background Image Container */}
        <div className="absolute inset-0 z-0 pointer-events-none">
          <img
            src="/images/hero-bg.jpg"
            alt="TMS Oto Elektronik"
            className="w-full h-full object-cover object-right md:object-right lg:object-center select-none"
          />
          {/* Natural soft shadow on left for maximum text readability while keeping full authenticity */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-950/80 via-slate-950/40 to-transparent lg:w-3/5" />
          <div className="absolute inset-0 bg-black/15" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center min-h-[340px] sm:min-h-[380px]">
            {/* Left Content (Text placed over the background from code) */}
            <div className="lg:col-span-7 xl:col-span-6 space-y-6 text-left py-2 sm:py-4">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-950/70 border border-blue-500/30 text-blue-300 text-xs font-bold uppercase tracking-wider backdrop-blur-md shadow-md">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                Orijinal ve Garantili Elektronik Modüller
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.12] drop-shadow-[0_2px_12px_rgba(0,0,0,0.8)]">
                Türkiye&apos;nin<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-sky-300 to-cyan-300">
                  Oto Elektronik
                </span><br />
                Parça Merkezi
              </h1>

              <p className="text-base sm:text-lg text-slate-200 max-w-lg leading-relaxed font-normal drop-shadow-[0_1px_6px_rgba(0,0,0,0.8)]">
                ECU, ABS, Airbag, BCM, BSI, UCH ve binlerce orijinal elektronik modül.
              </p>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-start gap-4 pt-2">
                <Link href="/urunler">
                  <button className="px-8 py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm tracking-wider shadow-lg shadow-blue-600/35 hover:shadow-blue-500/55 transition-all cursor-pointer transform hover:-translate-y-0.5">
                    ÜRÜNLERİ İNCELE
                  </button>
                </Link>

                <Link href="/urunler">
                  <button className="px-8 py-3.5 rounded-xl border border-slate-600 hover:border-slate-300 bg-slate-900/80 hover:bg-slate-800/90 backdrop-blur-md text-white font-bold text-sm tracking-wider transition-all cursor-pointer transform hover:-translate-y-0.5 shadow-md">
                    OEM NO İLE ARA
                  </button>
                </Link>
              </div>
            </div>

            {/* Right side is open for the 16:9 photo composition */}
            <div className="hidden lg:block lg:col-span-5 xl:col-span-6" />
          </div>

          {/* 2. OEM NO İLE HIZLI ARAMA Dark Container */}
          <div className="mt-12 sm:mt-16 max-w-4xl mx-auto backdrop-blur-xl bg-slate-950/85 border border-slate-800/90 rounded-2xl p-6 sm:p-7 text-center space-y-4 shadow-2xl shadow-black/50">
            <div className="flex items-center justify-center gap-3">
              <span className="h-px w-12 bg-slate-700" />
              <h3 className="text-xs uppercase font-extrabold tracking-widest text-slate-300">
                OEM NO İLE HIZLI ARAMA
              </h3>
              <span className="h-px w-12 bg-slate-700" />
            </div>

            <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="OEM, BOSCH, SIEMENS, PARÇA NO, ARAÇ MODELİ, VIN..."
                className="flex-1 bg-white text-slate-900 placeholder:text-slate-400 font-mono text-sm px-4 py-3.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-semibold shadow-inner"
              />
              <button
                type="submit"
                className="px-8 py-3.5 bg-blue-600 hover:bg-blue-500 text-white font-extrabold text-sm rounded-xl transition-all cursor-pointer shrink-0 shadow-md shadow-blue-600/30"
              >
                ARA
              </button>
            </form>

          </div>
        </div>
      </section>


      {/* 3. FOUR VALUE PROPOSITIONS matching Screenshot 1 */}
      <section className="w-full bg-white border-b border-slate-200 py-6 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 uppercase">AYNI GÜN HIZLI KARGO</h4>
              <p className="text-[11px] text-slate-500">Saat 16:00&apos;ya kadar verilen siparişler aynı gün yola çıkar</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 uppercase">GARANTİLİ &amp; ORİJİNAL</h4>
              <p className="text-[11px] text-slate-500">Tüm oto elektronik modülleri garantilidir</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 uppercase">ÜRÜN İADE GÜVENCESİ</h4>
              <p className="text-[11px] text-slate-500">Uyumsuzlukta koşulsuz birebir iade &amp; değişim</p>
            </div>
          </div>

          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-extrabold text-xs text-slate-900 uppercase">UZMAN TEKNİK DESTEK</h4>
              <p className="text-[11px] text-slate-500">WhatsApp &amp; Canlı Destek ile parça uyumluluk teyidi</p>
            </div>
          </div>
        </div>
      </section>

      {/* 4. PRODUCT CATEGORIES (12 Items matching Screenshot 1) */}
      <section className="w-full py-14 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-8">
          <div className="text-center">
            <div className="flex items-center justify-center gap-3 mb-1">
              <span className="h-px w-10 bg-slate-300" />
              <h2 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wider">
                ÜRÜN KATEGORİLERİ
              </h2>
              <span className="h-px w-10 bg-slate-300" />
            </div>
          </div>

          {/* Categories Grid from Convex */}
          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
            {categories?.map((cat) => (
              <Link
                key={cat._id || cat.slug}
                href={`/urunler?kategori=${cat.slug}`}
                className="group flex flex-col items-center justify-center p-6 rounded-2xl bg-white border border-slate-200 hover:border-blue-500 shadow-xs hover:shadow-lg transition-all text-center"
              >
                <div className="w-24 h-24 rounded-xl bg-slate-50 flex items-center justify-center p-2 mb-3 group-hover:scale-105 transition-transform">
                  {cat.image ? (
                    <img
                      src={cat.image}
                      alt={cat.name}
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Layers className="w-10 h-10 text-slate-400" />
                  )}
                </div>
                <h3 className="font-extrabold text-xs text-slate-900 uppercase tracking-tight group-hover:text-blue-600 transition-colors">
                  {cat.name}
                </h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 5. STATS BAR (Dynamic from Site Settings) */}
      <section className="w-full py-10 px-4 sm:px-6 lg:px-8 bg-[#091424] text-white">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-y md:divide-y-0 md:divide-x divide-slate-800">
          <div className="pt-2 md:pt-0">
            <span className="text-3xl sm:text-4xl font-black text-white block">
              15.000+
            </span>
            <span className="text-[11px] uppercase font-bold text-slate-400 mt-1 block tracking-wider">
              STOKLU ÜRÜN
            </span>
          </div>

          <div className="pt-2 md:pt-0">
            <span className="text-3xl sm:text-4xl font-black text-white block">
              {brands && brands.length > 0 ? `${brands.length}+` : "45+"}
            </span>
            <span className="text-[11px] uppercase font-bold text-slate-400 mt-1 block tracking-wider">
              ARAÇ MARKASI
            </span>
          </div>

          <div className="pt-2 md:pt-0">
            <span className="text-3xl sm:text-4xl font-black text-white block">
              1000+
            </span>
            <span className="text-[11px] uppercase font-bold text-slate-400 mt-1 block tracking-wider">
              ECU MODELİ
            </span>
          </div>

          <div className="pt-2 md:pt-0">
            <span className="text-3xl sm:text-4xl font-black text-white block">
              20+
            </span>
            <span className="text-[11px] uppercase font-bold text-slate-400 mt-1 block tracking-wider">
              YILLIK TECRÜBE
            </span>
          </div>
        </div>
      </section>

      {/* 6. SUPPORTED BRANDS STRIP (Dynamic from Convex) */}
      <section className="w-full py-10 px-4 sm:px-6 lg:px-8 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto space-y-6 text-center">
          <div className="flex items-center justify-center gap-3">
            <span className="h-px w-10 bg-slate-300" />
            <h3 className="text-xs uppercase font-extrabold text-slate-400 tracking-widest">
              ARAÇ MARKALARI
            </h3>
            <span className="h-px w-10 bg-slate-300" />
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            {brands?.map((b) => (
              <Link
                key={b._id}
                href={`/urunler?marka=${encodeURIComponent(b.name)}`}
                className="group flex items-center gap-2.5 px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-extrabold text-slate-700 hover:text-blue-600 hover:border-blue-300 hover:bg-white hover:shadow-md transition-all shadow-2xs cursor-pointer"
              >
                {b.logoUrl && (
                  <img
                    src={b.logoUrl}
                    alt={`${b.name} logosu`}
                    className="w-4 h-4 object-contain opacity-75 group-hover:opacity-100 transition-opacity"
                    onError={(e) => {
                      (e.currentTarget as HTMLElement).style.display = "none";
                    }}
                  />
                )}
                <span>{b.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
