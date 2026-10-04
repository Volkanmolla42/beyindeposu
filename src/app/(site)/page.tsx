import { Suspense } from "react";
import type { Metadata } from "next";
import Image, { getImageProps } from "next/image";
import Link from "next/link";
import { ArrowRight, Cpu, Layers } from "lucide-react";
import OemSearchBar from "@/components/OemSearchBar";
import { getPublicCategories, getPublicBrands } from "@/lib/seo-data";
import ConvexAuthIsland from "@/app/ConvexAuthIsland";
import {
  createPageMetadata,
  serializeJsonLd,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TITLE,
  SITE_URL,
} from "@/lib/seo";


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
  const result: T[] = [];
  for (let i = 0; i < repeatCount; i++) {
    result.push(...items);
  }
  return result;
}

function HeroSection() {
  const imageProps = {
    alt: "",
    sizes: "100vw",
    quality: 75,
    fetchPriority: "high" as const,
  };
  const {
    props: { srcSet: desktopSrcSet },
  } = getImageProps({
    ...imageProps,
    src: "/images/hero.webp",
    width: 1672,
    height: 941,
  });
  const {
    props: { srcSet: mobileSrcSet, ...mobileImageProps },
  } = getImageProps({
    ...imageProps,
    src: "/images/home-hero-mobile.webp",
    width: 941,
    height: 1672,
  });

  return (
    <section className="relative isolate flex min-h-[calc(100svh-76px)] flex-col overflow-hidden bg-slate-100 text-slate-900">
      <picture className="absolute inset-0 z-0 block">
        <source media="(min-width: 640px)" srcSet={desktopSrcSet} sizes="100vw" />
        <source media="(max-width: 639px)" srcSet={mobileSrcSet} sizes="100vw" />
        <img
          {...mobileImageProps}
          alt=""
          loading="eager"
          className="absolute inset-0 h-full w-full object-cover object-right sm:object-left"
        />
      </picture>

      <div className="relative z-20 mx-auto flex w-full max-w-[1680px] flex-col justify-start px-4 py-8 sm:flex-1 sm:justify-center sm:px-6 sm:py-12 lg:px-8">
        <div className="max-w-xl">
          <h1 className="max-w-xl text-4xl font-medium leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
            Aracınızın beyni <span className="text-blue-700">bizde</span>
          </h1>

          <div className="mt-8 max-w-lg">
            <Suspense fallback={<div className="h-14 animate-pulse rounded-full border border-slate-300 bg-white shadow-sm" aria-hidden="true" />}>
              <ConvexAuthIsland>
                <OemSearchBar variant="hero" />
              </ConvexAuthIsland>
            </Suspense>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section className="container pb-12 pt-8 sm:pb-16">
      <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 md:grid-cols-4">
        {[
          ["15.000+", "Stoklu parça"],
          ["32+", "Araç markası"],
          ["1.000+", "ECU modeli"],
          ["20+", "Yıllık tecrübe"],
        ].map(([value, label]) => (
          <div key={label} className="bg-white px-4 py-6 text-center sm:px-6 sm:py-8">
            <div className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">{value}</div>
            <div className="mt-1 text-sm text-slate-600">{label}</div>
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
    <section className="container py-12 sm:py-16">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
          Kategoriler
        </h2>
        <Link
          href="/parcalar"
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
        >
          Tüm parçalar
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category._id || category.slug}
            href={`/parcalar?kategori=${encodeURIComponent(category.slug)}`}
            className="group flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50 sm:gap-4 sm:p-4"
          >
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-16 sm:w-16">
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
                <Cpu className="h-7 w-7 text-blue-700" aria-hidden="true" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-medium leading-5 text-slate-800 group-hover:text-blue-800">
                {category.name}
              </h3>
            </div>
            <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" aria-hidden="true" />
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
          <h2 className="text-xl font-medium tracking-tight text-slate-900 sm:text-2xl">
            Araç markaları
          </h2>
          <Link
            href="/markalar"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Tüm markalar
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
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
                          className="group inline-flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
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
      <StatsSection />

      <Suspense fallback={<CategoriesSkeleton />}>
        <CategoriesSection />
      </Suspense>

      <Suspense fallback={<BrandsSkeleton />}>
        <BrandsSection />
      </Suspense>
    </>
  );
}
