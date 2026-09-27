"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Cpu, Layers } from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@convex/_generated/api";
import OemSearchBar from "@/components/OemSearchBar";

function getRepeatedBrands<T>(items: T[], minCount = 28): T[] {
  if (items.length === 0) return [];
  const repeatCount = Math.max(1, Math.ceil(minCount / items.length));
  const result: T[] = [];
  for (let i = 0; i < repeatCount; i++) {
    result.push(...items);
  }
  return result;
}

export default function HomePage() {
  const categories = useQuery(api.categories.list, {});
  const brands = useQuery(api.brands.list);
  const allBrands = brands ?? [];
  const brandSplitIndex = Math.ceil(allBrands.length / 2);
  const brandRows = [
    allBrands.slice(0, brandSplitIndex),
    allBrands.slice(brandSplitIndex),
  ].filter((row) => row.length > 0);

  return (
    <>
      <section className="relative isolate flex min-h-[calc(100svh-76px)] flex-col overflow-hidden bg-slate-100 text-slate-900">
        <div className="absolute inset-0 z-0 hidden sm:block">
          <Image
            src="/images/home-hero.webp"
            alt="Beyin Deposu oto elektronik parça merkezi"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center sm:object-[65%_center]"
          />
        </div>

        <div className="absolute inset-0 z-0 sm:hidden">
          <Image
            src="/images/home-hero-mobile.webp"
            alt="Beyin Deposu oto elektronik parça merkezi"
            fill
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>

        <div className="container relative z-20 flex flex-col justify-start py-8 sm:flex-1 sm:justify-center sm:py-12">
          <div className="max-w-xl">
            <h1 className="max-w-xl text-4xl font-medium leading-[1.08] tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
              Aracınıza uygun <span className="text-blue-700">elektronik parçayı</span> bulun.
            </h1>

            <div className="mt-8 max-w-lg">
              <OemSearchBar variant="hero" />
            </div>
          </div>
        </div>
      </section>

      <section className="container pb-12 pt-8 sm:pb-16">
        <div className="grid grid-cols-2 gap-px overflow-hidden rounded-3xl border border-slate-200 bg-slate-200 md:grid-cols-4">
          {[
            ["15.000+", "Stoklu ürün"],
            [brands && brands.length > 0 ? `${brands.length}+` : "32+", "Araç markası"],
            ["1.000+", "ECU modeli"],
            ["20+", "Yıllık tecrübe"],
          ].map(([value, label]) => (
            <div key={label} className="bg-white px-4 py-6 text-center sm:px-6 sm:py-8">
              <div className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">{value}</div>
              <div className="mt-1 text-sm text-slate-600">{label}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="container py-12 sm:py-16">
        <div className="mb-6 flex items-end justify-between gap-4">
          <h2 className="text-2xl font-medium tracking-tight text-slate-900 sm:text-3xl">
            Ürün kategorileri
          </h2>
          <Link
            href="/urunler"
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
          >
            Tüm ürünler
            <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
          {categories?.map((category) => (
            <Link
              key={category._id || category.slug}
              href={`/urunler?kategori=${category.slug}`}
              className="group flex min-h-24 items-center gap-3 rounded-2xl border border-slate-200 bg-white p-3 transition-colors hover:border-blue-200 hover:bg-blue-50/50 sm:gap-4 sm:p-4"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-100 sm:h-16 sm:w-16">
                {category.image ? (
                  <div className="relative h-full w-full">
                    <Image
                      src={category.image}
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
                <h3 className="text-sm font-medium leading-5 text-slate-800 group-hover:text-blue-800">
                  {category.name}
                </h3>
              </div>
              <ArrowRight className="h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-blue-700" aria-hidden="true" />
            </Link>
          ))}
        </div>
      </section>

      {brands && brands.length > 0 && (
        <section className="border-y border-slate-200 bg-white">
          <div className="container py-10">
            <div className="mb-5 flex items-center justify-between gap-4">
              <h2 className="text-xl font-medium tracking-tight text-slate-900 sm:text-2xl">
                Araç markaları
              </h2>
              <Link
                href="/markalar"
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-blue-700 hover:bg-blue-50"
              >
                Tüm markalar
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </div>
            <div className="space-y-3">
              {brandRows.map((row, rowIndex) => {
                const repeatedBrands = getRepeatedBrands(row, 28);
                return (
                  <div className="brand-marquee" key={rowIndex}>
                    <div
                      className={`brand-marquee__track ${rowIndex === 0 ? "brand-marquee__track--right" : ""}`}
                    >
                      {[false, true].map((isDuplicate) => (
                        <div
                          key={String(isDuplicate)}
                          className="flex w-max shrink-0 items-center gap-2 pr-2"
                          aria-hidden={isDuplicate}
                        >
                          {repeatedBrands.map((brand, itemIndex) => (
                            <Link
                              key={`${isDuplicate ? "dup" : "orig"}-${rowIndex}-${itemIndex}-${brand._id}`}
                              href={`/urunler?marka=${encodeURIComponent(brand.name)}`}
                              tabIndex={isDuplicate ? -1 : undefined}
                              className="group inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition-colors hover:border-blue-200 hover:bg-blue-50 hover:text-blue-800"
                            >
                              {brand.logoUrl ? (
                                <Image
                                  src={brand.logoUrl}
                                  alt=""
                                  width={16}
                                  height={16}
                                  className="h-4 w-4 object-contain opacity-80 transition-opacity group-hover:opacity-100"
                                />
                              ) : (
                                <Layers className="h-4 w-4 text-slate-500" aria-hidden="true" />
                              )}
                              {brand.name}
                            </Link>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
