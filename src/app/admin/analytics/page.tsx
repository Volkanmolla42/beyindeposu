"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePaginatedQuery, useQuery } from "convex/react";
import { ArrowDown, ArrowUpRight, CalendarDays, CircleHelp, Clock, Download, Eye, Loader2, MessageSquare, Package, Search, Users } from "lucide-react";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";
import type { FunctionReturnType } from "convex/server";
import { dateKey, monthKeys, type Metrics } from "@convex/analyticsModel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { analyticsLabel, formatAnalyticsDuration, formatAnalyticsMonth, formatAnalyticsNumber as number } from "@/lib/analytics-labels";
import AnalyticsBoundary from "./AnalyticsBoundary";

type Dashboard = FunctionReturnType<typeof api.analytics.dashboard>;
const dateTime = (value: number) => new Date(value).toLocaleString("tr-TR", { timeZone: "Europe/Istanbul", dateStyle: "short", timeStyle: "short" });

function Ranking({ title, rows, countLabel, products = false }: { title: string; rows: Dashboard["rankings"][string]; countLabel: string; products?: boolean }) {
  const renderRows = (items: typeof rows, startIndex: number) => (
    <ol start={startIndex + 1} className="divide-y divide-slate-100">
      {items.map((row, index) => (
        <li key={row.key} className="grid grid-cols-[2rem_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-5">
          <span aria-hidden="true" className="text-xs font-medium tabular-nums text-slate-400">{String(startIndex + index + 1).padStart(2, "0")}</span>
          <div className="min-w-0 break-words text-sm text-slate-700">
            {row.key.startsWith("/") ? (
              <Link href={row.key} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 hover:text-blue-700">
                {row.label}<ArrowUpRight aria-hidden="true" className="h-3.5 w-3.5 shrink-0" />
              </Link>
            ) : analyticsLabel(row.label)}
          </div>
          <div className="shrink-0 text-right">
            <span className="block font-mono text-sm font-medium tabular-nums text-slate-900">{number(row.count)}</span>
            <span className="block text-2xs text-slate-500">{countLabel}</span>
            {products && <span className="mt-1 block text-2xs text-slate-600">{number(row.contacts)} iletişim</span>}
          </div>
        </li>
      ))}
    </ol>
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <h3 className="text-sm font-medium text-slate-900">{title}</h3>
        {rows.length > 0 && <span className="text-xs text-slate-500">İlk {Math.min(rows.length, 5)}</span>}
      </div>
      {rows.length ? (
        <>
          {renderRows(rows.slice(0, 5), 0)}
          {rows.length > 5 && (
            <details className="border-t border-slate-100 px-4 sm:px-5">
              <summary className="cursor-pointer py-3 text-sm font-medium text-blue-700 hover:text-blue-800">{number(rows.length - 5)} sonuç daha göster</summary>
              {renderRows(rows.slice(5), 5)}
            </details>
          )}
        </>
      ) : <p className="px-5 py-8 text-sm text-slate-500">Bu dönemde kayıt yok.</p>}
    </section>
  );
}

function MetricCard({
  label,
  value,
  icon: Icon,
  note,
  primary = false,
  compact = false,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  note?: string;
  primary?: boolean;
  compact?: boolean;
}) {
  return (
    <article
      className={`relative flex h-full flex-col justify-between rounded-xl border p-3.5 sm:rounded-2xl sm:p-5 transition-shadow ${
        primary ? "border-blue-200 bg-blue-50/70" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex min-h-[2.5rem] items-start justify-between gap-2">
        <h3 className="min-w-0 flex-1 text-xs font-medium leading-snug text-slate-600 sm:text-sm">
          {label}
        </h3>
        <span
          aria-hidden="true"
          className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg sm:h-8 sm:w-8 ${
            primary ? "bg-white text-blue-700 shadow-2xs" : "bg-slate-100 text-slate-600"
          }`}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </span>
      </div>
      <div className="mt-2 sm:mt-3">
        <p
          className={`font-semibold tabular-nums tracking-tight text-slate-900 ${
            compact ? "text-xl sm:text-2xl" : "text-2xl sm:text-3xl"
          }`}
        >
          {value}
        </p>
        {note && <p className="mt-1 text-xs text-slate-500">{note}</p>}
      </div>
    </article>
  );
}

function TrafficChart({ title, points, monthly = false }: { title: string; points: Array<{ key: string; metrics: Metrics }>; monthly?: boolean }) {
  const [metric, setMetric] = useState<"visitors" | "pageViews">("visitors");
  const max = Math.max(1, ...points.map((point) => point.metrics[metric]));
  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-medium text-slate-900">{title}</h3>
        <div role="group" aria-label={`${title} metriği`} className="flex rounded-xl bg-slate-100 p-1">
          <Button size="sm" className="h-8 rounded-lg px-3" variant={metric === "visitors" ? "default" : "ghost"} aria-pressed={metric === "visitors"} onClick={() => setMetric("visitors")}>Ziyaretçi</Button>
          <Button size="sm" className="h-8 rounded-lg px-3" variant={metric === "pageViews" ? "default" : "ghost"} aria-pressed={metric === "pageViews"} onClick={() => setMetric("pageViews")}>Sayfa</Button>
        </div>
      </div>
      {points.length ? (
        <>
          <div className="mb-2 flex justify-between text-2xs text-slate-500"><span>{monthly ? "Ay" : "Gün"}</span><span>Ölçek: 0–{number(max)}</span></div>
          <div className="overflow-x-auto pb-1">
            <div className="min-w-[560px]">
              <div role="img" aria-label={`${title}, ${metric === "visitors" ? "tekil ziyaretçi" : "sayfa görüntüleme"}. Veri tablosunda kesin değerler bulunur.`} className="relative h-40 border-b border-slate-200">
                <div aria-hidden="true" className="absolute inset-0 flex flex-col justify-between">
                  {[0, 1, 2, 3].map((line) => <span key={line} className="border-t border-slate-100" />)}
                </div>
                <div className="relative z-10 flex h-full items-end gap-1.5 px-1">
                  {points.map((point) => {
                    const value = point.metrics[metric];
                    const height = value > 0 ? Math.max((value / max) * 100, 2) : 0;
                    return (
                      <div key={point.key} className="flex h-full min-w-0 flex-1 items-end">
                        <div title={`${monthly ? formatAnalyticsMonth(point.key) : point.key}: ${number(value)}`} className="w-full rounded-t bg-blue-600" style={{ height: `${height}%`, minHeight: value ? 3 : 0 }} />
                      </div>
                    );
                  })}
                </div>
              </div>
              <div className="mt-2 flex gap-1.5 px-1">{points.map((point) => <span key={point.key} className="min-w-0 flex-1 truncate text-center text-2xs text-slate-500">{monthly ? formatAnalyticsMonth(point.key).split(" ")[0] : point.key.slice(8)}</span>)}</div>
            </div>
          </div>
          <details className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
            <summary className="cursor-pointer font-medium">Veri tablosu</summary>
            <div className="mt-3 max-h-64 overflow-auto">
              <table className="w-full min-w-[420px] text-left text-sm">
                <caption className="sr-only">{title} veri tablosu</caption>
                <thead className="sticky top-0 bg-white text-xs text-slate-500"><tr><th scope="col" className="py-2">Tarih</th><th scope="col">Tekil ziyaretçi</th><th scope="col">Sayfa</th><th scope="col">Oturum</th></tr></thead>
                <tbody>{[...points].reverse().map((point) => <tr key={point.key} className="border-t border-slate-100"><th scope="row" className="py-2 font-normal">{monthly ? formatAnalyticsMonth(point.key) : point.key}</th><td>{number(point.metrics.visitors)}</td><td>{number(point.metrics.pageViews)}</td><td>{number(point.metrics.sessions)}</td></tr>)}</tbody>
              </table>
            </div>
          </details>
        </>
      ) : <p className="py-10 text-center text-sm text-slate-500">Bu dönem için trafik kaydı yok.</p>}
    </section>
  );
}

function Journey({ session }: { session: Id<"analyticsSessions"> }) {
  const { results, status, loadMore } = usePaginatedQuery(api.analytics.journey, { session }, { initialNumItems: 40 });
  return <><ol className="max-h-[55vh] space-y-4 overflow-y-auto pr-2">{results.map((row) => <li key={row.id} className="border-l-2 border-blue-200 pl-4"><div className="flex flex-wrap justify-between gap-2"><span className="text-sm font-medium">{analyticsLabel(row.event.name)}</span><time className="text-xs text-slate-500">{dateTime(row.at)}</time></div><p className="mt-1 break-all text-xs text-slate-600">{row.event.path}</p>{row.event.value && <p className="mt-1 text-sm text-slate-700">{analyticsLabel(row.event.value)}</p>}{row.event.resultCount !== undefined && <p className="text-xs text-slate-500">{row.event.resultCount === 0 ? "Sonuç bulunamadı" : `${row.event.resultCount} önizleme sonucu`}</p>}{row.event.number !== undefined && <p className="text-xs text-slate-500">{row.event.name === "engagement" ? formatAnalyticsDuration(row.event.number) : row.event.number}</p>}</li>)}</ol>{status === "LoadingFirstPage" && <p role="status" className="text-sm text-slate-500">Yükleniyor...</p>}{status === "Exhausted" && !results.length && <p className="text-sm text-slate-500">Oturum kayıtları silinmiş veya saklama süresi dolmuş.</p>}{status === "CanLoadMore" && <Button variant="outline" onClick={() => loadMore(40)}>Daha fazla hareket</Button>}</>;
}

function Sessions({ month, period, now }: { month: string; period: "today" | "month"; now: number }) {
  const { results, status, loadMore } = usePaginatedQuery(api.analytics.sessions, { month, period, now }, { initialNumItems: 20 });
  const [selected, setSelected] = useState<Id<"analyticsSessions"> | null>(null);
  return (
    <section id="sessions" className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 px-4 py-4 sm:px-5">
        <div>
          <h2 className="text-base font-medium text-slate-900">Oturum hareketleri</h2>
          <p className="mt-1 max-w-3xl text-xs leading-5 text-slate-500">
            {period === "today" ? "Bugün başlayan oturumlar" : `${formatAnalyticsMonth(month)} içinde başlayan oturumlar`}
          </p>
        </div>
        {results.length > 0 && <Badge variant="secondary">{number(results.length)} gösteriliyor</Badge>}
      </div>
      {results.length ? (
        <>
          <div className="space-y-3 p-3 xl:hidden">
            {results.map((row) => (
              <article key={row.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <time dateTime={new Date(row.startedAt).toISOString()} className="text-xs font-medium text-slate-800">{dateTime(row.startedAt)}</time>
                    <p className="mt-1 break-all text-xs text-slate-500">{row.entryPath}</p>
                  </div>
                  <Button size="sm" variant="outline" className="shrink-0 px-3" aria-label={`${dateTime(row.startedAt)} oturumunun hareketlerini görüntüle`} onClick={() => setSelected(row.id)}>Hareketler</Button>
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 border-t border-slate-100 pt-3">
                  <div><dt className="text-2xs text-slate-500">Cihaz / kaynak</dt><dd className="mt-1 text-xs text-slate-800">{analyticsLabel(row.device)} · {analyticsLabel(row.source)}</dd></div>
                  <div><dt className="text-2xs text-slate-500">Görüntülenen sayfa</dt><dd className="mt-1 text-xs font-mono tabular-nums text-slate-800">{number(row.pageViews)}</dd></div>
                  <div><dt className="text-2xs text-slate-500">Aktif süre</dt><dd className="mt-1 text-xs text-slate-800">{formatAnalyticsDuration(row.activeMs)}</dd></div>
                  <div><dt className="text-2xs text-slate-500">Kaydedilen hareket</dt><dd className="mt-1 text-xs font-mono tabular-nums text-slate-800">{number(row.events)}</dd></div>
                </dl>
              </article>
            ))}
          </div>
          <div className="hidden overflow-x-auto xl:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <caption className="sr-only">Seçili dönemde başlayan ziyaretçi oturumları</caption>
              <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-600">
                <tr>{["Başlangıç", "Giriş sayfası", "Cihaz / kaynak", "Sayfa", "Aktif süre", "Hareketler"].map((label) => <th key={label} scope="col" className="whitespace-nowrap px-5 py-3">{label}</th>)}</tr>
              </thead>
              <tbody>{results.map((row) => (
                <tr key={row.id} className="border-t border-slate-100 hover:bg-slate-50/70">
                  <td className="whitespace-nowrap px-5 py-3 text-xs">{dateTime(row.startedAt)}</td>
                  <td className="max-w-xs break-all px-5 py-3 text-xs text-slate-600">{row.entryPath}</td>
                  <td className="px-5 py-3 text-xs">{analyticsLabel(row.device)} · {analyticsLabel(row.source)}</td>
                  <td className="px-5 py-3 font-mono tabular-nums">{number(row.pageViews)}</td>
                  <td className="whitespace-nowrap px-5 py-3 text-xs">{formatAnalyticsDuration(row.activeMs)}</td>
                  <td className="px-5 py-3"><Button size="sm" variant="outline" onClick={() => setSelected(row.id)}>{number(row.events)} hareket</Button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </>
      ) : (
        <p role="status" className="px-5 py-10 text-center text-sm text-slate-500">
          {status === "LoadingFirstPage" ? "Oturumlar yükleniyor..." : period === "today" ? "Bugün için oturum kaydı yok." : "Bu ay için oturum kaydı yok."}
        </p>
      )}
      {status === "CanLoadMore" && <div className="border-t border-slate-100 p-4"><Button variant="outline" onClick={() => loadMore(20)}>Daha fazla oturum göster</Button></div>}
      <Dialog open={selected !== null} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogTitle>Oturum hareketleri</DialogTitle>
          <DialogDescription>Sayfa, arama ve etkileşim sırası</DialogDescription>
          {selected && <Journey session={selected} />}
        </DialogContent>
      </Dialog>
    </section>
  );
}

function exportCsv(data: Dashboard, today: string) {
  const rows: Array<Array<string | number>> = [["Tarih", "Tekil ziyaretçi", "Oturum", "Sayfa", "Parça", "Arama", "Sonuçsuz arama", "İletişim", "Aktif süre (sn)"]];
  for (const point of data.daily) rows.push([point.date, point.metrics.visitors, point.metrics.sessions, point.metrics.pageViews, point.metrics.productViews, point.metrics.searches, point.metrics.emptySearches, point.metrics.contacts, Math.round(point.metrics.activeMs / 1000)]);
  rows.push([], [data.period === "today" ? "Bugün toplamı" : "Ay toplamı", data.total.visitors, data.total.sessions, data.total.pageViews, data.total.productViews, data.total.searches, data.total.emptySearches, data.total.contacts, Math.round(data.total.activeMs / 1000)], [], ["Rapor", "Değer", "Adet", "İletişim"]);
  for (const [kind, items] of Object.entries(data.rankings)) for (const item of items) rows.push([kind, item.label, item.count, item.contacts]);
  const csv = rows.map((row) => row.map((value) => { const text = String(value); return `"${(/^[=+\-@\t\r]/.test(text) ? "'" : "") + text.replace(/"/g, '""')}"`; }).join(";")).join("\r\n");
  const url = URL.createObjectURL(new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" }));
  const link = document.createElement("a"); link.href = url; link.download = `analitik-${data.period === "today" ? today : data.month}.csv`; link.click(); URL.revokeObjectURL(url);
}

function AnalyticsDashboard() {
  const [now, setNow] = useState(() => Date.now());
  const months = monthKeys(now);
  const [month, setMonth] = useState(() => monthKeys(Date.now())[0]);
  const [todayOnly, setTodayOnly] = useState(false);
  const [serverEnabled, setServerEnabled] = useState(false);
  useEffect(() => {
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow((previous) => dateKey(previous) === dateKey(current) ? previous : current);
    }, 60_000);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    let mounted = true;
    void fetch("/api/analytics/consent", { cache: "no-store" }).then((response) => response.json()).then((settings) => { if (mounted) setServerEnabled(settings.enabled === true); }).catch(() => { if (mounted) setServerEnabled(false); });
    return () => { mounted = false; };
  }, []);
  const today = dateKey(now);
  const period = todayOnly ? "today" : "month";
  const data = useQuery(api.analytics.dashboard, { month, period, now });
  if (!data) return <div role="status" className="flex items-center gap-2 p-6 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />Analitik yükleniyor...</div>;
  const metrics = data.total;
  const enabled = data.enabled && serverEnabled;
  const primaryMetrics = [
    { label: "Tekil ziyaretçi", value: number(metrics.visitors), icon: Users, primary: true },
    { label: "Oturum", value: number(metrics.sessions), icon: Eye },
    { label: "Sayfa görüntüleme", value: number(metrics.pageViews), icon: Eye },
    { label: "Parça görüntüleme", value: number(metrics.productViews), icon: Package },
  ];
  const engagementMetrics = [
    { label: "Arama", value: number(metrics.searches), icon: Search },
    { label: "Sonuçsuz arama", value: number(metrics.emptySearches), icon: Search },
    { label: "İletişim / sohbet", value: number(metrics.contacts), icon: MessageSquare },
    { label: "Ortalama aktif süre", value: formatAnalyticsDuration(metrics.sessions ? metrics.activeMs / metrics.sessions : 0), icon: Clock },
  ];

  return (
    <div className="space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
        <div className="flex items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">Analitik</h1>
          {!enabled && <Badge variant="warning">Ölçüm kapalı</Badge>}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-0.5 sm:overflow-visible sm:pb-0">
          <div role="group" aria-label="Rapor dönemi" className="inline-flex shrink-0 rounded-xl bg-slate-100 p-1">
            <Button size="sm" className="h-8 rounded-lg px-2.5 text-xs sm:px-3 sm:text-sm" variant={todayOnly ? "default" : "ghost"} aria-pressed={todayOnly} onClick={() => setTodayOnly(true)}>Bugün</Button>
            <Button size="sm" className="h-8 rounded-lg px-2.5 text-xs sm:px-3 sm:text-sm" variant={!todayOnly ? "default" : "ghost"} aria-pressed={!todayOnly} onClick={() => setTodayOnly(false)}>Aylık</Button>
          </div>
          {!todayOnly && (
            <label htmlFor="analytics-month" className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs text-slate-700 shadow-2xs focus-within:outline-2 focus-within:outline-blue-600 sm:text-sm">
              <CalendarDays aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-500" />
              <span className="sr-only">Rapor ayı</span>
              <select id="analytics-month" value={month} onChange={(event) => setMonth(event.target.value)} className="cursor-pointer bg-transparent focus:outline-none">
                {months.map((key) => <option key={key} value={key}>{formatAnalyticsMonth(key)}</option>)}
              </select>
            </label>
          )}
          <Button variant="outline" className="h-10 shrink-0 gap-1.5 rounded-xl px-2.5 text-xs shadow-2xs sm:px-3 sm:text-sm" onClick={() => exportCsv(data, today)}>
            <Download aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <span>CSV</span>
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="ghost" size="icon" className="h-10 w-10 shrink-0 rounded-xl text-slate-400 hover:text-slate-700" aria-label="Analitik raporu hakkında yardım">
                <CircleHelp aria-hidden="true" className="h-5 w-5" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[85dvh] w-[calc(100%-2rem)] overflow-y-auto rounded-2xl text-left">
              <div className="space-y-1 pr-6">
                <DialogTitle>Analitik hakkında</DialogTitle>
                <DialogDescription>Ölçüm kapsamı ve raporların hesaplanma şekli.</DialogDescription>
              </div>
              <div className="space-y-5 text-sm leading-6 text-slate-600">
                <section>
                  <h3 className="font-medium text-slate-900">Ziyaretçi ve zaman</h3>
                  <p className="mt-1">Yalnızca analitik izni veren tarayıcılar ölçülür. Aynı tarayıcı seçili dönemde bir kez sayılır; aylık tekil, günlük tekiller toplanarak hesaplanmaz. Raporlar Türkiye saatine göredir.</p>
                </section>
                <section>
                  <h3 className="font-medium text-slate-900">Arama ve iletişim</h3>
                  <p className="mt-1">Arama sonuç adedi önizlemede veya ilk sayfada gösterilen sonuçları belirtir. İletişim sayısı tıklama ve sohbet başlangıçlarını gösterir; satış ya da tamamlanmış görüşme sayısı değildir.</p>
                </section>
                <section>
                  <h3 className="font-medium text-slate-900">Kayıt kapsamı</h3>
                  <p className="mt-1">Sıralamalarda en fazla ilk 20 değer yer alır. Ham oturum hareketleri 90 gün saklanır ve müşteri hesaplarıyla ilişkilendirilmez.</p>
                </section>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </header>

      {!enabled && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-medium">Ölçüm kapalı</p>
          <p className="mt-1">Yeni ziyaret verisi kaydedilmiyor. Mevcut raporlar saklanan kayıtları göstermeye devam eder.</p>
        </div>
      )}

      <section className="space-y-3" aria-labelledby="analytics-overview">
        <div className="flex items-center justify-between gap-2">
          <h2 id="analytics-overview" className="text-base font-medium text-slate-900">Genel bakış</h2>
          <span className="text-xs text-slate-500">{todayOnly ? today : formatAnalyticsMonth(month)}</span>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          {primaryMetrics.map((card) => <MetricCard key={card.label} {...card} />)}
        </div>
      </section>

      <section className="space-y-3" aria-labelledby="analytics-engagement">
        <div className="flex items-center justify-between gap-2">
          <h2 id="analytics-engagement" className="text-base font-medium text-slate-900">Arama ve etkileşim</h2>
        </div>
        <div className="grid grid-cols-2 gap-2.5 sm:gap-3 xl:grid-cols-4">
          {engagementMetrics.map((card) => <MetricCard key={card.label} {...card} compact />)}
        </div>
      </section>

      {todayOnly ? (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50/70 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <div>
            <h2 className="text-sm font-medium text-slate-900">Bugünkü ziyaret akışı</h2>
            <p className="mt-1 text-sm text-slate-600">Bugün görünümünde saatlik grafik yok. Oturum listesinden ziyaret rotalarını ve aramalarını inceleyebilirsin.</p>
          </div>
          <Link href="#sessions" className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-full px-3 text-sm font-medium text-blue-700 hover:bg-blue-100 focus-visible:outline-2 focus-visible:outline-blue-600">
            Oturumlara git<ArrowDown aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <section className="space-y-4" aria-labelledby="analytics-trends">
          <div>
            <h2 id="analytics-trends" className="text-base font-medium text-slate-900">Trafik eğilimleri</h2>
            <p className="mt-1 text-sm text-slate-600">Ziyaretçi ve sayfa görüntüleme sayılarını gün ve ay bazında karşılaştır.</p>
          </div>
          <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
            <TrafficChart title={`${formatAnalyticsMonth(month)} · gün gün`} points={data.daily.map((point) => ({ key: point.date, metrics: point.metrics }))} />
            <TrafficChart title="Aylık trafik" monthly points={data.monthly.map((point) => ({ key: point.month, metrics: point.metrics }))} />
          </div>
        </section>
      )}

      <Sessions key={todayOnly ? `today-${today}` : month} month={month} period={period} now={now} />

      <section className="space-y-4" aria-labelledby="analytics-content">
        <div>
          <h2 id="analytics-content" className="text-base font-medium text-slate-900">İçerik performansı</h2>
          <p className="mt-1 text-sm text-slate-600">Hangi ürünlerin ve sayfaların daha çok ilgi gördüğünü gör.</p>
        </div>
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
          <Ranking title="En çok açılan parçalar" rows={data.rankings.product ?? []} countLabel="açılma" products />
          <Ranking title="En çok görüntülenen sayfalar" rows={data.rankings.page ?? []} countLabel="görüntüleme" />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="analytics-search">
        <div>
          <h2 id="analytics-search" className="text-base font-medium text-slate-900">Arama talepleri</h2>
          <p className="mt-1 text-sm text-slate-600">Aranan kodları ve katalogda karşılık bulmayan ihtiyaçları incele.</p>
        </div>
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
          <Ranking title="En çok aranan OEM ve parça terimleri" rows={data.rankings.search ?? []} countLabel="arama" />
          <Ranking title="Sonuç bulunamayan aramalar" rows={data.rankings.empty_search ?? []} countLabel="arama" />
        </div>
      </section>

      <section className="space-y-4" aria-labelledby="analytics-visitor-behavior">
        <div>
          <h2 id="analytics-visitor-behavior" className="text-base font-medium text-slate-900">Ziyaretçi davranışı</h2>
          <p className="mt-1 text-sm text-slate-600">Trafik kaynakları, cihazlar ve sayfa içi hareketler.</p>
        </div>
        <div className="grid min-w-0 items-start gap-4 xl:grid-cols-2">
          <Ranking title="Kullanıcı hareketleri" rows={data.rankings.event ?? []} countLabel="hareket" />
          <Ranking title="Trafik kaynakları" rows={data.rankings.source ?? []} countLabel="oturum" />
          <Ranking title="Cihazlar" rows={data.rankings.device ?? []} countLabel="oturum" />
          <Ranking title="Filtre kullanımı" rows={data.rankings.filter ?? []} countLabel="kullanım" />
        </div>
      </section>

    </div>
  );
}

export default function AnalyticsPage() {
  return <AnalyticsBoundary><AnalyticsDashboard /></AnalyticsBoundary>;
}
