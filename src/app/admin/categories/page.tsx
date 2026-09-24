"use client";

import { useState, useRef, useEffect } from "react";
import {
  Layers,
  Plus,
  Search,
  Edit2,
  Trash2,
  ImageIcon,
  Upload,
  X,
  Loader2,
  Globe,
} from "lucide-react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { slugify } from "../admin-utils";

export default function AdminCategoriesPage() {
  const [catSearch, setCatSearch] = useState("");

  // Category Modal & Form State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catSlugManuallyEdited, setCatSlugManuallyEdited] = useState(false);
  const [catDescription, setCatDescription] = useState("");
  const [catPreviewImage, setCatPreviewImage] = useState<string>("");
  const [catStorageId, setCatStorageId] = useState<Id<"_storage"> | null>(null);
  const [catUploading, setCatUploading] = useState(false);
  const [catOrder, setCatOrder] = useState<number>(1);
  const [catIsActive, setCatIsActive] = useState<boolean>(true);
  const [catMetaTitle, setCatMetaTitle] = useState("");
  const [catMetaDescription, setCatMetaDescription] = useState("");
  const [catMetaKeywords, setCatMetaKeywords] = useState("");
  const [categoryError, setCategoryError] = useState<string>("");

  const catFileInputRef = useRef<HTMLInputElement>(null);

  // Queries & Mutations
  const categories = useQuery(api.categories.list, { onlyActive: false });
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);
  const deleteCategory = useMutation(api.categories.deleteCategory);

  const resetCategoryForm = () => {
    setCatName("");
    setCatSlug("");
    setCatSlugManuallyEdited(false);
    setCatDescription("");
    setCatPreviewImage("");
    setCatStorageId(null);
    setCatOrder((categories?.length || 0) + 1);
    setCatIsActive(true);
    setCatMetaTitle("");
    setCatMetaDescription("");
    setCatMetaKeywords("");
    setEditingCategory(null);
    setCategoryError("");
  };

  const handleOpenAddCategory = () => {
    resetCategoryForm();
    setCategoryModalOpen(true);
  };

  const handleOpenEditCategory = (c: any) => {
    setEditingCategory(c);
    setCatName(c.name);
    setCatSlug(c.slug);
    setCatSlugManuallyEdited(true);
    setCatDescription(c.description || "");
    setCatPreviewImage(c.image || "");
    setCatStorageId(c.imageStorageId || null);
    setCatOrder(c.order ?? 1);
    setCatIsActive(c.isActive ?? true);
    setCatMetaTitle(c.metaTitle || "");
    setCatMetaDescription(c.metaDescription || "");
    setCatMetaKeywords(c.metaKeywords || "");
    setCategoryError("");
    setCategoryModalOpen(true);
  };

  const handleCategoryFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setCatUploading(true);
    try {
      const postUrl = await generateUploadUrl();
      const result = await fetch(postUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      const { storageId } = await result.json();
      setCatStorageId(storageId);
      setCatPreviewImage(URL.createObjectURL(file));
    } catch (err) {
      console.error("Kategori görseli yüklenemedi:", err);
      alert("Görsel yüklenirken bir hata oluştu.");
    } finally {
      setCatUploading(false);
    }
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    setCategoryError("");

    const generatedSlug = catSlug.trim() ? catSlug.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-") : slugify(catName);

    try {
      const payload = {
        name: catName,
        slug: generatedSlug,
        description: catDescription || undefined,
        imageStorageId: catStorageId || undefined,
        order: Number(catOrder),
        isActive: catIsActive,
        metaTitle: catMetaTitle.trim() || undefined,
        metaDescription: catMetaDescription.trim() || undefined,
        metaKeywords: catMetaKeywords.trim() || undefined,
      };

      if (editingCategory) {
        await updateCategory({
          id: editingCategory._id,
          ...payload,
        });
      } else {
        await createCategory(payload);
      }

      setCategoryModalOpen(false);
      resetCategoryForm();
    } catch (err: any) {
      setCategoryError(err?.message || "Kategori kaydedilirken hata oluştu.");
    }
  };

  const handleDeleteCategory = async (cat: any) => {
    if (confirm(`'${cat.name}' kategorisini silmek istediğinizden emin misiniz?`)) {
      try {
        await deleteCategory({ id: cat._id });
      } catch (err: any) {
        alert(err?.message || "Kategori silinemedi. Bağlı ürünler olabilir.");
      }
    }
  };

  const filteredCategories = categories?.filter(
    (c) =>
      !catSearch ||
      c.name.toLowerCase().includes(catSearch.toLowerCase()) ||
      c.slug.toLowerCase().includes(catSearch.toLowerCase())
  );

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <span>Kategoriler</span>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
              {categories ? categories.length : 0} adet
            </span>
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Oto elektronik parça modül türlerini, görsellerini ve sıralamalarını yapılandırın.
          </p>
        </div>

        <Button
          onClick={handleOpenAddCategory}
          className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold h-9 rounded-lg gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-4 h-4" />
          <span>Yeni Kategori Ekle</span>
        </Button>
      </div>

      {/* Search Filter */}
      <div className="relative max-w-sm">
        <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
        <Input
          placeholder="Kategori adına göre filtrele..."
          value={catSearch}
          onChange={(e) => setCatSearch(e.target.value)}
          className="pl-9 bg-white border-slate-200 text-slate-900 text-xs h-9 rounded-lg"
        />
      </div>

      {/* Clean Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {filteredCategories?.map((cat) => (
          <div
            key={cat._id}
            className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between gap-3 hover:border-slate-300 transition-colors"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-12 h-12 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex items-center justify-center shrink-0 p-1">
                {cat.image ? (
                  <img src={cat.image} alt={cat.name} className="w-full h-full object-contain" />
                ) : (
                  <Layers className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-xs text-slate-900 truncate">{cat.name}</h4>
                <p className="text-[11px] text-slate-500 font-mono truncate">{cat.slug}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] text-slate-600 font-medium bg-slate-100 px-1.5 py-0.5 rounded">
                    Sıra: {cat.order ?? 1}
                  </span>
                  <span
                    className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${cat.isActive !== false
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                        : "bg-slate-100 text-slate-600"
                      }`}
                  >
                    {cat.isActive !== false ? "Aktif" : "Pasif"}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => handleOpenEditCategory(cat)}
                className="p-1.5 text-slate-400 hover:text-blue-600 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                title="Düzenle"
              >
                <Edit2 className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleDeleteCategory(cat)}
                className="p-1.5 text-slate-400 hover:text-red-600 rounded hover:bg-slate-50 transition-colors cursor-pointer"
                title="Sil"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Category Modal */}
      <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto bg-white text-slate-900 border-slate-200 p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900">
              {editingCategory ? "Kategoriyi Düzenle" : "Yeni Kategori Ekle"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Kategori adı, slug ve görsel detaylarını tanımlayın.
            </DialogDescription>
          </DialogHeader>

          {categoryError && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-800 text-xs font-medium">
              {categoryError}
            </div>
          )}

          <form onSubmit={handleSaveCategory} className="space-y-3.5 pt-1 text-xs">
            <div>
              <label className="font-semibold text-slate-700 block mb-1">Kategori Adı *</label>
              <Input
                required
                placeholder="Örn: Motor Beyinleri (ECU)"
                value={catName}
                onChange={(e) => {
                  const val = e.target.value;
                  setCatName(val);
                  if (!catSlugManuallyEdited) {
                    setCatSlug(slugify(val));
                  }
                }}
                className="bg-white border-slate-200"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-semibold text-slate-700 block">URL Slug *</label>
                <span className="text-[10px] text-slate-400">Otomatik üretilir</span>
              </div>
              <Input
                required
                placeholder="motor-beyinleri-ecu"
                value={catSlug}
                onChange={(e) => {
                  setCatSlugManuallyEdited(true);
                  setCatSlug(e.target.value.toLowerCase());
                }}
                className="font-mono bg-slate-50 border-slate-200 text-xs text-slate-600"
              />
            </div>

            {/* Category Image Upload & Auto Match */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="font-semibold text-slate-800 flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-slate-500" />
                  <span>Kategori Görseli</span>
                </label>
                <input
                  type="file"
                  accept="image/*"
                  ref={catFileInputRef}
                  onChange={handleCategoryFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={catUploading}
                  onClick={() => catFileInputRef.current?.click()}
                  className="bg-white border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-medium gap-1 cursor-pointer h-7"
                >
                  {catUploading ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Yükleniyor...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span>Görsel Yükle</span>
                    </>
                  )}
                </Button>
              </div>

              {catPreviewImage ? (
                <div className="flex items-center gap-3 pt-1">
                  <div className="relative w-14 h-14 rounded-md border border-slate-200 overflow-hidden bg-white p-1">
                    <img src={catPreviewImage} alt="Category Preview" className="w-full h-full object-contain" />
                    <button
                      type="button"
                      onClick={() => {
                        setCatPreviewImage("");
                        setCatStorageId(null);
                      }}
                      className="absolute top-0.5 right-0.5 bg-slate-800/80 text-white rounded-full p-0.5 hover:bg-red-600 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="text-[11px] space-y-0.5">
                    <span className="text-emerald-700 font-semibold block">Görsel Seçildi</span>
                    <span className="text-slate-400 font-mono text-[10px] truncate max-w-[200px] block">{catPreviewImage}</span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Kategori adına göre stüdyo görseli otomatik eşleştirilir veya yeni yükleyebilirsiniz.
                </p>
              )}
            </div>

            <div>
              <label className="font-semibold text-slate-700 block mb-1">Açıklama</label>
              <Input
                placeholder="Kategori hakkında kısa açıklama..."
                value={catDescription}
                onChange={(e) => setCatDescription(e.target.value)}
                className="bg-white border-slate-200"
              />
            </div>

            <div className="grid grid-cols-2 gap-3 items-center">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Sıralama</label>
                <Input
                  type="number"
                  value={catOrder}
                  onChange={(e) => setCatOrder(Number(e.target.value))}
                  className="bg-white border-slate-200"
                />
              </div>

              <div className="pt-4">
                <label className="flex items-center gap-2 font-semibold text-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={catIsActive}
                    onChange={(e) => setCatIsActive(e.target.checked)}
                    className="w-4 h-4 rounded text-blue-600 border-slate-300"
                  />
                  <span>Kategori Aktif</span>
                </label>
              </div>
            </div>

            {/* SEO Fields */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
              <div className="flex items-center gap-1.5 text-slate-800 font-semibold">
                <Globe className="w-3.5 h-3.5 text-slate-500" />
                <span>SEO Ayarları (Opsiyonel)</span>
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Meta Başlığı</label>
                <Input
                  placeholder="Motor Beyinleri (ECU) Modülleri | Beyindeposu"
                  value={catMetaTitle}
                  onChange={(e) => setCatMetaTitle(e.target.value)}
                  className="bg-white border-slate-200 text-xs"
                />
              </div>

              <div>
                <label className="text-[11px] text-slate-600 block mb-1">Meta Açıklaması</label>
                <Input
                  placeholder="En uygun fiyatlı orijinal çıkma ve sıfır motor beyinleri..."
                  value={catMetaDescription}
                  onChange={(e) => setCatMetaDescription(e.target.value)}
                  className="bg-white border-slate-200 text-xs"
                />
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoryModalOpen(false)}
                className="border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                İptal
              </Button>
              <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6">
                {editingCategory ? "Güncelle" : "Kategoriyi Kaydet"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
