"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  ImageIcon,
  X,
  Globe,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Doc } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { slugify, LOCAL_CATEGORY_IMAGES } from "@/app/admin/admin-utils";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { triggerRevalidate } from "@/lib/revalidate";

type Category = Doc<"categories"> & { image?: string };

export default function AdminCategoriesPage() {
  const [catSearch, setCatSearch] = useState("");

  // Category Modal & Form State
  const [isPending, startTransition] = useTransition();
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [catImageOverride, setCatPreviewImage] = useState<string | null>(null);
  const [catIsActive, setCatIsActive] = useState<boolean>(true);
  const [categoryError, setCategoryError] = useState<string>("");

  // Queries & Mutations
  const categories = useQuery(api.categories.list, { onlyActive: false });
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const deleteCategory = useMutation(api.categories.deleteCategory);

  const handleOpenAddCategory = () => {
    setEditingCategory(null);
    setCatPreviewImage(null);
    setCatIsActive(true);
    setCategoryError("");
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (c: Category) => {
    setEditingCategory(c);
    setCatPreviewImage(c.imageUrl ?? null);
    setCatIsActive(c.isActive ?? true);
    setCategoryError("");
    setCategoryModalOpen(true);
  };

  const handleSaveCategory = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCategoryError("");

    const formData = new FormData(e.currentTarget);
    const name = (formData.get("name") as string)?.trim() || "";
    const slugInput = (formData.get("slug") as string)?.trim() || "";
    const generatedSlug = slugify(slugInput || name);
    const description = (formData.get("description") as string)?.trim() || "";
    const order = Number(formData.get("order")) || 1;
    const metaTitle = (formData.get("metaTitle") as string)?.trim() || "";
    const metaDescription = (formData.get("metaDescription") as string)?.trim() || "";
    const metaKeywords = (formData.get("metaKeywords") as string)?.trim() || "";

    if (!name || !generatedSlug) {
      setCategoryError("Kategori adı ve geçerli bir URL slug girin.");
      return;
    }

    startTransition(async () => {
      try {
        const payload = {
          name,
          slug: generatedSlug,
          description,
          imageUrl: catImageOverride ?? (editingCategory?.slug ? LOCAL_CATEGORY_IMAGES[editingCategory.slug] : "") ?? "",
          order,
          isActive: catIsActive,
          metaTitle,
          metaDescription,
          metaKeywords,
        };

        if (editingCategory) {
          await updateCategory({
            id: editingCategory._id,
            ...payload,
          });
        } else {
          await createCategory(payload);
        }

        void triggerRevalidate([
          "/",
          "/parcalar",
          "/kategoriler",
          `/kategoriler/${generatedSlug}`,
          ...(editingCategory && editingCategory.slug !== generatedSlug
            ? [`/kategoriler/${editingCategory.slug}`]
            : []),
        ]);

        setCategoryModalOpen(false);
      } catch (err: unknown) {
        setCategoryError(
          err instanceof Error
            ? err.message
            : "Kategori kaydedilirken hata oluştu.",
        );
      }
    });
  };

  const handleDeleteCategory = async (cat: Category) => {
    if (confirm(`'${cat.name}' kategorisi silinsin mi?`)) {
      try {
        await deleteCategory({ id: cat._id });
        void triggerRevalidate([
          "/",
          "/parcalar",
          "/kategoriler",
          `/kategoriler/${cat.slug}`,
        ]);
      } catch (err: unknown) {
        alert(
          err instanceof Error
            ? err.message
            : "Kategori silinemedi. Bağlı parçalar olabilir.",
        );
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
    <div className="min-w-0 space-y-5">
      {/* Header */}
      <AdminPageHeader
        title="Kategoriler"
        badge={categories ? `${categories.length} kategori` : "Yükleniyor…"}
        description="Parçaları düzenlemek için kategorileri yönetin."
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

      {/* Clean Grid */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {categories === undefined ? (
          <div
            role="status"
            className="col-span-full rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500"
          >
            Kategoriler yükleniyor…
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Layers className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-600">
              {catSearch
                ? "Aramanıza uygun kategori bulunamadı."
                : "Henüz kategori eklenmedi."}
            </p>
            {catSearch && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setCatSearch("")}
                className="h-11 rounded-full"
              >
                Aramayı temizle
              </Button>
            )}
          </div>
        ) : (
          filteredCategories.map((cat) => (
            <div
              key={cat._id}
              className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-slate-300 sm:p-5"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {cat.image ? (
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      width={48}
                      height={48}
                      unoptimized
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <Layers className="w-5 h-5 text-slate-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-slate-900">
                    {cat.name}
                  </h2>
                  <p className="truncate font-mono text-xs text-slate-500">
                    {cat.slug}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Sıra: {cat.order ?? 1}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        cat.isActive !== false
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {cat.isActive !== false ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-2.5">
                <button
                  type="button"
                  aria-label={`${cat.name} kategorisini düzenle`}
                  onClick={() => handleOpenEditCategory(cat)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-amber-50 hover:text-amber-600 focus-visible:outline-2 focus-visible:outline-amber-500"
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

      {/* Category Modal */}
      <Dialog
        open={categoryModalOpen}
        onOpenChange={(open) => {
          if (!isPending) setCategoryModalOpen(open);
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 top-auto flex max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-3xl rounded-b-none border-0 bg-white p-5 text-slate-900 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%_-_2rem)] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-slate-200 sm:p-6"
        >
          <DialogHeader className="pr-12 text-left">
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingCategory ? "Kategoriyi düzenle" : "Yeni kategori"}
            </DialogTitle>
          </DialogHeader>

          {categoryError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
            >
              {categoryError}
            </div>
          )}

          <form
            key={editingCategory?._id ?? "new"}
            onSubmit={handleSaveCategory}
            className="space-y-5 pt-1 text-sm"
          >
            <fieldset disabled={isPending} className="space-y-5">
              <div>
                <label
                  htmlFor="category-name"
                  className="mb-1.5 block font-medium text-slate-700"
                >
                  Kategori adı *
                </label>
                <Input
                  id="category-name"
                  name="name"
                  required
                  placeholder="Örn: Motor beyinleri, ECU"
                  defaultValue={editingCategory?.name ?? ""}
                  className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="category-slug"
                    className="block font-medium text-slate-700"
                  >
                    URL slug (İsteğe bağlı)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Boş bırakılırsa otomatik üretilir
                  </span>
                </div>
                <Input
                  id="category-slug"
                  name="slug"
                  placeholder="motor-beyinleri-ecu"
                  defaultValue={editingCategory?.slug ?? ""}
                  className="h-12 rounded-xl border-slate-300 bg-slate-50 font-mono text-base! text-slate-700! sm:text-sm!"
                />
              </div>

              {/* Category Image Upload & Auto Match */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 font-medium text-slate-800">
                    <ImageIcon className="h-4 w-4 text-slate-500" />
                    <span>Kategori görseli</span>
                  </label>
                  <span className="text-xs text-slate-500">WebP görsel</span>
                </div>

                {catImageOverride || editingCategory?.imageUrl ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="relative w-14 h-14 rounded-md border border-slate-200 overflow-hidden bg-white p-1">
                      <Image
                        src={catImageOverride ?? editingCategory?.imageUrl ?? ""}
                        alt="Kategori görseli"
                        width={56}
                        height={56}
                        unoptimized
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setCatPreviewImage("");
                        }}
                        className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-white hover:bg-red-600"
                        aria-label="Görseli kaldır"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1 text-sm">
                      <span className="block font-medium text-emerald-700">
                        Görsel seçildi
                      </span>
                      <span className="block max-w-[200px] truncate font-mono text-xs text-slate-500">
                        {catImageOverride ?? editingCategory?.imageUrl}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-500">
                    Kategori adına göre görsel eşleşir.
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="category-description"
                  className="mb-1.5 block font-medium text-slate-700"
                >
                  Açıklama
                </label>
                <Input
                  id="category-description"
                  name="description"
                  defaultValue={editingCategory?.description ?? ""}
                  placeholder="Kategori hakkında kısa açıklama"
                  className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 items-center">
                <div>
                  <label
                    htmlFor="category-order"
                    className="mb-1.5 block font-medium text-slate-700"
                  >
                    Sıralama
                  </label>
                  <Input
                    id="category-order"
                    name="order"
                    aria-label="Kategori sırası"
                    type="number"
                    defaultValue={editingCategory?.order ?? (categories?.length || 0) + 1}
                    className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                  />
                </div>

                <div className="pt-2 sm:pt-4">
                  <label className="flex min-h-12 cursor-pointer items-center gap-2 font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={catIsActive}
                      onChange={(e) => setCatIsActive(e.target.checked)}
                      className="h-5 w-5 rounded text-amber-500 accent-amber-500"
                    />
                    <span>Kategori etkin</span>
                  </label>
                </div>
              </div>

              {/* SEO Fields */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center gap-2 font-medium text-slate-800">
                  <Globe className="h-4 w-4 text-slate-500" />
                  <span>SEO alanları</span>
                </div>

                <div>
                  <label
                    htmlFor="category-meta-title"
                    className="mb-1.5 block font-medium text-slate-700"
                  >
                    Meta başlığı
                  </label>
                  <Input
                    id="category-meta-title"
                    name="metaTitle"
                    placeholder="Motor beyinleri ve ECU modülleri | Beyin Deposu"
                    defaultValue={editingCategory?.metaTitle ?? ""}
                    className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                  />
                </div>

                <div>
                  <label
                    htmlFor="category-meta-description"
                    className="mb-1.5 block font-medium text-slate-700"
                  >
                    Meta açıklaması
                  </label>
                  <Input
                    id="category-meta-description"
                    name="metaDescription"
                    placeholder="Kategori ve parça bilgisi"
                    defaultValue={editingCategory?.metaDescription ?? ""}
                    className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                  />
                </div>

                <div>
                  <label
                    htmlFor="category-meta-keywords"
                    className="mb-1.5 block font-medium text-slate-700"
                  >
                    Anahtar Kelimeler (Virgülle ayrılmış)
                  </label>
                  <Input
                    id="category-meta-keywords"
                    name="metaKeywords"
                    placeholder="ecu, motor beyni, beyin tamiri"
                    defaultValue={editingCategory?.metaKeywords ?? ""}
                    className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                  />
                </div>
              </div>

              <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCategoryModalOpen(false)}
                  className="h-12 flex-1 rounded-full sm:flex-none"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="h-12 flex-1 rounded-full px-6 sm:flex-none"
                >
                  {isPending
                    ? "Kaydediliyor…"
                    : editingCategory
                      ? "Güncelle"
                      : "Kategoriyi kaydet"}
                </Button>
              </div>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
