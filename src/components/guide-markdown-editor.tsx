"use client";

import MarkdownEditor from "@uiw/react-md-editor";
import { MarkdownRenderer } from "./markdown-renderer";
import "@uiw/react-md-editor/markdown-editor.css";

export function GuideMarkdownEditor({
  label,
  previewLabel,
  value,
  onChange,
}: {
  label: string;
  previewLabel: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="guide-markdown-workspace">
      <div className="guide-markdown-pane">
        <span className="guide-field-label">{label}</span>
        <MarkdownEditor
          value={value}
          onChange={(next) => onChange(next ?? "")}
          preview="edit"
          height={520}
          visibleDragbar={false}
          textareaProps={{ "aria-label": label, spellCheck: true }}
        />
      </div>
      <div className="guide-markdown-pane guide-live-preview">
        <span className="guide-field-label">{previewLabel}</span>
        <MarkdownRenderer markdown={value} />
      </div>
    </div>
  );
}
