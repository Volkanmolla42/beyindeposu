import Image from "next/image";
import Link from "next/link";
import { ArrowRight, ChevronRight, Cpu } from "lucide-react";
import HeroBanner from "@/components/ui/HeroBanner";

export type CatalogDirectoryItem = {
  id: string;
  image?: string | null;
  title: string;
  filterHref: string;
  detailHref: string;
};

type CatalogDirectoryPageProps = {
  title: string;
  badge: string;
  description: string;
  heroImage: string;
  actionLabel: string;
  detailLabel: string;
  items: CatalogDirectoryItem[];
};

export default function CatalogDirectoryPage({
  title,
  badge,
  description,
  heroImage,
  actionLabel,
  detailLabel,
  items,
}: CatalogDirectoryPageProps) {
  return (
    <>
      <HeroBanner
        src={heroImage}
        alt={title}
        eyebrow={badge}
        title={title}
        description={description}
      />

      <section className="container py-8 md:py-12">
        <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item, index) => (
            <li key={item.id}>
              <div className="flex h-full flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-amber-400 hover:shadow-md sm:p-4">
                <Link
                  href={item.filterHref}
                  className="group flex min-h-16 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:gap-4"
                >
                  <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-100 bg-slate-50 transition-colors group-hover:border-amber-200 sm:h-20 sm:w-20">
                    {item.image ? (
                      <div className="relative h-full w-full">
                        <Image
                          src={item.image}
                          alt=""
                          fill
                          sizes="80px"
                          preload={index < 3}
                          loading={index < 6 ? "eager" : "lazy"}
                          className="object-contain p-1"
                        />
                      </div>
                    ) : (
                      <Cpu className="h-8 w-8 text-amber-500" aria-hidden="true" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-sm font-semibold leading-5 text-slate-800 transition-colors group-hover:text-amber-700 sm:text-base">
                      {item.title}
                    </h2>
                  </div>
                </Link>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                  <Link
                    href={item.filterHref}
                    className="inline-flex min-h-10 items-center gap-1 text-xs font-semibold text-amber-600 transition-colors hover:text-amber-700 sm:text-sm"
                  >
                    {actionLabel}
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                  <Link
                    href={item.detailHref}
                    className="inline-flex min-h-10 items-center gap-0.5 rounded-full px-2 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    {detailLabel}
                    <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}
