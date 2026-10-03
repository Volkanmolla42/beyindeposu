export default function SiteLoading() {
  return (
    <section
      aria-busy="true"
      aria-describedby="site-loading-status"
      className="container py-8 md:py-12"
    >
      <p id="site-loading-status" role="status" className="sr-only">
        Sayfa yükleniyor
      </p>
      <div
        aria-hidden="true"
        className="animate-pulse space-y-6 motion-reduce:animate-none"
      >
        <div className="h-4 w-36 rounded bg-slate-200" />
        <div className="h-8 w-2/3 max-w-lg rounded bg-slate-200" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div
              key={index}
              className="rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div className="aspect-[4/3] rounded-xl bg-slate-100" />
              <div className="mt-4 h-4 w-3/4 rounded bg-slate-200" />
              <div className="mt-3 h-3 w-1/2 rounded bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
