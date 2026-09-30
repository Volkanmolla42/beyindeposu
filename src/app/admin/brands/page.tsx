"use client";

import { useState, useRef } from "react";
import Image from "next/image";
import { Plus, Search, Edit2, Trash2, Cpu, ImageIcon, X } from "lucide-react";
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
import { slugify, LOCAL_BRAND_LOGOS } from "../admin-utils";

type Brand = Doc<"brands">;

export default function AdminBrandsPage() {
  const [brandSearch, setBrandSearch] = useState("");

  // Brand Modal & Form State
  const [saving, setSaving] = useState(false);
  const saveInProgress = useRef(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [brandLogoOverride, setBrandLogoUrl] = useState<string | null>(null);
  const brandLogoUrl =
    brandLogoOverride ??
    LOCAL_BRAND_LOGOS[brandSlug || slugify(brandName)] ??
    LOCAL_BRAND_LOGOS[slugify(brandName)] ??
    "";
  const [brandPopular, setBrandPopular] = useState(false);
  const [brandOrder, setBrandOrder] = useState<number>(1);
  const [brandIsActive, setBrandIsActive] = useState<boolean>(true);
  const [brandError, setBrandError] = useState("");

  // Queries & Mutations
  const brands = useQuery(api.brands.list, { onlyActive: false });
  const createBrand = useMutation(api.brands.create);
  const updateBrand = useMutation(api.brands.update);
  const deleteBrand = useMutation(api.brands.deleteBrand);

  const resetBrandForm = () => {
    setEditingBrand(null);
    setBrandName("");
    setBrandSlug("");
    setSlugManuallyEdited(false);
    setBrandLogoUrl(null);
    setBrandPopular(false);
    setBrandOrder((brands?.length || 0) + 1);
    setBrandIsActive(true);
    setBrandError("");
  };

  const handleOpenAddBrand = () => {
    resetBrandForm();
    setBrandModalOpen(true);
  };

  const handleOpenEditBrand = (b: Brand) => {
    setEditingBrand(b);
    setBrandName(b.name);
    setBrandSlug(b.slug);
    setSlugManuallyEdited(true);
    setBrandLogoUrl(b.logoUrl ?? LOCAL_BRAND_LOGOS[b.slug] ?? "");
    setBrandPopular(b.popular ?? false);
    setBrandOrder(b.order ?? 1);
    setBrandIsActive(b.isActive !== false);
    setBrandError("");
    setBrandModalOpen(true);
  };

  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (saveInProgress.current) return;
    if (!brandName.trim()) {
      setBrandError("Marka adı zorunludur.");
      return;
    }
    const finalSlug = slugify(brandSlug.trim() || brandName);
    if (!finalSlug) {
      setBrandError("Geçerli bir URL slug girin.");
      return;
    }

    saveInProgress.current = true;
    setSaving(true);
    setBrandError("");
    try {
      const payload = {
        name: brandName.trim(),
        slug: finalSlug,
        logoUrl: brandLogoUrl.trim(),
        popular: brandPopular,
        order: brandOrder,
        isActive: brandIsActive,
      };
      if (editingBrand) {
        await updateBrand({ id: editingBrand._id, ...payload });
      } else {
        await createBrand(payload);
      }

      setBrandModalOpen(false);
      resetBrandForm();
    } catch (err: unknown) {
      setBrandError(
        err instanceof Error
          ? err.message
          : "Marka kaydedilirken bir hata oluştu.",
      );
    } finally {
      saveInProgress.current = false;
      setSaving(false);
    }
  };

  const handleDeleteBrand = async (b: Brand) => {
    if (confirm(`'${b.name}' markası silinsin mi?`)) {
      try {
        await deleteBrand({ id: b._id });
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
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div className="min-w-0">
          <h1 className="flex flex-wrap items-center gap-2 text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            <span>Markalar</span>
            <span className="rounded-full border border-slate-200 bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
              {brands ? `${brands.length} marka` : "Yükleniyor…"}
            </span>
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Araç markalarını, logolarını ve sıralamasını yönetin.
          </p>
        </div>

        <Button
          onClick={handleOpenAddBrand}
          className="h-12 w-full gap-2 rounded-full px-5 sm:w-auto"
        >
          <Plus className="h-4 w-4" />
          <span>Marka ekle</span>
        </Button>
      </div>

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
          <div className="col-span-full flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Cpu className="h-8 w-8 text-slate-300" />
            <p className="text-sm text-slate-600">
              {brandSearch
                ? "Aramanıza uygun marka bulunamadı."
                : "Henüz marka eklenmedi."}
            </p>
            {brandSearch && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setBrandSearch("")}
                className="h-11 rounded-full"
              >
                Aramayı temizle
              </Button>
            )}
          </div>
        ) : (
          filteredBrands.map((b) => (
            <div
              key={b._id}
              className="flex min-w-0 flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-colors hover:border-slate-300 sm:p-5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-2">
                  {b.logoUrl ? (
                    <Image
                      src={b.logoUrl}
                      alt={`${b.name} logosu`}
                      width={48}
                      height={48}
                      unoptimized
                      className="w-full h-full object-contain"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <Cpu className="w-5 h-5 text-slate-400" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <h2 className="truncate text-base font-semibold text-slate-900">
                    {b.name}
                  </h2>
                  <p className="truncate font-mono text-xs text-slate-500">
                    {b.slug}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Sıra: {b.order ?? 1}
                    </span>
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                        b.isActive !== false
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {b.isActive !== false ? "Aktif" : "Pasif"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-1 border-t border-slate-100 pt-2.5">
                <button
                  type="button"
                  aria-label={`${b.name} markasını düzenle`}
                  onClick={() => handleOpenEditBrand(b)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  aria-label={`${b.name} markasını sil`}
                  onClick={() => handleDeleteBrand(b)}
                  className="flex h-11 w-11 items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-700 focus-visible:outline-2 focus-visible:outline-blue-600"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Brand Modal */}
      <Dialog
        open={brandModalOpen}
        onOpenChange={(open) => {
          if (!saveInProgress.current) setBrandModalOpen(open);
        }}
      >
        <DialogContent
          aria-describedby={undefined}
          className="fixed inset-x-0 bottom-0 top-auto flex max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-3xl rounded-b-none border-0 bg-white p-5 text-slate-900 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%_-_2rem)] sm:max-w-md sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-slate-200 sm:p-6"
        >
          <DialogHeader className="pr-12 text-left">
            <DialogTitle className="text-lg font-bold text-slate-900">
              {editingBrand ? "Markayı düzenle" : "Yeni marka"}
            </DialogTitle>
          </DialogHeader>

          {brandError && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
            >
              {brandError}
            </div>
          )}

          <form onSubmit={handleSaveBrand} className="space-y-5 pt-1 text-sm">
            <fieldset disabled={saving} className="space-y-5">
              <div>
                <label
                  htmlFor="brand-name"
                  className="mb-1.5 block font-medium text-slate-700"
                >
                  Marka adı *
                </label>
                <Input
                  id="brand-name"
                  required
                  placeholder="Örn: Volkswagen, Renault, BMW"
                  value={brandName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setBrandName(val);
                    if (!slugManuallyEdited) {
                      setBrandSlug(slugify(val));
                    }
                  }}
                  className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="brand-slug"
                    className="block font-medium text-slate-700"
                  >
                    URL slug *
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Otomatik üretilir
                  </span>
                </div>
                <Input
                  id="brand-slug"
                  required
                  placeholder="volkswagen, renault, bmw"
                  value={brandSlug}
                  onChange={(e) => {
                    setSlugManuallyEdited(true);
                    setBrandSlug(e.target.value.toLowerCase());
                  }}
                  className="h-12 rounded-xl border-slate-300 bg-slate-50 font-mono text-base! text-slate-700! sm:text-sm!"
                />
              </div>

              {/* Brand Logo Upload & Auto Preview */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 font-medium text-slate-800">
                    <ImageIcon className="h-4 w-4 text-slate-500" />
                    <span>Marka logosu</span>
                  </label>
                  <span className="text-xs text-slate-500">Vektör logo</span>
                </div>

                {brandLogoUrl ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="relative w-14 h-14 rounded-md border border-slate-200 bg-white p-2 flex items-center justify-center">
                      <Image
                        key={brandLogoUrl}
                        src={brandLogoUrl}
                        alt="Logo Preview"
                        width={56}
                        height={56}
                        unoptimized
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          e.currentTarget.style.display = "none";
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => setBrandLogoUrl("")}
                        aria-label="Logoyu kaldır"
                        className="absolute right-1 top-1 flex h-10 w-10 items-center justify-center rounded-full bg-slate-800/80 text-white hover:bg-red-600"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="space-y-1 text-sm">
                      <span className="text-emerald-700 font-semibold block">
                        Logo seçildi
                      </span>
                      <span className="block max-w-[200px] truncate font-mono text-xs text-slate-500">
                        {brandLogoUrl}
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed text-slate-500">
                    Marka adına göre logo eşleşir.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 items-center gap-3">
                <div>
                  <label
                    htmlFor="brand-order"
                    className="mb-1.5 block font-medium text-slate-700"
                  >
                    Sıralama
                  </label>
                  <Input
                    id="brand-order"
                    type="number"
                    value={brandOrder}
                    onChange={(e) => setBrandOrder(Number(e.target.value))}
                    className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                  />
                </div>

                <div className="pt-2 sm:pt-4">
                  <label className="flex min-h-12 cursor-pointer items-center gap-2 font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={brandIsActive}
                      onChange={(e) => setBrandIsActive(e.target.checked)}
                      className="h-5 w-5 rounded text-blue-600 accent-blue-600"
                    />
                    <span>Yayında</span>
                  </label>
                </div>
              </div>

              <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setBrandModalOpen(false)}
                  className="h-12 flex-1 rounded-full sm:flex-none"
                >
                  İptal
                </Button>
                <Button
                  type="submit"
                  disabled={saving}
                  className="h-12 flex-1 rounded-full px-6 sm:flex-none"
                >
                  {saving
                    ? "Kaydediliyor…"
                    : editingBrand
                      ? "Güncelle"
                      : "Markayı kaydet"}
                </Button>
              </div>
            </fieldset>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
