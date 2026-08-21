import ReactMarkdown from "react-markdown";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
} from "../lib/markdown-plugins";

type MarkdownRendererProps = {
  markdown: string;
  className?: string;
};

export function MarkdownRenderer({
  markdown,
  className,
}: MarkdownRendererProps) {
  const classes = ["markdown-content", className].filter(Boolean).join(" ");

  return (
    <div className={classes}>
      <ReactMarkdown
        remarkPlugins={markdownRemarkPlugins}
        rehypePlugins={markdownRehypePlugins}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
}
