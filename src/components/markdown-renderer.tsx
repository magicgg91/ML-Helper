import ReactMarkdown from "react-markdown";
import {
  markdownRehypePlugins,
  markdownRehypePluginsShifted,
  markdownRehypePluginsWithPlaceholders,
  markdownRemarkPlugins,
  markdownRemarkPluginsWithBreaks,
} from "../lib/markdown-plugins";

type MarkdownRendererProps = {
  markdown: string;
  className?: string;
  // Bloc 91/M5: normalize the body's Markdown heading levels so they sit under
  // the page's own <h1>, for pages that already render one around this content
  // (the guide detail page). See rehypeShiftHeadings in ../lib/markdown-plugins.
  shiftHeadings?: boolean;
  /**
   * Bloc 119: honour single line breaks, as the legal notice is written. Off
   * by default — guides are hard-wrapped prose and must keep the CommonMark
   * rule they were written under.
   */
  breaks?: boolean;
  /**
   * Bloc 119: wrap the notice's unfinished fields in a <mark>. Only the legal
   * notice has any, and only its two screens ask for this.
   */
  highlightPlaceholders?: boolean;
};

export function MarkdownRenderer({
  markdown,
  className,
  shiftHeadings,
  breaks,
  highlightPlaceholders,
}: MarkdownRendererProps) {
  const classes = ["markdown-content", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <ReactMarkdown
        remarkPlugins={
          breaks ? markdownRemarkPluginsWithBreaks : markdownRemarkPlugins
        }
        rehypePlugins={
          highlightPlaceholders
            ? markdownRehypePluginsWithPlaceholders
            : shiftHeadings
              ? markdownRehypePluginsShifted
              : markdownRehypePlugins
        }
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
