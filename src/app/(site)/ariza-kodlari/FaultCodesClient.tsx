"use client";

import { useState, useMemo } from "react";
import Image from "next/image";
import HeroBanner from "@/components/ui/HeroBanner";
import {
  Search,
  X,
  FileText,
  AlertTriangle,
  CheckCircle2,
  CarFront,
  Zap,
  TrendingDown,
  ShieldCheck,
  Activity,
  ChevronRight,
  Info,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import TrustBadgeStrip from "@/components/TrustBadgeStrip";
import FeatureCardGrid from "@/components/FeatureCardGrid";

export type FaultCodeItem = {
  code: string;
  title: string;
  description?: string;
  isPopular: boolean;
};

export default function FaultCodesClient({ codes }: { codes: FaultCodeItem[] }) {
  const [searchInput, setSearchInput] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [activeCode, setActiveCode] = useState<FaultCodeItem | null>(null);

  const filteredCodes = useMemo(() => {
    const q = searchInput.trim().toLowerCase();

    if (q || selectedCategory !== "ALL") {
      return codes.filter((item) => {
        const matchesCategory =
          selectedCategory === "ALL" || item.code.toUpperCase().startsWith(selectedCategory);

        if (!matchesCategory) return false;
        if (!q) return true;

        return (
          item.code.toLowerCase().includes(q) ||
          item.title.toLowerCase().includes(q) ||
          (item.description && item.description.toLowerCase().includes(q))
        );
      });
    }

    const populars = codes.filter((item) => item.isPopular);
    return populars.length > 0 ? populars : codes;
  }, [codes, searchInput, selectedCategory]);

  const counts = useMemo(() => {
    const res = { ALL: codes.length, P: 0, C: 0, B: 0, U: 0 };
    for (const item of codes) {
      const prefix = item.code.charAt(0).toUpperCase() as "P" | "C" | "B" | "U";
      if (res[prefix] !== undefined) {
        res[prefix]++;
      }
    }
    return res;
  }, [codes]);

  const isSearching = searchInput.trim().length > 0 || selectedCategory !== "ALL";
  const hasNoCodes = codes.length === 0;

  const handleSearchSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
  };

  const obdBadges = [
    {
      icon: CarFront,
      title: "Tüm Marka ve Modeller",
      description: "Kapsamlı veri tabanı",
    },
    {
      icon: FileText,
      title: "Kod Anlamları",
      description: "Detaylı açıklamalar",
    },
    {
      icon: AlertTriangle,
      title: "Arıza Sebepleri",
      description: "Olası nedenler",
    },
    {
      icon: CheckCircle2,
      title: "Çözüm Önerileri",
      description: "Doğru müdahale",
    },
  ];

  const obdBenefits = [
    {
      icon: Zap,
      title: "Doğrudan Arıza Tespiti",
      description: "Deneme yanılma yapmadan arızanın kaynağını doğrudan tespit eder.",
    },
    {
      icon: TrendingDown,
      title: "Maliyet Kontrolü",
      description: "Gereksiz parça değişimlerinin ve uzun servis sürelerinin önüne geçer.",
    },
    {
      icon: ShieldCheck,
      title: "Hedefe Yönelik Onarım",
      description: "Sorunlu sensör, hat veya kontrol modülüne doğrudan müdahale edilir.",
    },
    {
      icon: Activity,
      title: "Performans Koruma",
      description: "Erken teşhis ile motor ve şanzımanda kalıcı hasar oluşmasını engeller.",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <HeroBanner
        src="/images/obd-scanner-hero.jpg"
        alt="OBD Arıza Kodları ve Teşhis"
        eyebrow="OBD Arıza Teşhisi"
        title="OBD Arıza Kodları"
        description="Aracınızın arıza kodlarını öğrenin, anlamlarını keşfedin, doğru çözüme ulaşın."
      />

      <TrustBadgeStrip items={obdBadges} />

      <section className="py-10 sm:py-14">
        <div className="container space-y-8">
          <div className="mx-auto max-w-3xl">
            <form onSubmit={handleSearchSubmit} className="relative w-full">
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="P0100, P0420 veya sensör ara..."
                aria-label="Arıza kodu veya anahtar kelime ara"
                className="h-14 w-full rounded-2xl border border-slate-300 bg-white pl-5 pr-28 text-base font-medium text-slate-900 shadow-sm placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/20 transition-all"
              />

              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                {searchInput && (
                  <button
                    type="button"
                    onClick={() => setSearchInput("")}
                    className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                    aria-label="Aramayı temizle"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}

                <button
                  type="submit"
                  className="flex h-10 items-center justify-center gap-1.5 rounded-xl bg-amber-500 px-5 text-sm font-semibold text-slate-950 shadow-sm transition-all hover:bg-amber-400 active:scale-95 cursor-pointer"
                >
                  <Search className="h-4 w-4 text-slate-950" />
                  <span>Ara</span>
                </button>
              </div>
            </form>

            <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: "P", label: `P - Motor (${counts.P})` },
                { id: "C", label: `C - Şasi (${counts.C})` },
                { id: "B", label: `B - Gövde (${counts.B})` },
                { id: "U", label: `U - Ağ (${counts.U})` },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory((prev) => (prev === cat.id ? "ALL" : cat.id))}
                  aria-pressed={selectedCategory === cat.id}
                  className={`inline-flex shrink-0 min-h-9 items-center whitespace-nowrap rounded-full px-3.5 text-xs font-semibold transition-colors cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-amber-500 text-slate-950 shadow-sm"
                      : "border border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-100"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                {isSearching
                  ? "Arama Sonuçları"
                  : hasNoCodes
                    ? "OBD Arıza Kodları"
                    : "Popüler OBD Arıza Kodları"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                {isSearching
                  ? `${filteredCodes.length} adet arıza kodu bulundu.`
                  : hasNoCodes
                    ? "Henüz arıza kodu eklenmedi."
                    : "En sık karşılaşılan arıza kodlarını inceleyin."}
              </p>
            </div>

            {/* Code Cards Grid */}
            {filteredCodes.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
                <Info className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                {hasNoCodes && !isSearching ? (
                  <>
                    <h3 className="text-base font-semibold text-slate-800">
                      Henüz arıza kodu eklenmedi
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Yönetim panelinden arıza kodu eklendiğinde burada listelenir.
                    </p>
                  </>
                ) : (
                  <>
                    <h3 className="text-base font-semibold text-slate-800">
                      Sonuç Bulunamadı
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Aradığınız kriterlere uygun arıza kodu bulunamadı. Lütfen farklı bir kod veya anahtar kelime deneyin.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setSearchInput("");
                        setSelectedCategory("ALL");
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-amber-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-amber-400 cursor-pointer"
                    >
                      Tüm Kodları Göster
                    </button>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {filteredCodes.map((item) => (
                  <div
                    key={item.code}
                    role="button"
                    tabIndex={0}
                    aria-label={`${item.code}: ${item.title}`}
                    onClick={() => setActiveCode(item)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setActiveCode(item);
                      }
                    }}
                    className="group flex cursor-pointer items-center justify-between gap-4 rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-amber-400 hover:shadow-md active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <span className="shrink-0 rounded-lg border border-amber-300/50 bg-amber-50 px-3 py-1.5 font-mono text-sm font-bold text-amber-900 transition-colors group-hover:border-amber-400 group-hover:bg-amber-100">
                        {item.code}
                      </span>
                      <p className="min-w-0 text-sm font-medium leading-snug text-slate-800 break-words group-hover:text-slate-950">
                        {item.title}
                      </p>
                    </div>

                    <div className="shrink-0 text-slate-400 transition-transform group-hover:translate-x-0.5 group-hover:text-amber-600">
                      <ChevronRight className="h-5 w-5" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-3xl border border-white/10 bg-dark-surface text-white shadow-xl">
            <div className="grid grid-cols-1 items-center gap-8 p-6 sm:p-10 lg:grid-cols-12 lg:gap-12">
              <div className="relative aspect-video w-full overflow-hidden rounded-2xl lg:col-span-5 border border-white/10 shadow-lg">
                <Image
                  src="/images/obd-device-detail.jpg"
                  alt="OBD Cihazı Teşhis Ekranı"
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 40vw"
                />
              </div>

              <div className="space-y-4 lg:col-span-7">
                <h3 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
                  Arıza Kodları Ne Anlama Gelir?
                </h3>

                <p className="text-sm sm:text-base leading-relaxed text-slate-300">
                  OBD (On-Board Diagnostics) sistemi, araçta oluşan arızaları standart kodlar halinde bildirir. Bu kodlar, sorunun hangi sistemde olduğunu ve olası nedenlerini gösterir.
                </p>

                <div className="grid grid-cols-2 gap-3 pt-2 sm:grid-cols-4">
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <span className="font-mono text-base font-bold text-amber-400">P Kodları</span>
                    <p className="mt-0.5 text-xs text-slate-400">Motor & Şanzıman</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <span className="font-mono text-base font-bold text-amber-400">C Kodları</span>
                    <p className="mt-0.5 text-xs text-slate-400">Şasi & ABS / Fren</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <span className="font-mono text-base font-bold text-amber-400">B Kodları</span>
                    <p className="mt-0.5 text-xs text-slate-400">Gövde & Airbag</p>
                  </div>
                  <div className="rounded-xl border border-white/5 bg-white/5 p-3">
                    <span className="font-mono text-base font-bold text-amber-400">U Kodları</span>
                    <p className="mt-0.5 text-xs text-slate-400">Ağ & CAN İletişimi</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6 pt-4">
            <div className="text-center">
              <h3 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Neden OBD Arıza Kodu Okuma?
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Elektronik arıza tespiti ile aracınızı korumanın en etkili yolları
              </p>
            </div>

            <FeatureCardGrid items={obdBenefits} columns={4} />
          </div>
        </div>
      </section>

      <Dialog open={Boolean(activeCode)} onOpenChange={(open) => !open && setActiveCode(null)}>
        <DialogContent className="max-w-lg rounded-2xl p-6">
          {activeCode && (
            <div className="space-y-4">
              <DialogHeader>
                <div>
                  <span className="inline-block rounded-lg border border-amber-300/50 bg-amber-50 px-3.5 py-1.5 font-mono text-base font-bold text-amber-900">
                    {activeCode.code}
                  </span>
                </div>
                <DialogTitle className="pt-2 text-xl font-bold text-slate-900">
                  {activeCode.title}
                </DialogTitle>
              </DialogHeader>

              {activeCode.description ? (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Açıklama & Detaylar
                  </h4>
                  <div className="mt-2 rounded-xl bg-slate-50 border border-slate-100 p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                    {activeCode.description}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">Detaylı açıklama bulunmuyor.</p>
              )}

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setActiveCode(null)}
                  className="rounded-xl bg-slate-900 px-5 py-2 text-sm font-semibold text-white hover:bg-slate-800 cursor-pointer"
                >
                  Kapat
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
