"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Bot,
  FileText,
  HelpCircle,
  ImageIcon,
  Layers,
  Loader2,
  X,
} from "lucide-react";
import { useMutation } from "convex/react";
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
import { slugify } from "@/app/admin/admin-utils";
import { triggerRevalidate } from "@/lib/revalidate";
import { AdminMarkdownEditorField } from "@/components/admin/AdminMarkdownEditorField";
import { AdminFaqManager } from "@/components/admin/AdminFaqManager";

type Category = Doc<"categories"> & { image?: string };

export interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  order: number;
  imageUrl: string | null;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  metaKeywords: string;
  content: string;
  faqs: Array<{ question: string; answer: string }>;
}

function initialCategoryForm(
  category: Category | null,
  nextOrder: number,
): CategoryFormData {
  if (!category) {
    return {
      name: "",
      slug: "",
      description: "",
      order: nextOrder,
      imageUrl: null,
      isActive: true,
      metaTitle: "",
      metaDescription: "",
      metaKeywords: "",
      content: "",
      faqs: [],
    };
  }
  return {
    name: category.name,
    slug: category.slug,
    description: category.description ?? "",
    order: category.order ?? 1,
    imageUrl: category.imageUrl ?? null,
    isActive: category.isActive ?? true,
    metaTitle: category.metaTitle ?? "",
    metaDescription: category.metaDescription ?? "",
    metaKeywords: category.metaKeywords ?? "",
    content: category.content ?? "",
    faqs: category.faqs ?? [],
  };
}

interface CategoryFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category: Category | null;
  nextOrder: number;
}

export function CategoryFormModal({
  open,
  onOpenChange,
  category,
  nextOrder,
}: CategoryFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="fixed inset-x-0 bottom-0 top-auto flex max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-3xl rounded-b-none border-0 bg-white p-5 text-slate-900 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%_-_2rem)] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-slate-200 sm:p-6"
      >
        {open && (
          <CategoryFormModalContent
            key={category?._id ?? "new"}
            category={category}
            nextOrder={nextOrder}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryFormModalContent({
  category,
  nextOrder,
  onClose,
}: {
  category: Category | null;
  nextOrder: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState<CategoryFormData>(() =>
    initialCategoryForm(category, nextOrder),
  );
  const [activeTab, setActiveTab] = useState<"general" | "content" | "faqs">(
    "general",
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const createCategory = useMutation(api.categories.create);
  const updateCategory = useMutation(api.categories.update);

  const updateField = <K extends keyof CategoryFormData>(
    key: K,
    value: CategoryFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateAiContent = async () => {
    if (!form.name.trim()) {
      setError("Lütfen önce kategori adını girin.");
      setActiveTab("general");
      return;
    }
    setError("");
    setIsGeneratingAi(true);
    try {
      const res = await fetch("/api/ai/generate-seo-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "category",
          name: form.name.trim(),
        }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "SEO içeriği üretilemedi.");
      }
      const data = result.data;
      setForm((prev) => ({
        ...prev,
        metaTitle: data.metaTitle || prev.metaTitle,
        metaDescription: data.metaDescription || prev.metaDescription,
        content: data.content || prev.content,
        faqs:
          Array.isArray(data.faqs) && data.faqs.length > 0
            ? data.faqs
            : prev.faqs,
      }));
      setActiveTab("content");
    } catch (err: unknown) {
      setError(
        err instanceof Error ? err.message : "AI içeriği üretilemedi.",
      );
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleSaveCategory = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Kategori adı zorunludur.");
      setActiveTab("general");
      return;
    }
    const finalSlug = slugify(form.slug || name);
    if (!finalSlug) {
      setError("Geçerli bir URL slug girin.");
      setActiveTab("general");
      return;
    }

    setError("");
    startTransition(async () => {
      try {
        const validFaqs = form.faqs
          .map((f) => ({
            question: f.question.trim(),
            answer: f.answer.trim(),
          }))
          .filter((f) => f.question.length > 0 && f.answer.length > 0);

        const payload = {
          name,
          slug: finalSlug,
          description: form.description.trim() || undefined,
          order: Number(form.order) || 1,
          imageUrl: form.imageUrl?.trim() || undefined,
          isActive: form.isActive,
          metaTitle: form.metaTitle.trim() || undefined,
          metaDescription: form.metaDescription.trim() || undefined,
          metaKeywords: form.metaKeywords.trim() || undefined,
          content: form.content.trim() || undefined,
          faqs: validFaqs.length > 0 ? validFaqs : undefined,
        };

        if (category) {
          await updateCategory({ id: category._id, ...payload });
        } else {
          await createCategory(payload);
        }

        void triggerRevalidate([
          "/",
          "/parcalar",
          "/kategoriler",
          `/kategoriler/${finalSlug}`,
          ...(category && category.slug !== finalSlug
            ? [`/kategoriler/${category.slug}`]
            : []),
        ]);

        onClose();
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Kategori kaydedilirken bir hata oluştu.",
        );
      }
    });
  };

  return (
    <>
      <DialogHeader className="pr-12 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {category ? "Kategoriyi düzenle" : "Yeni kategori"}
          </DialogTitle>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isGeneratingAi || !form.name.trim()}
            onClick={handleGenerateAiContent}
            className="h-9 rounded-full border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 font-medium text-xs shadow-2xs"
          >
            {isGeneratingAi ? (
              <>
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin text-amber-600" />
                İçerik Hazırlanıyor…
              </>
            ) : (
              <>
                <Bot className="mr-1.5 h-3.5 w-3.5 text-amber-600" />
                AI ile SEO İçeriği Üret
              </>
            )}
          </Button>
        </div>
      </DialogHeader>

      {error && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-800"
        >
          {error}
        </div>
      )}

      {/* Modal Tabs */}
      <div className="flex border-b border-slate-200 text-sm">
        <button
          type="button"
          onClick={() => setActiveTab("general")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-medium transition-colors ${
            activeTab === "general"
              ? "border-amber-500 text-amber-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <Layers className="h-4 w-4" />
          Genel Bilgiler
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("content")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-medium transition-colors ${
            activeTab === "content"
              ? "border-amber-500 text-amber-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <FileText className="h-4 w-4" />
          SEO ve İçerik
          {form.content ? (
            <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
              Dolu
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("faqs")}
          className={`flex items-center gap-1.5 border-b-2 px-4 py-2.5 font-medium transition-colors ${
            activeTab === "faqs"
              ? "border-amber-500 text-amber-700"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          <HelpCircle className="h-4 w-4" />
          SSS ({form.faqs.length})
        </button>
      </div>

      <form onSubmit={handleSaveCategory} className="space-y-5 pt-1 text-sm">
        <fieldset disabled={isPending} className="space-y-5">
          {activeTab === "general" && (
            <>
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
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
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
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
                  className="h-12 rounded-xl border-slate-300 bg-slate-50 font-mono text-base! text-slate-700! sm:text-sm!"
                />
              </div>

              {/* Category Image Preview */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-2">
                  <label className="flex items-center gap-2 font-medium text-slate-800">
                    <ImageIcon className="h-4 w-4 text-slate-500" />
                    <span>Kategori görseli</span>
                  </label>
                  <span className="text-xs text-slate-500">WebP görsel</span>
                </div>

                {form.imageUrl || category?.imageUrl ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="relative w-14 h-14 rounded-md border border-slate-200 overflow-hidden bg-white p-1">
                      <Image
                        src={form.imageUrl ?? category?.imageUrl ?? ""}
                        alt="Kategori görseli"
                        width={56}
                        height={56}
                        unoptimized
                        className="w-full h-full object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => updateField("imageUrl", "")}
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/80 text-white hover:bg-red-600"
                        aria-label="Görseli kaldır"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1 text-sm">
                      <span className="block font-medium text-emerald-700">
                        Görsel seçildi
                      </span>
                      <span className="block max-w-[260px] truncate font-mono text-xs text-slate-500">
                        {form.imageUrl ?? category?.imageUrl}
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
                  Kısa Açıklama
                </label>
                <Input
                  id="category-description"
                  name="description"
                  value={form.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Kategori hakkında kısa özet bilgi"
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
                    value={form.order}
                    onChange={(e) =>
                      updateField("order", Number(e.target.value) || 1)
                    }
                    className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                  />
                </div>

                <div className="pt-2 sm:pt-4">
                  <label className="flex min-h-12 cursor-pointer items-center gap-2 font-medium text-slate-800">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(e) =>
                        updateField("isActive", e.target.checked)
                      }
                      className="h-5 w-5 rounded text-amber-500 accent-amber-500"
                    />
                    <span>Kategori etkin</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === "content" && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="category-meta-title"
                  className="mb-1.5 block font-medium text-slate-700"
                >
                  Meta Başlığı (SEO Title)
                </label>
                <Input
                  id="category-meta-title"
                  placeholder="Motor Beyinleri ve ECU Fiyatları | Beyin Deposu"
                  value={form.metaTitle}
                  onChange={(e) => updateField("metaTitle", e.target.value)}
                  className="h-11 rounded-xl border-slate-300 bg-white text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="category-meta-desc"
                  className="mb-1.5 block font-medium text-slate-700"
                >
                  Meta Açıklaması (Meta Description)
                </label>
                <textarea
                  id="category-meta-desc"
                  rows={2}
                  placeholder="Orijinal motor beyinleri, test edilmiş çıkma ve sıfır ECU üniteleri 12 ay garantili ve tak-çalıştır klonlama desteği ile."
                  value={form.metaDescription}
                  onChange={(e) =>
                    updateField("metaDescription", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-amber-500 focus:outline-none"
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
                  placeholder="ecu, motor beyni, beyin tamiri"
                  value={form.metaKeywords}
                  onChange={(e) =>
                    updateField("metaKeywords", e.target.value)
                  }
                  className="h-11 rounded-xl border-slate-300 bg-white text-sm"
                />
              </div>

              <AdminMarkdownEditorField
                value={form.content}
                onChange={(val) => updateField("content", val)}
                label="Kategori Rehber İçeriği (Markdown)"
                placeholder="## Genel Bakış ve Elektronik Mimari&#10;Kategori kontrol üniteleri hakkında teknik bilgiler...&#10;&#10;## Sık Karşılaşılan Arızalar"
              />
            </div>
          )}

          {activeTab === "faqs" && (
            <AdminFaqManager
              faqs={form.faqs}
              onChange={(faqs) => updateField("faqs", faqs)}
            />
          )}

          <div className="sticky bottom-0 flex gap-3 border-t border-slate-200 bg-white pt-4 pb-[max(0.25rem,env(safe-area-inset-bottom))] sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-11 flex-1 rounded-full sm:flex-none"
            >
              İptal
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="h-11 flex-1 rounded-full px-6 sm:flex-none"
            >
              {isPending
                ? "Kaydediliyor…"
                : category
                  ? "Güncelle"
                  : "Kategoriyi kaydet"}
            </Button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
