"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ChevronRight,
  ChevronLeft,
  Phone,
  Check,
  Copy,
  Cpu,
  Zap,
  Share2,
  Package,
  Car,
  Wrench,
} from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import ProductCard from "@/components/ProductCard";
import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "@convex/_generated/api";
import { SITE_CONTACT } from "@/config/site";
import { generateWhatsAppLink } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { Badge } from "@/components/ui/badge";
import { ModernImageZoom } from "@/components/ModernImageZoom";
import { slugify, LOCAL_BRAND_LOGOS } from "@/app/admin/admin-utils";

interface PageProps {
  slug: string;
  initialProduct: NonNullable<FunctionReturnType<typeof api.products.getBySlug>>;
}

export default function ProductDetailClient({ slug, initialProduct }: PageProps) {

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [copiedOem, setCopiedOem] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const queriedProduct = useQuery(api.products.getBySlug, { slug });
  const product = queriedProduct === undefined ? initialProduct : queriedProduct;
  // static site contact

  // Fetch related products in the same category
  const relatedProducts = useQuery(
    api.products.list,
    product?.categorySlug
      ? { categorySlug: product.categorySlug }
      : "skip"
  );

  const whatsappNumber = SITE_CONTACT.whatsappNumber;
  const displayPhone = SITE_CONTACT.phone;

  // Resolve brand logo
  const brands = useQuery(api.brands.list);
  const brandSlug = product?.brand ? slugify(product.brand) : "";
  const brandInfo = brands?.find(
    (b) =>
      b.name.toLowerCase() === product?.brand?.toLowerCase() ||
      b.slug.toLowerCase() === brandSlug
  );
  const brandLogoUrl =
    brandInfo?.logoUrl ||
    LOCAL_BRAND_LOGOS[brandSlug] ||
    (brandSlug ? `/images/brands/${brandSlug}.svg` : null);

  const galleryImages = product?.images ?? [];
  const productDescription = product?.description?.trim() ?? "";


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

  if (product === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center py-24">
        <div className="space-y-4 max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <Cpu className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Aradığınız Ürün Bulunamadı</h2>
          <Link href="/urunler">
            <Button variant="default" size="default" className="w-full">
              Tüm Ürün Kataloğuna Dön
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Filter out current product from related list and take up to 3 items
  const filteredRelated = (relatedProducts || [])
    .filter((p) => p._id !== product._id)
    .slice(0, 3);

  return (
    <>
      {/* 1. Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="container flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap">
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

      {/* 2. Main Product Showcase & Related Products */}
      <div className="container py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">

            {/* Product images are shown only when they exist in the product record. */}
            {galleryImages.length > 0 && (
              <div className="lg:col-span-6 space-y-4">
                <div className="relative aspect-4/3 w-full rounded-2xl bg-slate-50/80 border border-slate-200 overflow-hidden flex items-center justify-center p-2 group shadow-xs">
                  <ModernImageZoom
                    src={galleryImages[activeImageIndex] || galleryImages[0]}
                    alt={product.title}
                    className="w-full h-full aspect-4/3 border-0 bg-transparent rounded-xl"
                  />

                  {galleryImages.length > 1 && (
                    <>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveImageIndex((prev) => (prev === 0 ? galleryImages.length - 1 : prev - 1));
                        }}
                        className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-700 flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-white transition-all cursor-pointer"
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
                        className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white/90 shadow-md border border-slate-200 text-slate-700 flex items-center justify-center opacity-80 hover:opacity-100 hover:bg-white transition-all cursor-pointer"
                        title="Sonraki Görsel"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </button>
                    </>
                  )}
                </div>

                <div className="flex items-center gap-2.5 overflow-x-auto pb-1">
                  {galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-16 rounded-xl overflow-hidden border-2 bg-slate-50 transition-all cursor-pointer shrink-0 ${activeImageIndex === idx ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200 opacity-70 hover:opacity-100"}`}
                    >
                      <img src={img} alt={`Görsel ${idx + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Right Column: Specs, Badges & Working Action CTAs */}
            <div className={`${galleryImages.length > 0 ? "lg:col-span-6" : "lg:col-span-12"} space-y-5`}>
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
                  {[product.brand, product.model, product.categoryName].filter(Boolean).join(" • ")}
                </p>

                {/* Status Badges */}
                <div className="flex items-center gap-2 pt-3">
                  <Badge variant={product.condition === "Sıfır" ? "success" : "secondary"} className="text-xs font-bold">
                    {product.condition}
                  </Badge>
                  <Badge variant={product.inStock ? "info" : "warning"} className="text-xs font-bold">
                    {product.inStock ? "Stokta" : "Stokta değil"}
                  </Badge>
                </div>
              </div>

              {/* Technical Information Summary Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden text-xs divide-y divide-slate-100 shadow-2xs">
                <div className="grid grid-cols-2 p-3 bg-slate-50/60">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-slate-400" /> OEM / Parça No
                  </span>
                  <span className="font-mono font-bold text-slate-900">{product.oemNumber}</span>
                </div>
                <div className="grid grid-cols-2 p-3 items-center">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400" /> Araç Markası
                  </span>
                  <Link
                    href={`/urunler?marka=${encodeURIComponent(product.brand)}`}
                    className="inline-flex items-center gap-2 group w-fit"
                    title={`${product.brand} parçalarını gör`}
                  >
                    {brandLogoUrl && (
                      <img
                        src={brandLogoUrl}
                        alt=""
                        className="h-5 w-5 object-contain shrink-0"
                        onError={(e) => {
                          (e.currentTarget as HTMLElement).style.display = "none";
                        }}
                      />
                    )}
                    {product.brand}
                  </Link>
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
                    Parça Durumu
                  </span>
                  <span className="font-bold text-slate-900">{product.condition}</span>
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
                    `Merhaba Beyin Deposu, ${product.oemNumber} kodlu (${product.title}) parça hakkında fiyat ve stok bilgisi almak istiyorum.`
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
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs py-6 rounded-xl shadow-sm"
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

          {productDescription && (
            <section className="mt-10 pt-8 border-t border-slate-200 text-sm text-slate-700 leading-relaxed">
              <MarkdownRenderer content={productDescription} />
            </section>
          )}
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
    </>
  );
}
