import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MarkdownRenderer } from "./markdown-renderer";

const markdown = `
| Colonne | Valeur |
| --- | --- |
| Test | 42 |

- Élément à puces

1. Première étape
2. Deuxième étape

- [ ] À faire
- [x] Terminé

~~Ancien texte~~

\`\`\`ts
const answer = 42;
\`\`\`

> Citation de test

[Lien de test](https://example.com)

<script>alert("unsafe")</script>
`;

describe("MarkdownRenderer", () => {
  afterEach(cleanup);

  it("renders GFM and standard Markdown semantics", () => {
    const { container } = render(<MarkdownRenderer markdown={markdown} />);

    const table = screen.getByRole("table");
    expect(
      within(table).getByRole("columnheader", { name: "Colonne" }),
    ).toBeVisible();
    expect(within(table).getByRole("cell", { name: "42" })).toBeVisible();
    expect(
      container.querySelector("ul:not(.contains-task-list)"),
    ).toHaveTextContent("Élément à puces");
    expect(container.querySelector("ol")).toHaveTextContent(
      "Première étape Deuxième étape",
    );

    const tasks = screen.getAllByRole("checkbox");
    expect(tasks).toHaveLength(2);
    expect(tasks[0]).toBeDisabled();
    expect(tasks[0]).not.toBeChecked();
    expect(tasks[1]).toBeChecked();
    expect(container.querySelector("del")).toHaveTextContent("Ancien texte");
    expect(container.querySelector("pre code.language-ts")).toHaveTextContent(
      "const answer = 42;",
    );
    expect(container.querySelector("blockquote")).toHaveTextContent(
      "Citation de test",
    );
    expect(screen.getByRole("link", { name: "Lien de test" })).toHaveAttribute(
      "href",
      "https://example.com",
    );
    expect(container.querySelector("script")).toBeNull();
  });
});
