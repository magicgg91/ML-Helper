import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider, createTranslator } from "next-intl";
import frMessages from "../../messages/fr.json";
import { defaultCalculatorAvailability } from "../lib/calculator-catalog";
import { referenceCatalog } from "../lib/reference-catalog";
import { ReferenceCatalogGrid } from "./reference-catalog-grid";

afterEach(cleanup);

// The generated translator type only accepts the namespace's known keys —
// narrower than the component's plain (key: string) => string prop type, so
// this cast just aligns the two for the test (same runtime function either way).
const t = createTranslator({
  locale: "fr",
  messages: frMessages,
  namespace: "references",
}) as (key: string) => string;

describe("ReferenceCatalogGrid (Bloc 38/O)", () => {
  it("shows the real referential illustration for every one of the 6 references", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid locale="fr" t={t} active={defaultCalculatorAvailability} />
      </NextIntlClientProvider>,
    );
    for (const src of [
      "/referentials/referential-fight.webp",
      "/referentials/referential-expedition.webp",
      "/referentials/referential-levelup.webp",
      "/referentials/referential-temples.webp",
      "/referentials/referential-gems.webp",
      // Bloc 51: Boutique's own illustration, deposited after the other 5.
      "/referentials/referential-shop.webp",
    ])
      expect(document.querySelector(`img[src='${src}']`)).toBeInTheDocument();
  });

  // Bloc 104: what a failed illustration degrades to. It used to be a second
  // <img>, pointing at the placeholder icons this catalog carried before the
  // illustrations existed — files deleted long ago, so the "fallback" was one
  // broken image behind another, and its mere presence in the props cost the
  // homepage five 404s (React preloads any <img> it finds in the RSC payload,
  // rendered or not). It degrades to nothing now: the tile keeps its square
  // box and its title, and asks the network for nothing more.
  //
  // Covered on three references rather than one because each got its
  // illustration in a different bloc (Boutique at 51, Événements at 62/H) and
  // each was verified separately at the time.
  it.each([
    ["combat-equipment", "/referentials/referential-fight.webp", false],
    ["shop", "/referentials/referential-shop.webp", false],
    ["events", "/referentials/referential-events.webp", true],
  ])(
    "Bloc104: %s degrades to an empty image box, requesting no replacement",
    (slug, src, needsEvents) => {
      render(
        <NextIntlClientProvider locale="fr" messages={frMessages}>
          <ReferenceCatalogGrid
            locale="fr"
            t={t}
            active={
              needsEvents
                ? { ...defaultCalculatorAvailability, events: true }
                : defaultCalculatorAvailability
            }
          />
        </NextIntlClientProvider>,
      );
      const image = document.querySelector<HTMLImageElement>(
        `img[src='${src}']`,
      )!;
      expect(image).toBeInTheDocument();
      const box = image.closest(".tool-category-image")!;

      fireEvent.error(image);

      expect(
        document.querySelector(`img[src='${src}']`),
      ).not.toBeInTheDocument();
      // No second <img> takes its place — that is the whole point.
      expect(box.querySelector("img")).toBeNull();
      // The box itself stays, so the grid does not reflow around the gap,
      // and the card still names the reference it links to.
      expect(box).toBeInTheDocument();
      expect(box.closest("a")).toHaveAttribute(
        "href",
        expect.stringContaining(slug),
      );
    },
  );

  // Bloc 64/A: tiles ordered by the displayed label, in the visitor's
  // locale — the catalog declares Combat/Expédition/Équipements... in its
  // own order, which is not alphabetical.
  it("Bloc64/A: orders the tiles alphabetically by their displayed label", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid
          locale="fr"
          t={t}
          active={{ ...defaultCalculatorAvailability, events: true }}
        />
      </NextIntlClientProvider>,
    );
    const titles = Array.from(container.querySelectorAll("h2")).map(
      (heading) => heading.textContent!,
    );
    expect(titles).toEqual([...titles].sort((a, b) => a.localeCompare(b, "fr")));
    // Not the catalog's own order, which starts with Combat/Expédition.
    expect(titles).not.toEqual(
      referenceCatalog.map((reference) => t(`catalog.${reference.slug}`)),
    );
  });

  // Bloc 66/A: dropping the "Coût des" prefix moves Templiers from sorting
  // under C to sorting under T — an automatic consequence of the sort
  // above being computed on the displayed label, not a bug to guard
  // against. Confirmed here with the real, non-mocked fr labels.
  it("Bloc66/A: sorts Templiers under T (after Progression, Gemmes), not under C as 'Coût des Templiers' once did", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid locale="fr" t={t} active={defaultCalculatorAvailability} />
      </NextIntlClientProvider>,
    );
    const titles = Array.from(container.querySelectorAll("h2")).map(
      (heading) => heading.textContent!,
    );
    expect(titles).toContain("Templiers");
    expect(titles.indexOf("Templiers")).toBeGreaterThan(
      titles.indexOf("Progression"),
    );
    expect(titles.indexOf("Templiers")).toBeGreaterThan(
      titles.indexOf("Gemmes"),
    );
  });

  // Bloc 67: same repositioning consequence as Bloc 66/A above, this time
  // for "Level Up" -> "Progression" itself (L sorted before Gemmes/G,
  // Progression now sorts after both).
  it("Bloc67: sorts Progression under P (after Gemmes), not under L as 'Level Up' once did", () => {
    const { container } = render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid locale="fr" t={t} active={defaultCalculatorAvailability} />
      </NextIntlClientProvider>,
    );
    const titles = Array.from(container.querySelectorAll("h2")).map(
      (heading) => heading.textContent!,
    );
    expect(titles).toContain("Progression");
    expect(titles.indexOf("Progression")).toBeGreaterThan(
      titles.indexOf("Gemmes"),
    );
  });

  it("uses the same square .tool-category-image box as the tool categories (Bloc 38/H)", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid locale="fr" t={t} active={defaultCalculatorAvailability} />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getAllByRole("link")[0].querySelector(".tool-category-image"),
    ).not.toBeNull();
  });

  // Bloc 50 Group3: `limit` is a real structural cap (used by the homepage's
  // teaser section), not something that happens to hold today because the
  // catalog has only 6 entries — verify it truncates when given fewer slots
  // than the full catalog, and that omitting it (the /referentiels index
  // page's usage) still shows every entry.
  it("caps the number of tiles rendered when a limit is given", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid
        locale="fr"
        t={t}
        limit={2}
        active={defaultCalculatorAvailability}
      />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("shows every catalog entry when no limit is given", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid locale="fr" t={t} active={defaultCalculatorAvailability} />
      </NextIntlClientProvider>,
    );
    expect(screen.getAllByRole("link")).toHaveLength(referenceCatalog.length);
  });

  // Bloc 60 review (Codex PR #81): a reference shipped inactive (Events,
  // hidden until an admin activates it) must not appear as a clickable
  // tile here — the direct URL already shows the "unavailable" message on
  // its own, this grid should never link to it in the meantime.
  it("hides a reference's tile while its calculator is inactive", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={frMessages}>
        <ReferenceCatalogGrid
          locale="fr"
          t={t}
          active={{ ...defaultCalculatorAvailability, events: false }}
        />
      </NextIntlClientProvider>,
    );
    expect(screen.queryByRole("link", { name: /Événements/ })).toBeNull();
    expect(screen.getAllByRole("link")).toHaveLength(
      referenceCatalog.length - 1,
    );
  });
});
