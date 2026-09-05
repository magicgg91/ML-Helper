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

// Bloc 91/M5: renumber a Markdown body's headings into a gapless outline that
// starts at <h2> — one level below the page <h1> the guide shell already
// renders. Walking the headings in document order and mapping each authored
// level onto (nearest shallower ancestor's output + 1), floored at 2, means:
//   - a body opening with `# …` (a second <h1>) becomes <h2>;
//   - a body already opening at `##` stays <h2> (its `###` child stays <h3>);
//   - a body starting too deep (e.g. `###`) is promoted to <h2>;
//   - an internal skip the author wrote (`## …` then `#### …`) is closed to
//     <h2> then <h3>, not left as an h2→h4 gap (Codex review, PR #112).
// Output levels only ever rise by one and are floored at 2, so the body can
// never re-introduce an <h1>; they are capped at 6 for pathological nesting.
// NOT applied to the legal page, whose Markdown provides its own (single) <h1>.
export function rehypeShiftHeadings() {
  return (tree: HastNode): void => {
    // Each entry maps an open authored level to the output level it received;
    // deeper-or-equal entries are popped when a new heading closes them.
    const stack: { input: number; output: number }[] = [];
    forEachNode(tree, (node) => {
      const level = headingLevel(node);
      if (level === null) return;
      while (stack.length && stack[stack.length - 1].input >= level)
        stack.pop();
      const output = Math.min(
        6,
        stack.length ? stack[stack.length - 1].output + 1 : 2,
      );
      stack.push({ input: level, output });
      node.tagName = `h${output}`;
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
