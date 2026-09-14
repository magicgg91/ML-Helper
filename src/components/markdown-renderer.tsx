import ReactMarkdown from "react-markdown";
import {
  markdownRehypePlugins,
  markdownRehypePluginsShifted,
  markdownRemarkPlugins,
} from "../lib/markdown-plugins";

type MarkdownRendererProps = {
  markdown: string;
  className?: string;
  // Bloc 91/M5: normalize the body's Markdown heading levels so they sit under
  // the page's own <h1>, for pages that already render one around this content
  // (the guide detail page). See rehypeShiftHeadings in ../lib/markdown-plugins.
  shiftHeadings?: boolean;
};

export function MarkdownRenderer({
  markdown,
  className,
  shiftHeadings,
}: MarkdownRendererProps) {
  const classes = ["markdown-content", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={
          shiftHeadings ? markdownRehypePluginsShifted : markdownRehypePlugins
        }
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
