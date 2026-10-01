import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  absoluteUrl,
  metadataDescription,
  plainText,
  serializeJsonLd,
  SITE_NAME,
} from "@/lib/seo";
import { getPublicProductBySlug } from "@/lib/seo-data";
import { PRODUCT_IMAGE_PLACEHOLDER } from "@/lib/product-images";

type ProductRouteParams = {
  params: Promise<{ slug: string }>;
};

type ProductRouteLayoutProps = ProductRouteParams & {
  children: React.ReactNode;
};

function getProductImages(images: readonly string[]): string[] {
  return images.map((image) => new URL(image, absoluteUrl("/")).toString());
}

export async function generateMetadata({ params }: ProductRouteParams): Promise<Metadata> {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) notFound();

  const productTitle = product.title.trim() || "Oto elektronik parça";
  const oemNumber = product.oemNumber.trim();
  const titleIncludesOem = productTitle
    .toLocaleLowerCase("tr-TR")
    .includes(oemNumber.toLocaleLowerCase("tr-TR"));
  const titleText = oemNumber && !titleIncludesOem
    ? `${productTitle} ${oemNumber}`
    : productTitle;
  const title = product.metaTitle?.trim() || `${titleText} | ${SITE_NAME}`;
  const descriptionText = plainText(product.metaDescription?.trim() || product.description);
  const description = metadataDescription(
    descriptionText || `${oemNumber} kodlu ${productTitle}. Parça uyumluluğu ve stok bilgisi için iletişime geçin.`,
  );
  const path = `/parcalar/${product.slug}`;
  const productImages = getProductImages(product.images);
  const socialImages = productImages.length > 0
    ? productImages
    : [absoluteUrl(PRODUCT_IMAGE_PLACEHOLDER)];

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
      images: socialImages.map((url) => ({ url, alt: productTitle })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: socialImages,
    },
  };
}

export default async function ProductSeoLayout({ children, params }: ProductRouteLayoutProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) notFound();

  const url = absoluteUrl(`/parcalar/${product.slug}`);
  const images = getProductImages(product.images);
  const categoryUrl = absoluteUrl(
    product.category ? `/kategoriler/${product.category.slug}` : "/parcalar",
  );

  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Product",
        name: product.title,
        description: plainText(product.description),
        mpn: product.oemNumber,
        category: product.categoryName,
        url,
        image: images.length > 0 ? images : undefined,
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Parçalar", item: absoluteUrl("/parcalar") },
          { "@type": "ListItem", position: 3, name: product.categoryName, item: categoryUrl },
          { "@type": "ListItem", position: 4, name: product.title, item: url },
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
