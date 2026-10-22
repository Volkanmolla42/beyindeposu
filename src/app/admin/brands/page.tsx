"use client";

import { useState } from "react";
import Image from "next/image";
import { Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { LOCAL_BRAND_LOGOS } from "@/app/admin/admin-utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { triggerRevalidate } from "@/lib/revalidate";
import { BrandFormModal } from "./BrandFormModal";

type Brand = Doc<"brands">;

export default function AdminBrandsPage() {
  const [brandSearch, setBrandSearch] = useState("");
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);

  // Queries & Mutations
  const brands = useQuery(api.brands.list, { onlyActive: false });
  const deleteBrand = useMutation(api.brands.deleteBrand);

  const handleOpenAddBrand = () => {
    setEditingBrand(null);
    setBrandModalOpen(true);
  };

  const handleOpenEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandModalOpen(true);
  };

  const handleDeleteBrand = async (b: Brand) => {
    if (confirm(`'${b.name}' markası silinsin mi?`)) {
      try {
        await deleteBrand({ id: b._id });
        void triggerRevalidate([
          "/",
          "/parcalar",
          "/markalar",
          `/markalar/${b.slug}`,
        ]);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Marka silinemedi.");
      }
    }
  };

  const filteredBrands = (brands ?? []).filter(
    (b) =>
      !brandSearch ||
      b.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
      b.slug.toLowerCase().includes(brandSearch.toLowerCase()),
  );

  return (
    <div className="min-w-0 space-y-5">
      {/* Header */}
      <AdminPageHeader
        title="Markalar"
        badge={brands ? `${brands.length} marka` : "Yükleniyor…"}
        description="Araç markalarını, logolarını ve sıralamasını yönetin."
        actions={
          <Button
            onClick={handleOpenAddBrand}
            className="h-12 w-full gap-2 rounded-full px-5 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Marka ekle</span>
          </Button>
        }
      />

      {/* Search Filter */}
      <div className="relative w-full sm:max-w-md">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-500"
        />
        <Input
          aria-label="Marka ara"
          placeholder="Marka adına göre ara"
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          className="h-12 rounded-full border-slate-200 bg-white pl-12 text-base! shadow-xs sm:text-sm!"
        />
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {brands === undefined ? (
          <div
            role="status"
            className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
          >
            Markalar yükleniyor…
          </div>
        ) : filteredBrands.length === 0 ? (
          <div
            role="status"
            className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
          >
            {brandSearch
              ? "Arama kriterine uygun marka bulunamadı."
              : "Henüz marka eklenmemiş."}
          </div>
        ) : (
          filteredBrands.map((b) => (
            <div
              key={b._id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 p-2 border border-slate-100">
                  {b.logoUrl || LOCAL_BRAND_LOGOS[b.slug] ? (
                    <Image
                      src={b.logoUrl || LOCAL_BRAND_LOGOS[b.slug]}
                      alt={b.name}
                      width={36}
                      height={36}
                      unoptimized
                      className="max-h-8 max-w-8 object-contain"
                    />
                  ) : (
                    <span className="text-base font-bold text-slate-400">
                      {b.name.charAt(0)}
                    </span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-900">
                      {b.name}
                    </span>
                    {b.popular && (
                      <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                        Popüler
                      </span>
                    )}
                    {b.isActive === false && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        Pasif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono text-[11px] text-slate-400">
                      /{b.slug}
                    </span>
                    <span>•</span>
                    <span>Sıra: {b.order ?? 1}</span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`${b.name} markasını düzenle`}
                  onClick={() => handleOpenEditBrand(b)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`${b.name} markasını sil`}
                  onClick={() => handleDeleteBrand(b)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Brand Form Modal */}
      <BrandFormModal
        open={brandModalOpen}
        onOpenChange={setBrandModalOpen}
        brand={editingBrand}
        nextOrder={(brands?.length || 0) + 1}
      />
    </div>
  );
}
