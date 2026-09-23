import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import remarkBreaks from "remark-breaks";
import remarkGfm from "remark-gfm";
import { legalNoticePlaceholderPattern } from "./legal-notice";

export const markdownRemarkPlugins = [remarkGfm];

/**
 * Bloc 119: the same pipeline, plus single line breaks.
 *
 * Markdown, by the CommonMark rule every renderer here follows, folds a lone
 * newline into a space. The legal notice is written with one idea per line —
 * a name, then a contact, then an address — and read as one run-on paragraph,
 * in the admin preview and on the public page alike. This adds the `<br>` a
 * writer means by pressing Enter once.
 *
 * Bloc 119 §3 bis asks for "le même correctif de retours à la ligne" on the
 * guide editor, so guides opt in too — the public page and the admin preview
 * together, which is the point: a preview that renders differently from the
 * page is not a preview. §3's caution was about not changing the guides
 * *unintentionally*; this is intentional, and it does change how an already
 * published guide reads if its author hard-wrapped their paragraphs. Dropping
 * `breaks` from the guide page and the guide editor reverts it in two lines.
 *
 * Still not the default: a caller says which rendering it wants.
 */
export const markdownRemarkPluginsWithBreaks = [remarkGfm, remarkBreaks];
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

/** A hast text node, as the placeholder highlighter rewrites them. */
type HastTextNode = HastNode & { value?: string; properties?: unknown };

/**
 * Bloc 119: wraps each unfinished field of the legal notice in a <mark>, so
 * the preview shows at a glance what is still to write.
 *
 * It reuses the one regex the count comes from (lib/legal-notice.ts): the
 * banner's number and the highlights can never disagree about what a field
 * is.
 *
 * It runs AFTER sanitization, which is the opposite of what one would expect
 * and the only order that works: rehype-sanitize follows GitHub's schema, and
 * `mark` is not in it — marks inserted before it are stripped without a
 * trace. Running after is safe here because these elements are this code's
 * own: it wraps text that has already been sanitized, and adds no attribute
 * but a class name of its own choosing.
 */
export function rehypeHighlightPlaceholders() {
  return (tree: HastNode): void => {
    const rewrite = (node: HastNode): void => {
      if (!node.children) return;
      const next: HastNode[] = [];
      for (const child of node.children as HastTextNode[]) {
        if (child.type !== "text" || typeof child.value !== "string") {
          rewrite(child);
          next.push(child);
          continue;
        }
        const pattern = legalNoticePlaceholderPattern();
        let index = 0;
        let match: RegExpExecArray | null;
        while ((match = pattern.exec(child.value))) {
          if (match.index > index)
            next.push({
              type: "text",
              value: child.value.slice(index, match.index),
            } as HastTextNode);
          next.push({
            type: "element",
            tagName: "mark",
            properties: { className: ["legal-placeholder"] },
            children: [{ type: "text", value: match[0] } as HastTextNode],
          } as HastNode);
          index = match.index + match[0].length;
        }
        if (index === 0) {
          next.push(child);
          continue;
        }
        if (index < child.value.length)
          next.push({
            type: "text",
            value: child.value.slice(index),
          } as HastTextNode);
      }
      node.children = next;
    };
    rewrite(tree);
  };
}

/** The legal notice's own pipeline: raw HTML, sanitization, then highlights. */
export const markdownRehypePluginsWithPlaceholders = [
  rehypeRaw,
  rehypeSanitize,
  rehypeHighlightPlaceholders,
];
