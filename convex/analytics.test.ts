/// <reference types="vite/client" />
import { convexTest } from "convex-test";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { cleanEvent, CONSENT_VERSION, dateKey, DAY, monthKeys, safePath, safeSearch, type AnalyticsEvent } from "./analyticsModel";

const modules = import.meta.glob("./**/*.ts");
const secret = "analytics-test-secret-only-32-characters";
const visitor = "a".repeat(64);
const session = "b".repeat(64);
const now = Date.parse("2026-10-01T12:00:00+03:00");
function event(name: AnalyticsEvent["name"], properties: Partial<AnalyticsEvent> = {}): AnalyticsEvent {
  return { id: crypto.randomUUID(), name, path: "/", ...properties };
}
function ingestion(events: AnalyticsEvent[], overrides = {}) {
  return { secret, visitorId: visitor, sessionId: session, consentVersion: CONSENT_VERSION, consentAt: now, device: "desktop" as const, source: "google", events, ...overrides };
}
function reportArgs(month = "2026-10", period: "today" | "month" = "month", at = now) {
  return { month, period, now: at };
}
async function fixture() {
  const t = convexTest(schema, modules);
  const userId = await t.run((ctx) => ctx.db.insert("users", { email: "admin@example.invalid" }));
  const admin = t.withIdentity({ subject: `${userId}|session` });
  await t.run(async (ctx) => {
    await ctx.db.insert("brands", { name: "Renault", slug: "renault", popular: true, order: 1 });
    await ctx.db.insert("products", { title: "Motor Beyni", slug: "motor-beyni", oemNumber: "0261207425", brand: "Renault", condition: "Orijinal Çıkma", inStock: true, description: "", images: [], createdAt: now, updatedAt: now });
  });
  return { t, admin };
}

beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(now); vi.stubEnv("ANALYTICS_INGEST_SECRET", secret); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllEnvs(); });

describe("Privacy boundary", () => {
  test("invalid filters are discarded instead of becoming reset events", async () => {
    const { t, admin } = await fixture();
    expect(cleanEvent(event("filter_change"))).toBeNull();
    expect(cleanEvent(event("filter_change", { value: "unknown:private" }))).toBeNull();
    await t.mutation(api.analytics.ingest, ingestion([event("filter_change"), event("filter_change", { value: "brand:Renault" })]));
    const data = await admin.query(api.analytics.dashboard, reportArgs());
    expect(data.rankings.filter).toMatchObject([{ key: "brand:Renault", count: 1 }]);
    expect(data.total.events).toBe(1);
  });
  test("removes URL queries, arbitrary properties, VIN and personal input", () => {
    expect(safePath("/admin/analytics")).toBeNull();
    expect(safePath("/parcalar?q=person")).toBeNull();
    expect(safeSearch("WVWZZZ1JZXW000001")).toBeNull();
    expect(safeSearch("someone@example.com")).toBeNull();
    expect(safeSearch("+90 555 123 45 67")).toBeNull();
    expect(safeSearch("5551234567")).toBeNull();
    expect(safeSearch("0555 123 45 67")).toBeNull();
    expect(safeSearch("02121234567")).toBeNull();
    expect(safeSearch("0261207425")).toBe("0261207425");
    expect(safeSearch("0 555 123 45 67")).toBeNull();
    const cleaned = cleanEvent({ ...event("search", { value: "someone@example.com" }), phone: "private", referrer: "private", number: Infinity });
    expect(cleaned?.value).toBe("[gizlendi]");
    expect(cleaned).not.toHaveProperty("phone");
    expect(cleaned).not.toHaveProperty("referrer");
    expect(cleaned).not.toHaveProperty("number");
  });
  test("server rejects wrong secret and outdated or future consent", async () => {
    const { t } = await fixture();
    await expect(t.mutation(api.analytics.ingest, ingestion([event("page_view")], { secret: "wrong" }))).rejects.toThrow("Yetkisiz");
    expect(await t.mutation(api.analytics.ingest, ingestion([event("page_view")], { consentVersion: "old" }))).toEqual({ accepted: 0 });
    expect(await t.mutation(api.analytics.ingest, ingestion([event("page_view")], { consentAt: now + 1 }))).toEqual({ accepted: 0 });
    expect(await t.run((ctx) => ctx.db.query("analyticsEvents").collect())).toHaveLength(0);
  });
  test("analytics reads require authenticated admin", async () => {
    const { t, admin } = await fixture();
    await expect(t.query(api.analytics.dashboard, reportArgs())).rejects.toThrow("Yetkisiz");
    expect((await admin.query(api.analytics.dashboard, reportArgs())).total.visitors).toBe(0);
    await expect(admin.query(api.analytics.dashboard, reportArgs("2027-01"))).rejects.toThrow("Geçersiz ay");
  });
  test("only safe searches survive, valid numeric OEM is retained", async () => {
    const { t, admin } = await fixture();
    await t.mutation(api.analytics.ingest, ingestion([
      event("search", { value: "0261207425", resultCount: 1 }),
      event("search", { value: "05551234567", resultCount: 0 }),
      event("search", { value: "Ahmet Mehmet", resultCount: 0 }),
      event("search", { value: "S113717205D", resultCount: 0 }),
      event("search", { value: "Renault motor beyni", resultCount: 1 }),
    ]));
    const data = await admin.query(api.analytics.dashboard, reportArgs());
    expect(data.rankings.search.map((row) => row.key)).toContain("0261207425");
    expect(data.rankings.search.map((row) => row.key)).toContain("S113717205D");
    expect(data.rankings.search.map((row) => row.key)).not.toContain("05551234567");
    expect(JSON.stringify(data)).not.toContain("AHMET");
    expect(data.total.emptySearches).toBe(3);
  });
});

describe("Counting", () => {
  test("deduplicates a committed batch even when the session cookie response was lost", async () => {
    const { t, admin } = await fixture();
    const open = event("page_view");
    await t.mutation(api.analytics.ingest, ingestion([open]));
    expect(await t.mutation(api.analytics.ingest, ingestion([open], { sessionId: "c".repeat(64) }))).toEqual({ accepted: 0 });
    expect((await admin.query(api.analytics.dashboard, reportArgs())).total).toMatchObject({ sessions: 1, pageViews: 1, events: 1 });
  });
  test("never exceeds the lifetime session limit with a batch at the boundary", async () => {
    const { t } = await fixture();
    await t.mutation(api.analytics.ingest, ingestion([event("page_view")]));
    await t.run(async (ctx) => {
      const row = await ctx.db.query("analyticsSessions").withIndex("by_sessionId", (q) => q.eq("sessionId", session)).unique();
      await ctx.db.patch("analyticsSessions", row!._id, { events: 9999 });
    });
    expect(await t.mutation(api.analytics.ingest, ingestion([event("page_view"), event("page_view")]))).toEqual({ accepted: 1 });
    expect(await t.mutation(api.analytics.ingest, ingestion([event("page_view")]))).toEqual({ accepted: 0 });
    expect((await t.run((ctx) => ctx.db.query("analyticsSessions").withIndex("by_sessionId", (q) => q.eq("sessionId", session)).unique()))?.events).toBe(10000);
  });
  test("deduplicates retries and counts unique browsers independently from sessions", async () => {
    const { t, admin } = await fixture();
    const open = event("page_view");
    expect(await t.mutation(api.analytics.ingest, ingestion([open, open]))).toEqual({ accepted: 1 });
    expect(await t.mutation(api.analytics.ingest, ingestion([open]))).toEqual({ accepted: 0 });
    await t.mutation(api.analytics.ingest, ingestion([event("page_view")], { sessionId: "c".repeat(64) }));
    vi.setSystemTime(now + DAY);
    await t.mutation(api.analytics.ingest, ingestion([event("page_view")], { sessionId: "d".repeat(64) }));
    const data = await admin.query(api.analytics.dashboard, reportArgs("2026-10", "month", now + DAY));
    expect(data.total).toMatchObject({ visitors: 1, sessions: 3, pageViews: 3 });
    expect(data.daily[0].metrics.visitors).toBe(1);
    expect(data.daily[1].metrics.visitors).toBe(1);
    expect(data.today.visitors).toBe(1);
  });
  test("today filter scopes totals, rankings, and sessions to the Turkey calendar day", async () => {
    const { t, admin } = await fixture();
    await t.mutation(api.analytics.ingest, ingestion([
      event("page_view"),
      event("search", { value: "0261207425", resultCount: 1 }),
    ]));
    const nextDay = Date.parse("2026-10-02T01:00:00+03:00");
    vi.setSystemTime(nextDay);
    await t.mutation(api.analytics.ingest, ingestion([
      event("page_view", { path: "/parcalar/motor-beyni" }),
      event("search", { value: "S113717205D", resultCount: 1 }),
    ], { sessionId: "d".repeat(64) }));

    const day = await admin.query(api.analytics.dashboard, reportArgs("2026-10", "today", now));
    expect(day.total).toMatchObject({ visitors: 1, sessions: 1, pageViews: 1, searches: 1 });
    expect(day.daily).toHaveLength(1);
    expect(day.daily[0].date).toBe("2026-10-01");
    expect(day.monthly).toEqual([]);
    expect(day.rankings.search.map((row) => row.key)).toContain("0261207425");
    expect(day.rankings.search.map((row) => row.key)).not.toContain("S113717205D");
    expect(day.rankings.source.map((row) => row.key)).toContain("google");
    expect(day.rankings.device.map((row) => row.key)).toContain("desktop");

    const sessions = await admin.query(api.analytics.sessions, {
      ...reportArgs("2026-10", "today", now),
      paginationOpts: { numItems: 20, cursor: null },
    });
    expect(sessions.page).toHaveLength(1);
    expect(sessions.page[0].startedAt).toBe(now);
  });
  test("Turkey date and month boundaries count the same visitor anew in a new month", async () => {
    expect(dateKey(Date.parse("2026-09-30T21:00:00Z"))).toBe("2026-10-01");
    expect(dateKey(Date.parse("2026-09-30T20:59:59Z"))).toBe("2026-09-30");
    expect(monthKeys(now, 2)).toEqual(["2026-10", "2026-09"]);
    const { t, admin } = await fixture();
    await t.mutation(api.analytics.ingest, ingestion([event("page_view")]));
    const november = Date.parse("2026-11-01T00:00:01+03:00");
    vi.setSystemTime(november);
    await t.mutation(api.analytics.ingest, ingestion([event("page_view")], { sessionId: "c".repeat(64) }));
    expect((await admin.query(api.analytics.dashboard, reportArgs("2026-10", "month", november))).total.visitors).toBe(1);
    expect((await admin.query(api.analytics.dashboard, reportArgs("2026-11", "month", november))).total.visitors).toBe(1);
  });
  test("validates public products and aggregates contacts/active time", async () => {
    const { t, admin } = await fixture();
    await t.mutation(api.analytics.ingest, ingestion([
      event("product_view", { path: "/parcalar/motor-beyni" }),
      event("product_view", { path: "/parcalar/nonexistent" }),
      event("page_view", { path: "/markalar/private-name" }),
      event("page_view", { path: "/kategoriler/private-name" }),
      event("whatsapp_click", { path: "/parcalar/motor-beyni" }),
      event("email_click", { path: "/parcalar/motor-beyni" }),
      event("engagement", { number: 15000 }),
    ]));
    const data = await admin.query(api.analytics.dashboard, reportArgs());
    expect(data.total).toMatchObject({ productViews: 1, contacts: 2, activeMs: 15000 });
    expect(data.rankings.product[0]).toMatchObject({ count: 1, contacts: 2 });
  });
  test("enforces per-session rate limit", async () => {
    const { t } = await fixture();
    for (let i = 0; i < 12; i++) await t.mutation(api.analytics.ingest, ingestion(Array.from({ length: 10 }, () => event("page_view"))));
    expect(await t.mutation(api.analytics.ingest, ingestion([event("page_view")]))).toEqual({ accepted: 0 });
    vi.setSystemTime(now + 60001);
    expect(await t.mutation(api.analytics.ingest, ingestion([event("page_view")]))).toEqual({ accepted: 1 });
  });
});

describe("Erasure and retention", () => {
  test.each(["erasure", "retention"] as const)("%s drains multiple cleanup batches without deleting another visitor's current records", async (mode) => {
    const { t } = await fixture();
    await t.run(async (ctx) => {
      for (let i = 0; i < 205; i++) {
        await ctx.db.insert("analyticsEvents", { visitorId: visitor, sessionId: session, at: now, event: event("page_view"), expiresAt: now - 1 });
      }
      await ctx.db.insert("analyticsEvents", { visitorId: "c".repeat(64), sessionId: "d".repeat(64), at: now, event: event("page_view"), expiresAt: now + DAY });
    });
    if (mode === "erasure") await t.mutation(api.analytics.requestErasure, { secret, visitorId: visitor });
    else await t.mutation(internal.analytics.prune, {});
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    const remaining = await t.run((ctx) => ctx.db.query("analyticsEvents").collect());
    expect(remaining).toHaveLength(1);
    expect(remaining[0].visitorId).toBe("c".repeat(64));
  });
  test("withdrawal deletes pseudonymous records and prevents in-flight resurrection", async () => {
    const { t, admin } = await fixture();
    await t.mutation(api.analytics.ingest, ingestion([event("page_view")]));
    await t.mutation(api.analytics.requestErasure, { secret, visitorId: visitor });
    expect(await t.mutation(api.analytics.ingest, ingestion([event("page_view")]))).toEqual({ accepted: 0 });
    await t.finishAllScheduledFunctions(vi.runAllTimers);
    await t.run(async (ctx) => {
      expect(await ctx.db.query("analyticsEvents").collect()).toHaveLength(0);
      expect(await ctx.db.query("analyticsSessions").collect()).toHaveLength(0);
      expect(await ctx.db.query("analyticsVisitors").collect()).toHaveLength(0);
    });
    expect((await admin.query(api.analytics.dashboard, reportArgs())).total.pageViews).toBe(1);
  });
  test("pruning removes raw records at 90 days and summaries at 400 days", async () => {
    const { t } = await fixture();
    await t.mutation(api.analytics.ingest, ingestion([event("page_view")]));
    vi.setSystemTime(now + 90 * DAY + 1);
    await t.mutation(internal.analytics.prune, {});
    expect(await t.run((ctx) => ctx.db.query("analyticsEvents").collect())).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.query("analyticsTotals").collect())).toHaveLength(2);
    vi.setSystemTime(now + 400 * DAY + 1);
    await t.mutation(internal.analytics.prune, {});
    expect(await t.run((ctx) => ctx.db.query("analyticsTotals").collect())).toHaveLength(0);
    expect(await t.run((ctx) => ctx.db.query("analyticsBreakdowns").collect())).toHaveLength(0);
  });
});
