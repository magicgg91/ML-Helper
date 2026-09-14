import { cache } from "react";
import { prisma } from "./prisma";
import { parseTrackingScriptUrl } from "./tracking";

// Bloc 100: the Configuration tab's named settings (see the SiteSetting model).
// Keys are constants here rather than string literals at the call sites.
export const trackingScriptUrlKey = "tracking_script_url";

export async function getSiteSetting(key: string): Promise<string | null> {
  const row = await prisma.siteSetting.findUnique({
    where: { key },
    select: { value: true },
  });
  return row?.value ?? null;
}

/**
 * The tracking script URL to inject, or null when none is configured or the
 * stored value is not a usable http(s) URL.
 *
 * `cache` dedupes the read within a single request: the root layout is the
 * only caller today, but a second one must not mean a second query.
 */
export const getTrackingScriptUrl = cache(async (): Promise<string | null> => {
  return parseTrackingScriptUrl(await getSiteSetting(trackingScriptUrlKey));
});
