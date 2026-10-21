import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function BlogNotFound() {
  return (
    <section className="container flex min-h-[55vh] items-center justify-center py-16">
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 text-center">
        <p className="text-sm font-semibold text-amber-600">404</p>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
          Yazı bulunamadı
        </h1>
        <p className="text-sm leading-relaxed text-slate-600">
          Aradığınız blog yazısı yayınlanmamış veya kaldırılmış olabilir.
        </p>
        <Button asChild>
          <Link href="/blog">Bloga dön</Link>
        </Button>
      </div>
    </section>
  );
}
