"use client";

import Image from "next/image";
import Link from "next/link";
import { Phone, ExternalLink } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { Button } from "@/components/ui/button";
import { useContactSettings } from "@/hooks/useContactSettings";
import { formatPhoneNumber, getWhatsAppUrl } from "@/lib/whatsapp";
import { cn } from "@/lib/utils";

interface ProblemCtaProps {
  title?: string;
  description?: string;
  className?: string;
}

export default function ProblemCta({
  title = "Aracınızda bir sorun mu var?",
  description = "Uzman ekibimizden destek alın. Aracınız için en doğru çözümü birlikte bulalım.",
  className,
}: ProblemCtaProps) {
  const { phoneNumber } = useContactSettings();
  const displayPhone = formatPhoneNumber(phoneNumber);
  const cleanPhone = phoneNumber ? phoneNumber.replace(/[^0-9+]/g, "") : "";

  return (
    <div
      className={cn(
        "relative rounded-3xl overflow-hidden bg-dark-bg text-white p-8 sm:p-12 lg:p-14 border border-white/10 shadow-2xl",
        className
      )}
    >
      <div className="absolute inset-y-0 right-0 w-full md:w-3/5 opacity-35 md:opacity-55 pointer-events-none select-none">
        <Image
          src="/images/cta-car-banner.jpg"
          alt={title}
          fill
          className="object-cover object-right"
          sizes="(max-width: 768px) 100vw, 60vw"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-dark-bg via-dark-bg/40 to-transparent" />
      </div>

      <div className="relative z-10 max-w-3xl">
        <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight mb-3">
          {title}
        </h2>
        <p className="text-sm sm:text-base text-slate-300 mb-6 sm:mb-8 leading-relaxed max-w-xl">
          {description}
        </p>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4">
          <Button
            asChild
            variant="whatsapp"
            size="lg"
            className="rounded-full shadow-md font-semibold shrink-0"
          >
            <a
              href={getWhatsAppUrl(undefined, phoneNumber)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2"
            >
              <WhatsAppIcon className="w-4 h-4 fill-white" />
              <span>WhatsApp Danışma</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </Button>

          {cleanPhone && (
            <Button
              asChild
              variant="darkOutline"
              size="lg"
              className="rounded-full font-semibold border-white/20 text-white hover:bg-white/10 hover:text-white shrink-0"
            >
              <a href={`tel:${cleanPhone}`} className="flex items-center gap-2">
                <Phone className="w-4 h-4" />
                <span>{displayPhone || "Hemen Arayın"}</span>
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </Button>
          )}

          <Button
            asChild
            variant="ghost"
            size="lg"
            className="rounded-full text-slate-300 hover:text-white hover:bg-white/10 shrink-0"
          >
            <Link href="/iletisim" className="flex items-center gap-1.5 text-xs sm:text-sm whitespace-nowrap">
              <span>İletişim Bilgileri</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
