import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Clock } from "lucide-react";
import type { BlogCard } from "@/lib/blog-data";
import { Badge } from "@/components/ui/badge";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

export default function BlogCardItem({ blog }: { blog: BlogCard }) {
  return (
    <article className="bg-white rounded-2xl overflow-hidden border border-slate-200/80 shadow-xs hover:shadow-md hover:border-slate-300 transition-all duration-300 flex flex-col group">
      <Link
        href={`/blog/${blog.slug}`}
        className="relative aspect-[16/10] w-full bg-slate-900 overflow-hidden block"
      >
        <Image
          src={blog.coverImage}
          alt={blog.title}
          fill
          className="object-cover group-hover:scale-105 transition-transform duration-500"
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
        />
        <div className="absolute inset-0 bg-slate-950/10 group-hover:bg-transparent transition-colors" />
      </Link>

      <div className="p-6 flex-1 flex flex-col justify-between">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2 leading-snug">
            <Link href={`/blog/${blog.slug}`}>{blog.title}</Link>
          </h2>

          <p className="mt-3 text-xs sm:text-sm text-slate-600 line-clamp-3 leading-relaxed">
            {blog.excerpt}
          </p>

          <Link
            href={`/blog/${blog.slug}`}
            className="inline-flex items-center gap-1.5 mt-4 text-xs sm:text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors"
          >
            <span>Devamını Oku</span>
            <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        <div className="pt-5 mt-5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <time dateTime={new Date(blog.createdAt).toISOString()}>
              {dateFormatter.format(new Date(blog.createdAt))}
            </time>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3 text-slate-400" />
              {blog.readTime}
            </span>
          </div>

          <Badge variant="secondary">{blog.category}</Badge>
        </div>
      </div>
    </article>
  );
}
