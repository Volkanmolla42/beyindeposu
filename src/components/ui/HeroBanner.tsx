import Image from "next/image";
import { ReactNode } from "react";

interface HeroBannerProps {
  /** Arka plan görseli yolu (/images/... veya URL) */
  src: string;
  /** Görsel alt etiketi */
  alt: string;
  /** Yükseklik standardı: "half" (varsayılan - alt sayfalar) | "full" (ana sayfa hero) */
  size?: "half" | "full";
  /** Üst etiket */
  eyebrow: string;
  /** Ana başlık */
  title: string;
  /** Açıklama */
  description: string;
  /** Alt eylem alanı (CTA butonları, arama) */
  actions?: ReactNode;
}

export default function HeroBanner({
  src,
  alt,
  size = "half",
  eyebrow,
  title,
  description,
  actions,
}: HeroBannerProps) {
  const heightClass =
    size === "full"
      ? "min-h-[calc(100svh-72px)] py-16 sm:py-24"
      : "min-h-[calc(55svh-36px)] min-h-[440px] sm:min-h-[480px] py-14 sm:py-20";

  return (
    <section
      className={`relative flex flex-col justify-center overflow-hidden bg-dark-bg text-white border-b border-slate-800 ${heightClass}`}
    >
      <div className="absolute inset-0 z-0 pointer-events-none select-none">
        <Image
          src={src}
          alt={alt}
          fill
          preload
          fetchPriority="high"
          loading="eager"
          className="object-cover object-right sm:object-center opacity-65 sm:opacity-75 transition-opacity duration-300"
          sizes="100vw"
        />
        {/* Soldan sağa metin kontrast gradyanı: Metin solda net okunur, görsel canlı kalır */}
        <div className="absolute inset-0 bg-gradient-to-r from-dark-bg/90 via-dark-bg/55 to-black/15" />
        {/* Alttan yukarıya yumuşak zemin gradyanı */}
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg/75 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full">
        <div className="container">
          <div className="max-w-3xl space-y-4 sm:space-y-5">
            <span className="inline-block text-xs font-bold tracking-wider text-amber-400 uppercase sm:text-sm">
              {eyebrow}
            </span>
            <h1 className="text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
              {title}
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-slate-300 sm:text-lg">
              {description}
            </p>
            {actions && (
              <div className="flex flex-wrap items-center gap-3 pt-2">
                {actions}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
