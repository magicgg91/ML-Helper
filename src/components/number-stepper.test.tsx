import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NumberStepper } from "./number-stepper";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(() => {
  cleanup();
});

describe("NumberStepper", () => {
  it("increments and decrements by the given step", () => {
    const onChange = vi.fn();
    render(
      <NumberStepper label="Niveau" value={5} step={2} onChange={onChange} />,
    );
    fireEvent.click(screen.getByLabelText("Augmenter Niveau"));
    expect(onChange).toHaveBeenCalledWith(7);
    fireEvent.click(screen.getByLabelText("Diminuer Niveau"));
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("clamps to the min/max bounds", () => {
    const onChange = vi.fn();
    render(
      <NumberStepper
        label="Niveau"
        value={1}
        min={1}
        max={3}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByLabelText("Diminuer Niveau"));
    expect(onChange).toHaveBeenCalledWith(1);
    render(
      <NumberStepper
        label="Niveau"
        value={3}
        min={1}
        max={3}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getAllByLabelText("Augmenter Niveau")[1]);
    expect(onChange).toHaveBeenCalledWith(3);
  });

  it("treats a non-numeric typed value as zero before clamping", () => {
    const onChange = vi.fn();
    render(
      <NumberStepper label="Niveau" value={5} min={0} onChange={onChange} />,
    );
    fireEvent.change(screen.getByLabelText("Niveau"), {
      target: { value: "" },
    });
    expect(onChange).toHaveBeenCalledWith(0);
  });
});
