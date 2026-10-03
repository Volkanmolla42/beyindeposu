import { paginationOptsValidator, paginationResultValidator } from "convex/server";
import { v } from "convex/values";
import { env, internalMutation, mutation, query, type MutationCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdmin } from "./authz";
import { analyticsEvent, breakdownKinds, cleanEvent, CONSENT_VERSION, dateKey, DAY, deviceValidator, emptyMetrics, eventNames, metricsValidator, monthKeys, RAW_RETENTION, SUMMARY_RETENTION, type AnalyticsEvent, type BreakdownKind, type Metrics } from "./analyticsModel";

function authorize(secret: string) {
  if (!env.ANALYTICS_INGEST_SECRET || env.ANALYTICS_INGEST_SECRET.length < 32 || secret !== env.ANALYTICS_INGEST_SECRET) throw new Error("Yetkisiz erişim.");
}

async function addTotal(ctx: MutationCtx, bucket: string, delta: Metrics, now: number) {
  const row = await ctx.db.query("analyticsTotals").withIndex("by_bucket", (q) => q.eq("bucket", bucket)).unique();
  const metrics = emptyMetrics();
  for (const key of Object.keys(metrics) as Array<keyof Metrics>) metrics[key] = (row?.metrics[key] ?? 0) + delta[key];
  if (row) await ctx.db.patch("analyticsTotals", row._id, { metrics });
  else await ctx.db.insert("analyticsTotals", { bucket, metrics, expiresAt: now + SUMMARY_RETENTION });
}

async function addBreakdown(ctx: MutationCtx, bucket: string, kind: BreakdownKind, key: string, count: number, now: number) {
  const row = await ctx.db.query("analyticsBreakdowns").withIndex("by_bucket_and_kind_and_key", (q) => q.eq("bucket", bucket).eq("kind", kind).eq("key", key)).unique();
  if (row) await ctx.db.patch("analyticsBreakdowns", row._id, { count: row.count + count });
  else await ctx.db.insert("analyticsBreakdowns", { bucket, kind, key, count, expiresAt: now + SUMMARY_RETENTION });
}

function summarizeEvents(events: AnalyticsEvent[]) {
  const metrics = emptyMetrics();
  const breakdowns = new Map<string, { kind: BreakdownKind; key: string; count: number }>();
  const count = (kind: BreakdownKind, key: string) => {
    const id = `${kind}:${key}`;
    const row = breakdowns.get(id);
    if (row) row.count++;
    else breakdowns.set(id, { kind, key, count: 1 });
  };
  for (const event of events) {
    metrics.events++;
    count("event", event.name);
    switch (event.name) {
      case "page_view":
        metrics.pageViews++;
        count("page", event.path);
        break;
      case "product_view":
        metrics.productViews++;
        count("product", event.path);
        break;
      case "search":
        metrics.searches++;
        count("search", event.value ?? "[gizlendi]");
        if (event.resultCount === 0) {
          metrics.emptySearches++;
          count("empty_search", event.value ?? "[gizlendi]");
        }
        break;
      case "filter_change":
        if (event.value !== undefined) count("filter", event.value);
        break;
      case "whatsapp_click":
      case "phone_click":
      case "email_click":
      case "chat_start":
        metrics.contacts++;
        if (event.path.startsWith("/parcalar/")) count("product_contact", event.path);
        break;
      case "engagement":
        metrics.activeMs += event.number ?? 0;
        break;
    }
  }
  return { metrics, breakdowns: Array.from(breakdowns.values()) };
}

async function sanitizeSearch(ctx: MutationCtx, value: string) {
  if (value === "[gizlendi]") return value;
  const exact = await ctx.db.query("products").withIndex("by_oemNumber", (q) => q.eq("oemNumber", value)).first();
  if (exact && !exact.isDraft) return exact.oemNumber;
  // Unknown part codes are useful for unmet demand. Numeric phone/ID-shaped input is masked.
  if (/^(?=.{5,16}$)(?=.*[A-Z])(?=.*\d)[A-Z0-9]+$/.test(value) || /^\d{5,9}$/.test(value)) return value;
  const terms = new Set(["MOTOR", "BEYNİ", "BEYNI", "BEYİN", "BEYIN", "ECU", "ABS", "AIRBAG", "FREN", "ŞANZIMAN", "SANZIMAN", "MODÜL", "MODUL", "SENSÖR", "SENSOR", "KONTROL", "ÜNİTESİ", "UNITESI", "POMPA", "ENJEKTÖR", "ENJEKTOR", "ÇIKMA", "CIKMA", "ORİJİNAL", "ORIJINAL"]);
  const brands = await ctx.db.query("brands").withIndex("by_order").take(200);
  for (const brand of brands) for (const word of brand.name.toLocaleUpperCase("tr-TR").split(/\s+/)) terms.add(word);
  return value.split(" ").every((word) => terms.has(word) || /^\d{1,4}$/.test(word)) ? value : "[gizlendi]";
}

async function sanitizeFilter(ctx: MutationCtx, value: string) {
  const [kind, key] = value.split(":");
  if (key === "" || key === "Tümü") return `${kind}:tümü`;
  if (kind === "reset") return "reset:tümü";
  if (kind === "category") {
    const item = await ctx.db.query("categories").withIndex("by_slug", (q) => q.eq("slug", key)).first();
    return item ? `category:${item.slug}` : "category:diğer";
  }
  if (kind === "brand") {
    const brands = await ctx.db.query("brands").withIndex("by_order").take(200);
    return brands.some((brand) => brand.name === key) ? value : "brand:diğer";
  }
  if (kind === "model") return key === "Seçili" ? "model:seçili" : "model:diğer";
  const allowed = ["condition:Orijinal Çıkma", "condition:Sıfır - Orijinal", "condition:Revizyonlu", "condition:Sıfırlanmış - Virgin", "stock:Stokta", "stock:Stokta Yok", "sort:date-desc", "sort:date-asc", "sort:title-asc", "sort:title-desc", "sort:oem-asc", "sort:oem-desc"];
  return allowed.includes(value) ? value : `${kind}:diğer`;
}

export const ingest = mutation({
  args: { secret: v.string(), visitorId: v.string(), sessionId: v.string(), consentVersion: v.string(), consentAt: v.number(), device: deviceValidator, source: v.string(), events: v.array(analyticsEvent) },
  returns: v.object({ accepted: v.number() }),
  handler: async (ctx, args) => {
    authorize(args.secret);
    const now = Date.now();
    if (args.consentVersion !== CONSENT_VERSION || !Number.isFinite(args.consentAt) || args.consentAt > now || now - args.consentAt > 180 * DAY) return { accepted: 0 };
    if (!/^[a-f0-9]{64}$/.test(args.visitorId) || !/^[a-f0-9]{64}$/.test(args.sessionId) || args.events.length > 10) throw new Error("Geçersiz ölçüm.");
    const erased = await ctx.db.query("analyticsErasure").withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId)).unique();
    if (erased) return { accepted: 0 };
    const existing = await ctx.db.query("analyticsSessions").withIndex("by_sessionId", (q) => q.eq("sessionId", args.sessionId)).unique();
    if (existing && existing.visitorId !== args.visitorId) throw new Error("Geçersiz oturum.");
    const inWindow = existing && now - existing.rateWindow < 60000;
    const rateCount = inWindow ? existing.rateCount : 0;
    const remainingEvents = Math.min(120 - rateCount, 10000 - (existing?.events ?? 0));
    if (remainingEvents <= 0) return { accepted: 0 };
    const events: AnalyticsEvent[] = [];
    const seen = new Set<string>();
    for (const input of args.events) {
      if (events.length >= remainingEvents) break;
      const event = cleanEvent(input);
      if (!event || seen.has(event.id)) continue;
      seen.add(event.id);
      if (await ctx.db.query("analyticsEvents").withIndex("by_visitorId_and_eventId", (q) => q.eq("visitorId", args.visitorId).eq("event.id", event.id)).first()) continue;
      if (event.path.startsWith("/parcalar/")) {
        const product = await ctx.db.query("products").withIndex("by_slug", (q) => q.eq("slug", event.path.slice(10))).first();
        if (!product || product.isDraft) continue;
      }
      if (event.path.startsWith("/markalar/")) {
        const brand = await ctx.db.query("brands").withIndex("by_slug", (q) => q.eq("slug", event.path.slice(10))).first();
        if (!brand || brand.isActive === false) continue;
      }
      if (event.path.startsWith("/kategoriler/")) {
        const category = await ctx.db.query("categories").withIndex("by_slug", (q) => q.eq("slug", event.path.slice(13))).first();
        if (!category || category.isActive === false) continue;
      }
      if (event.name === "search") event.value = await sanitizeSearch(ctx, event.value ?? "[gizlendi]");
      if (event.name === "filter_change" && event.value !== undefined) event.value = await sanitizeFilter(ctx, event.value);
      events.push(event);
    }
    if (!events.length) return { accepted: 0 };
    const day = dateKey(now);
    const buckets = [day, day.slice(0, 7)];
    const { metrics: delta, breakdowns } = summarizeEvents(events);
    delta.sessions = existing ? 0 : 1;
    const source = ["direct", "google", "bing", "yandex", "facebook", "instagram", "other"].includes(args.source) ? args.source : "other";
    for (const event of events) {
      await ctx.db.insert("analyticsEvents", { sessionId: args.sessionId, visitorId: args.visitorId, at: now, event, expiresAt: now + RAW_RETENTION });
    }
    for (const bucket of buckets) {
      for (const row of breakdowns) await addBreakdown(ctx, bucket, row.kind, row.key, row.count, now);
      const visitor = await ctx.db.query("analyticsVisitors").withIndex("by_bucket_and_visitorId", (q) => q.eq("bucket", bucket).eq("visitorId", args.visitorId)).unique();
      if (!visitor) await ctx.db.insert("analyticsVisitors", { bucket, visitorId: args.visitorId, expiresAt: now + RAW_RETENTION });
      await addTotal(ctx, bucket, { ...delta, visitors: visitor ? 0 : 1 }, now);
    }
    if (existing) await ctx.db.patch("analyticsSessions", existing._id, { lastAt: now, lastPath: events[events.length - 1].path, pageViews: existing.pageViews + delta.pageViews, events: existing.events + delta.events, activeMs: existing.activeMs + delta.activeMs, rateWindow: inWindow ? existing.rateWindow : now, rateCount: rateCount + events.length });
    else {
      await ctx.db.insert("analyticsSessions", { sessionId: args.sessionId, visitorId: args.visitorId, consentVersion: args.consentVersion, consentAt: args.consentAt, startedAt: now, lastAt: now, entryPath: events[0].path, lastPath: events[events.length - 1].path, device: args.device, source, pageViews: delta.pageViews, events: delta.events, activeMs: delta.activeMs, rateWindow: now, rateCount: events.length, expiresAt: now + RAW_RETENTION });
      for (const bucket of buckets) {
        await addBreakdown(ctx, bucket, "source", source, 1, now);
        await addBreakdown(ctx, bucket, "device", args.device, 1, now);
      }
    }
    return { accepted: events.length };
  },
});

const ranking = v.object({ key: v.string(), label: v.string(), count: v.number(), contacts: v.number() });
const reportPeriod = v.union(v.literal("today"), v.literal("month"));
export const dashboard = query({
  args: { month: v.string(), period: reportPeriod, now: v.number() },
  returns: v.object({ enabled: v.boolean(), month: v.string(), period: reportPeriod, today: metricsValidator, total: metricsValidator, daily: v.array(v.object({ date: v.string(), metrics: metricsValidator })), monthly: v.array(v.object({ month: v.string(), metrics: metricsValidator })), rankings: v.record(v.string(), v.array(ranking)) }),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!Number.isFinite(args.now)) throw new Error("Geçersiz rapor zamanı.");
    const months = monthKeys(args.now);
    if (!months.includes(args.month)) throw new Error("Geçersiz ay.");
    const today = dateKey(args.now);
    const readTotal = async (bucket: string) => (await ctx.db.query("analyticsTotals").withIndex("by_bucket", (q) => q.eq("bucket", bucket)).unique())?.metrics ?? emptyMetrics();
    const [year, month] = args.month.split("-").map(Number);
    const days = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const daily = args.period === "today"
      ? [{ date: today, metrics: await readTotal(today) }]
      : await Promise.all(Array.from({ length: days }, async (_, i) => {
        const date = `${args.month}-${String(i + 1).padStart(2, "0")}`;
        return { date, metrics: await readTotal(date) };
      }));
    const monthly = args.period === "today"
      ? []
      : await Promise.all(months.slice().reverse().map(async (key) => ({ month: key, metrics: await readTotal(key) })));
    const reportBucket = args.period === "today" ? today : args.month;
    const rankings: Record<string, Array<{ key: string; label: string; count: number; contacts: number }>> = {};
    for (const kind of breakdownKinds) {
      if (kind === "product_contact") continue;
      const rows = await ctx.db.query("analyticsBreakdowns").withIndex("by_bucket_and_kind_and_count", (q) => q.eq("bucket", reportBucket).eq("kind", kind)).order("desc").take(20);
      const visibleRows = kind === "event" ? rows.filter((row) => (eventNames as readonly string[]).includes(row.key)) : rows;
      rankings[kind] = await Promise.all(visibleRows.map(async (row) => {
        let label = row.key;
        let contacts = 0;
        if (kind === "product") {
          const product = await ctx.db.query("products").withIndex("by_slug", (q) => q.eq("slug", row.key.slice(10))).first();
          label = product ? `${product.title} · ${product.oemNumber}` : row.key;
          contacts = (await ctx.db.query("analyticsBreakdowns").withIndex("by_bucket_and_kind_and_key", (q) => q.eq("bucket", reportBucket).eq("kind", "product_contact").eq("key", row.key)).unique())?.count ?? 0;
        }
        return { key: row.key, label, count: row.count, contacts };
      }));
    }
    return { enabled: (env.ANALYTICS_INGEST_SECRET?.length ?? 0) >= 32, month: args.month, period: args.period, today: await readTotal(today), total: await readTotal(reportBucket), daily, monthly, rankings };
  },
});

const sessionSummary = v.object({ id: v.id("analyticsSessions"), startedAt: v.number(), lastAt: v.number(), entryPath: v.string(), lastPath: v.string(), device: deviceValidator, source: v.string(), pageViews: v.number(), events: v.number(), activeMs: v.number() });
export const sessions = query({
  args: { month: v.string(), period: reportPeriod, now: v.number(), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(sessionSummary),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    if (!Number.isFinite(args.now)) throw new Error("Geçersiz rapor zamanı.");
    if (!monthKeys(args.now).includes(args.month)) throw new Error("Geçersiz ay.");
    let start: number;
    let end: number;
    if (args.period === "today") {
      const [year, month, day] = dateKey(args.now).split("-").map(Number);
      start = Date.UTC(year, month - 1, day) - 3 * 3600000;
      end = start + DAY;
    } else {
      const [year, month] = args.month.split("-").map(Number);
      start = Date.UTC(year, month - 1, 1) - 3 * 3600000;
      end = Date.UTC(year, month, 1) - 3 * 3600000;
    }
    const result = await ctx.db.query("analyticsSessions").withIndex("by_startedAt", (q) => q.gte("startedAt", start).lt("startedAt", end)).order("desc").paginate(args.paginationOpts);
    return { ...result, page: result.page.map((row) => ({ id: row._id, startedAt: row.startedAt, lastAt: row.lastAt, entryPath: row.entryPath, lastPath: row.lastPath, device: row.device, source: row.source, pageViews: row.pageViews, events: row.events, activeMs: row.activeMs })) };
  },
});

export const journey = query({
  args: { session: v.id("analyticsSessions"), paginationOpts: paginationOptsValidator },
  returns: paginationResultValidator(v.object({ id: v.id("analyticsEvents"), at: v.number(), event: analyticsEvent })),
  handler: async (ctx, args) => {
    await requireAdmin(ctx);
    const session = await ctx.db.get("analyticsSessions", args.session);
    if (!session) return { page: [], isDone: true, continueCursor: "" };
    const result = await ctx.db.query("analyticsEvents").withIndex("by_sessionId_and_at", (q) => q.eq("sessionId", session.sessionId)).order("asc").paginate(args.paginationOpts);
    return { ...result, page: result.page.filter((row) => eventNames.includes(row.event.name)).map((row) => ({ id: row._id, at: row.at, event: row.event })) };
  },
});

export const requestErasure = mutation({
  args: { secret: v.string(), visitorId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    authorize(args.secret);
    if (!/^[a-f0-9]{64}$/.test(args.visitorId)) throw new Error("Geçersiz ziyaretçi.");
    const existing = await ctx.db.query("analyticsErasure").withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId)).unique();
    if (!existing) await ctx.db.insert("analyticsErasure", { visitorId: args.visitorId, expiresAt: Date.now() + RAW_RETENTION });
    await ctx.scheduler.runAfter(0, internal.analytics.eraseVisitor, { visitorId: args.visitorId });
    return null;
  },
});

export const eraseVisitor = internalMutation({
  args: { visitorId: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    let remaining = false;
    for (const table of ["analyticsEvents", "analyticsSessions", "analyticsVisitors"] as const) {
      const rows = await ctx.db.query(table).withIndex("by_visitorId", (q) => q.eq("visitorId", args.visitorId)).take(200);
      for (const row of rows) await ctx.db.delete(table, row._id);
      if (rows.length === 200) remaining = true;
    }
    if (remaining) await ctx.scheduler.runAfter(0, internal.analytics.eraseVisitor, args);
    return null;
  },
});

export const prune = internalMutation({
  args: {}, returns: v.null(),
  handler: async (ctx) => {
    let remaining = false;
    for (const table of ["analyticsEvents", "analyticsSessions", "analyticsVisitors", "analyticsTotals", "analyticsBreakdowns", "analyticsErasure"] as const) {
      const rows = await ctx.db.query(table).withIndex("by_expiresAt", (q) => q.lt("expiresAt", Date.now())).take(200);
      for (const row of rows) await ctx.db.delete(table, row._id);
      if (rows.length === 200) remaining = true;
    }
    if (remaining) await ctx.scheduler.runAfter(0, internal.analytics.prune, {});
    return null;
  },
});
