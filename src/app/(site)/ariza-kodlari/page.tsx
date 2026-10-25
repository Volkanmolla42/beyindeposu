import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@convex/_generated/api";
import { SITE_NAME, SITE_URL, serializeJsonLd } from "@/lib/seo";
import FaultCodesClient from "./FaultCodesClient";

export const metadata: Metadata = {
  title: "OBD Arıza Kodları ve Anlamları | Beyin Deposu",
  description:
    "Aracınızın motor, şanzıman, ABS ve airbag OBD-II arıza kodlarını öğrenin. P, C, B, U kodlarının anlamları, olası nedenleri ve profesyonel çözüm yolları.",
  alternates: {
    canonical: "/ariza-kodlari",
  },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: SITE_NAME,
    url: `${SITE_URL}/ariza-kodlari`,
    title: "OBD Arıza Kodları ve Anlamları | Beyin Deposu",
    description:
      "Aracınızın OBD-II arıza kodlarını öğrenin, anlamlarını keşfedin, doğru oto elektronik çözümlerine ulaşın.",
    images: [{ url: `${SITE_URL}/images/obd-scanner-hero.jpg`, alt: "OBD Arıza Kodları ve Teşhis Rehberi" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "OBD Arıza Kodları ve Anlamları | Beyin Deposu",
    description:
      "Aracınızın motor, şanzıman, ABS ve airbag arıza kodlarını öğrenin, profesyonel oto beyin çözümlerine ulaşın.",
    images: [`${SITE_URL}/images/obd-scanner-hero.jpg`],
  },
};

async function getFaultCodes() {
  const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
  if (!convexUrl) throw new Error("NEXT_PUBLIC_CONVEX_URL is not configured.");
  return await new ConvexHttpClient(convexUrl).query(api.faultCodes.listPublic, {});
}

export default async function FaultCodesPage() {
  const codes = await getFaultCodes();

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
    ],
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "OBD-II Arıza Kodları Kataloğu ve Teşhis Rehberi",
    description:
      "Aracınızın motor, şanzıman, ABS ve airbag OBD-II arıza kodlarını öğrenin. P, C, B, U kodlarının anlamları ve profesyonel çözüm yolları.",
    url: `${SITE_URL}/ariza-kodlari`,
    publisher: {
      "@type": "Organization",
      name: SITE_NAME,
      url: SITE_URL,
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(collectionJsonLd) }}
      />
      <FaultCodesClient codes={codes} />
    </>
  );
}
