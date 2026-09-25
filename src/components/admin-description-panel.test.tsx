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

/**
 * Les deux appels rendus : `onSaved` a toujours été utile aux tests du Bloc
 * 130, `onClose` l'est devenu au Bloc 131/B — c'est lui qui dit si le
 * panneau s'est fermé, ou s'il a posé une question avant.
 */
function renderPanel(
  props: Partial<Parameters<typeof DescriptionPanel>[0]> = {},
  bundle: typeof fr | typeof en = fr,
  locale = "fr",
) {
  const onSaved = vi.fn();
  const onClose = vi.fn();
  render(
    <NextIntlClientProvider locale={locale} messages={bundle}>
      <DescriptionPanel
        target={target}
        onClose={onClose}
        onSaved={onSaved}
        {...props}
      />
    </NextIntlClientProvider>,
  );
  return { onSaved, onClose };
}

/**
 * Le tiroir, et lui seul : dès qu'une question est posée par-dessus, deux
 * surfaces portent `role="dialog"`. C'est le champ qui les départage, et non
 * le titre — celui du tiroir change de langue avec l'interface.
 */
const panel = () =>
  screen
    .getAllByRole("dialog")
    .find((surface) => within(surface).queryByRole("textbox")) as HTMLElement;

/** La question posée avant de perdre une saisie, quand elle est à l'écran. */
const question = () =>
  screen
    .getAllByRole("dialog")
    .find((surface) => !within(surface).queryByRole("textbox"));

/** Le fond cliquable du tiroir : le geste par lequel le Bloc 131/B arrive. */
const backdrop = () => panel().parentElement as HTMLElement;
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
    const { onSaved } = renderPanel();

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

/**
 * Bloc 131/B : une saisie en cours ne part pas sans un mot.
 *
 * Reproduit au navigateur avant d'être corrigé : le panneau ouvert sur Coût
 * de Ville, un texte tapé, un clic sur le fond — le panneau disparaissait,
 * la saisie avec, et rien à l'écran n'avait rien demandé.
 *
 * La question ne se pose que s'il y a quelque chose à perdre : c'est la
 * moitié qu'il est facile de rater, et les tests la tiennent dans les deux
 * sens — fermeture immédiate sans modification, question avec.
 */
describe("Bloc 131/B — quitter le panneau sans enregistrer", () => {
  const type = (text: string) =>
    fireEvent.change(field(), { target: { value: text } });
  const leave = () =>
    fireEvent.click(
      within(question() as HTMLElement).getByRole("button", {
        name: "Quitter sans enregistrer",
      }),
    );

  it("ferme sans rien demander quand rien n’a changé", () => {
    const { onClose } = renderPanel();
    fireEvent.mouseDown(backdrop());
    expect(onClose).toHaveBeenCalled();
    expect(question()).toBeUndefined();
  });

  it.each([
    ["le fond", () => fireEvent.mouseDown(backdrop())],
    [
      "la croix",
      () =>
        fireEvent.click(
          within(panel()).getByRole("button", { name: "Fermer" }),
        ),
    ],
    [
      "Annuler",
      () =>
        fireEvent.click(
          within(panel()).getByRole("button", { name: "Annuler" }),
        ),
    ],
  ])("demande avant de perdre une saisie — %s", (_gesture, close) => {
    const { onClose } = renderPanel();
    type("Un texte jamais enregistré.");
    close();
    expect(onClose).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        "Es-tu sûr de vouloir quitter sans enregistrer les modifications ?",
      ),
    ).toBeInTheDocument();
  });

  it("garde la saisie quand la question est déclinée", () => {
    const { onClose } = renderPanel();
    type("Un texte jamais enregistré.");
    fireEvent.mouseDown(backdrop());
    fireEvent.click(
      within(question() as HTMLElement).getByRole("button", {
        name: "Annuler",
      }),
    );
    expect(onClose).not.toHaveBeenCalled();
    expect(question()).toBeUndefined();
    expect(field()).toHaveValue("Un texte jamais enregistré.");
  });

  it("ferme pour de bon quand la question est confirmée", () => {
    const { onClose } = renderPanel();
    type("Un texte jamais enregistré.");
    fireEvent.mouseDown(backdrop());
    leave();
    expect(onClose).toHaveBeenCalled();
  });

  /**
   * L’état est comparé à ce qui est stocké, pas à ce que le champ contenait
   * à l’ouverture : retaper le texte d’origine n’a plus rien à faire perdre.
   */
  it("redevient propre quand le texte d’origine est retapé", () => {
    const { onClose } = renderPanel();
    type("Le prix d’une ville, ou presque.");
    expect(
      within(panel()).getByText("Modifications non enregistrées"),
    ).toBeInTheDocument();
    type("Le prix d’une ville.");
    expect(
      within(panel()).queryByText("Modifications non enregistrées"),
    ).toBeNull();
    fireEvent.mouseDown(backdrop());
    expect(onClose).toHaveBeenCalled();
    expect(question()).toBeUndefined();
  });

  // Une langue vide et une langue jamais renseignée sont le même état :
  // ouvrir un onglet sans y écrire ne doit pas salir le panneau.
  it("ne se salit pas en visitant une langue vide", () => {
    const { onClose } = renderPanel();
    fireEvent.click(within(panel()).getByRole("button", { name: /^DE/ }));
    fireEvent.mouseDown(backdrop());
    expect(onClose).toHaveBeenCalled();
    expect(question()).toBeUndefined();
  });

  /**
   * Les deux surfaces écoutent Échap sur le document, et la touche atteint
   * donc les deux. Ce que ce test tient, c'est le résultat : la question
   * part, le panneau et sa saisie restent.
   *
   * Il ne prouve pas la garde `if (leaving) return` du panneau : dans
   * l'ordre où les écouteurs sont posés aujourd'hui, le résultat serait le
   * même sans elle. Elle est là pour que cet ordre cesse de décider —
   * inversé, la question se refermerait puis se rouvrirait dans le même
   * lot d'états, et Échap ne pourrait plus jamais la fermer.
   */
  it("une seule touche Échap ferme la question, pas le panneau", () => {
    const { onClose } = renderPanel();
    type("Un texte jamais enregistré.");
    fireEvent.mouseDown(backdrop());
    fireEvent.keyDown(document, { key: "Escape" });
    expect(question()).toBeUndefined();
    expect(onClose).not.toHaveBeenCalled();
    expect(field()).toHaveValue("Un texte jamais enregistré.");
  });
});
