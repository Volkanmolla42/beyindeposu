import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight } from "lucide-react";
import HeroBanner from "@/components/ui/HeroBanner";
import SupportCta from "@/components/SupportCta";
import ArticleRenderer from "@/components/blog/ArticleRenderer";
import type { BlogDetail, BlogRelatedCard } from "@/lib/blog-data";
import { calculateReadTime } from "@/lib/utils";

const dateFormatter = new Intl.DateTimeFormat("tr-TR", {
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: "Europe/Istanbul",
});

interface BlogArticleProps {
  blog: BlogDetail;
  relatedBlogs: BlogRelatedCard[];
}

export default function BlogArticle({ blog, relatedBlogs }: BlogArticleProps) {
  const { title, excerpt, content, coverImage, category, tags, createdAt, updatedAt } =
    blog;

  const dateStr = dateFormatter.format(new Date(createdAt));
  const updatedStr = dateFormatter.format(new Date(updatedAt));
  const showUpdated = updatedAt > createdAt + 86_400_000;

  return (
    <article className="min-h-screen bg-slate-50 text-slate-900 pb-20">
      <HeroBanner
        src={coverImage}
        alt={title}
        eyebrow={category}
        title={title}
        description={excerpt}
      />

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 sm:pt-10">
        <div className="mb-8 flex flex-wrap items-center gap-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
          <time dateTime={new Date(createdAt).toISOString()}>
            {dateStr.toLocaleUpperCase("tr-TR")}
          </time>
          <span className="text-slate-400">•</span>
          <span>{calculateReadTime(content).toLocaleUpperCase("tr-TR")} OKUMA</span>
          <span className="text-slate-400">•</span>
          <span>YAZAR: BEYİN DEPOSU TEKNİK EKİBİ</span>
          {showUpdated && (
            <>
              <span className="text-slate-400">•</span>
              <time dateTime={new Date(updatedAt).toISOString()}>
                GÜNCELLENDİ {updatedStr.toLocaleUpperCase("tr-TR")}
              </time>
            </>
          )}
        </div>
        <ArticleRenderer content={content} />

        <div className="my-10 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200/80 shadow-xs flex items-center gap-4 sm:gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-slate-950 font-bold text-base sm:text-lg shrink-0 shadow-md">
            BD
          </div>
          <div className="flex-1 min-w-0">
            <span className="text-3xs font-bold text-amber-600 uppercase tracking-wider block mb-0.5">
              Yazar
            </span>
            <h4 className="text-sm sm:text-base font-bold text-slate-900 truncate">
              Beyin Deposu Teknik Ekibi
            </h4>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
              Oto beyin (ECU), ABS beyni, mekatronik ve otomotiv elektronik
              kontrol sistemleri teşhis, yazılım ve laboratuvar onarım servisi.
            </p>
          </div>
        </div>

        <SupportCta />

        {tags && tags.length > 0 && (
          <div className="pt-6 border-t border-slate-200">
            <span className="text-xs font-semibold text-slate-500 block mb-2">
              Etiketler:
            </span>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="px-3 py-1 rounded-lg bg-slate-200/80 text-slate-700 text-xs font-medium"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8 pt-6 border-t border-slate-200">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 text-sm font-semibold text-slate-700 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Tüm Blog Yazılarına Dön</span>
          </Link>
        </div>
      </div>

      {relatedBlogs.length > 0 && (
        <section className="mt-16 pt-12 border-t border-slate-200 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <h3 className="text-xl sm:text-2xl font-bold text-slate-900 mb-8">
              Diğer Blog Yazıları
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {relatedBlogs.map((item) => (
                <Link
                  key={item.slug}
                  href={`/blog/${item.slug}`}
                  className="bg-slate-50 border border-slate-200 rounded-2xl overflow-hidden hover:border-slate-300 hover:shadow-md transition-all group flex flex-col"
                >
                  <div className="relative aspect-[16/10] w-full bg-slate-950">
                    <Image
                      src={item.coverImage}
                      alt={item.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-300"
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <span className="text-3xs font-semibold text-amber-600 block mb-1.5">
                        {item.category}
                      </span>
                      <h4 className="font-bold text-slate-900 text-base line-clamp-2 group-hover:text-amber-600 transition-colors">
                        {item.title}
                      </h4>
                    </div>
                    <span className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-slate-900 group-hover:text-amber-600">
                      <span>İncele</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </article>
  );
}
