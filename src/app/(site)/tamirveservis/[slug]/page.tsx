import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  Cpu,
  Phone,
  ShieldCheck,
  UserCheck,
} from "lucide-react";
import HeroBanner from "@/components/ui/HeroBanner";
import { Button } from "@/components/ui/button";
import ProblemCta from "@/components/ProblemCta";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import {
  getServiceBySlug,
  getSiteContactSettings,
  listPublicServices,
} from "@/lib/services-data";
import {
  metadataDescription,
  serializeJsonLd,
  SITE_NAME,
  SITE_URL,
  toAbsoluteUrl,
} from "@/lib/seo";
import { getWhatsAppUrl } from "@/lib/whatsapp";

export const revalidate = 300;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  try {
    const services = await listPublicServices();
    return (services ?? []).map((service) => ({ slug: service.slug }));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);

  if (!service) notFound();

  const title = `${service.title} | Beyin Deposu Tamir & Servis`;
  const description = metadataDescription(
    service.fullDesc || service.shortDesc,
    160
  );
  const url = `${SITE_URL}/tamirveservis/${service.slug}`;
  const image = toAbsoluteUrl(service.image);

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `/tamirveservis/${service.slug}` },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [{ url: image, alt: service.title }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function ServiceDetailPage({ params }: Props) {
  const { slug } = await params;
  const [service, allServices, contactSettings] = await Promise.all([
    getServiceBySlug(slug),
    listPublicServices(),
    getSiteContactSettings(),
  ]);

  if (!service) notFound();

  const otherServices = allServices.filter((s) => s.slug !== service.slug);
  const phoneNumber = contactSettings?.phoneNumber || "";
  const whatsappUrl = getWhatsAppUrl(
    {
      message: `Merhaba Beyin Deposu, ${service.title} hizmeti için randevu ve bilgi almak istiyorum.`,
    },
    phoneNumber
  );

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Ana Sayfa",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Tamir & Servis",
        item: `${SITE_URL}/tamirveservis`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: service.title,
        item: `${SITE_URL}/tamirveservis/${service.slug}`,
      },
    ],
  };

  const serviceJsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: `${service.title} - ${SITE_NAME}`,
    serviceType: service.title,
    description: service.fullDesc,
    url: `${SITE_URL}/tamirveservis/${service.slug}`,
    image: toAbsoluteUrl(service.image),
    provider: {
      "@type": "AutoRepair",
      name: SITE_NAME,
      url: SITE_URL,
      telephone: phoneNumber,
      address: {
        "@type": "PostalAddress",
        addressLocality: "İstanbul",
        addressCountry: "TR",
      },
    },
    areaServed: {
      "@type": "Country",
      name: "Türkiye",
    },
  };

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(serviceJsonLd) }}
      />

      {/* Hero Banner */}
      <HeroBanner
        src={service.image}
        alt={service.title}
        eyebrow="Tamir & Servis Hizmetleri"
        title={service.title}
        description={service.shortDesc}
        actions={
          <>
            <Button asChild variant="default" size="lg">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="h-5 w-5 fill-slate-950" />
                WhatsApp Randevu Al
              </a>
            </Button>
            <Button asChild variant="darkOutline" size="lg">
              <a href={`tel:${phoneNumber.replace(/[^0-9+]/g, "")}`}>
                <Phone className="h-4 w-4" />
                Hemen Ara
              </a>
            </Button>
          </>
        }
      />

      {/* Breadcrumb Bar */}
      <div className="border-b border-slate-200 bg-white py-3">
        <div className="container">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs sm:text-sm text-slate-500">
            <Link href="/" className="transition-colors hover:text-slate-900">
              Ana Sayfa
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <Link href="/tamirveservis" className="transition-colors hover:text-slate-900">
              Tamir & Servis
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-semibold text-slate-900 truncate">
              {service.title}
            </span>
          </nav>
        </div>
      </div>

      {/* Detay İçerik */}
      <div className="container py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
          {/* Sol Kolon (İçerik) */}
          <div className="lg:col-span-2 space-y-8">
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-slate-200 bg-dark-bg shadow-xs">
              {service.videoUrl ? (
                <video
                  src={service.videoUrl}
                  poster={service.image}
                  controls
                  playsInline
                  preload="metadata"
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={service.image}
                  alt={service.title}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                />
              )}
            </div>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Detaylı Bilgi ve Onarım Süreci
              </h2>
              <div className="mt-4 text-slate-700 leading-relaxed text-sm sm:text-base space-y-4">
                <p>{service.fullDesc}</p>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                Hizmet Kapsamı ve Yapılan İşlemler
              </h2>
              <ul className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {(service.features ?? []).map((feature, idx) => (
                  <li
                    key={idx}
                    className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3.5 text-sm text-slate-800"
                  >
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          {/* Sağ Kolon (Sticky Sidebar) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="text-lg font-bold text-slate-900">
                  Randevu ve Bilgi Alın
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600">
                  {service.title} için uzman teknisyenlerimizden hızlı fiyat ve randevu desteği alın.
                </p>

                <div className="mt-6 space-y-3">
                  <Button
                    asChild
                    variant="default"
                    size="lg"
                    className="w-full justify-center rounded-xl"
                  >
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <WhatsAppIcon className="h-5 w-5 fill-slate-950" />
                      <span>WhatsApp ile Randevu Al</span>
                    </a>
                  </Button>

                  <Button
                    asChild
                    variant="outline"
                    size="lg"
                    className="w-full justify-center rounded-xl"
                  >
                    <a
                      href={`tel:${phoneNumber.replace(/[^0-9+]/g, "")}`}
                      className="flex items-center gap-2"
                    >
                      <Phone className="h-4 w-4" />
                      <span>{phoneNumber}</span>
                    </a>
                  </Button>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5 space-y-3.5">
                  <div className="flex items-center gap-3 text-xs text-slate-700">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Garantili onarım ve test raporu</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-700">
                    <Cpu className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Orijinal test ve simülasyon cihazları</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-700">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Hızlı arıza tespiti ve teslimat</span>
                  </div>
                </div>
              </div>

              {/* Bilgi Kutusu */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-xs leading-relaxed text-amber-950">
                <h4 className="font-bold flex items-center gap-1.5 mb-1.5">
                  <UserCheck className="h-4 w-4 text-amber-700" />
                  Kargo ile Gönderim İmkanı
                </h4>
                <p>
                  İstanbul dışından veya servisimize gelemediğiniz durumlarda arızalı ünitenizi anlaşmalı kargo ile bize gönderebilirsiniz.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Diğer Hizmetlerimiz */}
        {otherServices.length > 0 && (
          <section className="mt-16 sm:mt-24 border-t border-slate-200 pt-12 sm:pt-16">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Diğer Tamir & Servis Hizmetlerimiz
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Elektronik ve mekanik sistemler için sunduğumuz diğer profesyonel çözümler.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/tamirveservis">
                  Tümünü Gör
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {otherServices.slice(0, 3).map((other) => (
                <Link
                  key={other.slug}
                  href={`/tamirveservis/${other.slug}`}
                  className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md"
                >
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-dark-bg">
                    <Image
                      src={other.image}
                      alt={other.title}
                      fill
                      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                      className="object-cover object-center transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/80 via-transparent to-transparent" />
                  </div>
                  <div className="flex flex-1 flex-col justify-between p-5">
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                        {other.title}
                      </h3>
                      <p className="mt-1.5 text-xs text-slate-600 line-clamp-2">
                        {other.shortDesc}
                      </p>
                    </div>
                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className="text-xs font-medium text-slate-500">Detayları Gör</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 group-hover:bg-amber-500 group-hover:text-slate-950">
                        <ChevronRight className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Problem CTA */}
        <section className="mt-16 sm:mt-24">
          <ProblemCta />
        </section>
      </div>
    </div>
  );
}
