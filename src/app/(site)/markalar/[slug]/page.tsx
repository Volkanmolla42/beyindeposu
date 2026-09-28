import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import ProductCard from "@/components/ProductCard";
import {
  createPageMetadata,
  metadataDescription,
  SITE_NAME,
} from "@/lib/seo";
import { getPublicBrandPage, getPublicBrands } from "@/lib/seo-data";

export const revalidate = 3600;

export async function generateStaticParams() {
  const brands = await getPublicBrands();
  return brands.map((brand) => ({
    slug: brand.slug,
  }));
}

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

export default async function BrandPage({ params }: BrandPageProps) {
  const { slug } = await params;
  const page = await getPublicBrandPage(slug);

  if (!page) notFound();

  const { brand, products } = page;

  return (
    <section className="container py-8 md:py-12">
      <nav aria-label="İçerik yolu" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-700">Ana sayfa</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <Link href="/markalar" className="hover:text-blue-700">Markalar</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-slate-900">{brand.name}</span>
      </nav>

      <h1 className="mb-7 mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        {brand.name} oto elektronik parçaları
      </h1>

      {products.page.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {products.page.map((product) => (
            <ProductCard key={product._id} product={product} />
          ))}
        </div>
      ) : (
        <p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          Bu markaya ait şu anda yayında parça bulunmuyor.
        </p>
      )}

      {!products.isDone && (
        <div className="mt-8 text-center">
          <Link
            href={`/parcalar?marka=${encodeURIComponent(brand.name)}`}
            className="text-sm font-medium text-blue-700 hover:text-blue-800 hover:underline"
          >
            Bu markanın tüm parçalarını gör
          </Link>
        </div>
      )}
    </section>
  );
}
