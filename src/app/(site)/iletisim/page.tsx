import type { Metadata } from "next";
import Link from "next/link";
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  ChevronRight,
  Home,
  ExternalLink,
  Truck,
} from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { SITE_CONTACT } from "@/config/site";
import { getWhatsAppUrl, formatPhoneNumber } from "@/lib/whatsapp";
import { createPageMetadata, serializeJsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";

export const dynamic = "force-static";
export const revalidate = 3600;

export const metadata: Metadata = createPageMetadata({
  title: `İletişim | ${SITE_NAME}`,
  description:
    "Beyin Deposu iletişim bilgileri, telefon, WhatsApp destek hattı, adres ve çalışma saatleri.",
  path: "/iletisim",
});

export default function IletisimPage() {
  const displayPhone = SITE_CONTACT.phone;
  const displayEmail = SITE_CONTACT.email;
  const displayAddress = SITE_CONTACT.address;
  const workingHours = SITE_CONTACT.workingHours;

  const mapQuery = encodeURIComponent(displayAddress);

  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: SITE_NAME,
    url: `${SITE_URL}/iletisim`,
    image: new URL("/images/logo-mark.webp", SITE_URL).toString(),
    telephone: displayPhone,
    email: displayEmail,
    address: {
      "@type": "PostalAddress",
      streetAddress: displayAddress,
      addressLocality: "Başakşehir",
      addressRegion: "İstanbul",
      addressCountry: "TR",
    },
    openingHours: "Mo-Sa 09:00-18:30",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(contactJsonLd) }}
      />
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="container flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-blue-600 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Ana sayfa</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-bold">İletişim</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200 py-10">
        <div className="container text-center space-y-3">
          <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
            Bize ulaşın
          </h1>
        </div>
      </div>

      {/* Contact Content Area */}
      <div className="container py-12 space-y-10">
        {/* Quick Contact Action Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* WhatsApp Card */}
          <a
            href={getWhatsAppUrl()}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="WhatsApp'tan parça sorun"
            className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-colors hover:border-emerald-200 hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                <WhatsAppIcon className="h-6 w-6 fill-emerald-700 text-emerald-700" />
              </div>
              <h2 className="text-lg font-medium tracking-tight">WhatsApp</h2>
              <p className="text-sm leading-relaxed text-slate-600">
                OEM kodu veya parça fotoğrafı gönderin.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
              <span>Mesaj gönder</span>
              <span className="text-emerald-700 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </a>

          {/* Phone Card */}
          <a
            href={`tel:${displayPhone.replace(/[^0-9+]/g, "")}`}
            aria-label={`Bizi telefonla arayın: ${formatPhoneNumber(displayPhone)}`}
            className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-colors hover:border-blue-200 hover:shadow-md"
          >
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <Phone className="h-6 w-6 text-blue-700" />
              </div>
              <h2 className="text-lg font-medium tracking-tight">Telefon</h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Parça uyumu ve stok bilgisi için arayın.
              </p>
            </div>
            <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
              <span>{formatPhoneNumber(displayPhone)}</span>
              <span className="text-blue-700 group-hover:translate-x-1 transition-transform">→</span>
            </div>
          </a>

          {/* Shipping Info Card */}
          <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
            <div className="space-y-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50">
                <Truck className="h-6 w-6 text-blue-700" />
              </div>
              <h2 className="text-lg font-medium tracking-tight">Kargo</h2>
              <p className="text-sm leading-relaxed text-slate-600">
                Saat 16:00&apos;a kadar verilen stoklu siparişleri aynı gün kargoya veriyoruz.
              </p>
            </div>
            <div className="mt-6 border-t border-slate-200 pt-4 text-sm font-medium text-blue-700">
              Türkiye geneline gönderim
            </div>
          </div>
        </div>

        {/* Details & Map Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Contact Details List */}
          <div className="lg:col-span-5 flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-8 shadow-sm space-y-8">
            <div className="space-y-6">
              <h2 className="text-xl font-medium tracking-tight text-slate-900">
                İletişim bilgileri
              </h2>

              <div className="space-y-5 text-sm">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Adres</div>
                    <div className="text-slate-600 leading-relaxed mt-0.5">{displayAddress}</div>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Phone className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Telefon</div>
                    <a
                      href={`tel:${displayPhone.replace(/[^0-9+]/g, "")}`}
                      className="text-slate-600 hover:text-blue-700 transition-colors mt-0.5 inline-block"
                    >
                      {formatPhoneNumber(displayPhone)}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">E-posta</div>
                    <a
                      href={`mailto:${displayEmail}`}
                      className="text-slate-600 hover:text-blue-700 transition-colors mt-0.5 inline-block"
                    >
                      {displayEmail}
                    </a>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Clock className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">Çalışma saatleri</div>
                    <div className="text-slate-600 mt-0.5">{workingHours}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-200">
              <a
                href={`https://maps.google.com/maps?q=${mapQuery}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-700 hover:text-blue-800 transition-colors"
              >
                Google Haritalar&apos;da aç
                <ExternalLink className="h-4 w-4" />
              </a>
            </div>
          </div>

          {/* Map Section */}
          <div className="lg:col-span-7">
            <div className="rounded-3xl bg-white border border-slate-200 shadow-sm overflow-hidden h-[340px] lg:h-full min-h-[340px]">
              <iframe
                title="İşletme konumu haritası"
                src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                className="w-full h-full border-0 min-h-[340px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
