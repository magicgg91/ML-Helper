import { describe, expect, it } from "vitest";
import { blocksToMarkdown, markdownToBlocks } from "./guide-markdown";

describe("guide block markdown", () => {
  it("round-trips visual block types as clean markdown", () => {
    const source =
      "## Départ\n\nPremier paragraphe.\n\n- Un\n- Deux\n\n> Important\n\n![Carte](https://example.com/map.png)";
    expect(blocksToMarkdown(markdownToBlocks(source))).toBe(source);
  });
});
