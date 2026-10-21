export type RevalidateTarget =
  | string
  | { path: string; type?: "page" | "layout" };

/**
 * Fires an on-demand revalidation request to the Next.js API route.
 * Non-blocking by design so UI mutations don't hang if revalidation encounters a blip.
 */
export async function triggerRevalidate(
  targets: RevalidateTarget | RevalidateTarget[]
): Promise<void> {
  const paths = Array.isArray(targets) ? targets : [targets];
  if (paths.length === 0) return;

  try {
    await fetch("/api/revalidate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paths }),
    });
  } catch (err) {
    console.warn("[revalidate] Failed to trigger revalidation:", err);
  }
}
