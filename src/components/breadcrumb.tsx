import { Link } from "@/i18n/navigation";
import { JsonLd } from "./json-ld";
import { breadcrumbJsonLd } from "@/lib/structured-data";

export type BreadcrumbItem = { path: string; label: string };

// Bloc 91/M7: a visible breadcrumb trail on deep pages, plus its BreadcrumbList
// structured data. `items` runs root → current; the last item is the current
// page (rendered as text with aria-current, not a link). Paths are
// locale-stripped ("/", "/tools", "/tools/villes") — the i18n Link adds the
// locale prefix, and breadcrumbJsonLd builds the absolute canonical URLs.
export function Breadcrumb({
  locale,
  label,
  items,
}: {
  locale: string;
  label: string;
  items: BreadcrumbItem[];
}) {
  return (
    <>
      <JsonLd data={breadcrumbJsonLd(locale, items)} />
      <nav className="breadcrumb" aria-label={label}>
        <ol>
          {items.map((item, index) =>
            index === items.length - 1 ? (
              <li key={item.path}>
                <span aria-current="page">{item.label}</span>
              </li>
            ) : (
              <li key={item.path}>
                <Link href={item.path}>{item.label}</Link>
              </li>
            ),
          )}
        </ol>
      </nav>
    </>
  );
}
