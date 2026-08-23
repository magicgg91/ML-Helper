import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/fr.json";
import { ContactForm } from "./contact-form";

function renderForm() {
  render(
    <NextIntlClientProvider locale="fr" messages={messages}>
      <ContactForm />
    </NextIntlClientProvider>,
  );
}

async function fillAndSubmit() {
  fireEvent.change(screen.getByLabelText("Email"), {
    target: { value: "player@example.com" },
  });
  fireEvent.change(screen.getByLabelText("Objet"), {
    target: { value: "data-error" },
  });
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
  });

  it("exposes the required email, subject and message fields", () => {
    renderForm();
    expect(screen.getByLabelText("Email")).toHaveAttribute("required");
    expect(screen.getByLabelText("Email")).toHaveAttribute("type", "email");
    expect(screen.getByLabelText("Objet")).toHaveAttribute("required");
    expect(screen.getByLabelText("Message")).toHaveAttribute("required");
    for (const label of [
      "Signaler une erreur de donnée",
      "Suggestion d’amélioration",
      "Problème technique / bug",
      "Autre",
    ]) {
      expect(screen.getByRole("option", { name: label })).toBeInTheDocument();
    }
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

  it("shows a not-configured message when SMTP isn't set up", async () => {
    vi.mocked(fetch).mockResolvedValue(
      new Response(JSON.stringify({ error: "not_configured" }), {
        status: 503,
      }),
    );
    renderForm();
    await fillAndSubmit();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "L’envoi d’emails n’est pas configuré pour le moment",
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
      "Vérifie les champs du formulaire",
    );
  });
});
