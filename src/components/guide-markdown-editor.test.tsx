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
});
