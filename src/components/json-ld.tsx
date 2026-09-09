// Bloc 91/M4: renders one or more JSON-LD objects in a script tag. `type`
// application/ld+json is a non-executable data block: CSP's script-src does not
// gate it (it's never run), and the tag is server-rendered into the HTML for
// crawlers regardless of CSP — so no nonce is needed and this stays a plain
// sync server component. The serialized JSON has its "<" escaped so a value can
// never close the <script> element early.
export function JsonLd({
  data,
}: {
  data: Record<string, unknown> | Record<string, unknown>[];
}) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}
