"use client";

import Image from "next/image";
import Link from "next/link";
import { Eye, Cpu } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { ProductWithCategory } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface ProductCardProps {
  product: ProductWithCategory;
  priority?: boolean;
}

export default function ProductCard({ product, priority = false }: ProductCardProps) {
  const subtitle = [product.categoryName, product.brand].filter(Boolean).join(" • ");
  const stockBadgeVariant = product.inStock ? "success" : "warning";
  const stockBadgeText = product.inStock ? "Stokta" : "Stokta yok";


  return (
    <div className="product-card-clean flex flex-col justify-between p-4 group sm:p-5">
      <div>
        {/* Hardware Photo on Clean Background */}
        <Link href={`/urunler/${product.slug}`} className="block">
          <div className="relative mb-4 flex aspect-4/3 w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-50 p-3">
            {product.images?.[0] ? (
              <Image
                src={product.images[0]}
                alt={product.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                className="object-contain p-2 group-hover:scale-105 transition-transform duration-300"
                priority={priority}
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
            {subtitle}
          </p>

          {/* Model / Compatibility */}
          {product.model && (
            <p className="truncate text-sm text-slate-600">
              {product.model}
            </p>
          )}

          {/* Pill Badges: Condition & Stock */}
          <div className="flex items-center gap-1.5 pt-1.5 flex-wrap">
            <Badge variant="secondary" className="font-medium text-xs">
              {product.condition}
            </Badge>

            <Badge
              variant={stockBadgeVariant}
              className="text-2xs font-bold"
            >
              {stockBadgeText}
            </Badge>
          </div>
        </div>
      </div>

      {/* Action Buttons: DETAY button + WhatsApp quick button */}
      <div className="mt-5 flex items-center gap-2">
        <Button asChild variant="outline" size="sm" className="flex-1 rounded-full">
          <Link href={`/urunler/${product.slug}`}>
            <Eye className="w-3.5 h-3.5" />
            <span>Ürünü gör</span>
          </Link>
        </Button>

        <Button asChild variant="whatsapp" size="sm" className="shrink-0 rounded-full">
          <a
            href={getWhatsAppUrl({
              product: {
                title: product.title,
                oemNumber: product.oemNumber,
                action: "price",
              },
            })}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Fiyat sor: ${product.title} için WhatsApp`}
          >
            <WhatsAppIcon className="w-3.5 h-3.5 fill-white text-white" />
            <span className="hidden sm:inline">Fiyat sor</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
