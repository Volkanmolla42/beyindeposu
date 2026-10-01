"use client";

import { useSyncExternalStore } from "react";
import { cleanEvent, safePath, type AnalyticsEvent } from "@convex/analyticsModel";

type ConsentState = { ready: boolean; enabled: boolean; choice: "granted" | "denied" | null; privacySignal: boolean };
const initial: ConsentState = { ready: false, enabled: false, choice: null, privacySignal: false };
let state = initial;
const subscribers = new Set<() => void>();
let queue: AnalyticsEvent[] = [];
let pending: Promise<void> | null = null;
let pendingController: AbortController | null = null;
let generation = 0;
let failures = 0;
let retryAt = 0;

export function setAnalyticsConsent(next: ConsentState) {
  const wasGranted = state.enabled && state.choice === "granted" && !state.privacySignal;
  const granted = next.enabled && next.choice === "granted" && !next.privacySignal;
  state = next;
  if (!granted) { queue = []; generation++; pendingController?.abort(); }
  if (!wasGranted && granted) { failures = 0; retryAt = 0; }
  subscribers.forEach((notify) => notify());
}

export function useAnalyticsConsent() {
  return useSyncExternalStore((notify) => { subscribers.add(notify); return () => { subscribers.delete(notify); }; }, () => state, () => initial);
}

function allowed() {
  return typeof window !== "undefined" && state.enabled && state.choice === "granted" && !state.privacySignal && navigator.doNotTrack !== "1" && !("globalPrivacyControl" in navigator && navigator.globalPrivacyControl === true);
}

export function trackAnalytics(name: AnalyticsEvent["name"], properties: Partial<Pick<AnalyticsEvent, "value" | "resultCount" | "number" | "path">> = {}) {
  if (!allowed() || !crypto.randomUUID) return;
  const path = safePath(properties.path ?? window.location.pathname);
  if (!path) return;
  const event = cleanEvent({ id: crypto.randomUUID(), name, path, ...properties });
  if (event && queue.length < 100) queue.push(event);
}

function trafficSource() {
  try {
    const host = new URL(document.referrer).hostname;
    if (host === window.location.hostname) return "direct";
    if (/(^|\.)google\.[a-z.]+$/.test(host)) return "google";
    if (/(^|\.)bing\.com$/.test(host)) return "bing";
    if (/(^|\.)yandex\.[a-z.]+$/.test(host)) return "yandex";
    if (/(^|\.)facebook\.com$/.test(host)) return "facebook";
    if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
    return "other";
  } catch { return "direct"; }
}

export function flushAnalytics(): Promise<void> {
  if (pending) return pending;
  if (!allowed() || !queue.length || Date.now() < retryAt) return Promise.resolve();
  const batch = queue.splice(0, 10);
  const sentGeneration = generation;
  pendingController = new AbortController();
  const controller = pendingController;
  const timeout = setTimeout(() => controller.abort(), 10_000);
  // We need the response and signed session cookie, so deferred, response-less beacons cannot replace this request.
  pending = fetch("/api/analytics/collect", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ events: batch, device: window.innerWidth < 768 ? "mobile" : window.innerWidth < 1024 ? "tablet" : "desktop", source: trafficSource() }), keepalive: true, signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error("Unavailable");
      if (generation === sentGeneration) { failures = 0; retryAt = 0; }
    })
    .catch(() => {
      if (generation !== sentGeneration || !allowed()) return;
      failures++;
      retryAt = Date.now() + Math.min(30_000, 1000 * 2 ** Math.min(failures - 1, 5));
      queue = [...batch, ...queue].slice(0, 100);
    })
    .finally(() => { clearTimeout(timeout); pending = null; pendingController = null; if (allowed() && queue.length && Date.now() >= retryAt) void flushAnalytics(); });
  return pending;
}

export function openAnalyticsPreferences() {
  window.dispatchEvent(new Event("analytics-preferences"));
}

export function createEngagementTracker(now: number, active: boolean) {
  let lastTick = now;
  let lastInteraction = now;
  let elapsed = 0;
  const advance = (at: number) => {
    if (active) elapsed += Math.max(0, Math.min(at, lastInteraction + 60_000) - lastTick);
    lastTick = at;
  };
  return {
    interact(at: number) {
      advance(at);
      lastInteraction = at;
    },
    sample(at: number, nextActive: boolean) {
      advance(at);
      active = nextActive;
      const duration = Math.min(elapsed, 15_000);
      elapsed = 0;
      return duration;
    },
  };
}
