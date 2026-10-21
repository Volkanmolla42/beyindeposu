"use client";

import { BLOG_HINT, BLOG_LABEL, BLOG_PANEL } from "./blog-editor-shared";

interface BlogExcerptFieldProps {
  excerpt: string;
  onExcerptChange: (value: string) => void;
}

export default function BlogExcerptField({
  excerpt,
  onExcerptChange,
}: BlogExcerptFieldProps) {
  return (
    <section className={`${BLOG_PANEL} p-5`}>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <label htmlFor="blog-excerpt" className={BLOG_LABEL}>
          Özet
        </label>
        <span className={BLOG_HINT}>
          Kartlarda ve arama sonuçlarında görünür
        </span>
      </div>
      <textarea
        id="blog-excerpt"
        value={excerpt}
        onChange={(e) => onExcerptChange(e.target.value)}
        rows={4}
        placeholder="Yazının kısa özeti..."
        aria-required="true"
        className="mt-2 w-full resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
      />
    </section>
  );
}
