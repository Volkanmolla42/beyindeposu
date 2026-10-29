import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  Clock,
  Cpu,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  Settings,
  Truck,
  Wrench,
} from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { formatPhoneNumber, getWhatsAppUrl } from "@/lib/whatsapp";
import { createPageMetadata, serializeJsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
import { getSiteContactSettings } from "@/lib/services-data";
import HeroBanner from "@/components/ui/HeroBanner";
import FeatureCardGrid from "@/components/FeatureCardGrid";

export const metadata: Metadata = createPageMetadata({
  title: "İletişim & Servis",
  description:
    "Beyin satışı, beyin tamir & kodlama, yarı otomatik & mekatronik ve elektrik-elektronik servis hizmetlerimiz için bize ulaşın.",
  path: "/iletisim",
});

export default async function IletisimPage() {
  const contact = await getSiteContactSettings();

  const contactServices = [
    {
      icon: Cpu,
      title: "Beyin Tamir & Kodlama",
      description:
        "Motor, ABS, airbag, konfor ve şanzıman kontrol ünitelerinin devre onarımı, klonlama ve araç uyumlu kodlama işlemleri.",
    },
    {
      icon: Settings,
      title: "Yarı Otomatik & Mekatronik",
      description:
        "DSG, EDC, Powershift ve robotize şanzıman mekatronik kart tamiri, basınç tüpü revizyonu ve adaptasyon testleri.",
    },
    {
      icon: Wrench,
      title: "Elektrik - Elektronik & Mekanik Servis",
      description:
        "Araç tesisat arıza tespiti, CAN-bus haberleşme kontrolleri, sensör teşhisi ve mekanik bakım onarım hizmetleri.",
    },
  ];

  const productsCount = "15.000’den fazla";
  const displayPhone = contact.phoneNumber;
  const displayEmail = contact.email;
  const displayAddress = contact.address;
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
      ...(contact.district ? { addressLocality: contact.district } : {}),
      ...(contact.city ? { addressRegion: contact.city } : {}),
      ...(contact.postalCode ? { postalCode: contact.postalCode } : {}),
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
        eyebrow="İletişim & Servis"
        title="Oto Beyin Satış, Garantili Tamir ve Servis Hizmetleri"
        description="Beyin tamir & kodlama, yarı otomatik mekatronik onarımı, elektrik-elektronik ve mekanik bakım servis hizmetlerimizle yanınızdayız."
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
          <h2 className="text-2xl font-medium text-slate-900">
            Parça kontrolü, gönderim ve garanti koşulları
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Parça ve simülasyon testi</h3>
              <p className="text-slate-600">
                OEM kodunu, parça etiketini ve devre haberleşmesini gönderim öncesi test ederiz.
              </p>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Şasi ve uyumluluk teyidi</h3>
              <p className="text-slate-600">
                Şasi numarası (VIN) ve mevcut modülün parça kodu ile birebir uyumluluğu doğrularız.
              </p>
            </div>
            <div className="space-y-1.5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-medium text-slate-900">Antistatik paketleme</h3>
              <p className="text-slate-600">
                Kontrol ünitelerini güvenlik bandrolü ve antistatik koruma ile kargolarız.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 text-xs leading-relaxed text-slate-600 space-y-1.5">
            <h3 className="font-semibold text-slate-900">
              Onarım ve Çıkma / Revizyonlu Parça Garanti Kapsamı
            </h3>
            <p>
              Tamir edilen kontrol üniteleri yalnızca yapılan onarım işlemine karşı; test edilmiş
              çıkma/orijinal parçalar ise montaj ve çalışma kontrol süresince fonksiyon test
              garantisi altındadır. Güvenlik etiketi/bandrolü sökülmüş, içi açılmış, araç tesisatındaki
              kısa devre veya yüksek voltaj nedeniyle hasar görmüş, ters kutup bağlanmış, sıvı/su
              temasına maruz kalmış veya yetkisiz yazılım/kodlama müdahalesi yapılmış modüller
              garanti kapsamı dışındadır.
            </p>
          </div>
        </div>

        <section className="space-y-6">
          <div className="max-w-2xl space-y-2">
            <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
              Tamir, Servis ve Kodlama Hizmetlerimiz
            </h2>
            <p className="text-sm text-slate-600">
              Sadece oto beyin ve parça satışı değil; donanımlı laboratuvarımızda garantili onarım, kodlama ve servis hizmeti sunuyoruz.
            </p>
          </div>

          <FeatureCardGrid items={contactServices} columns={3} />
        </section>

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
              aria-label={`WhatsApp'tan yazın: ${formatPhoneNumber(displayPhone)}`}
              className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-colors hover:border-emerald-200 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                  <WhatsAppIcon className="h-6 w-6 fill-emerald-700 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-medium tracking-tight">WhatsApp</h3>
                  <p className="mt-1 text-sm text-slate-600">Hızlı mesaj ve parça danışma</p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
                <span className="font-medium text-slate-900 transition-colors group-hover:text-emerald-700">
                  {formatPhoneNumber(displayPhone)}
                </span>
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
                <div>
                  <h3 className="text-lg font-medium tracking-tight">Telefon</h3>
                  <p className="mt-1 text-sm text-slate-600">Teknik servis ve destek hattı</p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
                <span className="font-medium text-slate-900 transition-colors group-hover:text-amber-600">
                  {formatPhoneNumber(displayPhone)}
                </span>
                <span className="text-amber-500 transition-transform group-hover:translate-x-1">→</span>
              </div>
            </a>

            <a
              href={`https://maps.google.com/maps?q=${mapQuery}`}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Adresi haritada görüntüleyin: ${displayAddress}`}
              className="group flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-sm transition-colors hover:border-amber-400 hover:shadow-md"
            >
              <div className="space-y-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
                  <MapPin className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h3 className="text-lg font-medium tracking-tight">Adres</h3>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    {displayAddress}
                  </p>
                </div>
              </div>
              <div className="mt-6 flex items-center justify-between border-t border-slate-200 pt-4 text-sm font-medium text-slate-700">
                <span className="font-medium text-slate-900 transition-colors group-hover:text-amber-600">
                  Haritada Aç
                </span>
                <span className="text-amber-500 transition-transform group-hover:translate-x-1">→</span>
              </div>
            </a>
          </div>

          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-12">
            <div className="flex flex-col justify-between space-y-6 rounded-3xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm lg:col-span-5">
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-medium tracking-tight text-slate-900">
                    Çalışma & Servis Bilgileri
                  </h3>
                  <p className="mt-1 text-xs text-slate-500">
                    Atölyemizi ziyaret edebilir veya Türkiye genelinden kargo ile parça gönderebilirsiniz.
                  </p>
                </div>

                <div className="space-y-4 text-sm">
                  {contact.workingHours && (
                    <div className="flex items-start gap-3.5">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                        <Clock className="h-5 w-5" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-900">Çalışma Saatleri</div>
                        <div className="mt-0.5 text-slate-600">{contact.workingHours}</div>
                      </div>
                    </div>
                  )}

                  <div className="flex items-start gap-3.5">
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

                  <div className="flex items-start gap-3.5">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                      <Truck className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="font-medium text-slate-900">Kargo & Teslimat</div>
                      <div className="mt-0.5 leading-relaxed text-slate-600">
                        Türkiye geneli anlaşmalı kargo ile arızalı beyin onarım kabulü ve hızlı parça teslimatı.
                      </div>
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
                  Google Haritalar&apos;da yol tarifi al
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
          <h2 className="font-bold text-slate-900">Kurumsal Künye, Marka Uyarısı ve KVKK</h2>
          <p>
            <strong>İşletme:</strong> Beyin Deposu Oto Elektronik ve Kontrol Üniteleri Servisi ·{" "}
            {displayAddress} · Tel: {formatPhoneNumber(displayPhone)} · E-posta: {displayEmail}
          </p>
          <p>
            Sitemizde yer alan araç marka adları, logoları ve OEM numaraları 6769 sayılı Sınai
            Mülkiyet Kanunu m. 7/5 uyarınca yalnızca yedek parça ve servis uyumluluğunu belirtmek
            amacıyla kullanılmaktadır; Beyin Deposu bağımsız özel servistir.
          </p>
          <Link href="/gizlilik" className="inline-block text-amber-600 underline hover:text-amber-500">
            KVKK Aydınlatma Metni, canlı destek ve çerez gizlilik politikası
          </Link>
        </div>
      </div>
    </>
  );
}
