import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Cpu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";

type TaxonomyPageHeaderProps = {
  title: string;
  image?: string | null;
  description?: string;
  filterHref: string;
  filterLabel: string;
};

export default function TaxonomyPageHeader({
  title,
  image,
  description,
  filterHref,
  filterLabel,
}: TaxonomyPageHeaderProps) {
  return (
    <header className="mb-7 flex min-w-0 flex-col gap-4 md:flex-row md:items-center md:gap-6">
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4 md:flex-1">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white p-2 shadow-xs sm:h-20 sm:w-20 sm:p-3">
          {image ? (
            <Image
              src={image}
              alt=""
              width={80}
              height={80}
              sizes="(max-width: 640px) 56px, 80px"
              unoptimized
              className="h-full w-full object-contain"
            />
          ) : (
            <Cpu className="h-7 w-7 text-blue-700" aria-hidden="true" />
          )}
        </div>
        <div className="min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            {title}
          </h1>
          {description && (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              {description}
            </p>
          )}
        </div>
      </div>
      <Button asChild size="lg" className="shrink-0 self-end md:ml-auto">
        <Link href={filterHref}>
          <Search className="h-4 w-4" aria-hidden="true" />
          {filterLabel}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </Button>
    </header>
  );
}
