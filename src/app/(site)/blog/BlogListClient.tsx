"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { BookOpen } from "lucide-react";
import type { BlogCard } from "@/lib/blog-data";
import BlogCardItem from "./BlogCardItem";

const ITEMS_PER_PAGE = 12;

export default function BlogListClient({
  allBlogs,
  categories,
}: {
  allBlogs: BlogCard[];
  categories: string[];
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [, startTransition] = useTransition();

  const activeCategory = searchParams.get("kategori") ?? "Tümü";
  const [page, setPage] = useState(1);

  const categoryOptions = ["Tümü", ...categories];

  const filteredBlogs =
    activeCategory === "Tümü"
      ? allBlogs
      : allBlogs.filter((b) => b.category === activeCategory);

  const totalPages = Math.ceil(filteredBlogs.length / ITEMS_PER_PAGE);
  const displayedBlogs = filteredBlogs.slice(0, page * ITEMS_PER_PAGE);

  const handleCategorySelect = (item: string) => {
    setPage(1);
    startTransition(() => {
      if (item === "Tümü") {
        router.push("/blog", { scroll: false });
      } else {
        router.push(`/blog?kategori=${encodeURIComponent(item)}`, { scroll: false });
      }
    });
  };

  return (
    <>
      <section className="py-8 sm:py-10 bg-white border-b border-slate-200">
        <div className="container">
          <div className="flex items-center justify-start sm:justify-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {categoryOptions.map((item) => {
              const isActive = activeCategory === item;
              return (
                <button
                  key={item}
                  type="button"
                  onClick={() => handleCategorySelect(item)}
                  className={`px-5 py-2.5 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                    isActive
                      ? "bg-amber-400 text-slate-950 shadow-xs"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200 hover:text-slate-950 border border-slate-200/80"
                  }`}
                >
                  {item}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className="py-12 sm:py-16 bg-slate-50">
        <div className="container">
          {displayedBlogs.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-slate-200 p-8 max-w-lg mx-auto">
              <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-3">
                <BookOpen className="w-6 h-6" />
              </div>
              <h2 className="text-base font-bold text-slate-900 mb-1">
                Yazı Bulunamadı
              </h2>
              <p className="text-xs text-slate-500">
                {activeCategory !== "Tümü"
                  ? `"${activeCategory}" kategorisinde henüz yayınlanmış yazı bulunmuyor.`
                  : "Henüz yayınlanmış bir blog yazısı bulunmuyor."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
              {displayedBlogs.map((blog) => (
                <BlogCardItem key={blog.slug} blog={blog} />
              ))}
            </div>
          )}

          {page < totalPages && (
            <div className="mt-10 flex items-center justify-center">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className="rounded-full bg-amber-500 px-6 py-2.5 text-sm font-semibold text-slate-950 transition-colors hover:bg-amber-400 cursor-pointer shadow-xs"
              >
                Daha Fazla Göster ({filteredBlogs.length - displayedBlogs.length} yazı)
              </button>
            </div>
          )}
        </div>
      </section>
    </>
  );
}
