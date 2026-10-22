"use client";

import { useState } from "react";
import Image from "next/image";
import { Layers, Plus, Search, Edit2, Trash2 } from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { triggerRevalidate } from "@/lib/revalidate";
import { CategoryFormModal } from "./CategoryFormModal";

type Category = Doc<"categories"> & { image?: string };

export default function AdminCategoriesPage() {
  const [catSearch, setCatSearch] = useState("");
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  // Queries & Mutations
  const categories = useQuery(api.categories.list, { onlyActive: false });
  const deleteCategory = useMutation(api.categories.deleteCategory);

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCategoryModalOpen(true);
  };

  const handleDeleteCategory = async (c: Category) => {
    if (confirm(`'${c.name}' kategorisi silinsin mi?`)) {
      try {
        await deleteCategory({ id: c._id });
        void triggerRevalidate([
          "/",
          "/parcalar",
          "/kategoriler",
          `/kategoriler/${c.slug}`,
        ]);
      } catch (err: unknown) {
        alert(err instanceof Error ? err.message : "Kategori silinemedi.");
      }
    }
  };

  const filteredCategories = (categories ?? []).filter(
    (c) =>
      !catSearch ||
      c.name.toLowerCase().includes(catSearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(catSearch.toLowerCase()),
  );

  return (
    <div className="space-y-5">
      {/* Header */}
      <AdminPageHeader
        title="Kategoriler"
        badge={categories ? `${categories.length} kategori` : "Yükleniyor…"}
        description="Ürün kategorilerini, görsellerini ve sıralamasını yönetin."
        actions={
          <Button
            onClick={handleOpenAddCategory}
            className="h-12 w-full gap-2 rounded-full px-5 sm:w-auto"
          >
            <Plus className="h-4 w-4" />
            <span>Kategori ekle</span>
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
          aria-label="Kategori ara"
          placeholder="Kategori adına göre ara"
          value={catSearch}
          onChange={(e) => setCatSearch(e.target.value)}
          className="h-12 rounded-full border-slate-200 bg-white pl-12 text-base! shadow-xs sm:text-sm!"
        />
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories === undefined ? (
          <div
            role="status"
            className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
          >
            Kategoriler yükleniyor…
          </div>
        ) : filteredCategories.length === 0 ? (
          <div
            role="status"
            className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
          >
            {catSearch
              ? "Arama kriterine uygun kategori bulunamadı."
              : "Henüz kategori eklenmemiş."}
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div
              key={cat._id}
              className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-50 border border-slate-100 overflow-hidden">
                  {cat.imageUrl ? (
                    <Image
                      src={cat.imageUrl}
                      alt={cat.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="h-full w-full object-contain p-1"
                    />
                  ) : (
                    <Layers className="h-5 w-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-semibold text-slate-900">
                      {cat.name}
                    </span>
                    {cat.isActive === false && (
                      <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-500">
                        Pasif
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span className="font-mono text-[11px] text-slate-400">
                      /{cat.slug}
                    </span>
                    <span>•</span>
                    <span>Sıra: {cat.order ?? 1}</span>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-1">
                <button
                  type="button"
                  aria-label={`${cat.name} kategorisini düzenle`}
                  onClick={() => handleOpenEditCategory(cat)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`${cat.name} kategorisini sil`}
                  onClick={() => handleDeleteCategory(cat)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-amber-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Category Form Modal */}
      <CategoryFormModal
        open={categoryModalOpen}
        onOpenChange={setCategoryModalOpen}
        category={editingCategory}
        nextOrder={(categories?.length || 0) + 1}
      />
    </div>
  );
}
