import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  createPageMetadata,
  metadataDescription,
  SITE_NAME,
} from "@/lib/seo";
import { getPublicBrandPage } from "@/lib/seo-data";
import { ProductListingSkeleton } from "@/components/RouteSkeletons";
import TaxonomyProductResults from "@/components/TaxonomyProductResults";
import TaxonomyPageHeader from "@/components/TaxonomyPageHeader";


type BrandPageProps = {
  params: Promise<{ slug: string }>;
};

function getBrandDescription(name: string) {
  return metadataDescription(
    `${name} araçlarına uyumlu oto elektronik parçalarını inceleyin.`,
  );
}

export async function generateMetadata({ params }: BrandPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicBrandPage(slug);

  if (!page) notFound();

  const { brand } = page;
  const title = `${brand.name} oto elektronik parçaları | ${SITE_NAME}`;
  const path = `/markalar/${brand.slug}`;

  return {
    ...createPageMetadata({
      title,
      description: getBrandDescription(brand.name),
      path,
    }),
    title: { absolute: title },
    robots: brand.isActive !== false && page.products.page.length > 0
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

async function BrandContent({ params }: BrandPageProps) {
  const { slug } = await params;
  const page = await getPublicBrandPage(slug);

  if (!page) notFound();

  const { brand, products } = page;

  return (
    <section className="container py-8 md:py-12">
      <TaxonomyPageHeader
        title={`${brand.name} oto elektronik parçaları`}
        image={brand.logoUrl || `/images/brands/${brand.slug}.svg`}
        filterHref={`/parcalar?marka=${encodeURIComponent(brand.name)}`}
        filterLabel="Bu markada parça ara"
      />

      <TaxonomyProductResults
        products={products.page}
        emptyMessage="Bu markaya ait şu anda yayında parça bulunmuyor."
      />
    </section>
  );
}

export default function BrandPage({ params }: BrandPageProps) {
  return (
    <Suspense fallback={<ProductListingSkeleton />}>
      <BrandContent params={params} />
    </Suspense>
  );
}
