import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CalculatorTranslationsEditor } from "./calculator-translations-editor";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CalculatorTranslationsEditor", () => {
  it("shows separate locale fields and never exposes raw JSON", async () => {
    const request = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response("{}", { status: 200 }));
    render(
      <CalculatorTranslationsEditor
        id="calculator-ranking"
        label="Ranking"
        initial={{
          name: { fr: "Classement", en: "Ranking", es: "Clasificación" },
          description: { fr: "Description", en: "Description" },
          tips: { fr: "Astuce", en: "Tip" },
        }}
      />,
    );
    fireEvent.click(screen.getByText(/Textes multilingues/));
    expect(screen.getByRole("group", { name: "FR" })).toBeVisible();
    expect(screen.queryByRole("group", { name: "EN" })).toBeNull();
    fireEvent.change(screen.getByLabelText("Langue du contenu"), {
      target: { value: "en" },
    });
    expect(screen.getByRole("group", { name: "EN" })).toBeVisible();
    fireEvent.change(screen.getByLabelText("Nom"), {
      target: { value: "Updated ranking" },
    });
    expect(screen.queryByText(/"es"/)).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Enregistrer les traductions" }),
    );
    await waitFor(() => expect(request).toHaveBeenCalled());
    const body = JSON.parse(
      (request.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.name).toEqual({
      fr: "Classement",
      en: "Updated ranking",
    });
  });
});
