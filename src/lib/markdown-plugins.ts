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
