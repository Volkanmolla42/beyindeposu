// @vitest-environment node
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createEngagementTracker, flushAnalytics, setAnalyticsConsent, trackAnalytics } from "./analytics";

beforeEach(() => {
  vi.stubGlobal("window", { location: { pathname: "/" }, innerWidth: 1280 });
  vi.stubGlobal("document", { referrer: "" });
  vi.stubGlobal("navigator", { doNotTrack: null });
});

test("active time excludes hidden and blurred intervals, including duplicate leave events", () => {
  const tracker = createEngagementTracker(0, true);
  expect(tracker.sample(4000, false)).toBe(4000);
  expect(tracker.sample(8000, false)).toBe(0);
  expect(tracker.sample(10000, true)).toBe(0);
  expect(tracker.sample(13000, false)).toBe(3000);
  expect(tracker.sample(20000, false)).toBe(0);
});

test("idle cutoff preserves time before inactivity without counting the gap before a new interaction", () => {
  const tracker = createEngagementTracker(0, true);
  expect(tracker.sample(15000, true)).toBe(15000);
  expect(tracker.sample(30000, true)).toBe(15000);
  expect(tracker.sample(45000, true)).toBe(15000);
  expect(tracker.sample(62000, true)).toBe(15000);
  tracker.interact(100000);
  expect(tracker.sample(103000, true)).toBe(3000);
});

afterEach(() => {
  setAnalyticsConsent({ ready: true, enabled: false, choice: "denied", privacySignal: false });
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

test("retries queued events with backoff and recovers after repeated failures", async () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-01T12:00:00Z"));
  vi.stubGlobal("window", { location: { pathname: "/" }, innerWidth: 1280 });
  vi.stubGlobal("document", { referrer: "" });
  vi.stubGlobal("navigator", { doNotTrack: null });
  const send = vi.fn()
    .mockRejectedValueOnce(new Error("offline"))
    .mockRejectedValueOnce(new Error("offline"))
    .mockRejectedValueOnce(new Error("offline"))
    .mockResolvedValueOnce({ ok: true });
  vi.stubGlobal("fetch", send);

  setAnalyticsConsent({ ready: true, enabled: true, choice: "granted", privacySignal: false });
  trackAnalytics("page_view");

  await flushAnalytics();
  expect(send).toHaveBeenCalledTimes(1);
  await flushAnalytics();
  expect(send).toHaveBeenCalledTimes(1);

  await vi.advanceTimersByTimeAsync(1000);
  await flushAnalytics();
  expect(send).toHaveBeenCalledTimes(2);
  await vi.advanceTimersByTimeAsync(2000);
  await flushAnalytics();
  expect(send).toHaveBeenCalledTimes(3);
  await vi.advanceTimersByTimeAsync(4000);
  await flushAnalytics();
  expect(send).toHaveBeenCalledTimes(4);
});

test("privacy signals discard queued events before tracking can be enabled again", async () => {
  const send = vi.fn().mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", send);
  setAnalyticsConsent({ ready: true, enabled: true, choice: "granted", privacySignal: false });
  trackAnalytics("page_view");
  setAnalyticsConsent({ ready: true, enabled: true, choice: "granted", privacySignal: true });
  setAnalyticsConsent({ ready: true, enabled: true, choice: "granted", privacySignal: false });
  await flushAnalytics();
  expect(send).not.toHaveBeenCalled();
});

test("a stalled request times out and the same event can be retried", async () => {
  vi.useFakeTimers();
  const send = vi.fn()
    .mockImplementationOnce((_url, options) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
    }))
    .mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", send);
  setAnalyticsConsent({ ready: true, enabled: true, choice: "granted", privacySignal: false });
  trackAnalytics("page_view");
  const stalled = flushAnalytics();
  await vi.advanceTimersByTimeAsync(10_000);
  await stalled;
  expect(send.mock.calls[0][1].signal.aborted).toBe(true);
  await vi.advanceTimersByTimeAsync(1000);
  await flushAnalytics();
  expect(send).toHaveBeenCalledTimes(2);
  expect(send.mock.calls[1][1].body).toBe(send.mock.calls[0][1].body);
});

test("withdrawal aborts an in-flight request and discards its events", async () => {
  const send = vi.fn().mockImplementation((_url, options) => new Promise((_resolve, reject) => {
    options.signal.addEventListener("abort", () => reject(new Error("aborted")), { once: true });
  }));
  vi.stubGlobal("fetch", send);
  setAnalyticsConsent({ ready: true, enabled: true, choice: "granted", privacySignal: false });
  trackAnalytics("page_view");
  const request = flushAnalytics();
  setAnalyticsConsent({ ready: true, enabled: true, choice: "denied", privacySignal: false });
  await request;
  expect(send.mock.calls[0][1].signal.aborted).toBe(true);
  setAnalyticsConsent({ ready: true, enabled: true, choice: "granted", privacySignal: false });
  await flushAnalytics();
  expect(send).toHaveBeenCalledTimes(1);
});

test("a failed request from a withdrawn consent cannot delay or resurrect a new grant", async () => {
  let fail: (error: Error) => void = () => {};
  const send = vi.fn()
    .mockImplementationOnce(() => new Promise((_resolve, reject) => { fail = reject; }))
    .mockResolvedValue({ ok: true });
  vi.stubGlobal("fetch", send);
  setAnalyticsConsent({ ready: true, enabled: true, choice: "granted", privacySignal: false });
  trackAnalytics("page_view");
  const oldRequest = flushAnalytics();
  setAnalyticsConsent({ ready: true, enabled: true, choice: "denied", privacySignal: false });
  setAnalyticsConsent({ ready: true, enabled: true, choice: "granted", privacySignal: false });
  trackAnalytics("phone_click");
  fail(new Error("offline"));
  await oldRequest;
  await flushAnalytics();
  expect(send).toHaveBeenCalledTimes(2);
  const body = JSON.parse(send.mock.calls[1][1].body);
  expect(body.events.map((event: { name: string }) => event.name)).toEqual(["phone_click"]);
});
