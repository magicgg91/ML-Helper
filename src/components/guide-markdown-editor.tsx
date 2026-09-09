"use client";

import MarkdownEditor from "@uiw/react-md-editor";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
} from "../lib/markdown-plugins";
import "@uiw/react-md-editor/markdown-editor.css";
// react-md-editor's own CSS never defines --color-fg-default (only the
// separate react-markdown-preview stylesheet does, scoped per
// data-color-mode) — without it the editor's text color falls back to
// whatever color it inherits from the page, i.e. the site's own dark-theme
// text on top of the editor's forced-light background. Importing this
// locks the editor's foreground to GitHub's light palette regardless of
// the site's active theme.
import "@uiw/react-markdown-preview/markdown.css";

const markdownEditorHeight = 640;

export function GuideMarkdownEditor({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="guide-markdown-workspace" data-color-mode="light">
      <span className="guide-field-label">{label}</span>
      <MarkdownEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        preview="live"
        previewOptions={{
          remarkPlugins: markdownRemarkPlugins,
          rehypePlugins: markdownRehypePlugins,
        }}
        height={markdownEditorHeight}
        visibleDragbar={false}
        textareaProps={{ "aria-label": label, spellCheck: true }}
      />
    </div>
  );
}
