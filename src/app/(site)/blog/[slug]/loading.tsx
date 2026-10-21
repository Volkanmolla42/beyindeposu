export default function BlogArticleLoading() {
  return (
    <div className="min-h-screen bg-slate-50" aria-busy="true">
      <p role="status" className="sr-only">
        Yazı yükleniyor
      </p>
      <div
        aria-hidden="true"
        className="animate-pulse motion-reduce:animate-none"
      >
        <div className="h-[420px] bg-dark-bg" />
        <div className="mx-auto max-w-4xl space-y-4 px-4 py-10 sm:px-6 lg:px-8">
          <div className="h-4 w-56 rounded bg-slate-200" />
          <div className="h-8 w-3/4 rounded bg-slate-200" />
          <div className="h-40 rounded-2xl border border-slate-200 bg-white" />
          <div className="h-4 w-full rounded bg-slate-200" />
          <div className="h-4 w-11/12 rounded bg-slate-200" />
          <div className="h-4 w-4/5 rounded bg-slate-200" />
          <div className="h-24 rounded-2xl border border-slate-200 bg-white" />
        </div>
      </div>
    </div>
  );
}
