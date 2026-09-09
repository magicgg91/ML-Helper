import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useSaveStatus } from "./use-save-status";

afterEach(cleanup);

const outcome = { success: "Enregistré", error: "Erreur serveur" };

// Driven through the rendered UI rather than by capturing the hook's return
// value, so the assertions describe what an editor using it actually shows.
function Probe() {
  const status = useSaveStatus();
  return (
    <>
      <p
        data-testid="status"
        data-tone={status.tone}
        data-pending={status.isPending}
      >
        {status.message}
      </p>
      <button type="button" onClick={() => status.pending("Enregistrement…")}>
        pending
      </button>
      <button type="button" onClick={() => status.settle(true, outcome)}>
        settle-ok
      </button>
      <button type="button" onClick={() => status.settle(false, outcome)}>
        settle-fail
      </button>
      <button type="button" onClick={() => status.success(outcome.success)}>
        success
      </button>
      <button type="button" onClick={() => status.error(outcome.error)}>
        error
      </button>
      <button type="button" onClick={status.reset}>
        reset
      </button>
    </>
  );
}

const status = () => screen.getByTestId("status");
const press = (name: string) =>
  fireEvent.click(screen.getByRole("button", { name }));

// Bloc 93/M1: the shared admin save state machine. Its point is that the tone
// travels with the message, so a success can never be rendered as if it were
// a failure — the defect the audit found in 3 editors.
describe("useSaveStatus", () => {
  it("starts idle and empty", () => {
    render(<Probe />);
    expect(status()).toHaveTextContent("");
    expect(status()).toHaveAttribute("data-tone", "idle");
    expect(status()).toHaveAttribute("data-pending", "false");
  });

  it("reports a pending save", () => {
    render(<Probe />);
    press("pending");
    expect(status()).toHaveTextContent("Enregistrement…");
    expect(status()).toHaveAttribute("data-tone", "pending");
    expect(status()).toHaveAttribute("data-pending", "true");
  });

  it("settles to success or error from one response flag", () => {
    render(<Probe />);
    press("settle-ok");
    expect(status()).toHaveTextContent("Enregistré");
    expect(status()).toHaveAttribute("data-tone", "success");

    press("settle-fail");
    expect(status()).toHaveTextContent("Erreur serveur");
    expect(status()).toHaveAttribute("data-tone", "error");
  });

  it("clears a stale message on reset", () => {
    render(<Probe />);
    press("success");
    press("reset");
    expect(status()).toHaveTextContent("");
    expect(status()).toHaveAttribute("data-tone", "idle");
  });

  it("replaces an earlier outcome rather than layering on it", () => {
    render(<Probe />);
    press("success");
    press("error");
    // A previous success must not survive next to a new failure.
    expect(status()).toHaveTextContent("Erreur serveur");
    expect(status()).not.toHaveTextContent("Enregistré");
    expect(status()).toHaveAttribute("data-tone", "error");
  });
});
