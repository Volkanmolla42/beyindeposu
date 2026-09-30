"use client";

import type { Dispatch, SetStateAction } from "react";
import type { FunctionReturnType } from "convex/server";
import type { api } from "@convex/_generated/api";
import Image from "next/image";
import Link from "next/link";
import {
  Cpu,
  Pencil,
  MoreVertical,
  ExternalLink,
  Trash2,
  Loader2,
  Package,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

type Product = FunctionReturnType<
  typeof api.products.listPaginatedAdmin
>["page"][number];
export type HoverPreview = { src: string; x: number; y: number } | null;
interface ProductViewsProps {
  products: Product[] | undefined;
  viewMode: "table" | "list";
  isLoading: boolean;
  hasActiveFilters: boolean;
  stockUpdatingIds: string[];
  deletingIds: string[];
  onEdit: (product: Product) => void;
  onDelete: (product: Product) => void;
  onToggleStock: (product: Product) => void;
  onOpenImages: (images: string[], index?: number) => void;
  onClearFilters: () => void;
  setHoverPreview: Dispatch<SetStateAction<HoverPreview>>;
}

export function ProductViews({
  products,
  viewMode,
  isLoading,
  hasActiveFilters,
  stockUpdatingIds,
  deletingIds,
  onEdit,
  onDelete,
  onToggleStock,
  onOpenImages,
  onClearFilters,
  setHoverPreview,
}: ProductViewsProps) {
  return (
    <>
      {/* Tablo Görünümü */}
      <div
        className={
          "overflow-x-auto " +
          (viewMode === "table" ? "hidden lg:block" : "hidden")
        }
      >
        <table className="w-full min-w-[800px] text-left text-sm text-slate-700">
          <caption className="sr-only">Parçalar ve stok durumu</caption>
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium text-slate-500">
            <tr>
              <th scope="col" className="px-5 py-4 w-[40%]">
                Parça
              </th>
              <th scope="col" className="px-4 py-4 w-[17%]">
                OEM
              </th>
              <th scope="col" className="px-4 py-4 w-[12%]">
                Raf
              </th>
              <th scope="col" className="px-4 py-4">
                Stok
              </th>
              <th scope="col" className="px-4 py-4">
                Yayın
              </th>
              <th scope="col" className="px-4 py-4">
                <span className="sr-only">İşlemler</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {products && products.length > 0 ? (
              products.map((product) => (
                <tr
                  key={product._id}
                  className="transition-colors hover:bg-slate-50/80 focus-within:bg-blue-50/40"
                >
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-4">
                      <div className="relative flex h-16 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                        {product.images?.[0] ? (
                          <button
                            type="button"
                            aria-label={
                              (product.title || "Taslak parça") +
                              " görselini büyüt"
                            }
                            onClick={() => {
                              setHoverPreview(null);
                              onOpenImages(product.images!, 0);
                            }}
                            onMouseEnter={(event) =>
                              setHoverPreview({
                                src: product.images![0],
                                x: event.clientX,
                                y: event.clientY,
                              })
                            }
                            onMouseMove={(event) =>
                              setHoverPreview((previous) =>
                                previous
                                  ? {
                                      ...previous,
                                      x: event.clientX,
                                      y: event.clientY,
                                    }
                                  : null,
                              )
                            }
                            onMouseLeave={() => setHoverPreview(null)}
                            className="h-full w-full cursor-zoom-in p-1 focus-visible:outline-2 focus-visible:outline-blue-600 focus-visible:outline-offset-[-2px]"
                          >
                            <Image
                              src={product.images[0]}
                              alt={product.title || "Parça"}
                              width={80}
                              height={64}
                              unoptimized
                              className="h-full w-full object-contain"
                            />
                          </button>
                        ) : (
                          <Cpu className="h-6 w-6 text-slate-300" />
                        )}
                        {product.images && product.images.length > 1 && (
                          <span className="pointer-events-none absolute bottom-1 right-1 rounded-md bg-slate-900/75 px-1.5 py-0.5 text-[10px] text-white">
                            +{product.images.length - 1}
                          </span>
                        )}
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          aria-label={
                            (product.title || "Taslak parça") + " düzenle"
                          }
                          onClick={() => onEdit(product)}
                          className="text-left text-sm! font-semibold leading-snug text-slate-900 hover:text-blue-700 focus-visible:rounded focus-visible:outline-2 focus-visible:outline-blue-600 [overflow-wrap:anywhere]"
                        >
                          {product.title || "Taslak parça"}
                        </button>
                        <p className="mt-1 text-xs leading-relaxed text-slate-500 [overflow-wrap:anywhere]">
                          {[product.brand, product.model, product.categoryName]
                            .filter(Boolean)
                            .join(" · ") || "—"}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <span className="font-mono text-sm font-medium text-slate-800 [overflow-wrap:anywhere]">
                      {product.oemNumber || "—"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    {product.shelfCode ? (
                      <span className="inline-block max-w-full rounded-lg border border-slate-200 bg-white px-2 py-1 font-mono text-xs text-slate-700 [overflow-wrap:anywhere]">
                        {product.shelfCode}
                      </span>
                    ) : (
                      <span className="text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-4">
                    <ProductStockButton
                      product={product}
                      updating={stockUpdatingIds.includes(product._id)}
                      onToggle={onToggleStock}
                    />
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={
                        "inline-flex rounded-full px-2.5 py-1 text-xs font-medium " +
                        (product.isDraft
                          ? "bg-slate-100 text-slate-600"
                          : "bg-blue-50 text-blue-700")
                      }
                    >
                      {product.isDraft ? "Taslak" : "Yayında"}
                    </span>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={
                          (product.title || "Taslak parça") + " düzenle"
                        }
                        onClick={() => onEdit(product)}
                        className="h-11 w-11 rounded-full text-slate-500 hover:text-blue-700"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <ProductActions
                        product={product}
                        onDelete={onDelete}
                        deleting={deletingIds.includes(product._id)}
                      />
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-5 py-14 text-center">
                  {isLoading ? (
                    <div
                      role="status"
                      className="flex items-center justify-center gap-2 text-slate-500"
                    >
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Parçalar yükleniyor…
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-3">
                      <Package className="h-9 w-9 text-slate-300" />
                      <p className="text-slate-500">Parça bulunamadı.</p>
                      {hasActiveFilters && (
                        <Button
                          variant="outline"
                          onClick={onClearFilters}
                          className="h-11"
                        >
                          Filtreleri temizle
                        </Button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile cards remain visible regardless of the saved desktop view. */}
      <div
        className={
          "grid grid-cols-1 gap-3 lg:p-4 " +
          (viewMode === "list" ? "lg:grid-cols-2 2xl:grid-cols-3" : "lg:hidden")
        }
      >
        {products && products.length > 0 ? (
          products.map((product) => (
            <article
              key={product._id}
              className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex items-start gap-3">
                <div className="relative flex h-15 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1 sm:h-18 sm:w-24">
                  {product.images?.[0] ? (
                    <button
                      type="button"
                      onClick={() => onOpenImages(product.images!, 0)}
                      aria-label={
                        (product.title || "Parça") + " görselini büyüt"
                      }
                      className="flex h-full w-full items-center justify-center rounded-lg focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <Image
                        src={product.images[0]}
                        alt={product.title || "Parça"}
                        width={96}
                        height={72}
                        unoptimized
                        className="h-full w-full object-contain"
                      />
                    </button>
                  ) : (
                    <Cpu className="h-7 w-7 text-slate-300" />
                  )}
                  {product.images && product.images.length > 1 && (
                    <span className="pointer-events-none absolute bottom-1 right-1 rounded-lg bg-slate-900/80 px-1.5 py-0.5 text-xs text-white">
                      +{product.images.length - 1}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2>
                    <button
                      type="button"
                      onClick={() => onEdit(product)}
                      aria-label={
                        (product.title || "Taslak parça") + " düzenle"
                      }
                      className="min-h-11 w-full rounded-lg text-left text-[15px] font-semibold leading-snug text-slate-900 focus-visible:outline-2 focus-visible:outline-blue-600"
                    >
                      <span className="line-clamp-2 wrap-anywhere">
                        {product.title || "Taslak parça"}
                      </span>
                    </button>
                  </h2>
                  <p className="mt-1 truncate text-xs text-slate-500">
                    {[product.brand, product.model]
                      .filter(Boolean)
                      .join(" · ") || product.categoryName}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                {product.oemNumber && (
                  <span className="max-w-full rounded-lg bg-slate-100 px-2 py-1 font-mono text-sm font-medium text-slate-800 wrap-anywhere">
                    {product.oemNumber}
                  </span>
                )}
                {product.shelfCode && (
                  <span className="max-w-full rounded-lg border border-slate-200 px-2 py-1 font-mono text-xs text-slate-600 wrap-anywhere">
                    Raf {product.shelfCode}
                  </span>
                )}
                <span
                  className={
                    "rounded-full px-2 py-1 text-xs font-medium " +
                    (product.isDraft
                      ? "bg-red-50 text-red-700"
                      : "bg-blue-50 text-blue-700")
                  }
                >
                  {product.isDraft ? "Taslak" : "Yayında"}
                </span>
              </div>
              <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                <ProductStockButton
                  product={product}
                  updating={stockUpdatingIds.includes(product._id)}
                  onToggle={onToggleStock}
                />
                <Button
                  variant="secondary"
                  onClick={() => onEdit(product)}
                  aria-label={(product.title || "Taslak parça") + " düzenle"}
                  className="h-11 min-w-0 flex-1 gap-1.5 px-2"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Düzenle
                </Button>
                <ProductActions
                  product={product}
                  onDelete={onDelete}
                  deleting={deletingIds.includes(product._id)}
                />
              </div>
            </article>
          ))
        ) : isLoading ? (
          <div
            role="status"
            className="col-span-full flex items-center justify-center gap-2 rounded-2xl bg-white p-10 text-sm text-slate-500"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
            Parçalar yükleniyor…
          </div>
        ) : (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <Package className="h-9 w-9 text-slate-300" />
            <p className="text-sm text-slate-500">Parça bulunamadı.</p>
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={onClearFilters}
                className="h-11"
              >
                Filtreleri temizle
              </Button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

function ProductActions({
  product,
  onDelete,
  deleting,
}: {
  product: Product;
  onDelete: (product: Product) => void;
  deleting: boolean;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={(product.title || "Taslak parça") + " işlemleri"}
          className="h-11 w-11 rounded-full text-slate-500"
        >
          <MoreVertical className="h-5 w-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-52 p-1">
        {product.isDraft !== true && (
          <Button
            asChild
            variant="ghost"
            className="h-12 w-full justify-start gap-3 rounded-lg"
          >
            <Link
              href={"/parcalar/" + product.slug}
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink className="h-4 w-4" />
              Sitede görüntüle
            </Link>
          </Button>
        )}
        <Button
          variant="ghost"
          disabled={deleting}
          onClick={() => onDelete(product)}
          className="h-12 w-full justify-start gap-3 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700"
        >
          <Trash2 className="h-4 w-4" />
          Parçayı sil
        </Button>
      </PopoverContent>
    </Popover>
  );
}

function ProductStockButton({
  product,
  updating,
  onToggle,
}: {
  product: Product;
  updating: boolean;
  onToggle: (product: Product) => void;
}) {
  return (
    <button
      type="button"
      disabled={updating}
      aria-label={
        (product.inStock
          ? "Stokta, stoktan çıkar: "
          : "Stokta yok, stok ekle: ") + (product.title || "Taslak parça")
      }
      onClick={() => onToggle(product)}
      className={
        "inline-flex h-11 min-w-0 items-center justify-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-blue-600 disabled:opacity-50 " +
        (product.inStock
          ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "bg-amber-50 text-amber-800 hover:bg-amber-100")
      }
    >
      {updating ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <span
          className={
            "h-1.5 w-1.5 rounded-full " +
            (product.inStock ? "bg-emerald-700" : "bg-amber-700")
          }
        />
      )}
      {product.inStock ? "Stokta" : "Stokta yok"}
    </button>
  );
}
