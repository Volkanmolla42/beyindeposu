import Link from "next/link";

export default function ProductNotFound() {
  return (
    <section className="container flex min-h-96 flex-col items-center justify-center gap-5 py-16 text-center">
      <h1 className="text-2xl font-semibold text-slate-900">Parça bulunamadı</h1>
      <Link href="/parcalar" className="font-medium text-blue-700 hover:text-blue-800">
        Parça kataloğuna dön
      </Link>
    </section>
  );
}
