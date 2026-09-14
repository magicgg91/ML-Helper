import { cache } from "react";
import { prisma } from "./prisma";
import { parseTrackingScriptUrl, parseTrackingWebsiteId } from "./tracking";

// Bloc 100: the Configuration tab's named settings (see the SiteSetting model).
// Keys are constants here rather than string literals at the call sites.
export const trackingScriptUrlKey = "tracking_script_url";
// Bloc 101: the identifier the script tag carries alongside its src —
// data-website-id for Umami, its equivalent elsewhere, nothing at all for a
// tracker that needs none.
export const trackingWebsiteIdKey = "tracking_website_id";

export type TrackingSettings = {
  /** null when no tracking is configured, or the stored URL is unusable. */
  url: string | null;
  /** null when no identifier is configured, or the stored one is unusable. */
  websiteId: string | null;
};

/**
 * The tracking script to inject, as the root layout and the admin page need
 * it.
 *
 * Both keys are read in one query rather than one each, and `cache` dedupes
 * that query within a request: the root layout runs on every page, so this is
 * the cost of the feature on each of them.
 */
export const getTrackingSettings = cache(
  async (): Promise<TrackingSettings> => {
    const rows = await prisma.siteSetting.findMany({
      where: { key: { in: [trackingScriptUrlKey, trackingWebsiteIdKey] } },
      select: { key: true, value: true },
    });
    const stored = new Map(rows.map((row) => [row.key, row.value]));
    return {
      url: parseTrackingScriptUrl(stored.get(trackingScriptUrlKey) ?? null),
      websiteId: parseTrackingWebsiteId(
        stored.get(trackingWebsiteIdKey) ?? null,
      ),
    };
  },
);
