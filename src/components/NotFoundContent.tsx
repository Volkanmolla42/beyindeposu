import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function NotFoundContent() {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 text-center">
      <p className="text-sm font-semibold text-blue-700">404</p>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
        Sayfa bulunamadı
      </h1>
      <p className="text-sm leading-relaxed text-slate-600">
        Aradığınız sayfayı bulamadık.
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link href="/">Ana sayfaya dön</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/parcalar">Parça kataloğu</Link>
        </Button>
      </div>
    </div>
  );
}
