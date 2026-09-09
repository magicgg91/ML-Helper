import { useState } from "react";
import { cleanup, fireEvent, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { NumberStepper } from "./number-stepper";
import { renderWithIntl as render } from "../test/render-with-intl";

afterEach(() => {
  cleanup();
});

// Multi-keystroke assertions need a real controlled round-trip (the value
// prop actually reflecting each onChange) to behave like the real app's
// useState-backed fields do — a static value prop + a no-op vi.fn() mock
// doesn't simulate that and would misfire NumberStepper's own "did the
// caller apply extra logic beyond my clamp" draft-sync heuristic.
function ControlledNumberStepper({
  initial,
  onChange,
  ...props
}: Omit<
  React.ComponentProps<typeof NumberStepper>,
  "value" | "onChange"
> & {
  initial: number;
  onChange: (value: number) => void;
}) {
  const [value, setValue] = useState(initial);
  return (
    <NumberStepper
      {...props}
      value={value}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

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

  it("Bloc 34/C: never resets the displayed value while typing", () => {
    const onChange = vi.fn();
    render(
      <ControlledNumberStepper
        label="Niveau"
        initial={2}
        min={2}
        max={200}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Niveau");
    // Regression test: typing "100" over a min-2 field used to reset the
    // *displayed* value to "2" right after the leading "1", making it
    // impossible to type any value starting below the minimum.
    fireEvent.change(input, { target: { value: "1" } });
    expect(input).toHaveValue(1);
    fireEvent.change(input, { target: { value: "10" } });
    expect(input).toHaveValue(10);
    fireEvent.change(input, { target: { value: "100" } });
    expect(input).toHaveValue(100);

    fireEvent.blur(input, { target: { value: "100" } });
    expect(input).toHaveValue(100);
    expect(onChange).toHaveBeenLastCalledWith(100);
  });

  it("Bloc 34/C: keeps out-of-range drafts out of the reported value (min side)", () => {
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
    // The displayed draft can dip below min while typing ("1" is the
    // start of "100"), but onChange — what calculator state and results
    // are computed from — must only ever receive an already-clamped
    // value, never the raw out-of-range one.
    fireEvent.change(input, { target: { value: "1" } });
    expect(input).toHaveValue(1);
    expect(onChange).toHaveBeenLastCalledWith(2);
    expect(onChange).not.toHaveBeenCalledWith(1);
  });

  it("Bloc 34/C: keeps out-of-range drafts out of the reported value (max side)", () => {
    const onChange = vi.fn();
    render(
      <ControlledNumberStepper
        label="Niveau"
        initial={5}
        min={0}
        max={20}
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText("Niveau");
    // Same, from the other direction: typing "200" over a max-20 field
    // (e.g. a Templar level) must never let 200 reach the caller, even
    // though the field keeps displaying exactly what was typed.
    fireEvent.change(input, { target: { value: "2" } });
    expect(onChange).toHaveBeenLastCalledWith(2);
    fireEvent.change(input, { target: { value: "20" } });
    expect(onChange).toHaveBeenLastCalledWith(20);
    fireEvent.change(input, { target: { value: "200" } });
    expect(input).toHaveValue(200);
    expect(onChange).toHaveBeenLastCalledWith(20);
    expect(onChange).not.toHaveBeenCalledWith(200);
  });

  it("Bloc 34/C: adopts a caller's own extra clamp immediately, unlike its own min/max", () => {
    // Some fields (e.g. Gems' per-row slot count, capped by how many
    // other rows already used) apply extra business logic on top of
    // NumberStepper's own min/max, and expect that to show up live rather
    // than waiting for blur — the draft-preservation above must not mask
    // that different, deliberate behavior.
    const onChange = vi.fn();
    function CappedStepper() {
      const [value, setValue] = useState(0);
      return (
        <NumberStepper
          label="Niveau"
          value={value}
          min={0}
          max={27}
          onChange={(next) => {
            const capped = Math.min(next, 2);
            setValue(capped);
            onChange(capped);
          }}
        />
      );
    }
    render(<CappedStepper />);
    const input = screen.getByLabelText("Niveau");
    fireEvent.change(input, { target: { value: "10" } });
    expect(input).toHaveValue(2);
    expect(onChange).toHaveBeenLastCalledWith(2);
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
