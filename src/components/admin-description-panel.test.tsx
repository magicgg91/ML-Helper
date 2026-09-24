import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import fr from "../../messages/fr.json";
import en from "../../messages/en.json";
import { DescriptionPanel } from "./admin-description-panel";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const target = {
  slug: "city-cost",
  label: "Coût de Ville",
  description: { fr: "Le prix d’une ville." },
};

function renderPanel(
  props: Partial<Parameters<typeof DescriptionPanel>[0]> = {},
  bundle: typeof fr | typeof en = fr,
  locale = "fr",
) {
  const onSaved = vi.fn();
  render(
    <NextIntlClientProvider locale={locale} messages={bundle}>
      <DescriptionPanel
        target={target}
        onClose={vi.fn()}
        onSaved={onSaved}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return onSaved;
}

const panel = () => screen.getByRole("dialog");
const field = () => within(panel()).getByRole("textbox");
const save = () =>
  fireEvent.click(within(panel()).getByRole("button", { name: "Enregistrer" }));

describe("Bloc 130: describing a tool or a reference", () => {
  it("opens on the stored text of the language it starts on", () => {
    renderPanel();
    expect(field()).toHaveValue("Le prix d’une ville.");
  });

  it("offers every launch language, not just the admin's two", () => {
    // The field is content for the public site (5 languages); the chrome
    // around it is admin interface (EN/FR). The two are different things.
    renderPanel();
    expect(
      within(panel())
        .getAllByRole("button", { pressed: false })
        .concat(within(panel()).getAllByRole("button", { pressed: true }))
        .map((button) => button.textContent),
    ).toEqual(expect.arrayContaining(["fr", "en", "de", "es", "tr"]));
  });

  it("writes two languages and sends both", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ description: { fr: "a", de: "b" } }), {
        status: 200,
      }),
    );
    const onSaved = renderPanel();

    fireEvent.change(field(), { target: { value: "Le prix d’une ville." } });
    fireEvent.click(within(panel()).getByRole("button", { name: /^DE/ }));
    fireEvent.change(field(), { target: { value: "Der Preis einer Stadt." } });
    save();

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/admin/calculators/city-cost/description");
    expect(init?.method).toBe("PATCH");
    expect(JSON.parse(String(init?.body)).description).toMatchObject({
      fr: "Le prix d’une ville.",
      de: "Der Preis einer Stadt.",
    });
    // The list is told what was stored, so it can show the new count.
    await waitFor(() =>
      expect(onSaved).toHaveBeenCalledWith("city-cost", { fr: "a", de: "b" }),
    );
  });

  it("keeps each language's own text when switching between them", () => {
    renderPanel();
    fireEvent.click(within(panel()).getByRole("button", { name: /^EN/ }));
    fireEvent.change(field(), { target: { value: "The cost of a city." } });
    fireEvent.click(within(panel()).getByRole("button", { name: /^FR/ }));
    expect(field()).toHaveValue("Le prix d’une ville.");
    fireEvent.click(within(panel()).getByRole("button", { name: /^EN/ }));
    expect(field()).toHaveValue("The cost of a city.");
  });

  it("starts from the row it was opened on, not the previous one", () => {
    const { rerender } = render(
      <NextIntlClientProvider locale="fr" messages={fr}>
        <DescriptionPanel target={target} onClose={vi.fn()} onSaved={vi.fn()} />
      </NextIntlClientProvider>,
    );
    expect(field()).toHaveValue("Le prix d’une ville.");
    rerender(
      <NextIntlClientProvider locale="fr" messages={fr}>
        <DescriptionPanel
          target={{ slug: "ranking", label: "Classement", description: {} }}
          onClose={vi.fn()}
          onSaved={vi.fn()}
        />
      </NextIntlClientProvider>,
    );
    expect(field()).toHaveValue("");
  });

  // Codex review on PR #151: Cancel, Escape and the backdrop all leave the
  // panel mounted — closing it is the parent dropping its target. The draft
  // used to be seeded once per row, so reopening the same row brought back
  // the text the admin had walked away from, and the next save stored it.
  it("forgets a draft the admin cancelled, on the same row", async () => {
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ description: {} }), { status: 200 }),
      );
    const view = (row: typeof target | undefined) => (
      <NextIntlClientProvider locale="fr" messages={fr}>
        <DescriptionPanel target={row} onClose={vi.fn()} onSaved={vi.fn()} />
      </NextIntlClientProvider>
    );
    const { rerender } = render(view(target));
    fireEvent.change(field(), { target: { value: "Un brouillon abandonné." } });

    rerender(view(undefined));
    rerender(view(target));

    expect(field()).toHaveValue("Le prix d’une ville.");
    // And what a save would store, which is the damage the stale draft did.
    save();
    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(
      JSON.parse(String(fetchMock.mock.calls[0][1]?.body)).description.fr,
    ).toBe("Le prix d’une ville.");
  });

  it("says which languages the public cannot see", () => {
    renderPanel({ hiddenLocales: ["de"], languageNames: { de: "Deutsch" } });
    expect(
      within(panel()).getByRole("button", {
        name: /Deutsch : masquée sur le site/,
      }),
    ).toBeInTheDocument();
  });

  // The constraint of Bloc 118, on a screen that also offers five content
  // languages: the chrome is the admin's, EN or FR, and nothing else.
  it("keeps its own chrome in the admin's language", () => {
    renderPanel();
    expect(
      within(panel()).getByRole("heading", {
        name: "Description de Coût de Ville",
      }),
    ).toBeInTheDocument();
    expect(
      within(panel()).getByRole("button", { name: "Enregistrer" }),
    ).toBeInTheDocument();
    cleanup();

    renderPanel({}, en as unknown as typeof fr, "en");
    expect(
      within(panel()).getByRole("heading", {
        name: "Description of Coût de Ville",
      }),
    ).toBeInTheDocument();
    expect(
      within(panel()).getByRole("button", { name: "Save" }),
    ).toBeInTheDocument();
    // ...while the content languages stay the site's five.
    for (const code of ["fr", "en", "de", "es", "tr"])
      expect(
        within(panel()).getByRole("button", {
          name: new RegExp(`^${code.toUpperCase()}`),
        }),
      ).toBeInTheDocument();
  });
});
