"use client";

import { useState, useRef, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  ChevronRight,
  Phone,
  Check,
  Copy,
  Cpu,
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
import { getWhatsAppUrl } from "@/lib/whatsapp";
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

  const displayPhone = SITE_CONTACT.phone;

  // Resolve brand logo
  const brands = useQuery(api.brands.list, {});
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


  const copyOemTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyLinkTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyOemTimerRef.current) clearTimeout(copyOemTimerRef.current);
      if (copyLinkTimerRef.current) clearTimeout(copyLinkTimerRef.current);
    };
  }, []);

  const handleCopyOem = () => {
    if (!product?.oemNumber) return;
    navigator.clipboard.writeText(product.oemNumber);
    setCopiedOem(true);
    if (copyOemTimerRef.current) clearTimeout(copyOemTimerRef.current);
    copyOemTimerRef.current = setTimeout(() => {
      setCopiedOem(false);
      copyOemTimerRef.current = null;
    }, 2000);
  };

  const handleShareLink = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      if (copyLinkTimerRef.current) clearTimeout(copyLinkTimerRef.current);
      copyLinkTimerRef.current = setTimeout(() => {
        setCopiedLink(false);
        copyLinkTimerRef.current = null;
      }, 2000);
    }
  };

  if (product === null) {
    return (
      <div className="flex-1 flex items-center justify-center p-6 text-center py-24">
        <div className="space-y-4 max-w-md bg-white p-8 rounded-2xl border border-slate-200 shadow-sm">
          <Cpu className="w-12 h-12 text-slate-400 mx-auto" />
          <h2 className="text-xl font-bold text-slate-900">Parça bulunamadı</h2>
          <Link href="/parcalar">
            <Button variant="default" size="default" className="w-full">
              Tüm parçalara dön
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
    <div className="w-full">
      {/* 1. Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="container flex items-center gap-2 text-xs text-slate-500 overflow-x-auto whitespace-nowrap scrollbar-none">
          <Link href="/" className="hover:text-blue-600 transition-colors shrink-0">Ana sayfa</Link>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <Link href="/parcalar" className="hover:text-blue-600 transition-colors shrink-0">Parçalar</Link>
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          {product.category ? (
            <Link href={`/kategoriler/${product.category.slug}`} className="hover:text-blue-600 transition-colors shrink-0">
              {product.categoryName}
            </Link>
          ) : (
            <span className="shrink-0">{product.categoryName}</span>
          )}
          <ChevronRight className="w-3 h-3 text-slate-400 shrink-0" />
          <span className="text-slate-900 font-mono font-bold truncate max-w-[180px] sm:max-w-none">{product.oemNumber}</span>
        </div>
      </div>

      {/* 2. Main Product Showcase */}
      <section className="bg-white border-b border-slate-200 py-6 sm:py-10">
        <div className="container">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10 items-start">

            {/* Product Gallery (No unnecessary wrappers, no arrow buttons) */}
            {galleryImages.length > 0 && (
              <div className="lg:col-span-6 min-w-0 space-y-3">
                <div className="w-full rounded-2xl overflow-hidden border border-slate-200 bg-slate-50 aspect-4/3 flex items-center justify-center">
                  <ModernImageZoom
                    src={galleryImages[activeImageIndex] || galleryImages[0]}
                    alt={product.title}
                    priority={true}
                    className="w-full h-full border-0 bg-transparent rounded-2xl"
                  />
                </div>

                {galleryImages.length > 1 && (
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 max-w-full scrollbar-none">
                    {galleryImages.map((img, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setActiveImageIndex(idx)}
                        aria-label={`Parça görseli ${idx + 1}`}
                        className={`relative w-16 h-14 sm:w-20 sm:h-16 rounded-xl overflow-hidden border-2 bg-slate-50 transition-all cursor-pointer shrink-0 ${activeImageIndex === idx ? "border-blue-600 ring-2 ring-blue-100" : "border-slate-200 opacity-70 hover:opacity-100"}`}
                      >
                        <Image
                          src={img}
                          alt=""
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Right Column: Specs, Badges & Working Action CTAs */}
            <div className={`${galleryImages.length > 0 ? "lg:col-span-6" : "lg:col-span-12"} min-w-0 space-y-4`}>
              <div>
                {/* OEM Number + Copy & Share Button */}
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-mono text-2xl sm:text-3xl font-black text-slate-950 tracking-tight break-all">
                    {product.oemNumber}
                  </h1>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      type="button"
                      onClick={handleCopyOem}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                      title="OEM kodunu kopyala"
                      aria-label="OEM kodunu kopyala"
                    >
                      {copiedOem ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-500" />
                          <span>Kopyala</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={handleShareLink}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold transition-all cursor-pointer"
                      title="Bağlantıyı kopyala"
                      aria-label="Parça bağlantısını kopyala"
                    >
                      {copiedLink ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="text-emerald-700 font-bold">Kopyalandı</span>
                        </>
                      ) : (
                        <>
                          <Share2 className="w-3.5 h-3.5 text-slate-500" />
                          <span>Paylaş</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-2 break-words">
                  {product.title}
                </h2>

                {/* Status Badges */}
                <div className="flex items-center gap-2 pt-3">
                  <Badge variant={product.condition === "Sıfır" ? "success" : "secondary"} className="text-xs font-bold">
                    {product.condition}
                  </Badge>
                  <Badge variant={product.inStock ? "info" : "warning"} className="text-xs font-bold">
                    {product.inStock ? "Stokta" : "Stokta yok"}
                  </Badge>
                </div>
              </div>

              {/* Technical Information Summary Table */}
              <div className="border border-slate-200 rounded-xl overflow-hidden text-xs divide-y divide-slate-100 bg-white">
                <div className="grid grid-cols-2 p-3 items-center">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Car className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Araç Markası
                  </span>
                  <Link
                    href={brandInfo
                      ? `/markalar/${brandInfo.slug}`
                      : `/parcalar?marka=${encodeURIComponent(product.brand)}`}
                    className="inline-flex items-center gap-2 group w-fit font-medium text-slate-900 hover:text-blue-600"
                    title={`${product.brand} parçalarını gör`}
                  >
                    {brandLogoUrl && (
                      <Image
                        src={brandLogoUrl}
                        alt=""
                        width={20}
                        height={20}
                        className="h-5 w-5 object-contain shrink-0"
                      />
                    )}
                    {product.brand}
                  </Link>
                </div>
                {product.model && (
                  <div className="grid grid-cols-2 p-3 bg-slate-50/60">
                    <span className="text-slate-500 font-medium flex items-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Uyumlu Model
                    </span>
                    <span className="font-bold text-slate-900">{product.model}</span>
                  </div>
                )}
                <div className="grid grid-cols-2 p-3">
                  <span className="text-slate-500 font-medium flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-slate-400 shrink-0" /> Modül Kategorisi
                  </span>
                  <span className="font-semibold text-slate-900">{product.categoryName}</span>
                </div>
              </div>

              {/* Clickable Tags */}
              {product.tags && product.tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {product.tags.map((tag, idx) => (
                    <Link
                      key={idx}
                      href={`/parcalar?q=${encodeURIComponent(tag)}`}
                      className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-slate-600 font-semibold text-[11px] transition-colors cursor-pointer"
                    >
                      #{tag}
                    </Link>
                  ))}
                </div>
              )}

              {/* Contact actions */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <Button
                  asChild
                  variant="whatsapp"
                  size="lg"
                  className="sm:col-span-2 w-full text-xs font-black tracking-wider py-6 rounded-xl shadow-md shadow-emerald-600/20"
                >
                  <a
                    href={getWhatsAppUrl({
                      product: {
                        title: product.title,
                        oemNumber: product.oemNumber,
                        action: "price_and_stock",
                      },
                    })}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Fiyat ve stok sor: ${product.oemNumber} için WhatsApp`}
                  >
                    <WhatsAppIcon className="w-5 h-5 fill-white text-white mr-1.5 shrink-0" />
                    <span>Fiyat ve stok sor</span>
                  </a>
                </Button>

                <Button
                  asChild
                  variant="default"
                  size="lg"
                  className="w-full font-medium text-xs py-6 rounded-xl shadow-sm"
                >
                  <a
                    href={`tel:${displayPhone.replace(/\s+/g, "")}`}
                    aria-label={`Telefonla ara: ${displayPhone}`}
                  >
                    <Phone className="w-4 h-4 mr-1.5 shrink-0" />
                    <span>Ara</span>
                  </a>
                </Button>
              </div>

            </div>
          </div>

          {/* Description */}
          {productDescription && (
            <section className="mt-8 pt-8 border-t border-slate-200 text-sm text-slate-700 leading-relaxed max-w-4xl">
              <MarkdownRenderer content={productDescription} />
            </section>
          )}
        </div>
      </section>

      {/* 3. Related Products */}
      {filteredRelated && filteredRelated.length > 0 && (
        <section className="py-8 sm:py-12 bg-slate-50">
          <div className="container space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-black text-lg text-slate-900 tracking-tight">
                {product.categoryName} kategorisindeki parçalar
              </h3>
              <Link
                href={product.category ? `/kategoriler/${product.category.slug}` : "/parcalar"}
                className="text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
              >
                <span>Tümünü gör</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredRelated.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
