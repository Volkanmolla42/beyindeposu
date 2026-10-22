import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ChevronRight, Cpu, Search } from "lucide-react";
import { createPageMetadata, SITE_NAME } from "@/lib/seo";
import { getPublicBrandBySlug, getPublicBrands } from "@/lib/seo-data";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { FaqAccordion } from "@/components/FaqAccordion";
import { buildFaqJsonLd, serializeJsonLd } from "@/lib/seo";
import { Button } from "@/components/ui/button";

export async function generateStaticParams() {
  try {
    const brands = await getPublicBrands();
    return (brands ?? []).map((brand) => ({ slug: brand.slug }));
  } catch {
    return [];
  }
}

type BrandPageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const brand = await getPublicBrandBySlug(slug);

  if (!brand) notFound();

  const title = brand.metaTitle?.trim() || `${brand.name} Beyin ve Oto Elektronik | ${SITE_NAME}`;
  const description =
    brand.metaDescription?.trim() ||
    `${brand.name} araçlarına ait motor beyni (ECU), şanzıman beyni (TCU) ve oto elektronik kontrol üniteleri.`;
  const path = `/markalar/${brand.slug}`;

  return {
    ...createPageMetadata({
      title,
      description,
      path,
    }),
    title: { absolute: title },
    robots: brand.isActive !== false
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const brand = await getPublicBrandBySlug(slug);

  if (!brand) notFound();

  const filterCatalogHref = `/parcalar?marka=${encodeURIComponent(brand.name)}`;
  const faqs = brand.faqs ?? [];
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
          <Link href="/markalar" className="transition-colors hover:text-amber-600">
            Araç Markaları
          </Link>
          <ChevronRight className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
          <span className="font-semibold text-slate-800" aria-current="page">
            {brand.name}
          </span>
        </nav>

        {/* Brand Header Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-5 sm:gap-6">
              <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-100 bg-slate-50 p-3 sm:h-24 sm:w-24 sm:p-4">
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt={`${brand.name} logosu`}
                    width={80}
                    height={80}
                    priority
                    className="h-full w-full object-contain"
                  />
                ) : (
                  <Cpu className="h-8 w-8 text-amber-500" aria-hidden="true" />
                )}
              </div>

              <div className="min-w-0 space-y-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-amber-600">
                  Oto Elektronik Kontrol Üniteleri
                </span>
                <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                  {brand.name}
                </h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                asChild
                className="h-10 rounded-full bg-amber-500 px-5 text-sm font-semibold text-slate-950 shadow-xs hover:bg-amber-400 transition-colors"
              >
                <Link href={filterCatalogHref}>
                  <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                  {brand.name} Parçalarını İncele
                </Link>
              </Button>

              <Button
                asChild
                variant="outline"
                className="h-10 rounded-full border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
              >
                <Link href="/markalar">
                  Tüm Markalar
                  <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {/* Brand Rich Content (Markdown) */}
        {brand.content ? (
          <section
            aria-labelledby="brand-guide-title"
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs sm:p-10"
          >
            <h2 id="brand-guide-title" className="sr-only">
              {brand.name} Teknik Rehber ve Elektronik Sistem Bilgisi
            </h2>
            <div className="prose prose-slate max-w-none">
              <MarkdownRenderer content={brand.content} />
            </div>
          </section>
        ) : null}

        {/* FAQ Section */}
        <FaqAccordion
          items={faqs}
          title={`${brand.name} Elektronik Üniteleri Hakkında Sıkça Sorulan Sorular`}
          subtitle="Merak Edilenler"
          id="brand-faq-title"
        />
      </div>
    </div>
  );
}
