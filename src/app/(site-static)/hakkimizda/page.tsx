import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Truck,
} from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { formatPhoneNumber, getWhatsAppUrl } from "@/lib/whatsapp";
import { createPageMetadata, serializeJsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
import { getSiteContactSettings } from "@/lib/services-data";
import HeroBanner from "@/components/ui/HeroBanner";

export const metadata: Metadata = createPageMetadata({
  title: "Hakkımızda ve iletişim",
  description:
    "20 yılı aşkın süredir oto elektronik parça tedarik ediyoruz. Kataloğumuzda 15.000’den fazla parça var.",
  path: "/hakkimizda",
});

export default async function HakkimizdaPage() {
  const contact = await getSiteContactSettings();

  const productsCount = "15.000’den fazla";
  const displayPhone = contact.phoneNumber;
  const displayEmail = contact.email;
  const displayAddress = contact.address;
  const mapQuery = encodeURIComponent(displayAddress);

  const contactJsonLd = {
    "@context": "https://schema.org",
    "@type": "AutoPartsStore",
    name: SITE_NAME,
    url: `${SITE_URL}/hakkimizda`,
    image: new URL("/images/logo-mark.webp", SITE_URL).toString(),
    telephone: displayPhone,
    email: displayEmail,
    address: {
      "@type": "PostalAddress",
      streetAddress: displayAddress,
      addressLocality: "Zeytinburnu",
      addressRegion: "İstanbul",
      postalCode: "34010",
      addressCountry: "TR",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(contactJsonLd) }}
      />
      <HeroBanner
        src="/images/hero-rebrand.jpg"
        alt="Beyin Deposu Atölye"
        eyebrow="Hakkımızda"
        title="20 yılı aşkın süredir oto elektronik parça tedarik ediyoruz."
        description="Orijinal çıkma, sıfır ve revizyonlu oto beyinleri, kontrol üniteleri ve hassas elektronik bileşenlerde profesyonel çözümler."
      />

      <div className="container max-w-5xl py-14 space-y-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div className="space-y-4">
            <p className="text-sm text-slate-600 leading-relaxed">
              Kataloğumuzda {productsCount} parça var. Motor, fren, airbag, gövde kontrol ve şanzıman modülleri de bunların arasında.
            </p>
          </div>

          <div className="relative h-72 rounded-3xl border border-slate-200 bg-slate-50 p-3 shadow-sm overflow-hidden">
            <Image
              src="/images/catalog-ecu-banner.webp"
              alt="Oto elektronik kontrol ünitesi"
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="rounded-2xl object-contain p-2"
            />
          </div>
        </div>

        <div id="kalite" className="space-y-6 rounded-3xl border border-slate-200 bg-white p-8 sm:p-10">
          <h2 className="text-2xl font-medium text-slate-900">Kontrol ve gönderim</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Parça kontrolü</h3>
              <p className="text-slate-600">
                OEM kodunu ve parça etiketini kontrol ederiz.
              </p>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Uyumluluk kontrolü</h3>
              <p className="text-slate-600">
                Şasi numarası ile parça kodunu karşılaştırırız.
              </p>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Paketleme</h3>
              <p className="text-slate-600">
                Modülleri antistatik ambalajla göndeririz.
              </p>
            </div>
          </div>
        </div>

        <section id="iletisim" className="space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
              İletişim
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            <a
              href={getWhatsAppUrl(undefined, displayPhone)}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="WhatsApp'tan parça sorun"
              className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-colors hover:border-emerald-200 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <WhatsAppIcon className="h-6 w-6 fill-emerald-700 text-emerald-700" />
                </div>
                <h3 className="text-lg font-medium tracking-tight">WhatsApp</h3>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
                <span>Mesaj gönder</span>
                <span className="text-emerald-700 transition-transform group-hover:translate-x-1">→</span>
              </div>
            </a>

            <a
              href={`tel:${displayPhone.replace(/[^0-9+]/g, "")}`}
              aria-label={`Bizi telefonla arayın: ${formatPhoneNumber(displayPhone)}`}
              className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-colors hover:border-amber-400 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                  <Phone className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-medium tracking-tight">Telefon</h3>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
                <span>{formatPhoneNumber(displayPhone)}</span>
                <span className="text-amber-500 transition-transform group-hover:translate-x-1">→</span>
              </div>
            </a>

            <div className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm">
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                  <Truck className="h-6 w-6 text-amber-500" />
                </div>
                <h3 className="text-lg font-medium tracking-tight">Kargo</h3>
              </div>
              <div className="mt-6 border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
                Türkiye geneli hızlı teslimat
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12">
            <div className="flex flex-col justify-between space-y-8 rounded-3xl border border-slate-200 bg-white p-8 shadow-sm lg:col-span-5">
              <div className="space-y-6">
                <div className="space-y-5 text-sm">
                  <div className="flex items-start gap-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">Adres</div>
                      <div className="mt-0.5 leading-relaxed text-slate-600">{displayAddress}</div>
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
                        className="mt-0.5 inline-block break-all text-slate-600 transition-colors hover:text-amber-500"
                      >
                        {displayEmail}
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-4">
                <a
                  href={`https://maps.google.com/maps?q=${mapQuery}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-amber-600 transition-colors hover:text-amber-500"
                >
                  Google Haritalar&apos;da aç
                  <ExternalLink className="h-4 w-4" />
                </a>
              </div>
            </div>

            <div className="lg:col-span-7">
              <div className="h-[340px] min-h-[340px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm lg:h-full">
                <iframe
                  title="İşletme konumu haritası"
                  src={`https://maps.google.com/maps?q=${mapQuery}&t=&z=15&ie=UTF8&iwloc=&output=embed`}
                  className="h-full min-h-[340px] w-full border-0"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            </div>
          </div>
        </section>

        <div id="kvkk" className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2">
          <h2 className="font-bold text-slate-900">Gizlilik</h2>
          <Link href="/gizlilik" className="inline-block text-amber-600 underline hover:text-amber-500">Kişisel veriler ve analitik hakkında</Link>
        </div>
      </div>
    </>
  );
}
