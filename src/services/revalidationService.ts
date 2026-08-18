/**
 * revalidationService.ts
 *
 * Calls the Next.js public-site on-demand revalidation API whenever
 * content changes in the admin panel.  If the call fails (network
 * error, wrong secret, site offline) the error is logged but NOT
 * re-thrown — it must never break the primary admin operation.
 */

const SITE_URL = process.env.PUBLIC_SITE_URL ?? "";
const SECRET = process.env.REVALIDATE_SECRET ?? "";

type RevalidateTag = "testimonials" | "faq" | "gallery" | "teachers";

/**
 * Fire-and-forget helper.  Sends a POST to the public-site
 * revalidation endpoint for the given content tag.
 */
export async function revalidatePublicCache(tag: RevalidateTag): Promise<void> {
  if (!SITE_URL || !SECRET) {
    // Environment variables not configured — skip silently in dev/test.
    return;
  }

  const url = `${SITE_URL}/api/revalidate/${tag}`;

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "x-revalidate-secret": SECRET,
        "Content-Type": "application/json",
      },
      // Short timeout so it never delays the admin response
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "");
      console.warn(
        `[revalidation] ${tag} revalidation returned ${response.status}: ${body}`
      );
    }
  } catch (err) {
    console.warn(`[revalidation] Failed to revalidate "${tag}":`, err);
  }
}
