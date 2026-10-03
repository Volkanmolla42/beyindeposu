import { Suspense } from "react";
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
import ConvexAuthIsland from "@/app/ConvexAuthIsland";
import { ProductDetailSkeleton } from "@/components/RouteSkeletons";
import ProductDetailClient from "./ProductDetailClient";


type ProductRouteProps = {
  params: Promise<{ slug: string }>;
};

function getProductImages(images: readonly string[]): string[] {
  return images.map((image) => new URL(image, absoluteUrl("/")).toString());
}

export async function generateMetadata({ params }: ProductRouteProps): Promise<Metadata> {
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
    alternates: {
      canonical: path,
    },
    openGraph: {
      title,
      description,
      url: path,
      type: "article",
      images: socialImages.map((image) => ({
        url: image,
        alt: `${titleText} görseli`,
      })),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: socialImages,
    },
    robots: { index: true, follow: true },
  };
}

async function ProductDetailContent({ params }: ProductRouteProps) {
  const { slug } = await params;
  const product = await getPublicProductBySlug(slug);

  if (!product) notFound();

  const productImages = getProductImages(product.images);
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: plainText(product.description),
    image: productImages.length > 0 ? productImages : [absoluteUrl(PRODUCT_IMAGE_PLACEHOLDER)],
    sku: product.oemNumber,
    mpn: product.oemNumber,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.category?.name,
    offers: {
      "@type": "Offer",
      priceCurrency: "TRY",
      availability: product.inStock
        ? "https://schema.org/InStock"
        : "https://schema.org/OutOfStock",
      itemCondition:
        product.condition === "Sıfır"
          ? "https://schema.org/NewCondition"
          : "https://schema.org/UsedCondition",
      url: absoluteUrl(`/parcalar/${product.slug}`),
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(structuredData) }}
      />
      <Suspense fallback={<ProductDetailSkeleton />}>
        <ConvexAuthIsland>
          <ProductDetailClient slug={slug} initialProduct={product} />
        </ConvexAuthIsland>
      </Suspense>
    </>
  );
}

export default function ProductPage({ params }: ProductRouteProps) {
  return (
    <Suspense fallback={<ProductDetailSkeleton />}>
      <ProductDetailContent params={params} />
    </Suspense>
  );
}
