import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, Cpu, Search } from "lucide-react";
import {
  buildFaqJsonLd,
  createPageMetadata,
  metadataDescription,
  plainText,
  serializeJsonLd,
  SITE_NAME,
} from "@/lib/seo";
import { getPublicCategories, getPublicCategoryBySlug } from "@/lib/seo-data";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  try {
    const categories = await getPublicCategories();
    return (categories ?? []).map((cat) => ({ slug: cat.slug }));
  } catch {
    return [];
  }
}

type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

function getCategoryDescription(category: {
  name: string;
  description?: string;
  metaDescription?: string;
}) {
  const description = plainText(category.metaDescription?.trim() || category.description || "");
  return metadataDescription(
    description || `${category.name} kategorisindeki oto elektronik parçalarını inceleyin.`,
  );
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (!category) notFound();

  const title = category.metaTitle?.trim() || `${category.name} | ${SITE_NAME}`;
  const path = `/kategoriler/${category.slug}`;

  return {
    ...createPageMetadata({
      title,
      description: getCategoryDescription(category),
      path,
    }),
    title: { absolute: title },
    robots: category.isActive !== false
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getPublicCategoryBySlug(slug);

  if (!category) notFound();

  const description = plainText(category.description || "");
  const filterCatalogHref = `/parcalar?kategori=${encodeURIComponent(category.slug)}`;
  const faqs = category.faqs ?? [];
  const faqJsonLd = buildFaqJsonLd(faqs);

  return (
    <div className="bg-slate-50 py-6 sm:py-10">
      {faqJsonLd ? (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      ) : null}

      <div className="container space-y-6">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-xs text-slate-500 sm:text-sm">
          <Link href="/" className="transition-colors hover:text-amber-600">
            Ana Sayfa
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <Link href="/kategoriler" className="transition-colors hover:text-amber-600">
            Kategoriler
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-800" aria-current="page">
            {category.name}
          </span>
        </nav>

        {/* Category Details Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-start md:gap-8">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:h-24 sm:w-24 sm:p-4">
              {category.image ? (
                <Image
                  src={category.image}
                  alt={`${category.name} görseli`}
                  width={80}
                  height={80}
                  priority
                  className="h-full w-full object-contain"
                />
              ) : (
                <Cpu className="h-8 w-8 text-amber-500" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-3">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {category.name}
              </h1>

              {description && (
                <p className="max-w-3xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  {description}
                </p>
              )}

              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Button
                  asChild
                  className="h-10 rounded-full bg-amber-500 px-5 text-sm font-semibold text-slate-950 shadow-xs hover:bg-amber-400 transition-colors"
                >
                  <Link href={filterCatalogHref}>
                    <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                    Tüm {category.name} Parçalarını İncele
                  </Link>
                </Button>

                <Button
                  asChild
                  variant="outline"
                  className="h-10 rounded-full border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
                >
                  <Link href="/kategoriler">
                    Tüm Kategoriler
                    <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Category Rich Content (Markdown) */}
        {category.content ? (
          <section
            aria-labelledby="category-guide-title"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10"
          >
            <h2 id="category-guide-title" className="sr-only">
              {category.name} Teknik Rehber ve Parça Bilgisi
            </h2>
            <div className="prose prose-slate max-w-none">
              <MarkdownRenderer content={category.content} />
            </div>
          </section>
        ) : null}

        {/* FAQ Section */}
        <FaqAccordion
          items={faqs}
          title={`${category.name} Hakkında Sıkça Sorulan Sorular`}
          subtitle="Merak Edilenler"
          id="category-faq-title"
        />
      </div>
    </div>
  );
}
