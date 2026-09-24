"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { X, Send } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { generateWhatsAppLink } from "@/lib/utils";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

export default function FloatingWhatsApp() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const settings = useQuery(api.siteSettings.get);
  const whatsappNumber = settings?.whatsappNumber || "";

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const url = generateWhatsAppLink(
      whatsappNumber,
      undefined,
      undefined,
      message || "Merhaba Beyindeposuu, parça danışmak istiyorum."
    );
    window.open(url, "_blank");
    setOpen(false);
    setMessage("");
  };

  // Hide on admin and login pages
  if (pathname?.startsWith("/admin") || pathname === "/login") {
    return null;
  }

  return (
    <div className="fixed bottom-5 left-5 z-50 flex flex-col items-start">
      {/* WhatsApp Popup Card */}
      {open && (
        <div className="mb-3 w-80 sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-emerald-600 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                <WhatsAppIcon className="w-6 h-6 fill-white text-white" />
              </div>
              <div>
                <h4 className="font-bold text-sm">Beyindeposuu WhatsApp</h4>
                <p className="text-[11px] text-emerald-100 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-300 animate-ping inline-block" />
                  Hızlı WhatsApp İletişim Hattı
                </p>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white p-1 rounded-lg cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="p-4 bg-slate-50 space-y-3">
            <div className="bg-white p-3 rounded-xl rounded-tl-none border border-slate-200/80 shadow-xs max-w-[85%] text-xs text-slate-700 space-y-1">
              <p className="font-semibold text-slate-900">
                👋 Merhaba! Beyindeposuu&apos;na hoş geldiniz.
              </p>
              <p>
                Aradığınız parçanın OEM kodunu veya fotoğrafını iletin, stok ve fiyat durumunu anında bildirelim.
              </p>
            </div>
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mesajınızı yazın..."
              className="flex-1 text-xs border border-slate-300 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl p-2 transition-colors cursor-pointer"
              aria-label="Gönder"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Left Button */}
      <button
        onClick={() => setOpen(!open)}
        className="group relative flex items-center gap-2.5 bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold px-4 py-3.5 rounded-full shadow-2xl hover:shadow-emerald-500/40 transition-all duration-300 transform hover:-translate-y-0.5 cursor-pointer"
        aria-label="WhatsApp Destek"
      >
        <WhatsAppIcon className="w-5 h-5 fill-white text-white shrink-0" />
        <span className="text-sm tracking-tight font-extrabold hidden sm:inline">WhatsApp</span>
        <span className="w-2.5 h-2.5 rounded-full bg-white border-2 border-emerald-500 animate-pulse" />
      </button>
    </div>
  );
}
