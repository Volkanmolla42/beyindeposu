import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import {
  createPageMetadata,
  metadataDescription,
  plainText,
  SITE_NAME,
} from "@/lib/seo";
import { getPublicCategoryPage } from "@/lib/seo-data";

export const revalidate = 3600;

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

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const page = await getPublicCategoryPage(slug);

  if (!page) notFound();

  const { category, products } = page;
  const description = plainText(category.description || "");

  return (
    <section className="container py-8 md:py-12">
      <nav aria-label="İçerik yolu" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-700">Ana sayfa</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/kategoriler" className="hover:text-blue-700">Kategoriler</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-slate-900">{category.name}</span>
      </nav>

      <header className="mt-6 mb-7">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          {category.name}
        </h1>
        {description && <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">{description}</p>}
      </header>

      {products.page.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.page.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Bu kategoride şu anda yayında parça bulunmuyor.
        </p>
      )}

      {!products.isDone && (
        <div className="mt-8 text-center">
          <Link
            href={`/parcalar?kategori=${encodeURIComponent(category.slug)}`}
            className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
          >
            Bu kategorideki tüm parçaları gör
          </Link>
        </div>
      )}
    </section>
  );
}
