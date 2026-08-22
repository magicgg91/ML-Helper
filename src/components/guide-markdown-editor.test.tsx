import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GuideMarkdownEditor } from "./guide-markdown-editor";

afterEach(cleanup);

describe("GuideMarkdownEditor", () => {
  it("uses the integrated light preview with GFM and sanitized HTML", () => {
    const { container } = render(
      <GuideMarkdownEditor
        label="Markdown"
        value={`| Name | Value |
| --- | --- |
| Test | 42 |

- [x] Done

~~obsolete~~

<script>alert("unsafe")</script>`}
        onChange={vi.fn()}
      />,
    );

    const workspace = container.querySelector(".guide-markdown-workspace");
    const preview = container.querySelector(".w-md-editor-preview");
    expect(workspace).toHaveAttribute("data-color-mode", "light");
    expect(preview?.querySelector("table")).toBeInTheDocument();
    expect(preview?.querySelector('input[type="checkbox"]')).toBeChecked();
    expect(preview?.querySelector("del")).toHaveTextContent("obsolete");
    expect(preview?.querySelector("script")).toBeNull();
    expect(container.querySelector(".guide-live-preview")).toBeNull();
  });

  it("scopes the editor's text color to its own light palette, not the site theme", () => {
    const { container } = render(
      <GuideMarkdownEditor label="Markdown" value="text" onChange={vi.fn()} />,
    );

    const workspace = container.querySelector(".guide-markdown-workspace");
    const editorRoot = container.querySelector(".w-md-editor");
    // wmde-markdown-var is what [data-color-mode*='light'] .wmde-markdown-var
    // in @uiw/react-markdown-preview/markdown.css matches to define
    // --color-fg-default for the whole editor: without that stylesheet
    // imported, this variable is never set and the editor's text silently
    // inherits the site's own (possibly dark-theme) foreground color instead.
    expect(workspace).toHaveAttribute("data-color-mode", "light");
    expect(editorRoot).toHaveClass("wmde-markdown-var");
    expect(workspace?.contains(editorRoot)).toBe(true);
  });
});
