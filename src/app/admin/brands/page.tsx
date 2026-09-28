"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Cpu,
  ImageIcon,
  X,
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
import { slugify, LOCAL_BRAND_LOGOS } from "../admin-utils";

type Brand = Doc<"brands">;

export default function AdminBrandsPage() {
  const [brandSearch, setBrandSearch] = useState("");

  // Brand Modal & Form State
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<Brand | null>(null);
  const [brandName, setBrandName] = useState("");
  const [brandSlug, setBrandSlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [brandLogoUrl, setBrandLogoUrl] = useState("");
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
    setBrandLogoUrl("");
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
    setBrandLogoUrl(LOCAL_BRAND_LOGOS[b.slug] || b.logoUrl || "");
    setBrandPopular(b.popular ?? false);
    setBrandOrder(b.order ?? 1);
    setBrandIsActive(b.isActive !== false);
    setBrandError("");
    setBrandModalOpen(true);
  };

  // Debounced auto-logo selection based on brand name / slug
  useEffect(() => {
    if (!brandModalOpen) return;
    const timer = setTimeout(() => {
      const key = (brandSlug || slugify(brandName)).trim();
      if (!key) return;
      const matched =
        LOCAL_BRAND_LOGOS[key] ||
        LOCAL_BRAND_LOGOS[slugify(brandName)] ||
        Object.entries(LOCAL_BRAND_LOGOS).find(([k]) => key.includes(k) || k.includes(key))?.[1];

      if (matched && (!brandLogoUrl || brandLogoUrl.startsWith("/images/brands/"))) {
        setBrandLogoUrl(matched);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [brandName, brandSlug, brandModalOpen, brandLogoUrl]);

  
  const handleSaveBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!brandName.trim()) {
      setBrandError("Marka adı zorunludur.");
      return;
    }
    const finalSlug = brandSlug.trim() || slugify(brandName);

    try {
      if (editingBrand) {
        await updateBrand({
          id: editingBrand._id,
          name: brandName.trim(),
          slug: finalSlug,
          logoUrl: brandLogoUrl.trim() || undefined,
          popular: brandPopular,
          order: Number(brandOrder),
          isActive: brandIsActive,
        });
      } else {
        await createBrand({
          name: brandName.trim(),
          slug: finalSlug,
          logoUrl: brandLogoUrl.trim() || undefined,
          popular: brandPopular,
          order: Number(brandOrder),
          isActive: brandIsActive,
        });
      }

      setBrandModalOpen(false);
      resetBrandForm();
    } catch (err: unknown) {
      setBrandError(err instanceof Error ? err.message : "Marka kaydedilirken bir hata oluştu.");
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

  const filteredBrands = brands?.filter(
    (b) =>
      !brandSearch ||
      b.name.toLowerCase().includes(brandSearch.toLowerCase()) ||
      b.slug.toLowerCase().includes(brandSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <span>Araç markaları</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {brands ? brands.length : 0} marka
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Marka adlarını, logolarını ve sırasını yönetin.
          </p>
        </div>

        <Button
          onClick={handleOpenAddBrand}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 rounded-lg gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni marka ekle</span>
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <Input
          placeholder="Marka adına göre ara"
          value={brandSearch}
          onChange={(e) => setBrandSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200 text-slate-900 text-xs h-9 rounded-lg"
        />
      </div>

      {/* Brands Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3.5">
        {filteredBrands?.map((b) => (
          <div
            key={b._id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between gap-3 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0 p-2">
                {b.logoUrl ? (
                  <Image
                    src={LOCAL_BRAND_LOGOS[b.slug] || b.logoUrl}
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
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 truncate">{b.name}</h4>
                <p className="text-[11px] text-slate-500 font-mono truncate">{b.slug}</p>
                <div className="flex items-center gap-1.5 mt-1">
                  <span className="text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                    Sıra: {b.order ?? 1}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${
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
                onClick={() => handleOpenEditBrand(b)}
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                title="Düzenle"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteBrand(b)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                title="Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Brand Modal */}
      <Dialog open={brandModalOpen} onOpenChange={setBrandModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white text-slate-900 border-slate-200 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingBrand ? "Markayı düzenle" : "Yeni marka"}
            </DialogTitle>
          </DialogHeader>

          {brandError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
              {brandError}
            </div>
          )}

          <form onSubmit={handleSaveBrand} className="space-y-3.5 pt-1 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Marka adı *</label>
              <Input
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
                className="bg-white border-slate-200"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 block">URL slug *</label>
                <span className="text-[10px] text-slate-400">Otomatik üretilir</span>
              </div>
              <Input
                required
                placeholder="volkswagen, renault, bmw"
                value={brandSlug}
                onChange={(e) => {
                  setSlugManuallyEdited(true);
                  setBrandSlug(e.target.value.toLowerCase());
                }}
                className="font-mono bg-slate-50 border-slate-200 text-xs text-slate-600"
              />
            </div>

            {/* Brand Logo Upload & Auto Preview */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Marka logosu</span>
                </label>
                <span className="text-[10px] text-slate-400">Statik SVG vektör logo</span>
              </div>

              {brandLogoUrl ? (
                <div className="flex items-center gap-3 pt-1">
                  <div className="relative w-14 h-14 rounded-md border border-slate-200 bg-white p-2 flex items-center justify-center">
                    <Image
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
                      className="absolute top-0.5 right-0.5 bg-slate-800/80 text-white rounded-full p-0.5 hover:bg-red-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[11px] space-y-0.5">
                    <span className="text-emerald-700 font-semibold block">Logo seçildi</span>
                    <span className="text-slate-400 font-mono text-[10px] truncate max-w-[200px] block">{brandLogoUrl}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Marka adına göre resmi vektör logosu otomatik atanır veya özel logo yükleyebilirsiniz.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sıralama</label>
                <Input
                  type="number"
                  value={brandOrder}
                  onChange={(e) => setBrandOrder(Number(e.target.value))}
                  className="bg-white border-slate-200"
                />
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={brandIsActive}
                    onChange={(e) => setBrandIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300"
                  />
                  <span>Yayında</span>
                </label>
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setBrandModalOpen(false)}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                İptal
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6">
                {editingBrand ? "Güncelle" : "Markayı Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
