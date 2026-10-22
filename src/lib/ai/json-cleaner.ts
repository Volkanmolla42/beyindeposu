export function parseLlmJson<T = unknown>(text: string): T | null {
  try {
    let clean = text.trim();
    if (clean.startsWith("```")) {
      clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    }
    return JSON.parse(clean) as T;
  } catch {
    return null;
  }
}
