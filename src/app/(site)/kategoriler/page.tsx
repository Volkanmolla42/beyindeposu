import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Cpu } from "lucide-react";
import { createPageMetadata } from "@/lib/seo";
import { getPublicCategories } from "@/lib/seo-data";

export const revalidate = 3600;

export const metadata = createPageMetadata({
  title: "Kategoriler",
  description: "Oto elektronik parçalarını kategorilerine göre inceleyin.",
  path: "/kategoriler",
});

export default async function CategoriesPage() {
  const categories = await getPublicCategories();

  return (
    <section className="container py-8 md:py-12">
      <nav aria-label="İçerik yolu" className="text-sm text-slate-500">
        <Link href="/" className="hover:text-blue-700">Ana sayfa</Link>
        <span className="mx-2" aria-hidden="true">/</span>
        <span className="text-slate-900">Kategoriler</span>
      </nav>

      <h1 className="mt-6 text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Kategoriler
      </h1>

      <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((category) => {
          const categoryImage = category.image &&
            /^(?:data:image\/webp;)|\.webp(?:[?#]|$)/i.test(category.image)
              ? category.image
              : null;

          return (
            <li key={category._id}>
              <Link
                href={`/kategoriler/${encodeURIComponent(category.slug)}`}
                className="group flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 sm:gap-4 sm:p-4"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-16 sm:w-16">
                  {categoryImage ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={categoryImage}
                        alt={category.name}
                        fill
                        sizes="64px"
                        className="object-contain p-1"
                      />
                    </div>
                  ) : (
                    <Cpu className="h-7 w-7 text-blue-700" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-medium leading-5 text-slate-800 group-hover:text-blue-800">
                    {category.name}
                  </h2>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" aria-hidden="true" />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
