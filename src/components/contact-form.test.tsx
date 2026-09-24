import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/fr.json";
import { ContactForm } from "./contact-form";

// Bloc 129 §2.4 : le formulaire lit l'objet et la page dans l'URL. Hors du
// routeur, useSearchParams renvoie null — d'où ce mock, réglable par test.
let search = "";
vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(search),
}));

function renderForm(query = "") {
  search = query;
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ContactForm />
    </NextIntlClientProvider>,
  );
}

async function fillAndSubmit(subject = "Erreur dans les données") {
  fireEvent.change(screen.getByLabelText("Ton email"), {
    target: { value: "player@example.com" },
  });
  fireEvent.click(screen.getByRole("button", { name: subject }));
  fireEvent.change(screen.getByLabelText("Message"), {
    target: { value: "Le taux d'XP semble faux." },
  });
  fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
}

describe("ContactForm", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    cleanup();
    search = "";
  });

  it("exposes the required email and message fields", () => {
    renderForm();
    expect(screen.getByLabelText("Ton email")).toHaveAttribute("required");
    expect(screen.getByLabelText("Ton email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Message")).toHaveAttribute("required");
    // §3.6 : la page concernée est facultative.
    expect(screen.getByLabelText("Page concernée")).not.toHaveAttribute(
      "required",
    );
  });

  // §3.6 : « Objet » passe du <select> à quatre pastilles à sélection unique,
  // dans un groupe qui porte son nom.
  describe("l'objet en pastilles", () => {
    it("propose les quatre objets, aucun choisi d'entrée", () => {
      renderForm();
      const group = screen.getByRole("group", { name: "Objet" });
      expect(screen.queryByRole("combobox")).toBeNull();
      for (const label of [
        "Erreur dans les données",
        "Idée d'amélioration",
        "Question",
        "Autre",
      ])
        expect(screen.getByRole("button", { name: label })).toHaveAttribute(
          "aria-pressed",
          "false",
        );
      expect(group).toBeInTheDocument();
    });

    it("n'en retient qu'un à la fois", () => {
      renderForm();
      const error = screen.getByRole("button", {
        name: "Erreur dans les données",
      });
      const idea = screen.getByRole("button", { name: "Idée d'amélioration" });
      fireEvent.click(error);
      expect(error).toHaveAttribute("aria-pressed", "true");
      fireEvent.click(idea);
      expect(idea).toHaveAttribute("aria-pressed", "true");
      expect(error).toHaveAttribute("aria-pressed", "false");
    });

    it("garde l'envoi fermé tant qu'aucun objet n'est choisi", () => {
      renderForm();
      expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
      fireEvent.click(screen.getByRole("button", { name: "Question" }));
      expect(screen.getByRole("button", { name: "Envoyer" })).toBeEnabled();
    });
  });

  // §3.6 : le placeholder du message demande ce qu'il faut écrire pour
  // l'objet choisi.
  it("change le placeholder du message avec l'objet", () => {
    renderForm();
    const message = screen.getByLabelText("Message");
    expect(message).toHaveAttribute("placeholder", "Ton message.");
    fireEvent.click(
      screen.getByRole("button", { name: "Erreur dans les données" }),
    );
    expect(message).toHaveAttribute(
      "placeholder",
      "Quelle valeur est affichée, et laquelle vois-tu en jeu ?",
    );
    fireEvent.click(screen.getByRole("button", { name: "Question" }));
    expect(message).toHaveAttribute("placeholder", "Pose ta question.");
  });

  // §2.4 : « Signaler une erreur » arrive avec l'objet et la page remplis.
  describe("le préremplissage par l'URL", () => {
    it("choisit l'objet et remplit la page concernée", () => {
      renderForm(
        "subject=data-error&page=Villes%20%E2%80%BA%20Co%C3%BBt%20de%20ville",
      );
      expect(
        screen.getByRole("button", { name: "Erreur dans les données" }),
      ).toHaveAttribute("aria-pressed", "true");
      expect(screen.getByLabelText("Page concernée")).toHaveValue(
        "Villes › Coût de ville",
      );
    });

    it("ignore un objet que le formulaire ne propose pas", () => {
      renderForm("subject=inconnu");
      expect(screen.getByRole("button", { name: "Envoyer" })).toBeDisabled();
    });

    it("laisse l'objet modifiable", () => {
      renderForm("subject=data-error");
      fireEvent.click(screen.getByRole("button", { name: "Question" }));
      expect(
        screen.getByRole("button", { name: "Erreur dans les données" }),
      ).toHaveAttribute("aria-pressed", "false");
    });
  });

  it("sends the form as JSON and shows a success message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    renderForm();
    await fillAndSubmit();

    expect(fetch).toHaveBeenCalledWith(
      "/api/contact",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          email: "player@example.com",
          subject: "data-error",
          message: "Le taux d'XP semble faux.",
        }),
      }),
    );
    expect(await screen.findByRole("status")).toHaveTextContent(
      "Message envoyé, merci !",
    );
  });

  // L'API n'a pas de champ pour la page concernée, et le §3.6 demande de ne
  // pas la modifier sans nécessité : la page voyage en tête du message.
  it("emmène la page concernée en tête du message", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    renderForm("subject=data-error&page=Villes");
    fireEvent.change(screen.getByLabelText("Ton email"), {
      target: { value: "player@example.com" },
    });
    fireEvent.change(screen.getByLabelText("Message"), {
      target: { value: "Le taux d'XP semble faux." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Envoyer" }));
    const body = JSON.parse(
      String(vi.mocked(fetch).mock.calls[0]?.[1]?.body),
    ) as { message: string };
    expect(body.message).toBe(
      "Page concernée : Villes\n\nLe taux d'XP semble faux.",
    );
  });

  it("shows a not-configured message when SMTP isn't set up", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "not_configured" }), {
        status: 503,
      }),
    );
    renderForm();
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "L’envoi d’emails n’est pas configuré pour le moment, réessaie plus tard.",
    );
  });

  it("shows a generic error message for an invalid submission", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "invalid_contact" }), {
        status: 400,
      }),
    );
    renderForm();
    await fillAndSubmit();
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Vérifie les champs du formulaire et réessaie.",
    );
  });
});
