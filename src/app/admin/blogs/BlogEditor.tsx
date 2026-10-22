"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  AlertTriangle,
  Bot,
  FileText,
  HelpCircle,
  Loader2,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { slugifyTurkish } from "@/lib/utils";
import { triggerRevalidate } from "@/lib/revalidate";
import { AdminMarkdownEditorField } from "@/components/admin/AdminMarkdownEditorField";
import { AdminFaqManager } from "@/components/admin/AdminFaqManager";
import BlogSettingsTab from "./BlogSettingsTab";
import {
  BLOG_PANEL,
  EMPTY_BLOG_FORM,
  formFromBlog,
  parseTags,
  segmentedButtonClass,
  toErrorMessage,
  type Blog,
  type BlogFormData,
  type UpdateBlogField,
} from "./blog-editor-shared";

type EditorTab = "settings" | "content" | "faqs";

function tabButtonClass(active: boolean) {
  return `inline-flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold transition-colors ${segmentedButtonClass(active)}`;
}

function EditorLoading({ message = "Yazı yükleniyor..." }: { message?: string }) {
  return (
    <div className="space-y-5">
      <AdminPageHeader title="Blog Yazısını Düzenle" />
      <div
        className={`${BLOG_PANEL} flex h-64 items-center justify-center gap-2 text-sm text-slate-500`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {message}
      </div>
    </div>
  );
}

function EditorNotFound() {
  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Blog Yazısını Düzenle"
        actions={
          <Button asChild variant="outline">
            <Link href="/admin/blogs">Listeye dön</Link>
          </Button>
        }
      />
      <div className={`${BLOG_PANEL} p-8 text-center`}>
        <p className="text-sm font-semibold text-slate-900">Yazı bulunamadı</p>
        <p className="mt-1 text-sm text-slate-500">
          Bağlantı geçersiz veya yazı silinmiş olabilir.
        </p>
      </div>
    </div>
  );
}

export default function BlogEditor({ slug }: { slug?: string }) {
  const blog = useQuery(api.blogs.getBySlug, slug ? { slug } : "skip");
  const [deleted, setDeleted] = useState(false);

  if (slug) {
    if (blog === undefined) return <EditorLoading />;
    if (blog === null) {
      return deleted ? (
        <EditorLoading message="Listeye dönülüyor..." />
      ) : (
        <EditorNotFound />
      );
    }
    return (
      <BlogEditorForm
        key={blog._id}
        blog={blog}
        onDeleted={() => setDeleted(true)}
      />
    );
  }

  return <BlogEditorForm />;
}

function BlogEditorForm({
  blog,
  onDeleted,
}: {
  blog?: Blog;
  onDeleted?: () => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<BlogFormData>(() =>
    blog ? formFromBlog(blog) : { ...EMPTY_BLOG_FORM },
  );
  const [tab, setTab] = useState<EditorTab>("settings");
  const [isPending, startTransition] = useTransition();
  const [isDeleting, startDeleteTransition] = useTransition();
  const [error, setError] = useState("");

  // AI Wizard State
  const [aiTopic, setAiTopic] = useState("");
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  const categoriesData = useQuery(api.blogCategories.list);
  const createBlog = useMutation(api.blogs.create);
  const updateBlog = useMutation(api.blogs.update);
  const deleteBlog = useMutation(api.blogs.deleteBlog);

  const categories = (categoriesData ?? []).map((category) => category.title);
  const category = form.category || categories[0] || "";
  const slugPreview = blog?.slug || slugifyTurkish(form.title.trim());

  const updateField: UpdateBlogField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleGenerateAiBlog = async () => {
    if (!aiTopic.trim()) {
      setError("Lütfen bir blog konusu veya anahtar kelime girin.");
      return;
    }
    setError("");
    setAiNotice(null);
    setIsGeneratingAi(true);

    try {
      const res = await fetch("/api/ai/generate-blog-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: aiTopic.trim(),
          existingCategories: categories,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Blog yazısı üretilemedi.");
      }

      const data = result.data;
      if (data.title) updateField("title", data.title);
      if (data.excerpt) updateField("excerpt", data.excerpt);
      if (data.category) updateField("category", data.category);
      if (Array.isArray(data.tags)) updateField("tags", data.tags.join(", "));
      if (data.content) updateField("content", data.content);
      if (Array.isArray(data.faqs)) updateField("faqs", data.faqs);

      if (data.isNewCategory) {
        setAiNotice(
          `Mevcut kategorilerde tam eşleşme bulunamadı. Yazı kaydedildiğinde "${data.category}" adıyla yeni kategori otomatik oluşturulacak.`,
        );
      } else {
        setAiNotice(`Kategori otomatik eşleştirildi: "${data.category}"`);
      }

      setTab("content");
    } catch (err) {
      setError(toErrorMessage(err, "Yapay zeka ile blog üretilemedi."));
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleDelete = () => {
    if (!blog || isDeleting) return;
    if (!confirm(`"${blog.title}" yazısını silmek istediğinize emin misiniz?`)) {
      return;
    }

    setError("");
    startDeleteTransition(async () => {
      try {
        await deleteBlog({ id: blog._id });
        void triggerRevalidate(["/", "/blog", `/blog/${blog.slug}`]);
        onDeleted?.();
        router.replace("/admin/blogs");
      } catch (err) {
        setError(toErrorMessage(err, "Yazı silinemedi."));
      }
    });
  };

  const handleSave = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const title = form.title.trim();
    const categoryValue = category.trim();
    const excerpt = form.excerpt.trim();
    const content = form.content.trim();

    if (!title) {
      setTab("settings");
      setError("Makale başlığı zorunludur.");
      return;
    }
    if (!content) {
      setTab("content");
      setError("Makale içeriği boş bırakılamaz.");
      return;
    }
    if (!categoryValue) {
      setTab("settings");
      setError("Bir kategori seçin veya yeni bir kategori ekleyin.");
      return;
    }
    const coverImageStorageId = form.coverImageStorageId;
    if (!coverImageStorageId) {
      setTab("settings");
      setError("Bir kapak görseli yükleyin.");
      return;
    }
    if (!excerpt) {
      setTab("settings");
      setError("Makale özeti zorunludur.");
      return;
    }

    const validFaqs = form.faqs
      .map((f) => ({ question: f.question.trim(), answer: f.answer.trim() }))
      .filter((f) => f.question.length > 0 && f.answer.length > 0);

    setError("");

    startTransition(async () => {
      try {
        const payload = {
          title,
          category: categoryValue,
          excerpt,
          content,
          coverImageStorageId,
          tags: parseTags(form.tags),
          faqs: validFaqs.length > 0 ? validFaqs : undefined,
          isPublished: form.isPublished,
        };

        const finalSlug = blog ? blog.slug : slugifyTurkish(title);
        if (blog) {
          await updateBlog({ id: blog._id, slug: blog.slug, ...payload });
        } else {
          await createBlog({ slug: finalSlug, ...payload });
        }

        void triggerRevalidate(["/", "/blog", `/blog/${finalSlug}`]);

        router.replace("/admin/blogs");
      } catch (err) {
        setError(toErrorMessage(err, "Kaydedilirken bir hata oluştu."));
      }
    });
  };

  return (
    <div className="space-y-4">
      {/* Top AI Blog Wizard Bar */}
      <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 sm:p-5 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
          <div className="relative flex-1">
            <Input
              value={aiTopic}
              onChange={(e) => setAiTopic(e.target.value)}
              placeholder="Blog konusu veya arıza girin: örn. Golf 7 DSG DQ200 mekatronik basınç tüpü arızası..."
              className="h-11 rounded-xl border-amber-300 bg-white text-sm pr-4 focus-visible:ring-amber-300"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void handleGenerateAiBlog();
                }
              }}
            />
          </div>
          <Button
            type="button"
            disabled={isGeneratingAi || !aiTopic.trim()}
            onClick={handleGenerateAiBlog}
            className="h-11 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-5 text-sm shrink-0 shadow-xs"
          >
            {isGeneratingAi ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-slate-950" />
                AI Makaleyi Hazırlıyor…
              </>
            ) : (
              <>
                <Bot className="mr-2 h-4 w-4 text-slate-950" />
                AI ile Blog Yazısı Üret
              </>
            )}
          </Button>
        </div>

        {aiNotice && (
          <p className="text-xs font-semibold text-amber-900 bg-amber-100/80 px-3 py-1.5 rounded-lg">
            {aiNotice}
          </p>
        )}
      </div>

      <AdminPageHeader
        title={blog ? "Blog Yazısını Düzenle" : "Yeni Blog Yazısı"}
        tabs={
          <div
            role="group"
            aria-label="Düzenleme bölümleri"
            className="inline-flex items-center gap-1 rounded-full bg-slate-100 p-1"
          >
            <button
              type="button"
              aria-pressed={tab === "settings"}
              onClick={() => setTab("settings")}
              className={tabButtonClass(tab === "settings")}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Yayın ayarları
            </button>
            <button
              type="button"
              aria-pressed={tab === "content"}
              onClick={() => setTab("content")}
              className={tabButtonClass(tab === "content")}
            >
              <FileText className="h-3.5 w-3.5" />
              İçerik
              {form.content ? (
                <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-800">
                  Dolu
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-pressed={tab === "faqs"}
              onClick={() => setTab("faqs")}
              className={tabButtonClass(tab === "faqs")}
            >
              <HelpCircle className="h-3.5 w-3.5" />
              SSS ({form.faqs.length})
            </button>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            {blog && (
              <Button
                type="button"
                variant="outline"
                onClick={handleDelete}
                disabled={isPending || isDeleting}
                className="text-rose-600 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-700"
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                {isDeleting ? "Siliniyor..." : "Sil"}
              </Button>
            )}
            <Button type="submit" form="blog-form" disabled={isPending || isDeleting}>
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isPending ? "Kaydediliyor..." : blog ? "Güncelle" : "Kaydet"}
            </Button>
          </div>
        }
      />

      {error && (
        <div
          role="alert"
          className="sticky top-0 z-20 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 shadow-sm"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      <form id="blog-form" onSubmit={handleSave} className="space-y-4">
        {tab === "settings" && (
          <BlogSettingsTab
            form={form}
            slug={slugPreview}
            updateField={updateField}
            categories={categories}
            onError={(message) => setError(message)}
          />
        )}

        {tab === "content" && (
          <section className={`${BLOG_PANEL} p-5 lg:p-6`}>
            <AdminMarkdownEditorField
              value={form.content}
              onChange={(content) => updateField("content", content)}
              rows={22}
              minHeightClass="min-h-[500px]"
              label="Makale İçeriği (Markdown)"
              placeholder="## Genel Bakış ve Elektronik Mimari&#10;Makale detayları...&#10;&#10;## Kronik Arıza Belirtileri&#10;- **Hata Kodu P0300:** Ateşleme kesintisi..."
            />
          </section>
        )}

        {tab === "faqs" && (
          <section className={`${BLOG_PANEL} p-5 sm:p-6`}>
            <AdminFaqManager
              faqs={form.faqs}
              onChange={(faqs) => updateField("faqs", faqs)}
              description="Google arama sonuçlarında FAQPage şeması ve sayfa içi SSS akordiyonu olarak listelenir."
            />
          </section>
        )}
      </form>
    </div>
  );
}
