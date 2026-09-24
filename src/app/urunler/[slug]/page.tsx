"use client";

import { use, useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronLeft,
  Phone,
  RotateCw,
  Check,
  Copy,
  Cpu,
  ShieldCheck,
  Zap,
  Maximize2,
  Share2,
  Package,
  Clock,
  Car,
  Wrench,
  CheckCircle2,
} from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard from "@/components/ProductCard";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { generateWhatsAppLink } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function ProductDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const slug = resolvedParams.slug;

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [isAutoPlaying, setIsAutoPlaying] = useState(false);
  const [copiedOem, setCopiedOem] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [activeTab, setActiveTab] = useState<"desc" | "specs" | "shipping">("desc");

  const product = useQuery(api.products.getBySlug, { slug });
  const settings = useQuery(api.siteSettings.get);

  // Fetch related products in the same category
  const relatedProducts = useQuery(
    api.products.list,
    product?.categorySlug
      ? { categorySlug: product.categorySlug }
      : "skip"
  );

  const whatsappNumber = settings?.whatsappNumber || "";
  const displayPhone = settings?.phone || "";

  // Dynamic SEO Title
  useEffect(() => {
    if (product) {
      document.title = product.metaTitle || `${product.oemNumber} ${product.title} | Beyindeposu`;
    }
  }, [product]);

  // Gallery Images fallback
  const galleryImages =
    product?.images && product.images.length > 0
      ? product.images
      : [
        "/images/catalog-ecu-banner.jpg",
        "/images/cat-ecu.jpg",
        "/images/hero-ecu-modules.jpg",
      ];

  // Interactive 360 / Slideshow Player
  useEffect(() => {
    if (!isAutoPlaying || galleryImages.length <= 1) return;
    const interval = setInterval(() => {
      setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
    }, 1200);
    return () => clearInterval(interval);
  }, [isAutoPlaying, galleryImages.length]);

  const handleCopyOem = () => {
    if (!product?.oemNumber) return;
    navigator.clipboard.writeText(product.oemNumber);
    setCopiedOem(true);
    setTimeout(() => setCopiedOem(false), 2000);
  };

  const handleShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  if (product === undefined) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center py-24">
          <div className="text-center space-y-3">
            <Cpu className="w-10 h-10 text-blue-600 animate-spin mx-auto" />
            <p className="text-sm font-semibold text-slate-600">Ürün Yükleniyor...</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (product === null) {
    return (
      <div className="min-h-screen flex flex-col bg-slate-50">
        <Header />
        <div className="flex-1 flex items-center justify-center p-6 text-center py-24">
          <div className="space-y-4 max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
            <Cpu className="w-12 h-12 text-slate-400 mx-auto" />
            <h2 className="text-xl font-bold text-slate-900">Aradığınız Ürün Bulunamadı</h2>
            <p className="text-xs text-slate-500">
              Bu parça kaldırılmış veya adresi değişmiş olabilir. Stoklarımızdaki diğer ürünleri inceleyebilirsiniz.
            </p>
            <Link href="/urunler">
              <Button variant="default" size="default" className="w-full">
                Tüm Ürün Kataloğuna Dön
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // Filter out current product from related list and take up to 3 items
  const filteredRelated = (relatedProducts || [])
    .filter((p) => p._id !== product._id)
    .slice(0, 3);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      {/* 1. Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
          <Link href="/" className="hover:text-blue-600 transition-colors">Ana Sayfa</Link>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <Link href="/urunler" className="hover:text-blue-600 transition-colors">Ürünler</Link>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <Link href={`/urunler?kategori=${product.categorySlug}`} className="hover:text-blue-600 transition-colors">
            {product.categoryName}
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-900 font-mono font-bold truncate">{product.oemNumber}</span>
        </div>
      </div>

      {/* 2. Main Product Showcase Card */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Left Column: Interactive Product Images Gallery */}
            <div className="lg:col-span-6 space-y-4">
              {/* Main Image Container */}
              <div className="relative aspect-4/3 w-full rounded-2xl bg-slate-50/80 border border-slate-200 overflow-hidden flex items-center justify-center p-6 group">
                <img
                  src={galleryImages[activeImageIndex] || galleryImages[0]}
                  alt={product.title}
                  onClick={() => setIsZoomOpen(true)}
                  className="w-full h-full object-contain cursor-zoom-in transition-transform duration-300 group-hover:scale-102"
                />

                {/* Prev / Next Arrows */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
                      }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-700 flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-white transition-all cursor-pointer"
                      title="Önceki Görsel"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveImageIndex((prev) => (prev + 1) % galleryImages.length);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-700 flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-white transition-all cursor-pointer"
                      title="Sonraki Görsel"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Top Action Floating Badges */}
                <div className="absolute top-3 right-3 flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setIsZoomOpen(true)}
                    className="w-8 h-8 rounded-lg bg-white/90 hover:bg-white text-slate-700 shadow-sm border border-slate-200 flex items-center justify-center transition-colors cursor-pointer"
                    title="Tam Ekran Büyüt"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Thumbnails Strip + Working 360/Play Toggle */}
              <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                {galleryImages.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setActiveImageIndex(idx);
                      setIsAutoPlaying(false);
                    }}
                    className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 bg-slate-50 transition-all cursor-pointer shrink-0 ${activeImageIndex === idx ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200 opacity-70 hover:opacity-100"
                      }`}
                  >
                    <img src={img} alt={`Görsel ${idx + 1}`} className="w-full h-full object-cover" />
                  </button>
                ))}

                {/* Working 360° / Auto-Tour Button */}
                {galleryImages.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setIsAutoPlaying((prev) => !prev)}
                    className={`ml-auto flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl border transition-all cursor-pointer shrink-0 ${isAutoPlaying
                        ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    title={isAutoPlaying ? "Döndürmeyi Durdur" : "Tüm Açıları Otomatik Oynat"}
                  >
                    <RotateCw className={`w-3.5 h-3.5 ${isAutoPlaying ? "animate-spin" : ""}`} />
                    <span>{isAutoPlaying ? "Durdur" : "360° Tur"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Right Column: Specs, Badges & Working Action CTAs */}
            <div className="lg:col-span-6 space-y-5">
              <div>
                {/* OEM Number + Copy Button */}
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="font-mono text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
                    {product.oemNumber}
                  </h1>
                  <button
                    type="button"
                    onClick={handleCopyOem}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    title="OEM Kodunu Kopyala"
                  >
                    {copiedOem ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Kopyalandı!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-500" />
                        <span>Kopyala</span>
                      </>
                    )}
                  </button>

                  {/* Share Link Button */}
                  <button
                    type="button"
                    onClick={handleShareLink}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                    title="Bağlantıyı Kopyala"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700 font-bold">Link Alındı!</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5 text-slate-500" />
                        <span>Paylaş</span>
                      </>
                    )}
                  </button>
                </div>

                <h2 className="text-base font-bold text-slate-800 mt-1">
                  {product.title}
                </h2>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {product.brand} • {product.model} • {product.categoryName}
                </p>

                {/* Status Badges */}
                <div className="flex items-center gap-2 pt-3">
                  <Badge variant={product.condition === "Sıfır" ? "success" : "secondary"} className="text-xs font-bold">
                    {product.condition}
                  </Badge>
                  <Badge variant={product.inStock ? "info" : "warning"} className="text-xs font-bold">
                    {product.inStock ? "Stokta Hazır" : "Temin Edilir"}
                  </Badge>
                  <Badge variant="outline" className="text-xs font-semibold text-slate-600">
                    Orijinal Garantili
                  </Badge>
                </div>
              </div>

              {/* Technical Information Summary Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs divide-y divide-slate-100 shadow-2xs">
                <div className="grid grid-cols-2 p-3 bg-slate-50/60">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" /> OEM / Bosch No
                  </span>
                  <span className="font-mono font-bold text-slate-900">{product.oemNumber}</span>
                </div>
                <div className="grid grid-cols-2 p-3">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400" /> Araç Markası
                  </span>
                  <span className="font-bold text-slate-900">{product.brand}</span>
                </div>
                {product.model && (
                  <div className="grid grid-cols-2 p-3 bg-slate-50/60">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-slate-400" /> Uyumlu Model
                    </span>
                    <span className="font-bold text-slate-900">{product.model}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 p-3">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400" /> Modül Kategorisi
                  </span>
                  <span className="font-semibold text-slate-900">{product.categoryName}</span>
                </div>
                <div className="grid grid-cols-2 p-3 bg-slate-50/60">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Parça Durumu
                  </span>
                  <span className="font-bold text-slate-900">{product.condition} (Test Edilmiş)</span>
                </div>
              </div>

              {/* Clickable Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {product.tags.map((tag, idx) => (
                    <Link
                      key={idx}
                      href={`/urunler?q=${encodeURIComponent(tag)}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* 100% Real Working Action Buttons: WHATSAPP & TELEFON */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <a
                  href={generateWhatsAppLink(
                    whatsappNumber,
                    product.title,
                    product.oemNumber,
                    `Merhaba Beyindeposu, ${product.oemNumber} kodlu (${product.title}) parça hakkında fiyat ve stok bilgisi almak istiyorum.`
                  )}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="sm:col-span-2"
                >
                  <Button
                    variant="whatsapp"
                    size="lg"
                    className="w-full text-xs font-black tracking-wider py-6 rounded-xl shadow-md shadow-emerald-600/20"
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-white text-white mr-1.5" />
                    <span>WHATSAPP İLE FİYAT &amp; STOK SOR</span>
                  </Button>
                </a>

                <a
                  href={`tel:${displayPhone.replace(/\s+/g, "")}`}
                  className="w-full"
                >
                  <Button
                    variant="secondary"
                    size="lg"
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs py-6 rounded-xl shadow-md"
                  >
                    <Phone className="w-4 h-4 mr-1.5" />
                    <span>HEMEN ARA</span>
                  </Button>
                </a>
              </div>

              {/* Guarantees Box */}
              <div className="p-4 rounded-2xl bg-gradient-to-br from-blue-50/80 via-slate-50 to-emerald-50/50 border border-blue-100/80 space-y-3 text-xs">
                <div className="flex items-center gap-2 text-blue-950 font-extrabold">
                  <Zap className="w-4 h-4 text-blue-600 fill-blue-600" />
                  <span>Kargo, Garanti ve İade Güvencesi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-[11px] text-slate-700">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 shrink-0">✓</span>
                    <span><strong>16:00&apos;ya Kadar Aynı Gün:</strong> Stoktaki ürünler aynı gün kargoya teslim edilir.</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 shrink-0">✓</span>
                    <span><strong>Birebir Değişim &amp; İade:</strong> Uyumsuzluk durumunda koşulsuz iade güvencesi.</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-emerald-600 shrink-0">✓</span>
                    <span><strong>Test Edilmiş Orijinal:</strong> Tüm elektronik kontrol üniteleri test edilmiş garantilidir.</span>
                  </div>

                  <div className="flex items-start gap-2">
                    <span className="font-bold text-blue-600 shrink-0">✓</span>
                    <span><strong>Antistatik Korumalı Paket:</strong> Hassas modüller darbelere dayanıklı özel kutuda gönderilir.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. Interactive Tabs: Açıklama, Uyumlu Araçlar, Garanti */}
          <div className="mt-10 pt-8 border-t border-slate-200 space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto scrollbar-none pb-px">
              <button
                type="button"
                onClick={() => setActiveTab("desc")}
                className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === "desc"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
              >
                Ürün Detayı ve Açıklaması
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("specs")}
                className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === "specs"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
              >
                Uyumlu Araçlar &amp; Parça Bilgileri
              </button>

              <button
                type="button"
                onClick={() => setActiveTab("shipping")}
                className={`pb-3 px-4 text-xs font-extrabold transition-all border-b-2 cursor-pointer whitespace-nowrap ${activeTab === "shipping"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-500 hover:text-slate-900"
                  }`}
              >
                Kargo, Teslimat &amp; Garanti
              </button>
            </div>

            {/* Tab 1: Açıklama */}
            {activeTab === "desc" && (
              <div className="space-y-4 animate-in fade-in-50 duration-200">
                <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 text-sm text-slate-700 leading-relaxed whitespace-pre-line">
                  {product.description || "Bu ürün orijinal oto elektronik parçası olup çalışır durumda ve garantilidir."}
                </div>

                {/* 4 Feature Badges */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
                  <div className="flex items-center gap-2 p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-xs text-slate-800">Orijinal Parça</span>
                  </div>
                  <div className="flex items-center gap-2 p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <Check className="w-4 h-4 text-emerald-600 shrink-0 font-bold" />
                    <span className="font-bold text-xs text-slate-800">Hazır Stok</span>
                  </div>
                  <div className="flex items-center gap-2 p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0" />
                    <span className="font-bold text-xs text-slate-800">Test Edilmiş</span>
                  </div>
                  <div className="flex items-center gap-2 p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs">
                    <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    <span className="font-bold text-xs text-slate-800">16:00 Aynı Gün</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab 2: Uyumlu Araçlar */}
            {activeTab === "specs" && (
              <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-4 animate-in fade-in-50 duration-200">
                <h4 className="font-bold text-sm text-slate-900">Uyumlu Araçlar ve Montaj Bilgisi</h4>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Bu modül <strong>{product.brand} {product.model}</strong> araç modelleri ile uyumludur. Aracınızın mevcut parça numarasının <strong>{product.oemNumber}</strong> ile birebir aynı olduğundan emin olunuz. Parça kodunuz farklıysa veya emin değilseniz WhatsApp hattımızdan şasi numaranızla teyit alabilirsiniz.
                </p>
                <div className="pt-2">
                  <a
                    href={generateWhatsAppLink(
                      whatsappNumber,
                      product.title,
                      product.oemNumber,
                      `Merhaba Beyindeposu, şasi numaram ile ${product.oemNumber} kodlu parçanın aracıma uyumlu olup olmadığını teyit etmek istiyorum.`
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button variant="outline" size="sm" className="font-bold text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300">
                      <WhatsAppIcon className="w-3.5 h-3.5 mr-1.5 fill-emerald-600 text-emerald-600" />
                      <span>Şasi No ile Uyumluluk Teyidi Al</span>
                    </Button>
                  </a>
                </div>
              </div>
            )}

            {/* Tab 3: Kargo & Teslimat */}
            {activeTab === "shipping" && (
              <div className="p-6 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3 text-xs text-slate-700 leading-relaxed animate-in fade-in-50 duration-200">
                <h4 className="font-bold text-sm text-slate-900 mb-2">Kargo &amp; Teslimat Koşulları</h4>
                <p>• Hafta içi saat 16:00&apos;ya kadar onaylanan siparişler aynı gün anlaşmalı kargo firmalarına teslim edilir.</p>
                <p>• Tüm ürünler antistatik korumalı hava yastıklı özel paketlerde kırılma ve darbelere karşı sigortalı gönderilir.</p>
                <p>• Ürünü teslim aldıktan sonra uyumsuzluk yaşanması halinde 14 gün içerisinde iade ve değişim talep edebilirsiniz.</p>
              </div>
            )}
          </div>
        </div>

        {/* 4. Benzer / Aynı Kategorideki Diğer Ürünler */}
        {filteredRelated && filteredRelated.length > 0 && (
          <div className="mt-12 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900 tracking-tight">
                {product.categoryName} Kategorisindeki Benzer Parçalar
              </h3>
              <Link
                href={`/urunler?kategori=${product.categorySlug}`}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Tümünü Gör</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRelated.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. Fullscreen Zoom Image Modal (Dialog) */}
      <Dialog open={isZoomOpen} onOpenChange={setIsZoomOpen}>
        <DialogContent className="max-w-4xl p-4 sm:p-6 bg-white rounded-2xl">
          <DialogTitle className="text-sm font-bold text-slate-900 font-mono pb-2 border-b border-slate-100 flex items-center justify-between">
            <span>{product.oemNumber} - {product.title}</span>
          </DialogTitle>
          <div className="relative aspect-4/3 w-full max-h-[70vh] flex items-center justify-center p-4 bg-slate-50 rounded-xl overflow-hidden">
            <img
              src={galleryImages[activeImageIndex] || galleryImages[0]}
              alt={product.title}
              className="w-full h-full object-contain"
            />
            {galleryImages.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1))}
                  className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 text-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-50"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setActiveImageIndex((prev) => (prev + 1) % galleryImages.length)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-md border border-slate-200 text-slate-800 flex items-center justify-center cursor-pointer hover:bg-slate-50"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
          {/* Thumbnails in Zoom Modal */}
          {galleryImages.length > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              {galleryImages.map((img, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setActiveImageIndex(i)}
                  className={`w-16 h-12 rounded-lg overflow-hidden border-2 cursor-pointer ${activeImageIndex === i ? "border-blue-600" : "border-slate-200 opacity-60"
                    }`}
                >
                  <img src={img} alt="thumb" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Footer />
    </div>
  );
}
