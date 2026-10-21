"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertTriangle, BookOpen, Plus, Search, X } from "lucide-react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import AdminPageHeader from "@/components/admin/AdminPageHeader";
import BlogListRow from "./BlogListRow";
import { toErrorMessage } from "./blog-editor-shared";

function filterChipClass(active: boolean) {
  return `rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
    active
      ? "border-amber-300 bg-amber-100 text-amber-950"
      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900"
  }`;
}

function ListSkeleton() {
  return (
    <div className="divide-y divide-slate-100">
      {[0, 1, 2].map((item) => (
        <div key={item} className="flex items-center gap-3 px-4 py-4 sm:px-5">
          <div className="h-12 w-16 shrink-0 rounded-lg bg-slate-100" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-slate-100" />
            <div className="h-3 w-2/3 rounded bg-slate-100" />
          </div>
          <div className="h-8 w-24 rounded-full bg-slate-100" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({
  filtered,
  onReset,
}: {
  filtered: boolean;
  onReset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400">
        <BookOpen className="h-5 w-5" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-slate-900">
        {filtered ? "Eşleşen yazı yok" : "Henüz blog yazısı yok"}
      </h3>
      <p className="mt-1 max-w-sm text-sm text-slate-500">
        {filtered
          ? "Arama veya kategori filtresini değiştirin."
          : "İlk yazınızı oluşturup yayınlayın."}
      </p>
      {filtered ? (
        <Button variant="outline" size="sm" className="mt-4" onClick={onReset}>
          Filtreleri temizle
        </Button>
      ) : (
        <Button asChild size="sm" className="mt-4">
          <Link href="/admin/blogs/addoredit">
            <Plus className="h-3.5 w-3.5" />
            Yeni Blog Ekle
          </Link>
        </Button>
      )}
    </div>
  );
}

export default function AdminBlogsPage() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<Id<"blogs"> | null>(null);
  const [error, setError] = useState("");

  const blogs = useQuery(api.blogs.listAdmin, {
    search: search.trim() || undefined,
  });
  const categoriesData = useQuery(api.blogCategories.list);
  const deleteBlog = useMutation(api.blogs.deleteBlog);
  const togglePublish = useMutation(api.blogs.togglePublish);

  const categoryOptions = Array.from(
    new Set([
      ...(categoriesData ?? []).map((item) => item.title),
      ...(blogs ?? []).map((blog) => blog.category),
      ...(category ? [category] : []),
    ]),
  ).filter(Boolean);

  const filteredBlogs = (blogs ?? []).filter(
    (blog) => category === null || blog.category === category,
  );
  const hasFilters = search.trim() !== "" || category !== null;

  const resetFilters = () => {
    setSearch("");
    setCategory(null);
  };

  const handleTogglePublish = async (id: Id<"blogs">) => {
    if (pendingId) return;
    setPendingId(id);
    setError("");
    try {
      await togglePublish({ id });
    } catch (err) {
      setError(toErrorMessage(err, "Yayın durumu değiştirilemedi."));
    } finally {
      setPendingId(null);
    }
  };

  const handleDelete = async (id: Id<"blogs">, title: string) => {
    if (pendingId) return;
    if (!confirm(`"${title}" yazısını silmek istediğinize emin misiniz?`)) {
      return;
    }

    setPendingId(id);
    setError("");
    try {
      await deleteBlog({ id });
    } catch (err) {
      setError(toErrorMessage(err, "Yazı silinemedi."));
    } finally {
      setPendingId(null);
    }
  };

  return (
    <div className="space-y-5">
      <AdminPageHeader
        title="Blog"
        actions={
          <Button asChild>
            <Link href="/admin/blogs/addoredit">
              <Plus className="h-4 w-4" />
              Yeni Blog Ekle
            </Link>
          </Button>
        }
      />

      {error && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-600" />
          <p>{error}</p>
        </div>
      )}

      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-xs lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Başlık, kategori veya özet ara"
            aria-label="Blog yazılarında ara"
            className="rounded-xl border-slate-300 bg-white pl-9 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus-visible:border-amber-400 focus-visible:ring-amber-200"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              aria-label="Aramayı temizle"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory(null)}
            className={filterChipClass(category === null)}
          >
            Tümü
          </button>
          {categoryOptions.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setCategory(item)}
              className={filterChipClass(category === item)}
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        {blogs === undefined ? (
          <ListSkeleton />
        ) : filteredBlogs.length === 0 ? (
          <EmptyState filtered={hasFilters} onReset={resetFilters} />
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredBlogs.map((blog) => (
              <BlogListRow
                key={blog._id}
                blog={blog}
                busy={pendingId === blog._id}
                onTogglePublish={() => void handleTogglePublish(blog._id)}
                onDelete={() => void handleDelete(blog._id, blog.title)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
