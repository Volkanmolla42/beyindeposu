"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import BlogCoverField from "./BlogCoverField";
import BlogExcerptField from "./BlogExcerptField";
import BlogTitleField from "./BlogTitleField";
import {
  BLOG_HINT,
  BLOG_INPUT,
  BLOG_LABEL,
  BLOG_PANEL,
  toErrorMessage,
  type BlogFormData,
  type UpdateBlogField,
} from "./blog-editor-shared";

interface BlogSettingsTabProps {
  form: BlogFormData;
  slug: string;
  updateField: UpdateBlogField;
  categories: string[];
  onError: (message: string) => void;
}

export default function BlogSettingsTab({
  form,
  slug,
  updateField,
  categories,
  onError,
}: BlogSettingsTabProps) {
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const createBlogCategory = useMutation(api.blogCategories.create);
  const category = form.category || categories[0] || "";
  const categoryOptions =
    category && !categories.includes(category)
      ? [category, ...categories]
      : categories;

  const handleCreateCategory = async () => {
    const title = (newCategory || "").trim();
    if (!title) return;

    try {
      await createBlogCategory({ title });
      updateField("category", title);
      setNewCategory(null);
      onError("");
    } catch (error) {
      onError(toErrorMessage(error, "Kategori eklenemedi."));
    }
  };

  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-[minmax(0,1fr)_24rem] xl:grid-cols-[minmax(0,1fr)_32rem]">
      <div className="space-y-3">
        <BlogTitleField
          title={form.title}
          slug={slug}
          onTitleChange={(value) => updateField("title", value)}
        />
        <BlogExcerptField
          excerpt={form.excerpt}
          onExcerptChange={(value) => updateField("excerpt", value)}
        />

        <div className="grid grid-cols-1 items-start gap-3 xl:grid-cols-2">
          <section className={`${BLOG_PANEL} p-5`}>
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="blog-category" className={BLOG_LABEL}>
                Kategori
              </label>
              {newCategory === null && (
                <button
                  type="button"
                  onClick={() => setNewCategory("")}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-700 transition-colors hover:text-amber-800"
                >
                  <Plus className="h-3 w-3" />
                  Yeni
                </button>
              )}
            </div>

            {newCategory !== null ? (
              <div className="mt-2 space-y-2">
                <Input
                  autoFocus
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  placeholder="Kategori adı"
                  aria-label="Yeni kategori adı"
                  className={BLOG_INPUT}
                  onKeyDown={async (e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      await handleCreateCategory();
                    } else if (e.key === "Escape") {
                      setNewCategory(null);
                    }
                  }}
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleCreateCategory}
                    disabled={!newCategory.trim()}
                    className="h-8 flex-1 text-xs"
                  >
                    Ekle
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    onClick={() => setNewCategory(null)}
                    className="h-8 text-xs"
                  >
                    İptal
                  </Button>
                </div>
              </div>
            ) : (
              <select
                id="blog-category"
                value={category}
                onChange={(e) => updateField("category", e.target.value)}
                className="mt-2 h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-800 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
              >
                {categoryOptions.length === 0 ? (
                  <option value="" disabled>
                    Kategori yok
                  </option>
                ) : (
                  categoryOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))
                )}
              </select>
            )}
          </section>

          <section className={`${BLOG_PANEL} p-5`}>
            <label htmlFor="blog-tags" className={BLOG_LABEL}>
              Etiketler
            </label>
            <Input
              id="blog-tags"
              value={form.tags}
              onChange={(e) => updateField("tags", e.target.value)}
              placeholder="DSG, mekatronik, arıza"
              className={`mt-2 ${BLOG_INPUT}`}
            />
            <p className={`mt-1.5 ${BLOG_HINT}`}>Virgülle ayırın.</p>
          </section>
        </div>
      </div>

      <div className="space-y-3 lg:sticky lg:top-6">
        <BlogCoverField
          coverImage={form.coverImage}
          onChange={(storageId, previewUrl) => {
            updateField("coverImageStorageId", storageId);
            updateField("coverImage", previewUrl);
          }}
          onError={onError}
        />

        <section className={`${BLOG_PANEL} p-4`}>
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className={BLOG_LABEL}>Yayın durumu</h2>
              <p className={`mt-0.5 ${BLOG_HINT}`}>
                {form.isPublished ? "Yayında" : "Taslak"}
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={form.isPublished}
              aria-label="Yayında"
              onClick={() => updateField("isPublished", !form.isPublished)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-2 ${
                form.isPublished ? "bg-emerald-500" : "bg-slate-300"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${
                  form.isPublished ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
