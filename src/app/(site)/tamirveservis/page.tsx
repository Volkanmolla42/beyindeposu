import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  ChevronRight,
  CircleDollarSign,
  Clock,
  Cpu,
  HeartHandshake,
  ShieldCheck,
  UserCheck,
  Video,
  Wrench,
} from "lucide-react";
import HeroBanner from "@/components/ui/HeroBanner";
import { Button } from "@/components/ui/button";
import ProblemCta from "@/components/ProblemCta";
import TrustBadgeStrip from "@/components/TrustBadgeStrip";
import { createPageMetadata, serializeJsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
import { listPublicServices } from "@/lib/services-data";

export const metadata: Metadata = createPageMetadata({
  title: "Tamir & Servis | Oto Beyin, Mekatronik ve Elektronik Onarımı",
  description:
    "ABS tamiri, VW DSG mekatronik onarımı, motor ve şanzıman beyin tamiri, ECU kodlama ve arıza tespiti. Uzman kadro ve garantili servis.",
  path: "/tamirveservis",
});

const topFeatures = [
  {
    icon: UserCheck,
    title: "Uzman Kadro",
    description: "Deneyimli teknisyenler",
  },
  {
    icon: Cpu,
    title: "Orijinal Ekipman",
    description: "Profesyonel test cihazları",
  },
  {
    icon: Clock,
    title: "Hızlı Çözüm",
    description: "Zamanında teslim",
  },
  {
    icon: ShieldCheck,
    title: "Güvenilir Hizmet",
    description: "Garantili onarım",
  },
];

const bottomFeatures = [
  {
    icon: Clock,
    title: "Hızlı Servis",
    description: "Aynı gün tespit ve teslimat",
  },
  {
    icon: Wrench,
    title: "Kaliteli İşçilik",
    description: "Laboratuvar test standartları",
  },
  {
    icon: CircleDollarSign,
    title: "Uygun Fiyat",
    description: "Şeffaf onarım & parça maliyeti",
  },
  {
    icon: HeartHandshake,
    title: "Müşteri Memnuniyeti",
    description: "Garantili teknik destek",
  },
];

export default async function TamirVeServisPage() {
  const services = await listPublicServices();

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoRepair",
    name: `${SITE_NAME} - Tamir & Servis`,
    url: `${SITE_URL}/tamirveservis`,
    image: new URL("/images/services/tamir-hero.jpg", SITE_URL).toString(),
    priceRange: "$$",
    address: {
      "@type": "PostalAddress",
      addressLocality: "İstanbul",
      addressCountry: "TR",
    },
    description:
      "Profesyonel oto elektronik, ECU motor beyin tamiri, DSG mekatronik onarımı ve arıza tespiti servisi.",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Tamir ve Elektronik Servis Hizmetleri",
      itemListElement: services.map((service, index) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: service.title,
          description: service.shortDesc,
          url: `${SITE_URL}/tamirveservis/${service.slug}`,
        },
        position: index + 1,
      })),
    },
  };

  return (
    <div className="bg-slate-50 text-slate-900">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceJsonLd) }}
      />

      {/* Hero Banner */}
      <HeroBanner
        src="/images/services/tamir-hero.jpg"
        alt="Beyin Deposu Tamir ve Servis Atölyesi"
        eyebrow="Uzman Kadro • Modern Teknoloji • Güvenilir Çözümler"
        title="Tamir & Servis"
        description="Aracınızın tüm mekanik ve elektronik ihtiyaçları için profesyonel tamir ve servis hizmetleri sunuyoruz."
        actions={
          <>
            <Button asChild variant="default" size="lg">
              <a href="#hizmetlerimiz">Randevu Al</a>
            </Button>
            <Button asChild variant="darkOutline" size="lg">
              <a href="#hizmetlerimiz">
                Hizmetlerimiz
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </>
        }
      />

      {/* 4 İkonlu Bilgi Kartı */}
      <TrustBadgeStrip items={topFeatures} />

      {/* Hizmetlerimiz Bölümü */}
      <section id="hizmetlerimiz" className="container scroll-mt-24 py-14 sm:py-20">
        <div className="max-w-2xl mb-8 sm:mb-12">
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight text-slate-900">
            Hizmetlerimiz
          </h2>
          <p className="mt-2 text-sm sm:text-base text-slate-600">
            Aracınızın tüm sistemleri için kapsamlı tamir ve servis çözümleri.
          </p>
        </div>

        {services.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500">
            Kayıtlı servis hizmeti bulunmuyor.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {services.map((service) => (
              <Link
                key={service.slug}
                href={`/tamirveservis/${service.slug}`}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500"
              >
              <div className="relative aspect-[16/9] w-full overflow-hidden bg-dark-bg">
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 via-transparent to-transparent" />
                {service.videoUrl && (
                  <span className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-slate-950/70 px-2.5 py-1 text-[11px] font-medium text-white backdrop-blur-xs">
                    <Video className="h-3 w-3 text-amber-400" />
                    Video
                  </span>
                )}
                <span className="absolute bottom-3 left-4 text-xs font-semibold uppercase tracking-wider text-amber-400">
                  Detayları Gör
                </span>
              </div>

              <div className="flex flex-1 flex-col justify-between p-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900 transition-colors group-hover:text-amber-600 sm:text-xl">
                    {service.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-2">
                    {service.shortDesc}
                  </p>
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                  <span className="text-xs font-medium text-slate-500">
                    İncele & Randevu Al
                  </span>
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-700 transition-colors group-hover:bg-amber-500 group-hover:text-slate-950">
                    <ChevronRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      </section>

      {/* Aracınızda Sorun mu Var? Bölümü & Altındaki 4 Bilgi Kartı */}
      <section className="container pb-16 sm:pb-24">
        <ProblemCta />

        {/* Alt 4 Bilgi Kartı */}
        <TrustBadgeStrip
          items={bottomFeatures}
          variant="cards"
          className="mt-8"
        />
      </section>
    </div>
  );
}
