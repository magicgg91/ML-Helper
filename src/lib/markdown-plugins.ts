import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

export const markdownRemarkPlugins = [remarkGfm];
// Bloc 56: rehypeRaw must run before rehypeSanitize — it parses raw HTML
// text nodes (e.g. `<img width="48">`) into real hast element nodes so
// rehypeSanitize's default schema (which already allows img/width/height,
// but only strips what it can actually see as elements) can then keep the
// safe ones and drop the rest (e.g. <script>). Without rehypeRaw, react-
// markdown never parses raw HTML at all — it was rendered as plain escaped
// text on the public site, unlike the admin preview (@uiw/react-markdown-
// preview always prepends its own rehypeRaw internally, independent of the
// rehypePlugins prop, which is why only the admin preview ever worked).
export const markdownRehypePlugins = [rehypeRaw, rehypeSanitize];

// Bloc 91/M5: a minimal hast node shape — enough to walk the tree and rewrite
// heading tag names without pulling in unist-util-visit (not a dependency).
type HastNode = {
  type: string;
  tagName?: string;
  children?: HastNode[];
};

const headingLevel = (node: HastNode): number | null => {
  if (node.type !== "element" || !node.tagName) return null;
  const match = /^h([1-6])$/.exec(node.tagName);
  return match ? Number(match[1]) : null;
};

const forEachNode = (node: HastNode, fn: (node: HastNode) => void): void => {
  fn(node);
  node.children?.forEach((child) => forEachNode(child, fn));
};

// Bloc 91/M5: normalize a Markdown body's heading levels so its shallowest
// heading sits at <h2> — one level below the page <h1> the guide shell already
// renders — while preserving the relative depth the author wrote. This fixes
// the two problems the audit found without introducing new skips:
//   - a body opening with `# …` (a second <h1>) shifts down to <h2>;
//   - a body already opening at `##` is left untouched (no over-shift to h3);
//   - a body starting too deep (e.g. `###`) is promoted up to <h2>.
// Levels are clamped to 2–6 so the body can never re-introduce an <h1>.
// NOT applied to the legal page, whose Markdown provides its own (single) <h1>.
export function rehypeShiftHeadings() {
  return (tree: HastNode): void => {
    let min: number | null = null;
    forEachNode(tree, (node) => {
      const level = headingLevel(node);
      if (level !== null && (min === null || level < min)) min = level;
    });
    if (min === null) return;
    const delta = 2 - min;
    if (delta === 0) return;
    forEachNode(tree, (node) => {
      const level = headingLevel(node);
      if (level !== null) {
        node.tagName = `h${Math.min(6, Math.max(2, level + delta))}`;
      }
    });
  };
}

// Bloc 91/M5: same pipeline as markdownRehypePlugins, with the heading
// normalization slotted after raw-HTML parsing (so a raw <h1> in the body is
// normalized too) and before sanitization (h2–h6 all stay in rehypeSanitize's
// default allowlist).
export const markdownRehypePluginsShifted = [
  rehypeRaw,
  rehypeShiftHeadings,
  rehypeSanitize,
];
