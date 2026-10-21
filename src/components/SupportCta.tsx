"use client";

import { Phone } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { useContactSettings } from "@/hooks/useContactSettings";
import { formatPhoneNumber, getWhatsAppUrl } from "@/lib/whatsapp";
import { Button } from "@/components/ui/button";

export default function SupportCta() {
  const { phoneNumber } = useContactSettings();

  return (
    <div className="my-12 p-6 sm:p-8 rounded-3xl bg-dark-bg text-white border border-dark-border shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
      <div className="max-w-md">
        <span className="inline-block text-xs font-bold text-amber-400 uppercase tracking-wider mb-2">
          İletişim ve Destek
        </span>
        <h4 className="text-lg sm:text-xl font-bold text-white mb-2">Test ve Onarım Desteği</h4>
        <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
          Aracınızdaki bu sorunu çözmek için teknisyenlerimizle görüşebilir, test ve tamir desteği alabilirsiniz.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 shrink-0">
        <Button asChild variant="whatsapp" className="rounded-full">
          <a
            href={getWhatsAppUrl(undefined, phoneNumber)}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2"
          >
            <WhatsAppIcon className="w-4 h-4 fill-white" />
            <span>WhatsApp Danışma</span>
          </a>
        </Button>
        <Button asChild variant="default" className="rounded-full">
          <a
            href={`tel:${phoneNumber?.replace(/[^0-9+]/g, "") || ""}`}
            className="flex items-center gap-2"
          >
            <Phone className="w-4 h-4" />
            <span>{formatPhoneNumber(phoneNumber) || "Hemen Arayın"}</span>
          </a>
        </Button>
      </div>
    </div>
  );
}
