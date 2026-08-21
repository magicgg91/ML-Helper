"use client";

import MarkdownEditor from "@uiw/react-md-editor";
import {
  markdownRehypePlugins,
  markdownRemarkPlugins,
} from "../lib/markdown-plugins";
import "@uiw/react-md-editor/markdown-editor.css";

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
