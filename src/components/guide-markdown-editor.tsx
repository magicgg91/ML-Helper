"use client";

import MarkdownEditor from "@uiw/react-md-editor";
import type { ComponentProps } from "react";
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

/**
 * The preview's plugin lists, typed from the editor's own props rather than
 * from the default arrays: the legal notice passes different ones, and a type
 * narrowed to the defaults would refuse them.
 */
type PreviewOptions = NonNullable<
  ComponentProps<typeof MarkdownEditor>["previewOptions"]
>;

export function GuideMarkdownEditor({
  label,
  value,
  onChange,
  mode = "live",
  remarkPlugins = markdownRemarkPlugins,
  rehypePlugins = markdownRehypePlugins,
  textareaId,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  /**
   * Bloc 119: which of the three views is on screen — write, side by side,
   * preview. "live" (side by side) is what every caller had before.
   */
  mode?: "edit" | "live" | "preview";
  /**
   * The preview's own pipeline. The legal notice renders its single line
   * breaks and highlights its unfinished fields, exactly as the public page
   * does; the guides keep the default.
   */
  remarkPlugins?: PreviewOptions["remarkPlugins"];
  rehypePlugins?: PreviewOptions["rehypePlugins"];
  /**
   * Puts an id on the textarea, so a caller can place the caret in it — the
   * legal screen's "Aller au premier" needs to reach the text itself, and the
   * library exposes no handle of its own.
   */
  textareaId?: string;
}) {
  return (
    <div className="guide-markdown-workspace" data-color-mode="light">
      <span className="guide-field-label">{label}</span>
      <MarkdownEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        preview={mode}
        previewOptions={{ remarkPlugins, rehypePlugins }}
        height={markdownEditorHeight}
        visibleDragbar={false}
        textareaProps={{
          "aria-label": label,
          spellCheck: true,
          id: textareaId,
        }}
      />
    </div>
  );
}
