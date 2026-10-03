function SkeletonBlock({ className }: { className: string }) {
  return <div aria-hidden="true" className={`animate-pulse rounded-xl bg-slate-200 ${className}`} />;
}

export function CatalogSkeleton() {
  return (
    <section className="container py-8" aria-label="Parçalar yükleniyor" role="status">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <aside className="space-y-4 lg:col-span-3">
          <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
            <SkeletonBlock className="h-5 w-28" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
            <SkeletonBlock className="h-10 w-full" />
          </div>
          <SkeletonBlock className="hidden h-36 w-full lg:block" />
        </aside>
        <div className="space-y-4 lg:col-span-9">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <SkeletonBlock className="h-10 w-full max-w-lg" />
            <SkeletonBlock className="mt-4 h-4 w-36" />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3">
                <SkeletonBlock className="aspect-4/3 w-full" />
                <SkeletonBlock className="mt-4 h-4 w-3/4" />
                <SkeletonBlock className="mt-2 h-4 w-1/2" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function ProductListingSkeleton() {
  return (
    <section className="container py-8 md:py-12" aria-label="Parçalar yükleniyor" role="status">
      <SkeletonBlock className="h-4 w-48" />
      <SkeletonBlock className="mb-7 mt-7 h-8 w-64" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, index) => (
          <div key={index} className="rounded-2xl border border-slate-200 bg-white p-3">
            <SkeletonBlock className="aspect-4/3 w-full" />
            <SkeletonBlock className="mt-4 h-4 w-3/4" />
            <SkeletonBlock className="mt-2 h-4 w-1/2" />
          </div>
        ))}
      </div>
    </section>
  );
}

export function ProductDetailSkeleton() {
  return (
    <section className="container py-8 md:py-12" aria-label="Parça yükleniyor" role="status">
      <SkeletonBlock className="mb-7 h-4 w-52" />
      <div className="grid gap-8 lg:grid-cols-2">
        <SkeletonBlock className="aspect-4/3 w-full rounded-2xl" />
        <div className="space-y-4">
          <SkeletonBlock className="h-7 w-3/4" />
          <SkeletonBlock className="h-5 w-1/2" />
          <SkeletonBlock className="h-28 w-full" />
          <SkeletonBlock className="h-12 w-full max-w-xs rounded-full" />
        </div>
      </div>
    </section>
  );
}
