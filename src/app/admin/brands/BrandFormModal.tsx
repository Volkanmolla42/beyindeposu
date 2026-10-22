"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import {
  Bot,
  Cpu,
  FileText,
  HelpCircle,
  ImageIcon,
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
import { slugify, LOCAL_BRAND_LOGOS } from "@/app/admin/admin-utils";
import { triggerRevalidate } from "@/lib/revalidate";
import { AdminMarkdownEditorField } from "@/components/admin/AdminMarkdownEditorField";
import { AdminFaqManager } from "@/components/admin/AdminFaqManager";

type Brand = Doc<"brands">;

export interface BrandFormData {
  name: string;
  slug: string;
  order: number;
  logoUrl: string | null;
  popular: boolean;
  isActive: boolean;
  metaTitle: string;
  metaDescription: string;
  content: string;
  faqs: Array<{ question: string; answer: string }>;
}

function initialBrandForm(brand: Brand | null, nextOrder: number): BrandFormData {
  if (!brand) {
    return {
      name: "",
      slug: "",
      order: nextOrder,
      logoUrl: null,
      popular: false,
      isActive: true,
      metaTitle: "",
      metaDescription: "",
      content: "",
      faqs: [],
    };
  }
  return {
    name: brand.name,
    slug: brand.slug,
    order: brand.order ?? 1,
    logoUrl: brand.logoUrl ?? LOCAL_BRAND_LOGOS[brand.slug] ?? "",
    popular: brand.popular ?? false,
    isActive: brand.isActive !== false,
    metaTitle: brand.metaTitle ?? "",
    metaDescription: brand.metaDescription ?? "",
    content: brand.content ?? "",
    faqs: brand.faqs ?? [],
  };
}

interface BrandFormModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brand: Brand | null;
  nextOrder: number;
}

export function BrandFormModal({
  open,
  onOpenChange,
  brand,
  nextOrder,
}: BrandFormModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="fixed inset-x-0 bottom-0 top-auto flex max-h-[92dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col gap-4 overflow-y-auto overscroll-contain rounded-t-3xl rounded-b-none border-0 bg-white p-5 text-slate-900 sm:left-1/2 sm:top-1/2 sm:bottom-auto sm:w-[calc(100%_-_2rem)] sm:max-w-2xl sm:translate-x-[-50%] sm:translate-y-[-50%] sm:rounded-2xl sm:border sm:border-slate-200 sm:p-6"
      >
        {open && (
          <BrandFormModalContent
            key={brand?._id ?? "new"}
            brand={brand}
            nextOrder={nextOrder}
            onClose={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

function BrandFormModalContent({
  brand,
  nextOrder,
  onClose,
}: {
  brand: Brand | null;
  nextOrder: number;
  onClose: () => void;
}) {
  const [form, setForm] = useState<BrandFormData>(() =>
    initialBrandForm(brand, nextOrder),
  );
  const [activeTab, setActiveTab] = useState<"general" | "content" | "faqs">(
    "general",
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  const createBrand = useMutation(api.brands.create);
  const updateBrand = useMutation(api.brands.update);

  const updateField = <K extends keyof BrandFormData>(
    key: K,
    value: BrandFormData[K],
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateAiContent = async () => {
    if (!form.name.trim()) {
      setError("Lütfen önce marka adını girin.");
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
          type: "brand",
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

  const handleSaveBrand = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const name = form.name.trim();
    if (!name) {
      setError("Marka adı zorunludur.");
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
        const logoUrl =
          form.logoUrl ?? LOCAL_BRAND_LOGOS[finalSlug] ?? "";

        const validFaqs = form.faqs
          .map((f) => ({
            question: f.question.trim(),
            answer: f.answer.trim(),
          }))
          .filter((f) => f.question.length > 0 && f.answer.length > 0);

        const payload = {
          name,
          slug: finalSlug,
          logoUrl: logoUrl.trim(),
          popular: form.popular,
          order: Number(form.order) || 1,
          isActive: form.isActive,
          metaTitle: form.metaTitle.trim() || undefined,
          metaDescription: form.metaDescription.trim() || undefined,
          content: form.content.trim() || undefined,
          faqs: validFaqs.length > 0 ? validFaqs : undefined,
        };

        if (brand) {
          await updateBrand({ id: brand._id, ...payload });
        } else {
          await createBrand(payload);
        }

        void triggerRevalidate([
          "/",
          "/parcalar",
          "/markalar",
          `/markalar/${finalSlug}`,
          ...(brand && brand.slug !== finalSlug
            ? [`/markalar/${brand.slug}`]
            : []),
        ]);

        onClose();
      } catch (err: unknown) {
        setError(
          err instanceof Error
            ? err.message
            : "Marka kaydedilirken bir hata oluştu.",
        );
      }
    });
  };

  return (
    <>
      <DialogHeader className="pr-12 text-left">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <DialogTitle className="text-lg font-bold text-slate-900">
            {brand ? "Markayı düzenle" : "Yeni marka"}
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
          <Cpu className="h-4 w-4" />
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

      <form onSubmit={handleSaveBrand} className="space-y-5 pt-1 text-sm">
        <fieldset disabled={isPending} className="space-y-5">
          {activeTab === "general" && (
            <>
              <div>
                <label
                  htmlFor="brand-name"
                  className="mb-1.5 block font-medium text-slate-700"
                >
                  Marka adı *
                </label>
                <Input
                  id="brand-name"
                  name="name"
                  required
                  placeholder="Örn: Volkswagen, Renault, BMW"
                  value={form.name}
                  onChange={(e) => updateField("name", e.target.value)}
                  className="h-12 rounded-xl border-slate-300 bg-white text-base! sm:text-sm!"
                />
              </div>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label
                    htmlFor="brand-slug"
                    className="block font-medium text-slate-700"
                  >
                    URL slug (İsteğe bağlı)
                  </label>
                  <span className="text-[10px] text-slate-400">
                    Boş bırakılırsa otomatik üretilir
                  </span>
                </div>
                <Input
                  id="brand-slug"
                  name="slug"
                  placeholder="volkswagen, renault, bmw"
                  value={form.slug}
                  onChange={(e) => updateField("slug", e.target.value)}
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

                {form.logoUrl || brand?.logoUrl ? (
                  <div className="flex items-center gap-3 pt-1">
                    <div className="relative w-14 h-14 rounded-md border border-slate-200 bg-white p-2 flex items-center justify-center">
                      <Image
                        key={form.logoUrl ?? brand?.logoUrl ?? ""}
                        src={form.logoUrl ?? brand?.logoUrl ?? ""}
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
                        onClick={() => updateField("logoUrl", "")}
                        aria-label="Logoyu kaldır"
                        className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-800/80 text-white hover:bg-red-600"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    <div className="space-y-1 text-sm">
                      <span className="text-emerald-700 font-semibold block">
                        Logo seçildi
                      </span>
                      <span className="block max-w-[260px] truncate font-mono text-xs text-slate-500">
                        {form.logoUrl ?? brand?.logoUrl}
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
                    name="order"
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
                    <span>Yayında</span>
                  </label>
                </div>
              </div>
            </>
          )}

          {activeTab === "content" && (
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="brand-meta-title"
                  className="mb-1.5 block font-medium text-slate-700"
                >
                  Meta Başlığı (SEO Title)
                </label>
                <Input
                  id="brand-meta-title"
                  placeholder="Volkswagen Beyin Tamiri ve ECU Fiyatları | Beyin Deposu"
                  value={form.metaTitle}
                  onChange={(e) => updateField("metaTitle", e.target.value)}
                  className="h-11 rounded-xl border-slate-300 bg-white text-sm"
                />
              </div>

              <div>
                <label
                  htmlFor="brand-meta-desc"
                  className="mb-1.5 block font-medium text-slate-700"
                >
                  Meta Açıklaması (Meta Description)
                </label>
                <textarea
                  id="brand-meta-desc"
                  rows={2}
                  placeholder="Volkswagen motor beyinleri, DSG şanzıman mekatroniği ve ABS üniteleri test edilmiş, garantili olarak stokta."
                  value={form.metaDescription}
                  onChange={(e) =>
                    updateField("metaDescription", e.target.value)
                  }
                  className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm focus:border-amber-500 focus:outline-none"
                />
              </div>

              <AdminMarkdownEditorField
                value={form.content}
                onChange={(val) => updateField("content", val)}
                label="Marka Rehber İçeriği (Markdown)"
                placeholder="## Genel Bakış ve Elektronik Mimari&#10;Markanın kontrol üniteleri hakkında teknik bilgiler...&#10;&#10;## Desteklenen Modüller&#10;- Motor Beyni (ECU)&#10;- Şanzıman Beyni (TCU)"
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
                : brand
                  ? "Güncelle"
                  : "Markayı kaydet"}
            </Button>
          </div>
        </fieldset>
      </form>
    </>
  );
}
