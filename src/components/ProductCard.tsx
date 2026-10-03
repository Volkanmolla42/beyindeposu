"use client";

import Link from "next/link";
import { Eye } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { ProductWithCategory } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProductImage } from "@/components/ProductImage";
import { getProductImageAlt, getProductImageSource } from "@/lib/product-images";
import { absoluteUrl } from "@/lib/seo";

export interface ProductCardProps {
  product: ProductWithCategory;
  priority?: boolean;
  variant?: "default" | "catalog";
}

export default function ProductCard({ product, priority = false, variant = "default" }: ProductCardProps) {
  const isCatalog = variant === "catalog";
  const subtitle = [product.categoryName, product.brand].filter(Boolean).join(" • ");

  return (
    <article className={isCatalog
      ? "product-card-clean group grid grid-cols-[6.25rem_minmax(0,1fr)] grid-rows-[auto_auto] gap-x-3 gap-y-3 p-3 sm:flex sm:flex-col sm:justify-between sm:p-4"
      : "product-card-clean group flex flex-col justify-between p-4 sm:p-5"}
    >
      <div className={isCatalog ? "contents sm:block" : undefined}>
        <Link href={`/parcalar/${product.slug}`} className={isCatalog ? "row-span-1 block" : "block"}>
          <div className={isCatalog
            ? "relative flex aspect-square w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50 sm:mb-4 sm:rounded-2xl"
            : "relative mb-4 flex aspect-square w-full items-center justify-center overflow-hidden rounded-2xl bg-slate-50"}
          >
            <ProductImage
              src={getProductImageSource(product.images)}
              alt={getProductImageAlt(product.title, product.images)}
              fill
              unoptimized
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-contain transition-transform duration-200 group-hover:scale-105 motion-reduce:transition-none motion-reduce:group-hover:scale-100"
              preload={priority}
            />
          </div>
        </Link>

        {isCatalog ? (
          <div className="min-w-0 self-center sm:space-y-1">
            <Link href={`/parcalar/${product.slug}`} className="block">
              <h2 className="whitespace-normal break-words text-sm font-semibold leading-snug text-slate-900 transition-colors group-hover:text-blue-800 sm:text-base">
                {product.title}
              </h2>
            </Link>
            <Link href={`/parcalar/${product.slug}`} className="block">
              <span className="mt-1 block font-mono text-xs font-semibold tracking-wide text-blue-800 sm:text-sm">
                {product.oemNumber}
              </span>
            </Link>
            <p className="mt-1 truncate text-xs font-medium text-slate-600 sm:text-sm">
              {subtitle}
            </p>
            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <Badge variant="secondary" className="max-w-full whitespace-normal text-left text-xs leading-tight">
                {product.condition}
              </Badge>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <Link href={`/parcalar/${product.slug}`} className="block">
              <span className="font-mono text-sm font-medium tracking-wide text-slate-900 transition-colors group-hover:text-blue-700 sm:text-base">
                {product.oemNumber}
              </span>
            </Link>

            <p className="text-sm font-medium text-slate-700">{subtitle}</p>

            <div className="flex flex-wrap items-center gap-1.5 pt-1.5">
              <Badge variant="secondary" className="font-medium text-xs">
                {product.condition}
              </Badge>
            </div>
          </div>
        )}
      </div>

      <div className={isCatalog ? "col-span-2 mt-0 flex items-center gap-2 sm:mt-5" : "mt-5 flex items-center gap-2"}>
        <Button
          asChild
          variant="outline"
          size="sm"
          className={isCatalog ? "min-h-11 flex-1 rounded-xl text-xs font-semibold sm:rounded-full sm:text-sm" : "flex-1 rounded-full"}
        >
          <Link href={`/parcalar/${product.slug}`}>
            <Eye className="h-4 w-4" aria-hidden="true" />
            {isCatalog ? (
              <>
                <span className="sm:hidden">Detay</span>
                <span className="hidden sm:inline">Parçayı incele</span>
              </>
            ) : (
              <span>Parçayı incele</span>
            )}
          </Link>
        </Button>

        <Button
          asChild
          variant="whatsapp"
          size="sm"
          className={isCatalog ? "min-h-11 flex-1 rounded-xl text-xs font-semibold sm:flex-none sm:rounded-full sm:text-sm" : "shrink-0 rounded-full"}
        >
          <a
            href={getWhatsAppUrl({
              product: {
                title: product.title,
                oemNumber: product.oemNumber,
                action: "price",
                productUrl: absoluteUrl(`/parcalar/${product.slug}`),
              },
            })}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`Fiyat sor: ${product.title} için WhatsApp`}
          >
            <WhatsAppIcon
              className={isCatalog ? "h-4 w-4 shrink-0 fill-white text-white" : "w-3.5 h-3.5 fill-white text-white"}
            />
            <span className={isCatalog ? "" : "hidden sm:inline"}>Fiyat sor</span>
          </a>
        </Button>
      </div>
    </article>
  );
}
