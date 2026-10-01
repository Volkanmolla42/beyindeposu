// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { writeFileSync } from "node:fs";
import AnalyticsPage from "./page";
import { emptyMetrics } from "@convex/analyticsModel";

const data = vi.hoisted(() => ({ current: null as unknown }));
vi.mock("convex/react", () => ({ useQuery: () => data.current, usePaginatedQuery: () => ({ results: [], status: "Exhausted", loadMore: vi.fn() }) }));
afterEach(() => { vi.useRealTimers(); });

test("dashboard exposes aggregate metrics, accessible charts and no visitor identifiers", () => {
  vi.useFakeTimers(); vi.setSystemTime(new Date("2026-10-01T12:00:00+03:00"));
  data.current = {
    enabled: false, month: "2026-10", period: "month", today: { ...emptyMetrics(), visitors: 48 },
    total: { ...emptyMetrics(), visitors: 1248, sessions: 1620, pageViews: 5430, productViews: 2870, searches: 412, emptySearches: 67, contacts: 183, activeMs: 144180000 },
    daily: Array.from({ length: 31 }, (_, i) => ({ date: `2026-10-${String(i + 1).padStart(2, "0")}`, metrics: { ...emptyMetrics(), visitors: i === 0 ? 48 : 0, pageViews: i === 0 ? 156 : 0, sessions: i === 0 ? 57 : 0 } })),
    monthly: [{ month: "2026-08", metrics: { ...emptyMetrics(), visitors: 740, pageViews: 2200 } }, { month: "2026-09", metrics: { ...emptyMetrics(), visitors: 1025, pageViews: 3400 } }, { month: "2026-10", metrics: { ...emptyMetrics(), visitors: 1248, pageViews: 5430 } }],
    rankings: { product: [{ key: "/parcalar/motor-beyni", label: "Renault motor beyni · S113717205D", count: 284, contacts: 23 }, { key: "/parcalar/abs-beyni", label: "Volkswagen ABS beyni · 1K0907379", count: 191, contacts: 17 }], search: [{ key: "S113717205D", label: "S113717205D", count: 61, contacts: 0 }], empty_search: [{ key: "0281012345", label: "0281012345", count: 18, contacts: 0 }], page: [{ key: "/parcalar", label: "/parcalar", count: 971, contacts: 0 }], event: [{ key: "whatsapp_click", label: "whatsapp_click", count: 121, contacts: 0 }], device: [{ key: "mobile", label: "mobile", count: 1220, contacts: 0 }], source: [{ key: "google", label: "google", count: 870, contacts: 0 }], filter: [{ key: "brand:Renault", label: "brand:Renault", count: 83, contacts: 0 }] },
  };
  const html = renderToStaticMarkup(<AnalyticsPage />);
  expect(html).toContain("Genel bakış");
  expect(html).toContain("Arama ve etkileşim");
  expect(html).toContain("Bugün</button>");
  expect(html).toContain("Aylık</button>");
  expect(html).toContain('aria-label="Analitik raporu hakkında yardım"');
  expect(html).toContain("1.248");
  expect(html).toContain("Ölçüm kapalı");
  expect(html).toContain("Veri tablosu");
  expect(html).toContain("Sonuç bulunamayan aramalar");
  expect(html).toContain("Oturum hareketleri");
  expect(html).not.toContain("visitorId");
  expect(html).not.toContain("sessionId");
  expect(html).not.toContain("googletagmanager");
  expect(html).not.toContain("Yalnızca analitik izni veren tarayıcılar ölçülür.");
  expect(html).not.toContain("Metrik notları");
  if (process.env.ANALYTICS_PREVIEW_OUTPUT) writeFileSync(process.env.ANALYTICS_PREVIEW_OUTPUT, html);
});
