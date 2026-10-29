import type { Metadata } from "next";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { getSiteContactSettings } from "@/lib/services-data";
import {
  ChevronRight,
  Phone,
  ShieldCheck,
  Cpu,
  Clock,
  UserCheck,
  Search,
} from "lucide-react";
import HeroBanner from "@/components/ui/HeroBanner";
import { Button } from "@/components/ui/button";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import ProblemCta from "@/components/ProblemCta";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import {
  SITE_NAME,
  SITE_URL,
  serializeJsonLd,
  metadataDescription,
  toAbsoluteUrl,
} from "@/lib/seo";
import { getWhatsAppUrl, formatPhoneNumber } from "@/lib/whatsapp";

interface Props {
  params: Promise<{ code: string }>;
}

export async function generateStaticParams() {
  try {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) return [];
    const entries = await new ConvexHttpClient(convexUrl).query(
      api.faultCodes.listSitemapEntries,
      {},
    );
    return (entries ?? []).map((entry) => ({ code: entry.code.toLowerCase() }));
  } catch {
    return [];
  }
}

const fetchFaultCodeCached = unstable_cache(
  async (codeParam: string) => {
    const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
    if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
    const client = new ConvexHttpClient(convexUrl);
    return await client.query(api.faultCodes.getByCodePublic, {
      code: codeParam,
    });
  },
  ["fault-code-by-code"],
  { revalidate: 3600 },
);

const getFaultCode = cache(async (codeParam: string) => {
  return await fetchFaultCodeCached(codeParam);
});

const fetchAllFaultCodesCached = unstable_cache(
  async () => {
    try {
      const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!convexUrl) return [];
      return await new ConvexHttpClient(convexUrl).query(
        api.faultCodes.listPublic,
        {},
      );
    } catch {
      return [];
    }
  },
  ["all-fault-codes"],
  { revalidate: 3600 },
);

const getAllFaultCodes = cache(async () => {
  return await fetchAllFaultCodesCached();
});
function extractFaqsFromMarkdown(description?: string) {
  if (!description) return [];
  const parsed: Array<{ question: string; answer: string }> = [];
  const regex =
    /\*\s*\*\*Soru:\s*([^\r\n*]+)\*\*\s*[\r\n]+\s*(?:\*\s*)?Cevap:\s*([\s\S]+?)(?=\n\s*\*|\n\s*###|\n\s*---|$)/gi;
  let match;
  while ((match = regex.exec(description)) !== null) {
    const q = match[1].trim();
    const a = match[2].trim().replace(/^[:\s-]+/, "");
    if (q && a) {
      parsed.push({ question: q, answer: a });
    }
  }
  return parsed;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { code: rawCode } = await params;
  const faultCode = await getFaultCode(rawCode);

  if (!faultCode) {
    return {
      title: "Arıza Kodu Bulunamadı | Beyin Deposu",
      robots: { index: false, follow: false },
    };
  }

  const code = faultCode.code;
  const title = `${code} Arıza Kodu Anlamı ve Çözümü: ${faultCode.title} | Beyin Deposu`;
  const description = metadataDescription(
    `${code} arıza kodu nedir? ${code} (${faultCode.title}) belirtileri, olası nedenleri, teşhis adımları ve oto beyin tamir çözüm rehberi.`,
    160,
  );
  const canonicalUrl = `/ariza-kodlari/${faultCode.slug}`;
  const absolutePageUrl = `${SITE_URL}${canonicalUrl}`;
  const image = faultCode.image
    ? toAbsoluteUrl(faultCode.image)
    : `${SITE_URL}/images/obd-scanner-hero.jpg`;

  return {
    title: { absolute: title },
    description,
    keywords: [
      code,
      `${code} arıza kodu`,
      `${code} anlamı`,
      `${code} nedir`,
      `${code} çözümü`,
      `${code} belirtileri`,
      `${code} tamiri`,
      "obd arıza kodları",
      "oto beyin tamiri",
      "ecu arıza teşhisi",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      type: "article",
      locale: "tr_TR",
      siteName: SITE_NAME,
      url: absolutePageUrl,
      title,
      description,
      images: [{ url: image, alt: `${code} Arıza Kodu: ${faultCode.title}` }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function FaultCodeDetailPage({ params }: Props) {
  const { code: rawCode } = await params;
  const [faultCode, contactSettings, allFaultCodes] = await Promise.all([
    getFaultCode(rawCode),
    getSiteContactSettings(),
    getAllFaultCodes(),
  ]);

  if (!faultCode) notFound();

  const phoneNumber = contactSettings?.phoneNumber || "";
  const displayPhone = formatPhoneNumber(phoneNumber);

  const whatsappMessage = `Merhaba Beyin Deposu, aracımda ${faultCode.code} (${faultCode.title}) arıza kodunu aldım. Beyin testi ve parça hakkında bilgi almak istiyorum.`;
  const whatsappUrl = getWhatsAppUrl({ message: whatsappMessage }, phoneNumber);

  const pageUrl = `${SITE_URL}/ariza-kodlari/${faultCode.slug}`;

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
        name: "OBD Arıza Kodları",
        item: `${SITE_URL}/ariza-kodlari`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: faultCode.code,
        item: pageUrl,
      },
    ],
  };

  const techArticleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: `${faultCode.code} Arıza Kodu Anlamı, Nedenleri ve Çözümü: ${faultCode.title}`,
    description: `${faultCode.code} arıza kodunun ayrıntılı açıklaması, araç üzerindeki belirtileri, teşhis yöntemleri ve oto elektronik tamir çözümleri.`,
    image: faultCode.image ? toAbsoluteUrl(faultCode.image) : `${SITE_URL}/images/obd-scanner-hero.jpg`,
    author: {
      "@type": "Organization",
      name: "Beyin Deposu Teknik Ekibi",
      url: SITE_URL,
    },
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        "@type": "ImageObject",
        url: `${SITE_URL}/images/logo-mark.webp`,
      },
    },
    inLanguage: "tr-TR",
    mainEntityOfPage: pageUrl,
    datePublished: new Date(faultCode._creationTime).toISOString(),
    dateModified: new Date(faultCode._creationTime).toISOString(),
  };

  const faqs = extractFaqsFromMarkdown(faultCode.description);
  const faqJsonLd =
    faqs.length > 0
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: faqs.map((faq) => ({
            "@type": "Question",
            name: faq.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: faq.answer,
            },
          })),
        }
      : null;

  const otherCodes = (allFaultCodes ?? [])
    .filter((c) => c.slug !== faultCode.slug)
    .slice(0, 3);

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(techArticleJsonLd) }}
      />
      {faqJsonLd && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(faqJsonLd) }}
        />
      )}

      {/* Hero Banner */}
      <HeroBanner
        src={faultCode.image || "/images/obd-scanner-hero.jpg"}
        alt={`${faultCode.code} Arıza Kodu ve Teşhis Rehberi`}
        eyebrow="OBD-II Arıza Kodu"
        title={`${faultCode.code} Arıza Kodu`}
        description={faultCode.title}
        actions={
          <>
            <Button asChild variant="default" size="lg">
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <WhatsAppIcon className="h-5 w-5 fill-slate-950" />
                WhatsApp ile Danışın
              </a>
            </Button>
            {phoneNumber && (
              <Button asChild variant="darkOutline" size="lg">
                <a href={`tel:${phoneNumber.replace(/[^0-9+]/g, "")}`}>
                  <Phone className="h-4 w-4" />
                  Hemen Ara
                </a>
              </Button>
            )}
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
            <Link href="/ariza-kodlari" className="transition-colors hover:text-slate-900">
              OBD Arıza Kodları
            </Link>
            <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            <span className="font-mono font-semibold text-slate-900 truncate">
              {faultCode.code}
            </span>
          </nav>
        </div>
      </div>

      {/* Detay İçerik Alanı */}
      <div className="container py-12 sm:py-16">
        <div className="grid grid-cols-1 gap-10 lg:grid-cols-3 lg:gap-12">
          {/* Sol Kolon (Ana İçerik) */}
          <div className="lg:col-span-2 space-y-8">
            {/* Görsel (Varsa) */}
            {faultCode.image && (
              <div className="relative aspect-[16/9] w-full overflow-hidden rounded-2xl border border-slate-200 bg-dark-bg shadow-xs">
                <Image
                  src={faultCode.image}
                  alt={`${faultCode.code} Arıza Kodu`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 800px"
                  className="object-cover"
                />
              </div>
            )}

            {/* Teşhis ve Teknik Kılavuz (Markdown İçeriği) */}
            <article className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-10 shadow-xs">
              {faultCode.description ? (
                <MarkdownRenderer content={faultCode.description} />
              ) : (
                <div className="space-y-4 text-slate-700 leading-relaxed text-sm sm:text-base">
                  <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                    Arıza Tanımı ve Teşhis Rehberi
                  </h2>
                  <p>
                    <strong className="font-semibold text-slate-900">{faultCode.code}</strong> ({faultCode.title}) arıza kodu için detaylı teknik açıklama hazırlanmaktadır.
                  </p>
                  <p>
                    Aracınızdaki bu arıza için uzman teknisyenlerimizden test, teşhis veya beyin onarım desteği almak üzere doğrudan iletişime geçebilirsiniz.
                  </p>
                </div>
              )}
            </article>
          </div>

          {/* Sağ Kolon (Sticky Sidebar) */}
          <div className="lg:col-span-1">
            <div className="sticky top-24 space-y-6">
              {/* Randevu ve Danışma Kartı */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
                <h3 className="text-lg font-bold text-slate-900">
                  Beyin &amp; Parça Desteği
                </h3>
                <p className="mt-1.5 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {faultCode.code} arızası için uzman teknisyenlerimizden hızlı parça sorgulama, test ve onarım desteği alın.
                </p>

                <div className="mt-6 space-y-3">
                  <Button
                    asChild
                    variant="default"
                    size="lg"
                    className="w-full justify-center rounded-xl font-semibold"
                  >
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2"
                    >
                      <WhatsAppIcon className="h-5 w-5 fill-slate-950" />
                      <span>WhatsApp ile Danışın</span>
                    </a>
                  </Button>

                  {phoneNumber && (
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
                        <span>{displayPhone}</span>
                      </a>
                    </Button>
                  )}

                  <Button
                    asChild
                    variant="ghost"
                    size="sm"
                    className="w-full justify-center text-xs text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                  >
                    <Link href="/parcalar" className="flex items-center gap-1.5">
                      <Search className="h-3.5 w-3.5" />
                      <span>Uyumlu Beyin ve Parçaları Ara</span>
                    </Link>
                  </Button>
                </div>

                <div className="mt-6 border-t border-slate-100 pt-5 space-y-3.5">
                  <div className="flex items-center gap-3 text-xs text-slate-700">
                    <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Garantili elektronik beyin onarımı</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-700">
                    <Cpu className="h-4 w-4 text-amber-600 shrink-0" />
                    <span>Masaüstü ECU simülasyon ve test</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-700">
                    <Clock className="h-4 w-4 text-amber-500 shrink-0" />
                    <span>Hızlı arıza tespiti ve aynı gün kargo</span>
                  </div>
                </div>
              </div>

              {/* Kargo ile Gönderim Bilgisi */}
              <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 text-xs leading-relaxed text-amber-950">
                <h4 className="font-bold flex items-center gap-1.5 mb-1.5">
                  <UserCheck className="h-4 w-4 text-amber-700" />
                  Kargo ile Gönderim İmkanı
                </h4>
                <p>
                  Türkiye&apos;nin her yerinden arızalı motor beyni, ABS ünitesi veya elektronik kontrol modüllerinizi anlaşmalı kargo ile servisimize gönderebilirsiniz.
                </p>
              </div>

              {/* İlgili Arıza Kodları */}
              {faultCode.relatedCodes && faultCode.relatedCodes.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-base font-bold text-slate-900">İlgili Arıza Kodları</h3>
                    <Link
                      href="/ariza-kodlari"
                      className="text-xs font-semibold text-amber-600 hover:text-amber-700"
                    >
                      Tüm Kodlar
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {faultCode.relatedCodes.map((rel) => (
                      <Link
                        key={rel.code}
                        href={`/ariza-kodlari/${rel.slug}`}
                        className="group flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 p-3 transition-colors hover:border-amber-300 hover:bg-amber-50/50"
                      >
                        <div className="min-w-0 flex-1">
                          <span className="font-mono text-xs font-bold text-amber-900 group-hover:text-amber-800">
                            {rel.code}
                          </span>
                          <p className="truncate text-xs text-slate-600 group-hover:text-slate-900">
                            {rel.title}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400 group-hover:text-amber-600 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Diğer OBD Arıza Kodları Kart Grid */}
        {otherCodes.length > 0 && (
          <section className="mt-16 sm:mt-24 border-t border-slate-200 pt-12 sm:pt-16">
            <div className="mb-8 flex items-end justify-between">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                  Diğer OBD Arıza Kodları
                </h2>
                <p className="mt-1 text-sm text-slate-600">
                  Sık karşılaşılan diğer elektronik arıza kodları ve onarım rehberleri.
                </p>
              </div>
              <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
                <Link href="/ariza-kodlari">
                  Tümünü Gör
                  <ChevronRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {otherCodes.map((other) => (
                <Link
                  key={other.code}
                  href={`/ariza-kodlari/${other.slug}`}
                  className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xs transition-all duration-300 hover:-translate-y-1 hover:border-amber-400 hover:shadow-md"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="font-mono text-xs font-bold text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {other.code}
                      </span>
                      {other.isPopular && (
                        <span className="text-3xs font-bold text-amber-700 bg-amber-100/60 px-2 py-0.5 rounded-md">
                          Popüler Kod
                        </span>
                      )}
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-600 transition-colors line-clamp-2">
                      {other.title}
                    </h3>
                  </div>

                  <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3">
                    <span className="text-xs font-medium text-slate-500">Rehberi İncele</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-slate-100 text-slate-700 group-hover:bg-amber-500 group-hover:text-slate-950 transition-colors">
                      <ChevronRight className="h-3.5 w-3.5" />
                    </span>
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
