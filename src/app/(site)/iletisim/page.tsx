import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Cpu, Settings, Wrench } from "lucide-react";
import { createPageMetadata, serializeJsonLd, SITE_NAME, SITE_URL } from "@/lib/seo";
import { getSiteContactSettings } from "@/lib/services-data";
import HeroBanner from "@/components/ui/HeroBanner";
import FeatureCardGrid from "@/components/FeatureCardGrid";
import ContactDetails from "./ContactDetails";

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

          <ContactDetails />
        </section>

        <div id="kvkk" className="p-6 rounded-2xl bg-white border border-slate-200 text-xs text-slate-600 space-y-2">
          <h2 className="font-bold text-slate-900">Gizlilik</h2>
          <Link href="/gizlilik" className="inline-block text-amber-600 underline hover:text-amber-500">Kişisel veriler ve analitik hakkında</Link>
        </div>
      </div>
    </>
  );
}
