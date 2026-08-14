import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Status } from "./status";
describe("Status", () => {
  it("renders its translated content", () => {
    render(<Status>Ready</Status>);
    expect(screen.getByRole("status")).toHaveTextContent("Ready");
  });
});
