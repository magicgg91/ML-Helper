import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { absoluteUrl } from "@/lib/site-url";

// Bloc 91/E4: crawl rules + sitemap declaration. /admin, /api and /login are
// already noindex, but robots keeps well-behaved crawlers off them entirely —
// and the real gain is pointing them at the sitemap, which nothing declared
// before. connection() forces runtime rendering (exactly like sitemap.ts) so
// the sitemap URL derives from the production NEXTAUTH_URL instead of whatever
// value happened to be set when the Docker image was built; a wrong
// NEXTAUTH_URL then shows up here the same way it would on every canonical.
export default async function robots(): Promise<MetadataRoute.Robots> {
  await connection();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin", "/api/", "/login"],
    },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
