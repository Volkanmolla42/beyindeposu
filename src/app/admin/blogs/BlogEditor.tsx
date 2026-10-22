"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import {
  AlertTriangle,
  FileText,
  Loader2,
  Save,
  Settings2,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import { slugifyTurkish } from "@/lib/utils";
import { triggerRevalidate } from "@/lib/revalidate";
import BlogRichTextEditor from "./BlogRichTextEditor";
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

type EditorTab = "content" | "settings";

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
        <div className={tab === "content" ? "" : "hidden"}>
          <section className={`${BLOG_PANEL} overflow-hidden`}>
            <BlogRichTextEditor
              initialContent={form.content}
              onChange={(markdown) => updateField("content", markdown)}
            />
          </section>
        </div>

        <div className={tab === "settings" ? "" : "hidden"}>
          <BlogSettingsTab
            form={form}
            slug={slugPreview}
            updateField={updateField}
            categories={categories}
            onError={(message) => setError(message)}
          />
        </div>
      </form>
    </div>
  );
}
