import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it } from "vitest";
import frMessages from "../../messages/fr.json";
import { SiteSearch } from "./site-search";

const guides = [
  {
    id: "one",
    slug: "guide-combat",
    title: "Guide Combat",
    excerpt: "Attaquer efficacement",
  },
];

function renderSearch() {
  render(
    <NextIntlClientProvider locale="fr" messages={frMessages}>
      <SiteSearch guides={guides} />
    </NextIntlClientProvider>,
  );
}

describe("SiteSearch", () => {
  afterEach(cleanup);

  it("exposes an accessible search box, closed by default", () => {
    renderSearch();
    expect(
      screen.getByRole("searchbox", { name: "Rechercher sur le site" }),
    ).toBeVisible();
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("finds a guide by title and routes to its page", () => {
    renderSearch();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Rechercher sur le site" }),
      { target: { value: "combat" } },
    );
    const link = screen.getByRole("link", { name: /Guide Combat/ });
    expect(link).toHaveAttribute("href", "/guides/guide-combat");
    expect(link).toHaveTextContent("Guide");
  });

  it("finds a reference table and routes to the referentiel page", () => {
    renderSearch();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Rechercher sur le site" }),
      { target: { value: "équipements de combat" } },
    );
    const link = screen.getByRole("link", { name: /Équipements de Combat/ });
    expect(link).toHaveAttribute(
      "href",
      "/guides/referentiels/combat-equipment",
    );
    expect(link).toHaveTextContent("Référentiel");
  });

  it("finds a tool and routes to its category page, not to a referentiel", () => {
    renderSearch();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Rechercher sur le site" }),
      // Bloc36/A: "classement" has no referentiel counterpart, so it stays
      // a single unambiguous match (unlike "gemmes", now shared with the
      // new Gems reference — see the dedicated Bloc36/A test below).
      { target: { value: "classement" } },
    );
    const link = screen.getByRole("link", { name: /Classement/ });
    expect(link).toHaveAttribute("href", "/tools/classement");
    expect(link).toHaveTextContent("Outil");
  });

  it("Bloc36/A: lists both the Gems tool and its reference, sharing the exact same label", () => {
    renderSearch();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Rechercher sur le site" }),
      { target: { value: "gemmes" } },
    );
    const links = screen.getAllByRole("link", { name: /Gemmes/ });
    expect(links).toHaveLength(2);
    expect(links.map((link) => link.getAttribute("href"))).toEqual(
      expect.arrayContaining([
        "/tools/competences",
        "/guides/referentiels/gemmes",
      ]),
    );
  });

  it("lists a referentiel calculator only once, as a reference, never as a tool", () => {
    renderSearch();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Rechercher sur le site" }),
      { target: { value: "level up" } },
    );
    expect(screen.getAllByRole("link")).toHaveLength(1);
    expect(screen.getByRole("link", { name: /Level Up/ })).toHaveAttribute(
      "href",
      "/guides/referentiels/level-up",
    );
  });

  it("shows a no-results message when nothing matches", () => {
    renderSearch();
    fireEvent.change(
      screen.getByRole("searchbox", { name: "Rechercher sur le site" }),
      { target: { value: "introuvable" } },
    );
    expect(screen.getByRole("status")).toHaveTextContent("Aucun résultat.");
  });

  it("clears the query and closes the results after clicking a result", () => {
    renderSearch();
    const input = screen.getByRole("searchbox", {
      name: "Rechercher sur le site",
    });
    // Bloc36/A: "level up" (not "gemmes", now shared by 2 results) keeps
    // this generic dropdown-behavior test to a single unambiguous match.
    fireEvent.change(input, { target: { value: "level up" } });
    fireEvent.click(screen.getByRole("link", { name: /Level Up/ }));
    expect(input).toHaveValue("");
    expect(screen.queryByRole("list")).toBeNull();
  });

  it("closes the results dropdown when clicking outside the search", () => {
    renderSearch();
    const input = screen.getByRole("searchbox", {
      name: "Rechercher sur le site",
    });
    fireEvent.change(input, { target: { value: "level up" } });
    expect(screen.getByRole("link", { name: /Level Up/ })).toBeVisible();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("link", { name: /Level Up/ })).toBeNull();
    expect(screen.queryByRole("status")).toBeNull();
    expect(input).toHaveValue("level up");
  });

  it("does not close when clicking inside the search box or its results", () => {
    renderSearch();
    const input = screen.getByRole("searchbox", {
      name: "Rechercher sur le site",
    });
    fireEvent.change(input, { target: { value: "level up" } });
    fireEvent.mouseDown(input);
    expect(screen.getByRole("link", { name: /Level Up/ })).toBeVisible();

    fireEvent.mouseDown(screen.getByRole("link", { name: /Level Up/ }));
    expect(screen.getByRole("link", { name: /Level Up/ })).toBeVisible();
  });

  it("reopens the results when the search box regains focus after an outside click", () => {
    renderSearch();
    const input = screen.getByRole("searchbox", {
      name: "Rechercher sur le site",
    });
    fireEvent.change(input, { target: { value: "level up" } });
    fireEvent.mouseDown(document.body);
    expect(screen.queryByRole("link", { name: /Level Up/ })).toBeNull();

    fireEvent.focus(input);
    expect(screen.getByRole("link", { name: /Level Up/ })).toBeVisible();
  });
});
