// @vitest-environment node
import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { NextRequest } from "next/server";
import { CONSENT_COOKIE, createToken, encodeConsent, ERASURE_COOKIE, readConsent, readToken, SESSION_COOKIE, VISITOR_COOKIE } from "./analytics-server";
import { GET as consentGet, POST as consentPost } from "@/app/api/analytics/consent/route";
import { POST as collectPost } from "@/app/api/analytics/collect/route";

vi.mock("server-only", () => ({}));
const mutation = vi.hoisted(() => vi.fn());
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { mutation = mutation; } }));
const origin = "https://site.example.invalid";
function request(path: string, body?: unknown, cookie?: string, extraHeaders?: Record<string, string>) {
  return new NextRequest(`${origin}/api/analytics/${path}`, { method: body === undefined ? "GET" : "POST", headers: { Origin: origin, "Content-Type": "application/json", ...(cookie ? { cookie } : {}), ...extraHeaders }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
}
beforeEach(() => {
  vi.stubEnv("ANALYTICS_INGEST_SECRET", "server-test-secret-at-least-32-characters");
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://test.convex.cloud");
  mutation.mockReset().mockResolvedValue({ accepted: 1 });
});
afterEach(() => vi.unstubAllEnvs());

test("unsigned or tampered cookie cannot grant tracking", () => {
  const valid = encodeConsent("granted");
  expect(readConsent(request("collect", {}, `${CONSENT_COOKIE}=${valid}`))?.choice).toBe("granted");
  expect(readConsent(request("collect", {}, `${CONSENT_COOKIE}=${valid}a`))).toBeNull();
  expect(readToken(request("collect", {}, `${VISITOR_COOKIE}=forged`), VISITOR_COOKIE)).toBeNull();
});
test("cross-origin consent and ingestion are rejected", async () => {
  expect((await consentPost(request("consent", { choice: "granted" }, undefined, { Origin: "https://other.example.invalid" }))).status).toBe(403);
  expect((await collectPost(request("collect", {}, undefined, { Origin: "https://other.example.invalid" }))).status).toBe(403);
  expect(mutation).not.toHaveBeenCalled();
});

test("consent uses the actual host when Next.js normalizes a loopback URL", async () => {
  const input = new NextRequest("http://127.0.0.1:3001/api/analytics/consent", {
    method: "POST",
    headers: { host: "127.0.0.1:3001", origin: "http://127.0.0.1:3001", "content-type": "application/json" },
    body: JSON.stringify({ choice: "denied" }),
  });
  expect((await consentPost(input)).status).toBe(200);
  const differentOrigin = new NextRequest("http://127.0.0.1:3001/api/analytics/consent", {
    method: "POST",
    headers: { host: "127.0.0.1:3001", origin: "http://localhost:3001", "content-type": "application/json" },
    body: JSON.stringify({ choice: "denied" }),
  });
  expect((await consentPost(differentOrigin)).status).toBe(403);
});
test("no consent, opt-out and bot requests never reach Convex ingestion", async () => {
  const cookie = `${CONSENT_COOKIE}=${encodeConsent("granted")}; ${VISITOR_COOKIE}=${createToken()}`;
  expect(await (await collectPost(request("collect", {}))).json()).toEqual({ accepted: 0 });
  expect(await (await collectPost(request("collect", {}, cookie, { "sec-gpc": "1" }))).json()).toEqual({ accepted: 0 });
  expect(await (await collectPost(request("collect", {}, cookie, { "user-agent": "Googlebot" }))).json()).toEqual({ accepted: 0 });
  expect(mutation).not.toHaveBeenCalled();
});
test("grant creates secure HttpOnly signed cookies without calling a third party", async () => {
  const response = await consentPost(request("consent", { choice: "granted" }));
  expect(response.status).toBe(200);
  const visitor = response.cookies.get(VISITOR_COOKIE)!;
  expect(visitor.httpOnly).toBe(true);
  expect(visitor.secure).toBe(true);
  expect(visitor.sameSite).toBe("lax");
  expect(visitor.maxAge).toBe(90 * 86400);
  expect(mutation).not.toHaveBeenCalled();
});

test("existing permission renews an expired visitor identifier without asking again", async () => {
  const response = consentGet(request("consent", undefined, `${CONSENT_COOKIE}=${encodeConsent("granted")}; ${SESSION_COOKIE}=${createToken()}`));
  expect(await response.json()).toMatchObject({ choice: "granted", enabled: true });
  expect(response.cookies.get(VISITOR_COOKIE)?.maxAge).toBe(90 * 86400);
  expect(response.cookies.get(SESSION_COOKIE)?.maxAge).toBe(0);
  expect(consentGet(request("consent", undefined, `${CONSENT_COOKIE}=${encodeConsent("denied")}`)).cookies.get(VISITOR_COOKIE)).toBeUndefined();
  expect(consentGet(request("consent", undefined, `${CONSENT_COOKIE}=${encodeConsent("granted")}`, { "sec-gpc": "1" })).cookies.get(VISITOR_COOKIE)).toBeUndefined();
});

test("saving an unchanged grant preserves the active session", async () => {
  const cookie = `${CONSENT_COOKIE}=${encodeConsent("granted")}; ${VISITOR_COOKIE}=${createToken()}; ${SESSION_COOKIE}=${createToken()}`;
  const response = await consentPost(request("consent", { choice: "granted" }, cookie));
  expect(response.cookies.get(SESSION_COOKIE)).toBeUndefined();
  expect(response.cookies.get(VISITOR_COOKIE)).toBeUndefined();
});
test("server re-sanitizes payload and never forwards private form fields", async () => {
  const cookie = `${CONSENT_COOKIE}=${encodeConsent("granted")}; ${VISITOR_COOKIE}=${createToken()}`;
  const response = await collectPost(request("collect", { device: "desktop", source: "direct", events: [
    { id: crypto.randomUUID(), name: "search", path: "/", value: "private@example.invalid", phone: "private", message: "private" },
    { id: crypto.randomUUID(), name: "search", path: "/", value: "5551234567" },
  ] }, cookie));
  expect(response.status).toBe(200);
  const payload = mutation.mock.calls[0][1];
  expect(payload.events[0].value).toBe("[gizlendi]");
  expect(payload.events[1].value).toBe("[gizlendi]");
  expect(JSON.stringify(payload)).not.toContain("5551234567");
  expect(payload.events[0]).not.toHaveProperty("phone");
  expect(payload.events[0]).not.toHaveProperty("message");
  expect(response.cookies.get("bd_analytics_session")?.httpOnly).toBe(true);
});
test("withdrawal clears identifiers even when erasure service is unavailable", async () => {
  mutation.mockRejectedValue(new Error("offline"));
  const cookie = `${CONSENT_COOKIE}=${encodeConsent("granted")}; ${VISITOR_COOKIE}=${createToken()}`;
  const response = await consentPost(request("consent", { choice: "denied" }, cookie));
  expect(response.status).toBe(503);
  expect(response.cookies.get(VISITOR_COOKIE)?.maxAge).toBe(0);
  expect(response.cookies.get("bd_analytics_session")?.maxAge).toBe(0);
  expect(response.cookies.get("bd_analytics_erasure")?.httpOnly).toBe(true);
  expect(response.cookies.get(CONSENT_COOKIE)?.value).toBeTruthy();
});
test("missing ingest secret blocks tracking and browser privacy signals override permission", async () => {
  vi.stubEnv("ANALYTICS_INGEST_SECRET", "");
  expect(await consentGet(request("consent")).json()).toMatchObject({ enabled: false });
  expect((await consentPost(request("consent", { choice: "granted" }))).status).toBe(409);
  vi.stubEnv("ANALYTICS_INGEST_SECRET", "server-test-secret-at-least-32-characters");
  expect(await consentGet(request("consent", undefined, `${CONSENT_COOKIE}=${encodeConsent("granted")}`, { "sec-gpc": "1" })).json()).toMatchObject({ choice: "denied", privacySignal: true });
});
test("invalid and oversized bodies are rejected before ingestion", async () => {
  const cookie = `${CONSENT_COOKIE}=${encodeConsent("granted")}; ${VISITOR_COOKIE}=${createToken()}`;
  expect((await collectPost(request("collect", { device: "unknown", events: [] }, cookie))).status).toBe(400);
  expect((await collectPost(request("collect", { device: ["desktop"], events: [] }, cookie))).status).toBe(400);
  expect((await consentPost(request("consent", { choice: ["granted"] }))).status).toBe(400);
  expect((await collectPost(request("collect", { device: "desktop", events: Array(11).fill({}) }, cookie))).status).toBe(400);
  expect((await consentPost(request("consent", { choice: "granted", noise: "x".repeat(17000) }))).status).toBe(400);
  expect(mutation).not.toHaveBeenCalled();
});

test("an invalid visitor cookie cannot replace a valid pending erasure receipt", async () => {
  mutation.mockRejectedValue(new Error("offline"));
  const receipt = createToken();
  const cookie = `${CONSENT_COOKIE}=${encodeConsent("denied")}; ${VISITOR_COOKIE}=forged; ${ERASURE_COOKIE}=${receipt}`;
  const response = await consentPost(request("consent", { choice: "denied" }, cookie));
  expect(response.status).toBe(503);
  expect(response.cookies.get(ERASURE_COOKIE)?.value).toBe(receipt);
  expect(mutation.mock.calls[0][1].visitorId).toBe(readToken(request("consent", {}, cookie), ERASURE_COOKIE));
});
