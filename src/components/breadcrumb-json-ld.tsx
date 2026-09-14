import { JsonLd } from "./json-ld";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export type BreadcrumbItem = { path: string; label: string };

// Bloc 94: the BreadcrumbList structured data only — no visible trail.
//
// Bloc 91/M4 added the JSON-LD and Bloc 91/M7 added a visible trail alongside
// it, in this same component. The visible trail is gone: it restated what the
// page already showed — the <h1> on référentiels and guides, and the
// accent-marked current category in ToolCategoryNav on tools, whose own <h1>
// is sr-only. The structured data has no such redundancy: it is invisible, and
// search engines use it to render the trail in results.
//
// `items` runs root → current. Paths are locale-stripped ("/", "/tools",
// "/tools/villes"); breadcrumbJsonLd builds the absolute canonical URLs.
export function BreadcrumbJsonLd({
  locale,
  items,
}: {
  locale: string;
  items: BreadcrumbItem[];
}) {
  return <JsonLd data={breadcrumbJsonLd(locale, items)} />;
}
