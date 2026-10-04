"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import {
  createEngagementTracker,
  flushAnalytics,
  setAnalyticsConsent,
  trackAnalytics,
  useAnalyticsConsent,
} from "@/lib/analytics";

const STORAGE_KEY = "bd_analytics_consent";

export default function AnalyticsProvider() {
  const pathname = usePathname();
  const consent = useAnalyticsConsent();
  const [preferences, setPreferences] = useState(false);
  const [analyticsSelection, setAnalyticsSelection] = useState<boolean | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const lastPage = useRef("");

  const selectedAnalytics =
    analyticsSelection ?? (consent.choice === "granted" && !consent.privacySignal);

  // 1. İlk yüklemede localStorage kontrolü (Anında hatırlama, zero-flash)
  useEffect(() => {
    let hasLocal = false;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "granted" || saved === "denied") {
        hasLocal = true;
        setAnalyticsConsent({ ready: true, enabled: true, choice: saved, privacySignal: false });
      }
    } catch {}

    if (!hasLocal) {
      setShowBanner(true);
    }

    // Sunucu ile arka planda tek seferlik senkronizasyon
    void fetch("/api/analytics/consent", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data) return;
        const serverChoice = data.choice === "granted" ? "granted" : data.choice === "denied" ? "denied" : null;
        const local = localStorage.getItem(STORAGE_KEY);
        const effective = (local === "granted" || local === "denied") ? local : serverChoice;

        if (effective) {
          try { localStorage.setItem(STORAGE_KEY, effective); } catch {}
          setShowBanner(false);
        } else {
          setShowBanner(true);
        }

        setAnalyticsConsent({
          ready: true,
          enabled: data.enabled === true,
          choice: effective,
          privacySignal: data.privacySignal === true,
        });

        // LocalStorage'da var ama sunucuda yoksa sunucuya kaydet
        if (!serverChoice && (local === "granted" || local === "denied")) {
          void fetch("/api/analytics/consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ choice: local }),
          }).catch(() => {});
        }
      })
      .catch(() => {});

    // Footer'daki "Çerez tercihleri" linki için event dinleyici
    const openPreferences = () => {
      setAnalyticsSelection(null);
      setPreferences(true);
    };
    window.addEventListener("analytics-preferences", openPreferences);

    // Sekmeler arası senkronizasyon (Storage event)
    const onStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && (e.newValue === "granted" || e.newValue === "denied")) {
        setAnalyticsConsent({ ready: true, enabled: true, choice: e.newValue, privacySignal: false });
        setShowBanner(false);
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("analytics-preferences", openPreferences);
      window.removeEventListener("storage", onStorage);
    };
  }, []);

  // 2. Sayfa ve ürün görüntüleme takibi
  useEffect(() => {
    if (!consent.enabled || consent.choice !== "granted" || consent.privacySignal) {
      lastPage.current = "";
      return;
    }
    if (lastPage.current === pathname) return;
    lastPage.current = pathname;

    trackAnalytics("page_view", { path: pathname });
    if (/^\/parcalar\/[^/]+$/.test(pathname)) {
      trackAnalytics("product_view", { path: pathname });
    }
  }, [pathname, consent.enabled, consent.choice, consent.privacySignal]);

  // 3. Etkileşim süresi (engagement) ve iletişim tıklamaları (whatsapp, telefon, e-posta)
  useEffect(() => {
    if (!consent.enabled || consent.choice !== "granted" || consent.privacySignal) return;
    const active = () => document.visibilityState === "visible" && document.hasFocus();
    const tracker = createEngagementTracker(Date.now(), active());
    const activity = () => { tracker.interact(Date.now()); };
    const recordEngagement = (nextActive: boolean) => {
      const duration = tracker.sample(Date.now(), nextActive);
      if (duration > 0) trackAnalytics("engagement", { path: pathname, number: duration });
    };
    const engagement = () => recordEngagement(active());
    const click = (event: MouseEvent) => {
      activity();
      const element = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(element instanceof HTMLAnchorElement)) return;
      if (element.protocol === "tel:") trackAnalytics("phone_click");
      else if (element.protocol === "mailto:") trackAnalytics("email_click");
      else if (["wa.me", "api.whatsapp.com", "web.whatsapp.com"].includes(element.hostname)) {
        trackAnalytics("whatsapp_click");
      }
    };
    const leave = () => {
      recordEngagement(false);
      void flushAnalytics();
    };
    const visibility = () => { if (document.visibilityState === "hidden") leave(); else engagement(); };
    const blur = () => { recordEngagement(false); };
    const flushTimer = window.setInterval(() => { void flushAnalytics(); }, 2000);
    const timeTimer = window.setInterval(engagement, 15000);

    window.addEventListener("scroll", activity, { passive: true });
    window.addEventListener("pointerdown", activity, { passive: true });
    window.addEventListener("keydown", activity);
    window.addEventListener("focus", engagement);
    window.addEventListener("blur", blur);
    window.addEventListener("pageshow", engagement);
    document.addEventListener("click", click);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("pagehide", leave);

    return () => {
      window.clearInterval(flushTimer);
      window.clearInterval(timeTimer);
      window.removeEventListener("scroll", activity);
      window.removeEventListener("pointerdown", activity);
      window.removeEventListener("keydown", activity);
      window.removeEventListener("focus", engagement);
      window.removeEventListener("blur", blur);
      window.removeEventListener("pageshow", engagement);
      document.removeEventListener("click", click);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("pagehide", leave);
      leave();
    };
  }, [pathname, consent.enabled, consent.choice, consent.privacySignal]);

  // 4. Kullanıcı tercihi kaydetme (Kabul et / Reddet)
  const choose = async (choice: "granted" | "denied") => {
    setBusy(true);
    try {
      localStorage.setItem(STORAGE_KEY, choice);
    } catch {}

    setAnalyticsConsent({ ...consent, choice, ready: true });
    setShowBanner(false);
    setPreferences(false);

    try {
      await fetch("/api/analytics/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      });
    } catch {
      // Arka plan senkronizasyonu hata alsa bile localStorage tercihi korur
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {showBanner && !preferences && (
        <aside
          aria-label="Gizlilik ve çerez tercihi"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[60] w-[calc(100%-1.5rem)] max-w-4xl"
        >
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 rounded-2xl border border-slate-200 bg-white/95 px-4 py-3 shadow-xl shadow-slate-900/10 backdrop-blur-md">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                <ShieldCheck aria-hidden="true" className="size-4" />
              </span>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                İsteğe bağlı analitik çerezleri site ve parça kullanımını anlamamıza yardım eder.{" "}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void choose("denied")}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Reddet
                </button>{" "}
                seçeneğiyle reddedebilir veya{" "}
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
                    setAnalyticsSelection(null);
                    setPreferences(true);
                  }}
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline cursor-pointer disabled:opacity-50"
                >
                  Tercihler
                </button>{" "}
                üzerinden düzenleyebilirsiniz.{" "}
                <Link
                  href="/gizlilik"
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  Ayrıntılar
                </Link>
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto justify-end">
              <Button
                variant="default"
                size="sm"
                disabled={busy}
                aria-busy={busy}
                className="w-full sm:w-auto h-9 shrink-0 rounded-xl px-5 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white cursor-pointer shadow-xs"
                onClick={() => void choose("granted")}
              >
                Kabul et
              </Button>
            </div>
          </div>
        </aside>
      )}

      {/* Tercihler Diyaloğu (Footer'daki 'Çerez tercihleri' veya banner'daki 'Tercihler' linki için) */}
      <Dialog open={preferences} onOpenChange={setPreferences}>
        <DialogContent className="max-h-[90dvh] w-[calc(100%-1.5rem)] max-w-xl gap-0 overflow-y-auto rounded-2xl p-0">
          <div className="border-b border-slate-200 bg-slate-50 px-5 py-5 pr-14 sm:px-6 sm:py-6">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-blue-100 text-blue-700">
                <ShieldCheck aria-hidden="true" className="size-5" />
              </span>
              <div className="space-y-1.5">
                <DialogTitle className="text-xl font-semibold leading-6">Çerez tercihleri</DialogTitle>
                <DialogDescription className="max-w-prose leading-5">
                  Zorunlu çerezler tercihinizi hatırlar. Analitik çerezleri isteğe bağlıdır; seçiminizi istediğiniz zaman değiştirebilirsiniz.
                </DialogDescription>
              </div>
            </div>
          </div>

          <div className="space-y-3 p-4 sm:p-6">
            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-900">Zorunlu çerezler</h3>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">Her zaman açık</span>
              </div>
              <p className="mt-2 text-sm leading-5 text-slate-600">Çerez tercihinizi hatırlamak ve seçiminize uymak için kullanılır.</p>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white p-4">
              <label htmlFor="analytics-cookie-choice" className="flex cursor-pointer items-start justify-between gap-4">
                <span className="flex min-w-0 items-start gap-3">
                  <input
                    id="analytics-cookie-choice"
                    type="checkbox"
                    checked={selectedAnalytics}
                    disabled={busy || !consent.enabled || consent.privacySignal}
                    onChange={(event) => setAnalyticsSelection(event.target.checked)}
                    aria-describedby="analytics-cookie-description"
                    className="mt-0.5 size-5 shrink-0 accent-blue-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-not-allowed"
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-900">Analitik çerezleri</span>
                    <span id="analytics-cookie-description" className="mt-1 block text-sm leading-5 text-slate-600">
                      Sayfa ve parça kullanımı, aramalar ve etkileşimler hakkında toplu ölçüm yapar. Analitik kayıtları 90 gün tutulur.
                    </span>
                  </span>
                </span>
                <span aria-hidden="true" className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${selectedAnalytics ? "bg-blue-50 text-blue-800" : "bg-slate-100 text-slate-700"}`}>
                  {selectedAnalytics ? "Açık" : "Kapalı"}
                </span>
              </label>
              {!consent.enabled && <p role="status" className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">Bu ortamda analitik tercihi şu anda kullanılamıyor.</p>}
              {consent.privacySignal && <p role="status" className="mt-3 rounded-lg bg-blue-50 px-3 py-2 text-sm text-blue-800">Tarayıcınız gizlilik sinyali gönderdi; analitik kapalı kalır.</p>}
            </section>

            <Link href="/gizlilik" className="inline-flex text-sm font-medium text-blue-700 underline underline-offset-2 hover:text-blue-800">
              Analitik ve gizlilik metnini okuyun
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t border-slate-200 bg-slate-50 p-4 sm:px-6">
            <Button variant="outline" disabled={busy} aria-busy={busy} className="w-full" onClick={() => void choose("denied")}>
              {busy ? "Kaydediliyor…" : "Hepsini reddet"}
            </Button>
            <Button variant="outline" disabled={busy} aria-busy={busy} className="w-full" onClick={() => void choose(selectedAnalytics ? "granted" : "denied")}>
              {busy ? "Kaydediliyor…" : "Seçimi kaydet"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
