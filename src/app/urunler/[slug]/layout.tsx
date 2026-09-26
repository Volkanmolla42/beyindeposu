import type { Metadata } from "next";
import {
  absoluteUrl,
  metadataDescription,
  plainText,
  SEO_IMAGE,
  serializeJsonLd,
  SITE_NAME,
} from "@/lib/seo";
import { getPublicProductBySlug } from "@/lib/seo-data";

type ProductRouteProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: ProductRouteProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) {
    return {
      title: { absolute: "Ürün bulunamadı | Beyin Deposu" },
      robots: { index: false, follow: false },
    };
  }

  const title = product.metaTitle?.trim() || `${product.oemNumber} ${product.title} | ${SITE_NAME}`;
  const description = metadataDescription(product.metaDescription?.trim() || product.description);
  const path = `/urunler/${product.slug}`;

  return {
    title: { absolute: title },
    description,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      siteName: SITE_NAME,
      url: absoluteUrl(path),
      title,
      description,
      images: [{ url: SEO_IMAGE, width: 1200, height: 630, alt: SITE_NAME }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [SEO_IMAGE],
    },
  };
}

export default async function ProductSeoLayout({ children, params }: ProductRouteProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) return children;

  const url = absoluteUrl(`/urunler/${product.slug}`);
  const images = product.images
    .filter((image) => /\.webp(?:[?#]|$)/i.test(image))
    .map((image) => {
      try {
        return new URL(image, url).toString();
      } catch {
        return null;
      }
    })
    .filter((image): image is string => image !== null);

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.title,
        description: plainText(product.description),
        mpn: product.oemNumber,
        brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
        category: product.categoryName,
        url,
        image: images.length > 0 ? images : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Ürünler", item: absoluteUrl("/urunler") },
          { "@type": "ListItem", position: 3, name: product.title, item: url },
        ],
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      {children}
    </>
  );
}
