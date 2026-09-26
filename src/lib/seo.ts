import type { Metadata } from "next";

export const SITE_NAME = "Beyin Deposu";
export const SITE_URL = new URL(
  process.env.SITE_URL?.trim() || "https://beyindeposu.com",
).origin;
export const SITE_DESCRIPTION =
  "ECU, ABS, airbag ve diğer oto elektronik parçaları. Ürün uyumluluğu, stok ve sipariş bilgisi için Beyin Deposu ile iletişime geçin.";
export const SEO_IMAGE = "/images/seo-cover.webp";

export const ORGANIZATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: SITE_URL,
  logo: new URL("/images/logo.webp", SITE_URL).toString(),
};

export function absoluteUrl(path: string): string {
  return new URL(path.replace(/^\/+/, ""), `${SITE_URL}/`).toString();
}

export function plainText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function metadataDescription(value: string, maxLength = 160): string {
  const text = plainText(value);
  if (text.length <= maxLength) return text;

  const excerpt = text.slice(0, maxLength - 1);
  const lastSpace = excerpt.lastIndexOf(" ");
  return `${excerpt.slice(0, lastSpace > 0 ? lastSpace : excerpt.length).trimEnd()}…`;
}

export function createPageMetadata({
  title,
  description,
  path,
}: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const url = absoluteUrl(path);
  const image = {
    url: SEO_IMAGE,
    width: 1200,
    height: 630,
    alt: SITE_NAME,
  };

  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: SITE_NAME,
      url,
      title,
      description,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SEO_IMAGE],
    },
  };
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}
