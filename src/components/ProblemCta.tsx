import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProblemCta() {
  return (
    <div className="relative rounded-3xl overflow-hidden bg-dark-bg text-white p-8 sm:p-12 lg:p-14 border border-white/10 shadow-2xl">
      <div className="absolute inset-y-0 right-0 w-full md:w-3/5 opacity-35 md:opacity-55 pointer-events-none select-none">
        <Image
          src="/images/cta-car-banner.jpg"
          alt="Aracınızda bir sorun mu var?"
          fill
          className="object-cover object-right"
          sizes="(max-width: 768px) 100vw, 60vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-bg via-dark-bg/10 to-transparent" />
      </div>

      <div className="relative z-10 max-w-xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
          Aracınızda bir sorun mu var?
        </h2>
        <p className="text-sm sm:text-base text-slate-300 mb-6 sm:mb-8 leading-relaxed">
          Uzman ekibimizden destek alın. Aracınız için en doğru çözümü birlikte bulalım.
        </p>
        <Button asChild variant="default" size="lg" className="rounded-full shadow-md font-semibold">
          <Link href="/hakkimizda">
            <span>Hemen İletişime Geç</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
