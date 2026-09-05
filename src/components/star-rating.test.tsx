import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { StarRating } from "./star-rating";

afterEach(cleanup);

function renderStars(level: number) {
  return render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <StarRating level={level} />
    </NextIntlClientProvider>,
  );
}

// Bloc 73/D: 1-4 renders as that many white stars; at 5 they convert
// completely to 1 yellow star (never a white+yellow mix), 6-8 add more.
describe("StarRating — Bloc 73/D", () => {
  it.each([1, 2, 3, 4])(
    "renders %i white star icon(s), never text like '%i★'",
    (level) => {
      renderStars(level);
      const group = screen.getByRole("img", { name: `${level} étoiles` });
      expect(group).not.toHaveClass("star-rating-yellow");
      expect(group.querySelectorAll("svg")).toHaveLength(level);
      expect(group).not.toHaveTextContent(`${level}★`);
      expect(group).not.toHaveTextContent(`${level}*`);
    },
  );

  it.each([
    [5, 1],
    [6, 2],
    [7, 3],
    [8, 4],
  ])(
    "converts level %i completely to %i yellow star icon(s), never a white+yellow mix",
    (level, expectedYellowCount) => {
      renderStars(level);
      const group = screen.getByRole("img", { name: `${level} étoiles` });
      expect(group).toHaveClass("star-rating-yellow");
      expect(group.querySelectorAll("svg")).toHaveLength(expectedYellowCount);
    },
  );

  it("caps at the 8-star ceiling instead of rendering more", () => {
    renderStars(12);
    const group = screen.getByRole("img", { name: "8 étoiles" });
    expect(group.querySelectorAll("svg")).toHaveLength(4);
  });
});
