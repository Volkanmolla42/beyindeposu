"use client";

import Image from "next/image";
import Link from "next/link";
import { Clock, Edit2, ExternalLink, Trash2 } from "lucide-react";
import { calculateReadTime } from "@/lib/utils";
import type { Blog } from "./blog-editor-shared";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

interface BlogListRowProps {
  blog: Blog;
  busy?: boolean;
  onTogglePublish: () => void;
  onDelete: () => void;
}

export default function BlogListRow({
  blog,
  busy = false,
  onTogglePublish,
  onDelete,
}: BlogListRowProps) {
  const editHref = `/admin/blogs/addoredit?slug=${encodeURIComponent(blog.slug)}`;

  return (
    <article
      aria-busy={busy}
      className="group flex flex-wrap items-start gap-3 px-4 py-4 transition-colors hover:bg-slate-50/70 sm:flex-nowrap sm:items-center sm:px-5"
    >
      <div className="relative h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
        <Image
          src={blog.coverImage}
          alt=""
          fill
          className="object-cover"
          sizes="64px"
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <Link
            href={editHref}
            className="line-clamp-1 text-sm font-semibold text-slate-900 transition-colors group-hover:text-amber-700"
          >
            {blog.title}
          </Link>
          <button
            type="button"
            onClick={onTogglePublish}
            disabled={busy}
            title={blog.isPublished ? "Yayından kaldır" : "Yayına al"}
            aria-label={`${blog.title}: ${
              blog.isPublished ? "yayından kaldır" : "yayına al"
            }`}
            className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
              blog.isPublished
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-200 bg-slate-50 text-slate-500 hover:bg-slate-100"
            }`}
          >
            {blog.isPublished ? "Yayında" : "Taslak"}
          </button>
        </div>

        <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">
          {blog.excerpt}
        </p>

        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-400">
          {blog.category && (
            <span className="font-medium text-slate-500">{blog.category}</span>
          )}
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {calculateReadTime(blog.content)}
          </span>
          <span>Güncellendi {dateFormatter.format(new Date(blog.updatedAt))}</span>
        </div>
      </div>

      <div className="flex w-full shrink-0 items-center justify-end gap-0.5 sm:w-auto">
        {blog.isPublished && (
          <a
            href={`/blog/${blog.slug}`}
            target="_blank"
            rel="noreferrer"
            title="Sitede görüntüle"
            aria-label={`${blog.title} yazısını sitede görüntüle`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        )}
        <Link
          href={editHref}
          title="Düzenle"
          aria-label={`${blog.title} yazısını düzenle`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-700"
        >
          <Edit2 className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={onDelete}
          disabled={busy}
          title="Sil"
          aria-label={`${blog.title} yazısını sil`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>
    </article>
  );
}
