import type { Doc, Id } from "@convex/_generated/dataModel";

export type Blog = Doc<"blogs"> & { coverImage: string };

export interface BlogFormData {
  title: string;
  category: string;
  excerpt: string;
  content: string;
  coverImageStorageId: Id<"_storage"> | "";
  coverImage: string;
  tags: string;
  isPublished: boolean;
  faqs: Array<{ question: string; answer: string }>;
}

export type UpdateBlogField = <K extends keyof BlogFormData>(
  key: K,
  value: BlogFormData[K],
) => void;

export const EMPTY_BLOG_FORM: BlogFormData = {
  title: "",
  category: "",
  excerpt: "",
  content: "",
  coverImageStorageId: "",
  coverImage: "",
  tags: "",
  isPublished: true,
  faqs: [],
};

export const BLOG_PANEL = "rounded-2xl border border-slate-200 bg-white shadow-xs";
export const BLOG_LABEL = "text-sm font-semibold text-slate-900";
export const BLOG_HINT = "text-[11px] text-slate-400";
export const BLOG_INPUT =
  "h-10 rounded-xl border-slate-300 text-sm focus-visible:border-amber-400 focus-visible:ring-amber-200";

export function segmentedButtonClass(active: boolean): string {
  return active
    ? "bg-white text-slate-900 shadow-xs"
    : "text-slate-500 hover:text-slate-800";
}

export function formFromBlog(blog: Blog): BlogFormData {
  return {
    title: blog.title,
    category: blog.category,
    excerpt: blog.excerpt,
    content: blog.content,
    coverImageStorageId: blog.coverImageStorageId,
    coverImage: blog.coverImage,
    tags: blog.tags ? blog.tags.join(", ") : "",
    isPublished: blog.isPublished,
    faqs: blog.faqs ?? [],
  };
}

export function parseTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

export function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message && !/fetch|network/i.test(error.message)) {
    return error.message;
  }
  return fallback;
}
