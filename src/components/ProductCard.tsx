"use client";

import Link from "next/link";
import { Eye, Cpu } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { generateWhatsAppLink } from "@/lib/utils";
import { ProductWithCategory } from "@/types";
import { SITE_CONTACT } from "@/config/site";

export interface ProductCardProps {
  product: ProductWithCategory;
}

export default function ProductCard({ product }: ProductCardProps) {
  const whatsappNumber = SITE_CONTACT.whatsappNumber;

  return (
    <div className="product-card-clean flex flex-col justify-between p-4 group sm:p-5">
      <div>
        {/* Hardware Photo on Clean Background */}
        <Link href={`/urunler/${product.slug}`} className="block">
          <div className="relative mb-4 flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-3">
            {product.images?.[0] ? (
              <img
                src={product.images[0]}
                alt={product.title}
                className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <Cpu className="w-16 h-16 text-slate-300" />
            )}
          </div>
        </Link>

        {/* Product Information */}
        <div className="space-y-1">
          {/* Large Bold OEM Code */}
          <Link href={`/urunler/${product.slug}`} className="block">
            <span className="font-mono text-sm font-medium tracking-wide text-slate-900 transition-colors group-hover:text-blue-700 sm:text-base">
              {product.oemNumber}
            </span>
          </Link>

          {/* Product Category & Brand */}
          <p className="text-sm font-medium text-slate-700">
            {[product.categoryName, product.brand].filter(Boolean).join(" • ")}
          </p>

          {/* Model / Compatibility */}
          {product.model && (
            <p className="truncate text-sm text-slate-600">
              {product.model}
            </p>
          )}

          {/* Pill Badges: Condition & Stock */}
          <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs text-slate-700">
              {product.condition}
            </span>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                product.inStock
                ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border border-amber-200 bg-amber-50 text-amber-800"
              }`}
            >
              {product.inStock ? "Stokta" : "Stokta değil"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: DETAY button + WhatsApp quick button */}
      <div className="mt-5 flex items-center gap-2">
        <Link href={`/urunler/${product.slug}`} className="flex-1">
          <span className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-full border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800">
            <Eye className="w-3.5 h-3.5" />
            <span>Detay</span>
          </span>
        </Link>

        <a
          href={generateWhatsAppLink(
            whatsappNumber,
            product.title,
            product.oemNumber,
            `Merhaba, ${product.oemNumber} kodlu (${product.title}) parça hakkında bilgi almak istiyorum.`
          )}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0"
        >
          <span className="flex min-h-10 items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-emerald-700">
            <WhatsAppIcon className="w-3.5 h-3.5 fill-white text-white" />
            <span className="hidden sm:inline">Sor</span>
          </span>
        </a>
      </div>
    </div>
  );
}
