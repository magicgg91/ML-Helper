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

  it("Bloc 34/C: does not clamp while typing, only on blur", () => {
    const onChange = vi.fn();
    render(
      <NumberStepper
        label="Niveau"
        value={2}
        min={2}
        max={200}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Niveau");
    // Regression test: typing "100" over a min-2 field used to clamp on
    // every keystroke, resetting to "2" right after the leading "1" and
    // making it impossible to type any value starting below the minimum.
    fireEvent.change(input, { target: { value: "1" } });
    expect(onChange).toHaveBeenLastCalledWith(1);
    fireEvent.change(input, { target: { value: "10" } });
    expect(onChange).toHaveBeenLastCalledWith(10);
    fireEvent.change(input, { target: { value: "100" } });
    expect(onChange).toHaveBeenLastCalledWith(100);
    expect(onChange).not.toHaveBeenCalledWith(2);

    fireEvent.blur(input, { target: { value: "100" } });
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("Bloc 34/C: clamps to min/max on blur", () => {
    const onChange = vi.fn();
    render(
      <NumberStepper
        label="Niveau"
        value={2}
        min={2}
        max={200}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Niveau");
    fireEvent.change(input, { target: { value: "1" } });
    fireEvent.blur(input, { target: { value: "1" } });
    expect(onChange).toHaveBeenLastCalledWith(2);
  });

  it("Bloc 34/C: calls onCommit with the clamped value on blur and on +/- clicks, never while typing", () => {
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <NumberStepper
        label="Niveau"
        value={5}
        min={2}
        max={200}
        onChange={onChange}
        onCommit={onCommit}
      />,
    );
    const input = screen.getByLabelText("Niveau");
    fireEvent.change(input, { target: { value: "1" } });
    expect(onCommit).not.toHaveBeenCalled();

    fireEvent.blur(input, { target: { value: "1" } });
    expect(onCommit).toHaveBeenCalledWith(2);

    fireEvent.click(screen.getByLabelText("Augmenter Niveau"));
    expect(onCommit).toHaveBeenLastCalledWith(6);
  });
});
