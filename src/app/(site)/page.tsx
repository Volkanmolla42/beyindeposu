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
import TrustBadgeStrip from "@/components/TrustBadgeStrip";
import { getPublicCategories, getPublicBrands } from "@/lib/seo-data";
import { listPublicServices } from "@/lib/services-data";
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
          <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:items-center">
            <Button asChild variant="default" size="lg" className="px-4 text-sm sm:px-7 sm:text-base">
              <Link href="/parcalar">
                Parçaları İncele
                <ArrowRight className="hidden h-4 w-4 sm:block" aria-hidden="true" />
              </Link>
            </Button>
            <Button asChild variant="darkOutline" size="lg" className="px-4 text-sm sm:px-7 sm:text-base">
              <Link href="/tamirveservis">Tamir & Servis</Link>
            </Button>
          </div>
        </>
      }
    />
  );
}

const homeBenefits = [
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

function CardGridSkeleton() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="grid min-h-24 animate-pulse grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-2xl border border-slate-200 bg-slate-100 p-3 sm:flex sm:gap-4 sm:p-4">
          <div className="col-start-1 row-start-1 h-14 w-14 rounded-xl bg-slate-200 sm:h-16 sm:w-16" />
          <div className="col-span-2 row-start-2 h-4 w-3/4 rounded bg-slate-200 sm:col-span-1 sm:flex-1" />
          <div className="col-start-2 row-start-1 h-4 w-4 rounded bg-slate-200" />
        </div>
      ))}
    </div>
  );
}

function SectionCardsSkeleton() {
  return (
    <section className="container pb-14 sm:pb-20" aria-hidden="true">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div className="h-8 w-44 animate-pulse rounded-lg bg-slate-200" />
        <div className="h-9 w-28 animate-pulse rounded-full bg-slate-200" />
      </div>
      <CardGridSkeleton />
    </section>
  );
}

async function ServicesSection() {
  const services = await listPublicServices();

  if (!services || services.length === 0) return null;

  return (
    <section className="container pb-14 sm:pb-20">
      <div className="mb-8 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            Hizmetlerimiz
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Aracınızın elektronik ve mekanik sistemleri için profesyonel tamir ve servis hizmetleri.
          </p>
        </div>

      </div>


      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {services.slice(0, 8).map((service) => (
          <Link
            key={service.slug}
            href={`/tamirveservis/${service.slug}`}
            className="group grid min-h-24 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-amber-400 hover:shadow-md sm:flex sm:gap-4 sm:p-4"
          >
            <div className="relative col-start-1 row-start-1 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 transition-colors group-hover:border-amber-200 sm:h-16 sm:w-16">
              <Image
                src={service.image}
                alt=""
                fill
                sizes="64px"
                className="object-cover"
              />
            </div>
            <h3 className="col-span-2 row-start-2 min-w-0 text-sm font-semibold leading-5 text-slate-900 transition-colors group-hover:text-amber-700 sm:col-span-1 sm:flex-1">
              {service.title}
            </h3>
            <ArrowRight className="col-start-2 row-start-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500" aria-hidden="true" />
          </Link>
        ))}
      </div>
      <div className="mt-8 flex justify-center">
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/tamirveservis" className="gap-2">
            Tüm Hizmetleri İncele
            <ArrowRight className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </Link>
        </Button>
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
            Parça Kategorileri
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Aracınızın tüm sistemleri için kapsamlı parça çözümleri.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
        {categories.map((category) => (
          <Link
            key={category._id || category.slug}
            href={`/parcalar?kategori=${encodeURIComponent(category.slug)}`}
            className="group grid min-h-24 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-amber-400 hover:shadow-md sm:flex sm:gap-4 sm:p-4"
          >
            <div className="col-start-1 row-start-1 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-100 transition-colors group-hover:border-amber-200 sm:h-16 sm:w-16">
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
            <h3 className="col-span-2 row-start-2 min-w-0 text-sm font-semibold leading-5 text-slate-900 transition-colors group-hover:text-amber-700 sm:col-span-1 sm:flex-1">
              {category.name}
            </h3>
            <ArrowRight className="col-start-2 row-start-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500" aria-hidden="true" />
          </Link>
        ))}
      </div>

      <div className="mt-8 flex justify-center">
        <Button asChild variant="outline" size="lg" className="rounded-full">
          <Link href="/parcalar" className="gap-2">
            Tüm Kategorileri İncele
            <ArrowRight className="h-4 w-4 text-amber-500" aria-hidden="true" />
          </Link>
        </Button>
      </div>
    </section>
  );
}

function BrandsSkeleton() {
  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="container py-10 sm:py-14">
        <div className="mb-6 flex items-end justify-between gap-4">
          <div className="h-6 w-40 animate-pulse rounded bg-slate-200" />
          <div className="h-8 w-28 animate-pulse rounded-full bg-slate-200" />
        </div>
        <CardGridSkeleton />
      </div>
    </section>
  );
}

async function BrandsSection() {
  const brands = await getPublicBrands();

  if (!brands || brands.length === 0) return null;

  return (
    <section className="border-y border-slate-200 bg-white">
      <div className="container py-10 sm:py-14">
        <div className="mb-6 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
              Araç Markaları
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Uyumlu olduğumuz markalardan parça ve ECU çözümlerine ulaşın.
            </p>
          </div>

        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {brands.slice(0, 8).map((brand) => (
            <Link
              key={brand._id}
              href={`/parcalar?marka=${encodeURIComponent(brand.name)}`}
              className="group grid min-h-24 grid-cols-[1fr_auto] items-center gap-x-3 gap-y-2 rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-amber-400 hover:shadow-md sm:flex sm:gap-4 sm:p-4"
            >
              <div className="col-start-1 row-start-1 flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 transition-colors group-hover:border-amber-200 sm:h-16 sm:w-16">
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl}
                    alt=""
                    width={48}
                    height={48}
                    className="h-10 w-10 object-contain sm:h-12 sm:w-12"
                  />
                ) : (
                  <Layers className="h-7 w-7 text-slate-500" aria-hidden="true" />
                )}
              </div>
              <h3 className="col-span-2 row-start-2 min-w-0 text-sm font-semibold leading-5 text-slate-900 transition-colors group-hover:text-amber-700 sm:col-span-1 sm:flex-1">
                {brand.name}
              </h3>
              <ArrowRight className="col-start-2 row-start-1 h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-500" aria-hidden="true" />
            </Link>
          ))}
        </div>

        <div className="mt-8 flex justify-center">
          <Button asChild variant="outline" size="lg" className="rounded-full">
            <Link href="/markalar" className="gap-2">
              Tüm Markaları İncele
              <ArrowRight className="h-4 w-4 text-amber-500" aria-hidden="true" />
            </Link>
          </Button>
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
      <TrustBadgeStrip items={homeBenefits} />
      <StatsSection />

      <Suspense fallback={<SectionCardsSkeleton />}>
        <CategoriesSection />
      </Suspense>

      <Suspense fallback={<SectionCardsSkeleton />}>
        <ServicesSection />
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
