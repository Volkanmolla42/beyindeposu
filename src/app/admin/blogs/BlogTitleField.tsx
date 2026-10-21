"use client";

import { Input } from "@/components/ui/input";
import { BLOG_LABEL, BLOG_PANEL } from "./blog-editor-shared";

interface BlogTitleFieldProps {
  title: string;
  slug: string;
  onTitleChange: (value: string) => void;
}

export default function BlogTitleField({
  title,
  slug,
  onTitleChange,
}: BlogTitleFieldProps) {
  return (
    <section className={`${BLOG_PANEL} p-5`}>
      <label htmlFor="blog-title" className={BLOG_LABEL}>
        Başlık
      </label>
      <Input
        id="blog-title"
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        placeholder="Makale başlığı"
        aria-required="true"
        className="mt-2 h-11 text-base font-semibold focus-visible:border-amber-400 focus-visible:ring-amber-200"
      />

      <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-[11px]">
        <span className="font-medium text-slate-500">URL önizlemesi</span>
        <span className="min-w-0 truncate rounded-md border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-amber-800">
          /blog/{slug || "yazi-basligi"}
        </span>
      </div>
    </section>
  );
}
