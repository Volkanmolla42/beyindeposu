import Link from "next/link";
import Image from "next/image";
import { ChevronRight, Home, ArrowRight, Cpu } from "lucide-react";
import { getPublicBrands } from "@/lib/seo-data";

export const revalidate = 3600;

export default async function MarkalarPage() {
  const brands = await getPublicBrands();

  return (
    <>
      {/* Breadcrumbs */}
      <div className="bg-white border-b border-slate-200 py-3">
        <div className="container flex items-center gap-2 text-xs font-medium text-slate-500">
          <Link href="/" className="hover:text-blue-600 flex items-center gap-1">
            <Home className="w-3.5 h-3.5" />
            <span>Ana sayfa</span>
          </Link>
          <ChevronRight className="w-3 h-3 text-slate-400" />
          <span className="text-slate-900 font-bold">Markalar</span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-white border-b border-slate-200 py-10">
        <div className="container text-center space-y-3">
          <h1 className="text-3xl font-medium tracking-tight text-slate-900 sm:text-4xl">
            Araç markaları
          </h1>
        </div>
      </div>

      {/* Brands Grid */}
      <div className="container py-12">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-5">
          {brands?.map((brand) => (
            <Link
              key={brand._id}
              href={`/markalar/${encodeURIComponent(brand.slug)}`}
              className="group relative flex flex-col items-center justify-center overflow-hidden rounded-3xl border border-slate-200 bg-white p-6 text-center transition-colors hover:border-blue-200 hover:bg-blue-50/30"
            >
              <div className="mb-3 flex h-18 w-18 items-center justify-center rounded-2xl bg-slate-50 p-3 transition-colors group-hover:bg-blue-50">
                {brand.logoUrl ? (
                  <Image
                    src={brand.logoUrl || `/images/brands/${brand.slug}.svg`}
                    alt={`${brand.name} logosu`}
                    width={48}
                    height={48}
                    className="w-12 h-12 object-contain filter group-hover:brightness-90 transition-transform duration-300"
                  />
                ) : (
                  <Cpu className="w-8 h-8 text-blue-600" />
                )}
              </div>
              <h2 className="text-base font-medium text-slate-900 transition-colors group-hover:text-blue-700">
                {brand.name}
              </h2>
              <ArrowRight className="mt-1 h-3 w-3 text-slate-400 transition-transform group-hover:translate-x-1 group-hover:text-blue-700" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </div>
    </>
  );
}
