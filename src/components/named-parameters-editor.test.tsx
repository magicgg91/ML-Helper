import { cleanup, fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { renderWithIntl as render } from "../test/render-with-intl";
import { defaultCityParameters } from "../lib/city-parameters";
import { CityParametersEditor, TemplarParametersEditor } from "./named-parameters-editor";

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
describe("named formula parameter editors", () => {
  it("edits all shared City progression and league multiplier values", async () => {
    const request = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response("{}", { status: 200 }));
    render(<CityParametersEditor initial={defaultCityParameters} />);
    expect(screen.getByRole("spinbutton", { name: "Base VP" })).toHaveValue(20);
    expect(screen.getByRole("spinbutton", { name: "Légende Multiplicateur Or" })).toHaveValue(10);
    fireEvent.change(screen.getByRole("spinbutton", { name: "Base VP" }), { target: { value: "21" } });
    fireEvent.click(screen.getByRole("button", { name: "Enregistrer les paramètres" }));
    await waitFor(() => expect(request).toHaveBeenCalled());
    expect(JSON.parse(String(request.mock.calls[0][1]?.body)).vp.base).toBe(21);
  });
  it("exposes only the named Templar base and ratio", () => {
    render(<TemplarParametersEditor initial={{ base: 150, ratio: 1.3 }} />);
    expect(screen.getByRole("spinbutton", { name: "Base" })).toHaveValue(150);
    expect(screen.getByRole("spinbutton", { name: "Ratio" })).toHaveValue(1.3);
    expect(screen.queryByText(/JSON/i)).toBeNull();
  });
});
