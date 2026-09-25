import { describe, expect, it } from "vitest";
import { readingMinutes, wordsPerMinute } from "./reading-time";

describe("Bloc 129 §3.5 : le temps de lecture", () => {
  it("compte une minute par cadence de lecture, arrondie au-dessus", () => {
    const words = (count: number) => "mot ".repeat(count).trim();
    expect(readingMinutes(words(wordsPerMinute))).toBe(1);
    expect(readingMinutes(words(wordsPerMinute + 1))).toBe(2);
    expect(readingMinutes(words(wordsPerMinute * 3))).toBe(3);
  });

  it("ne descend jamais à zéro, même sur un guide d'une ligne", () => {
    expect(readingMinutes("Trois mots ici.")).toBe(1);
    expect(readingMinutes("")).toBe(1);
  });

  it("ne compte ni le balisage ni les adresses des liens", () => {
    const plain = "un deux trois quatre cinq";
    const marked =
      "**un** _deux_ ## trois [quatre](https://exemple.test/tres/long/chemin) cinq";
    expect(readingMinutes(marked)).toBe(readingMinutes(plain));
  });

  it("ne compte pas un bloc de code comme de la prose", () => {
    const withCode = `texte\n\n\`\`\`\n${"code ".repeat(500)}\n\`\`\`\n`;
    expect(readingMinutes(withCode)).toBe(1);
  });
});
