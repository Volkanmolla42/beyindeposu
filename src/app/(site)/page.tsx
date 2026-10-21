import { Suspense } from "react";
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import HeroBanner from "@/components/ui/HeroBanner";
import {
  ArrowRight,
  Cpu,
  Layers,
  ShieldCheck,
  Wrench,
  Clock,
  CheckCircle2,
} from "lucide-react";
import ProblemCta from "@/components/ProblemCta";
import OemSearchBar from "@/components/OemSearchBar";
import { getPublicCategories, getPublicBrands } from "@/lib/seo-data";
import {
  createPageMetadata,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/seo";

export const revalidate = 300;

export const metadata: Metadata = {
  ...createPageMetadata({
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    path: "/",
  }),
  title: {
    absolute: SITE_TITLE,
  },
};

const WEBSITE_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  potentialAction: {
    "@type": "SearchAction",
    target: `${SITE_URL}/parcalar?q={search_term_string}`,
    "query-input": "required name=search_term_string",
  },
};

function getRepeatedBrands<T>(items: T[], minCount = 28): T[] {
  if (items.length === 0) return [];
  const repeatCount = Math.max(1, Math.ceil(minCount / items.length));
  return Array.from({ length: repeatCount }, () => items).flat();
}

function HeroSection() {
  return (
    <HeroBanner
      src="/images/hero-rebrand.jpg"
      alt="Beyin Deposu ECU ve Oto Elektronik Servisi"
      size="full"
      eyebrow=""
      title="Aracınızın Beyni Bizde"
      description="Aracınızın tüm mekanik ve elektronik ihtiyaçları için profesyonel test, tamir, kodlama ve garantili parça çözümleri sunuyoruz."
      actions={
        <>
          <div className="w-full max-w-2xl">
            <Suspense fallback={<div className="h-14 animate-pulse rounded-2xl border border-white/20 bg-white/10 shadow-sm" aria-hidden="true" />}>
              <OemSearchBar variant="hero" />
            </Suspense>
          </div>
          <Button asChild variant="default" size="lg">
            <Link href="/parcalar">
              Parçaları İncele
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="darkOutline" size="lg">
            <Link href="/hakkimizda">Hizmetlerimiz ve İletişim</Link>
          </Button>
        </>
      }
    />
  );
}

function BenefitStrip() {
  const benefits = [
    {
      icon: ShieldCheck,
      title: "Uzman Kadro",
      description: "Deneyimli teknisyenler",
    },
    {
      icon: Wrench,
      title: "Orijinal Ekipman",
      description: "Profesyonel test cihazları",
    },
    {
      icon: Clock,
      title: "Hızlı Çözüm",
      description: "Zamanında teslimat",
    },
    {
      icon: CheckCircle2,
      title: "Güvenilir Hizmet",
      description: "Garantili onarım & parça",
    },
  ];

  return (
    <section className="border-b border-slate-200 bg-white py-6 shadow-xs">
      <div className="container">
        <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
          {benefits.map((b, i) => (
            <div key={i} className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-50 text-amber-600">
                <b.icon className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-slate-900">{b.title}</h4>
                <p className="truncate text-xs text-slate-500">{b.description}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="container py-12 sm:py-16">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 md:grid-cols-4">
        {[
          ["15.000+", "Stoklu parça"],
          ["32+", "Araç markası"],
          ["1.000+", "ECU modeli"],
          ["20+", "Yıllık tecrübe"],
        ].map(([value, label]) => (
          <div key={label} className="bg-white px-4 py-6 text-center sm:px-6 sm:py-8">
            <div className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">{value}</div>
            <div className="mt-1 text-sm font-medium text-slate-600">{label}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function CategoriesSkeleton() {
  return (
    <section className="container py-12 sm:py-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div className="h-8 w-40 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-8 w-28 animate-pulse rounded-full bg-slate-200" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex min-h-24 animate-pulse items-center gap-3 rounded-2xl border border-slate-200 bg-slate-100 p-3 sm:p-4">
            <div className="h-14 w-14 rounded-xl bg-slate-200 sm:h-16 sm:w-16" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-3/4 rounded bg-slate-200" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

async function CategoriesSection() {
  const categories = await getPublicCategories();

  if (!categories || categories.length === 0) return null;

  return (
    <section className="container pb-14 sm:pb-20">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Hizmet & Parça Kategorileri
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Aracınızın tüm sistemleri için kapsamlı parça, tamir ve kodlama çözümleri.
          </p>
        </div>
        <Link
          href="/parcalar"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-2xs transition-colors hover:border-amber-400 hover:text-amber-600"
        >
          Tüm parçalar
          <ArrowRight className="h-4 w-4 text-amber-500" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category._id || category.slug}
            href={`/parcalar?kategori=${encodeURIComponent(category.slug)}`}
            className="group flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-amber-400 hover:shadow-md sm:gap-4 sm:p-4"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-100 transition-colors group-hover:border-amber-200 sm:h-16 sm:w-16">
              {category.image ? (
                <div className="relative h-full w-full">
                  <Image
                    src={category.image}
                    alt=""
                    fill
                    sizes="64px"
                    className="object-contain p-1"
                  />
                </div>
              ) : (
                <Cpu className="h-7 w-7 text-amber-500" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-semibold leading-5 text-slate-900 transition-colors group-hover:text-amber-700">
                {category.name}
              </h3>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500" aria-hidden="true" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function BrandsSkeleton() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="container py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <div className="h-6 w-36 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-28 animate-pulse rounded-full bg-slate-200" />
        </div>
        <div className="h-10 w-full animate-pulse rounded-full bg-slate-100" />
      </div>
    </section>
  );
}

async function BrandsSection() {
  const brands = await getPublicBrands();

  if (!brands || brands.length === 0) return null;

  const brandSplitIndex = Math.ceil(brands.length / 2);
  const brandRows = [
    brands.slice(0, brandSplitIndex),
    brands.slice(brandSplitIndex),
  ].filter((row) => row.length > 0);

  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="container py-10">
        <div className="mb-5 flex items-center justify-between gap-4">
          <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Araç Markaları
          </h2>
          <Link
            href="/markalar"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-semibold text-slate-700 transition-colors hover:text-amber-600"
          >
            Tüm markalar
            <ArrowRight className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </Link>
        </div>
        <div className="space-y-3">
          {brandRows.map((row, rowIndex) => {
            const repeatedBrands = getRepeatedBrands(row, 28);
            return (
              <div className="brand-marquee" key={rowIndex}>
                <div
                  className={`brand-marquee__track ${rowIndex === 0 ? "brand-marquee__track--right" : ""}`}
                >
                  {[false, true].map((isDuplicate) => (
                    <div
                      key={String(isDuplicate)}
                      className="flex w-max shrink-0 items-center gap-2 pr-2"
                      aria-hidden={isDuplicate}
                    >
                      {repeatedBrands.map((brand, itemIndex) => (
                        <Link
                          key={`${isDuplicate ? "dup" : "orig"}-${rowIndex}-${itemIndex}-${brand._id}`}
                          href={`/parcalar?marka=${encodeURIComponent(brand.name)}`}
                          tabIndex={isDuplicate ? -1 : undefined}
                          className="group inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-amber-400 hover:text-amber-800"
                        >
                          {brand.logoUrl ? (
                            <Image
                              src={brand.logoUrl}
                              alt=""
                              width={28}
                              height={28}
                              className="h-7 w-7 object-contain transition-transform duration-200 group-hover:scale-105"
                            />
                          ) : (
                            <Layers className="h-5 w-5 text-slate-500" aria-hidden="true" />
                          )}
                          {brand.name}
                        </Link>
                      ))}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(WEBSITE_JSON_LD) }}
      />

      <HeroSection />
      <BenefitStrip />
      <StatsSection />

      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesSection />
      </Suspense>

      <Suspense fallback={<BrandsSkeleton />}>
        <BrandsSection />
      </Suspense>

      <section className="container py-14 sm:py-20">
        <ProblemCta />
      </section>
    </>
  );
}
