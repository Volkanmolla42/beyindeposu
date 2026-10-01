"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { X, Send } from "lucide-react";
import WhatsAppIcon from "@/components/WhatsAppIcon";
import { getWhatsAppUrl } from "@/lib/whatsapp";
import { trackAnalytics } from "@/lib/analytics";

export default function FloatingWhatsApp() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    const url = getWhatsAppUrl(
      message.trim() ? { message: message.trim() } : undefined
    );
    trackAnalytics("whatsapp_click");
    window.open(url, "_blank", "noopener,noreferrer");
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
        <div className="mb-3 w-80 max-w-[calc(100vw-2.5rem)] sm:w-96 rounded-2xl bg-white shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in-0 slide-in-from-bottom-4 duration-200">
          {/* Header */}
          <div className="bg-emerald-700 text-white p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-white/15 flex items-center justify-center">
                <WhatsAppIcon className="w-5 h-5 fill-white text-white" />
              </div>
              <div>
                <h4 className="font-semibold text-sm">Beyin Deposu WhatsApp</h4>
              </div>
            </div>
            <button
              onClick={() => setOpen(false)}
              className="text-white/80 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Chat Body */}
          <div className="p-4 bg-slate-50 space-y-3">
            <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-slate-200/80 shadow-xs max-w-[85%] text-xs text-slate-700 leading-relaxed">
              <p>OEM kodunu veya parça fotoğrafını gönderin.</p>
            </div>
          </div>

          {/* Input Footer */}
          <form onSubmit={handleSend} className="p-3 bg-white border-t border-slate-200 flex items-center gap-2">
            <input
              id="whatsapp-chat-message"
              name="whatsapp-message"
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Mesaj yazın…"
              aria-label="WhatsApp mesajı"
              className="min-w-0 flex-1 text-xs border border-slate-300 rounded-xl px-3.5 py-2 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              autoFocus
            />
            <button
              type="submit"
              className="bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl p-2 transition-colors cursor-pointer disabled:opacity-50"
              aria-label="Mesajı WhatsApp ile gönder"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* Floating Left Button */}
      <button
        onClick={() => setOpen(!open)}
        className="group relative flex items-center gap-2.5 h-11 sm:h-12 px-3.5 sm:px-4 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-medium text-sm shadow-lg shadow-slate-900/15 hover:shadow-xl hover:shadow-slate-900/20 border border-emerald-600/40 transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] cursor-pointer"
        aria-label="WhatsApp desteği"
        aria-expanded={open}
      >
        <div className="relative flex items-center justify-center">
          <WhatsAppIcon className="w-5 h-5 fill-white text-white shrink-0" />
        </div>
        <span className="text-sm font-semibold tracking-tight hidden sm:inline">WhatsApp</span>
      </button>
    </div>
  );
}
