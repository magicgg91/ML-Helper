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

<img src="https://example.com/icon.png" alt="Icône" width="48" height="48" />
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
    // Bloc 56: raw HTML <img> must render (not be escaped as plain text)
    // with its width/height attributes preserved — the only way to control
    // an editorial image's size, impossible in pure Markdown syntax.
    const image = screen.getByRole("img", { name: "Icône" });
    expect(image).toHaveAttribute("src", "https://example.com/icon.png");
    expect(image).toHaveAttribute("width", "48");
    expect(image).toHaveAttribute("height", "48");
  });

  // Bloc 91/M5: by default the body keeps the levels the author wrote.
  it("renders headings at their authored level by default", () => {
    render(<MarkdownRenderer markdown={"# Titre\n\n## Sous-titre"} />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Titre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Sous-titre" }),
    ).toBeInTheDocument();
  });

  // Bloc 91/M5: under a page that already owns the <h1> (the guide detail
  // page), shiftHeadings normalizes a body opening with `# …` down to <h2>
  // (never a second <h1>), preserving relative depth. Raw HTML headings too.
  it("normalizes a body opening with an <h1> down to <h2> when shiftHeadings is set", () => {
    render(
      <MarkdownRenderer
        markdown={"# Titre\n\n## Sous-titre\n\n<h1>Brut</h1>"}
        shiftHeadings
      />,
    );
    expect(screen.queryByRole("heading", { level: 1 })).toBeNull();
    expect(
      screen.getByRole("heading", { level: 2, name: "Titre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Sous-titre" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "Brut" }),
    ).toBeInTheDocument();
  });

  // Bloc 91/M5: a body that already opens at `##` (the correct level under the
  // page <h1>) must be left untouched — no over-shift to <h3> that would
  // reintroduce an h1→h3 skip.
  it("leaves a body already opening at <h2> untouched when shiftHeadings is set", () => {
    render(
      <MarkdownRenderer markdown={"## Section\n\n### Détail"} shiftHeadings />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Section" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Détail" }),
    ).toBeInTheDocument();
  });

  // Bloc 91/M5: a body starting too deep (`###`) is promoted so its shallowest
  // heading becomes <h2>, closing the h1→h3 gap.
  it("promotes a body starting below <h2> up to <h2> when shiftHeadings is set", () => {
    render(
      <MarkdownRenderer
        markdown={"### Profond\n\n#### Plus profond"}
        shiftHeadings
      />,
    );
    expect(
      screen.getByRole("heading", { level: 2, name: "Profond" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "Plus profond" }),
    ).toBeInTheDocument();
  });
});
