"use client";

import Link from "next/link";
import { Eye, Cpu, Tag } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { generateWhatsAppLink } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { ProductWithCategory } from "@/types";

export interface ProductCardProps {
  product: ProductWithCategory;
}

export default function ProductCard({ product }: ProductCardProps) {
  const settings = useQuery(api.siteSettings.get);
  const whatsappNumber = settings?.whatsappNumber || "";

  return (
    <div className="product-card-clean rounded-xl p-4 flex flex-col justify-between group bg-white border border-slate-200/80 hover:border-blue-400 hover:shadow-md transition-all">
      <div>
        {/* Hardware Photo on Clean Background */}
        <Link href={`/urunler/${product.slug}`} className="block">
          <div className="relative aspect-4/3 w-full rounded-lg bg-slate-50 border border-slate-100 overflow-hidden flex items-center justify-center p-3 mb-3">
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
            <span className="font-mono text-sm sm:text-base font-black text-slate-950 group-hover:text-blue-600 transition-colors tracking-tight">
              {product.oemNumber}
            </span>
          </Link>

          {/* Product Category & Brand */}
          <p className="text-xs font-semibold text-slate-700">
            {product.categoryName || "Oto Elektronik"} • {product.brand}
          </p>

          {/* Model / Compatibility */}
          {product.model && (
            <p className="text-xs text-slate-500 font-medium truncate">
              {product.model}
            </p>
          )}

          {/* Pill Badges: Condition & Stock */}
          <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
            <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
              {product.condition}
            </span>

            <span
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                product.inStock
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-amber-50 text-amber-700 border border-amber-200"
              }`}
            >
              {product.inStock ? "Hazır Stok" : "Tükendi"}
            </span>
          </div>
        </div>
      </div>

      {/* Action Buttons: DETAY button + WhatsApp quick button */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
        <Link href={`/urunler/${product.slug}`} className="flex-1">
          <button className="w-full py-1.5 px-3 rounded-lg border border-slate-300 hover:border-blue-600 hover:bg-blue-50 text-slate-700 hover:text-blue-700 text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer">
            <Eye className="w-3.5 h-3.5" />
            <span>DETAY</span>
          </button>
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
          <button className="py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs">
            <WhatsAppIcon className="w-3.5 h-3.5 fill-white text-white" />
            <span className="hidden sm:inline">WhatsApp</span>
          </button>
        </a>
      </div>
    </div>
  );
}
