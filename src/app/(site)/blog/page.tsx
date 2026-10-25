import { Suspense } from "react";
import type { Metadata } from "next";
import HeroBanner from "@/components/ui/HeroBanner";
import ProblemCta from "@/components/ProblemCta";
import { absoluteUrl, SEO_IMAGE, SITE_NAME } from "@/lib/seo";
import { listBlogCards, listBlogCategories } from "@/lib/blog-data";
import BlogListClient from "./BlogListClient";

const BASE_TITLE = "Kronik Arızalar ve Çözümleri | Beyin Deposu Blog";
const BASE_DESCRIPTION =
  "Oto beyin, mekatronik, şanzıman ve elektronik sistemlerde sık karşılaşılan arızalar, teşhis yöntemleri ve garantili laboratuvar çözümleri.";

export const metadata: Metadata = {
  title: { absolute: BASE_TITLE },
  description: BASE_DESCRIPTION,
  alternates: {
    canonical: "/blog",
    types: { "application/rss+xml": "/blog/rss.xml" },
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    url: absoluteUrl("/blog"),
    title: BASE_TITLE,
    description: BASE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl(SEO_IMAGE),
        width: 1200,
        height: 630,
        alt: "Beyin Deposu Blog",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: BASE_TITLE,
    description: BASE_DESCRIPTION,
    images: [absoluteUrl(SEO_IMAGE)],
  },
};

function BlogListFallback() {
  return (
    <div className="py-12 sm:py-16 bg-slate-50">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="bg-white rounded-2xl p-4 border border-slate-200/80 animate-pulse space-y-4"
            >
              <div className="aspect-[16/10] bg-slate-200 rounded-xl w-full" />
              <div className="h-5 bg-slate-200 rounded-md w-3/4" />
              <div className="h-4 bg-slate-100 rounded-md w-full" />
              <div className="h-4 bg-slate-100 rounded-md w-2/3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default async function BlogPage() {
  const [allBlogs, categories] = await Promise.all([
    listBlogCards(),
    listBlogCategories(),
  ]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <HeroBanner
        src="/images/chronic-faults-hero.jpg"
        alt="Oto Elektronik Uzmanlığı"
        eyebrow="Beyin Deposu Blog"
        title="Kronik Arızalar ve Çözümleri"
        description="Sık karşılaşılan oto elektronik ve mekanik arızaları, belirtilerini ve tamir çözümlerini sizin için derledik."
      />

      <Suspense fallback={<BlogListFallback />}>
        <BlogListClient allBlogs={allBlogs} categories={categories} />
      </Suspense>

      <section className="pb-16 sm:pb-20 bg-slate-50">
        <div className="container">
          <ProblemCta />
        </div>
      </section>
    </div>
  );
}
