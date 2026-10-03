import { Suspense } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  createPageMetadata,
  metadataDescription,
  plainText,
  SITE_NAME,
} from "@/lib/seo";
import { getPublicCategoryPage } from "@/lib/seo-data";
import { ProductListingSkeleton } from "@/components/RouteSkeletons";
import TaxonomyProductResults from "@/components/TaxonomyProductResults";
import TaxonomyPageHeader from "@/components/TaxonomyPageHeader";


type CategoryPageProps = {
  params: Promise<{ slug: string }>;
};

function getCategoryDescription(category: {
  name: string;
  description?: string;
  metaDescription?: string;
}) {
  const description = plainText(category.metaDescription?.trim() || category.description || "");
  return metadataDescription(
    description || `${category.name} kategorisindeki oto elektronik parçalarını inceleyin.`,
  );
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const page = await getPublicCategoryPage(slug);

  if (!page) notFound();

  const { category } = page;
  const title = category.metaTitle?.trim() || `${category.name} | ${SITE_NAME}`;
  const path = `/kategoriler/${category.slug}`;

  return {
    ...createPageMetadata({
      title,
      description: getCategoryDescription(category),
      path,
    }),
    title: { absolute: title },
    robots: category.isActive === true && page.products.page.length > 0
      ? { index: true, follow: true }
      : { index: false, follow: true },
  };
}

async function CategoryContent({ params }: CategoryPageProps) {
  const { slug } = await params;
  const page = await getPublicCategoryPage(slug);

  if (!page) notFound();

  const { category, products } = page;
  const description = plainText(category.description || "");

  return (
    <section className="container py-8 md:py-12">
      <TaxonomyPageHeader
        title={category.name}
        image={category.image}
        description={description}
        filterHref={`/parcalar?kategori=${encodeURIComponent(category.slug)}`}
        filterLabel="Bu kategoride parça ara"
      />

      <TaxonomyProductResults
        products={products.page}
        emptyMessage="Bu kategoride şu anda yayında parça bulunmuyor."
      />
    </section>
  );
}

export default function CategoryPage({ params }: CategoryPageProps) {
  return (
    <Suspense fallback={<ProductListingSkeleton />}>
      <CategoryContent params={params} />
    </Suspense>
  );
}
