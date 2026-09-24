import { cleanup, fireEvent, screen } from "@testing-library/react";
import { useState } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NumberField } from "./admin-number-field";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(cleanup);

function renderField(
  props: Partial<Parameters<typeof NumberField>[0]> = {},
  locale = "fr",
) {
  const onChange = vi.fn();
  render(
    <NumberField label="Ratio" value={1.2453} onChange={onChange} {...props} />,
    locale,
  );
  return { onChange, field: screen.getByLabelText(props.label ?? "Ratio") };
}

describe("Bloc 119: the admin's number field", () => {
  it("writes the value the way the admin's language writes it", () => {
    const { field } = renderField();
    expect(field).toHaveValue("1,2453");
  });

  it("writes it the English way for an English admin", () => {
    const { field } = renderField({}, "en");
    expect(field).toHaveValue("1.2453");
  });

  it("reads a comma, which type=number never did", () => {
    const { onChange, field } = renderField();
    fireEvent.change(field, { target: { value: "2,5" } });
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it("reads a dot too, whatever the language", () => {
    const { onChange, field } = renderField();
    fireEvent.change(field, { target: { value: "2.5" } });
    expect(onChange).toHaveBeenCalledWith(2.5);
  });

  it("says a cleared field is empty, never zero", () => {
    // The old screens stored Number("") — that is 0, and it looked like a
    // confirmed game value.
    const { onChange, field } = renderField();
    fireEvent.change(field, { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it("marks a value nobody has confirmed yet, and offers no default", () => {
    const { field } = renderField({ value: null });
    expect(field).toHaveValue("");
    expect(field).toHaveAttribute("placeholder", "À renseigner");
    expect(field.className).toContain("border-dashed");
  });

  it("keeps a typo on screen and refuses to store it", () => {
    const { onChange, field } = renderField();
    fireEvent.change(field, { target: { value: "1.2.3" } });
    expect(field).toHaveValue("1.2.3");
    expect(field).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Nombre attendu")).toBeInTheDocument();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("follows the value when its owner changes it underneath", () => {
    // What Annuler does: the form goes back to the server's values, and the
    // field has to show them rather than what was typed over them.
    function Form() {
      const [value, setValue] = useState<number | null>(1);
      return (
        <>
          <NumberField label="Ratio" value={value} onChange={setValue} />
          <button type="button" onClick={() => setValue(1)}>
            Annuler
          </button>
        </>
      );
    }
    render(<Form />);
    const field = screen.getByLabelText("Ratio");
    fireEvent.change(field, { target: { value: "9" } });
    expect(field).toHaveValue("9");
    fireEvent.click(screen.getByRole("button", { name: "Annuler" }));
    expect(field).toHaveValue("1");
  });

  it("survives a value that is not a number at all", () => {
    // A stored field holding text arrives as Number(text), which is NaN — and
    // NaN never equals itself, so a `!==` re-seed would re-render forever.
    // The equipment reference found this one.
    expect(() => renderField({ value: Number.NaN })).not.toThrow();
    expect(screen.getByLabelText("Ratio")).toHaveValue("");
  });

  it("keeps a label for the screen reader even when the column carries it", () => {
    renderField({ label: "Bronze — coefficient", hideLabel: true });
    expect(screen.getByLabelText("Bronze — coefficient")).toBeInTheDocument();
  });

  it("says what the number is counted in", () => {
    const { field } = renderField({ label: "Coût", unit: "saphirs" });
    expect(field).toHaveAccessibleDescription("saphirs");
  });
});
