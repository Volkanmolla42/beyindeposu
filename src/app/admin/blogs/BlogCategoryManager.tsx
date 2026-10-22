"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import {
  AlertTriangle,
  Check,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { triggerRevalidate } from "@/lib/revalidate";
import { toErrorMessage } from "./blog-editor-shared";

interface BlogCategoryManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRenamed?: (oldTitle: string, newTitle: string) => void;
  onDeleted?: (title: string) => void;
}

export default function BlogCategoryManager({
  open,
  onOpenChange,
  onRenamed,
  onDeleted,
}: BlogCategoryManagerProps) {
  const categories = useQuery(
    api.blogCategories.listWithCounts,
    open ? {} : "skip",
  );
  const createCategory = useMutation(api.blogCategories.create);
  const updateCategory = useMutation(api.blogCategories.update);
  const deleteCategory = useMutation(api.blogCategories.deleteCategory);

  const [newTitle, setNewTitle] = useState("");
  const [editingId, setEditingId] = useState<Id<"blogCategories"> | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setEditingId(null);
      setEditingTitle("");
      setNewTitle("");
      setError("");
    }
    onOpenChange(next);
  };

  const handleCreate = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTitle.trim();
    if (!title || pending) return;

    setPending(true);
    setError("");
    try {
      await createCategory({ title });
      setNewTitle("");
      void triggerRevalidate("/blog");
    } catch (err) {
      setError(toErrorMessage(err, "Kategori eklenemedi."));
    } finally {
      setPending(false);
    }
  };

  const handleRename = async (
    id: Id<"blogCategories">,
    currentTitle: string,
  ) => {
    const title = editingTitle.trim();
    if (!title || pending) return;
    if (title === currentTitle) {
      setEditingId(null);
      return;
    }

    setPending(true);
    setError("");
    try {
      const result = await updateCategory({ id, title });
      onRenamed?.(currentTitle, title);
      setEditingId(null);
      void triggerRevalidate([
        "/blog",
        ...result.affectedSlugs.map((slug) => `/blog/${slug}`),
      ]);
    } catch (err) {
      setError(toErrorMessage(err, "Kategori güncellenemedi."));
    } finally {
      setPending(false);
    }
  };

  const handleDelete = async (
    id: Id<"blogCategories">,
    title: string,
    blogCount: number,
  ) => {
    if (pending) return;
    if (blogCount > 0) {
      setError(
        `"${title}" kategorisine bağlı ${blogCount} blog yazısı var. Silmek için önce yazıları başka bir kategoriye taşıyın.`,
      );
      return;
    }
    if (!confirm(`"${title}" kategorisini silmek istediğinize emin misiniz?`)) {
      return;
    }

    setPending(true);
    setError("");
    try {
      await deleteCategory({ id });
      onDeleted?.(title);
      void triggerRevalidate("/blog");
    } catch (err) {
      setError(toErrorMessage(err, "Kategori silinemedi."));
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl p-6">
        <DialogHeader>
          <DialogTitle>Blog Kategorileri</DialogTitle>
          <DialogDescription>
            Kategori ekleyin, yeniden adlandırın veya silin. Bağlı blog yazısı
            olan kategoriler silinemez.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleCreate} className="flex items-center gap-2">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Yeni kategori adı"
            aria-label="Yeni kategori adı"
            disabled={pending}
            className="h-10 rounded-xl border-slate-300 text-sm focus-visible:border-amber-400 focus-visible:ring-amber-200"
          />
          <Button
            type="submit"
            size="sm"
            disabled={!newTitle.trim() || pending}
            className="h-10 shrink-0 rounded-xl"
          >
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            Ekle
          </Button>
        </form>

        {error && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800"
          >
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
            <p>{error}</p>
          </div>
        )}

        {categories === undefined ? (
          <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
            <Loader2 className="h-4 w-4 animate-spin" />
            Kategoriler yükleniyor...
          </div>
        ) : categories.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500">
            Henüz kategori yok. Yukarıdan ekleyin.
          </p>
        ) : (
          <ul className="max-h-[45vh] space-y-1.5 overflow-y-auto pr-1">
            {categories.map((category) => (
              <li
                key={category._id}
                className="rounded-xl border border-slate-200 bg-white"
              >
                {editingId === category._id ? (
                  <div className="flex items-center gap-1.5 p-2">
                    <Input
                      autoFocus
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      aria-label={`${category.title} kategorisinin yeni adı`}
                      disabled={pending}
                      className="h-9 rounded-lg border-slate-300 text-sm focus-visible:border-amber-400 focus-visible:ring-amber-200"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          void handleRename(category._id, category.title);
                        } else if (e.key === "Escape") {
                          setEditingId(null);
                        }
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => void handleRename(category._id, category.title)}
                      disabled={pending || !editingTitle.trim()}
                      aria-label="Kategori adını kaydet"
                      className="rounded-lg p-2 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      disabled={pending}
                      aria-label="Düzenlemeyi iptal et"
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 px-3 py-2">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">
                        {category.title}
                      </p>
                      <p className="text-xs text-slate-500">
                        {category.blogCount > 0
                          ? `${category.blogCount} yazı`
                          : "Bağlı yazı yok"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingId(category._id);
                        setEditingTitle(category.title);
                        setError("");
                      }}
                      disabled={pending}
                      aria-label={`${category.title} kategorisini yeniden adlandır`}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        void handleDelete(
                          category._id,
                          category.title,
                          category.blogCount,
                        )
                      }
                      disabled={pending}
                      aria-label={`${category.title} kategorisini sil`}
                      className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
