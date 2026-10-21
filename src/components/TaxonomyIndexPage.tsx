import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Cpu } from "lucide-react";
import HeroBanner from "@/components/ui/HeroBanner";

export type TaxonomyIndexItem = {
  id: string;
  image?: string | null;
  title: string;
  filterHref: string;
  detailHref: string;
};

type TaxonomyIndexPageProps = {
  title: string;
  badge: string;
  description: string;
  heroImage: string;
  actionLabel: string;
  detailLabel: string;
  items: TaxonomyIndexItem[];
};

export default function TaxonomyIndexPage({
  title,
  badge,
  description,
  heroImage,
  actionLabel,
  detailLabel,
  items,
}: TaxonomyIndexPageProps) {
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
            <div className="rounded-2xl border border-slate-200 bg-white p-3 transition-all hover:border-amber-400 hover:shadow-md sm:p-4">
              <Link
                href={item.filterHref}
                className="group flex min-h-16 items-center gap-3 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 sm:gap-4"
              >
                <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-slate-50 border border-slate-100 transition-colors group-hover:border-amber-200 sm:h-16 sm:w-16">
                  {item.image ? (
                    <div className="relative h-full w-full">
                      <Image
                        src={item.image}
                        alt=""
                        fill
                        sizes="64px"
                        preload={index < 3}
                        loading={index < 6 ? "eager" : "lazy"}
                        className="object-contain p-1"
                      />
                    </div>
                  ) : (
                    <Cpu className="h-7 w-7 text-amber-500" aria-hidden="true" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-sm font-semibold leading-5 text-slate-800 transition-colors group-hover:text-amber-700">
                    {item.title}
                  </h2>
                  <span className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-amber-600">
                    {actionLabel}
                    <ArrowRight
                      className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600"
                      aria-hidden="true"
                    />
                  </span>
                </div>
              </Link>
              <Link
                href={item.detailHref}
                className="mt-1 inline-flex min-h-8 items-center rounded-full px-3 text-xs text-slate-600 underline-offset-2 hover:bg-slate-100 hover:text-slate-900 hover:underline"
              >
                {detailLabel}
              </Link>
            </div>
          </li>
        ))}
      </ul>
      </section>
    </>
  );
}
