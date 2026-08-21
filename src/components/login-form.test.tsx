import { cleanup, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import messages from "../../messages/en.json";
import { LoginForm } from "./login-form";
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
afterEach(cleanup);
describe("LoginForm", () => {
  it("renders username credentials", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LoginForm />
      </NextIntlClientProvider>,
    );
    expect(screen.getByLabelText("Username")).toBeRequired();
    expect(screen.getByLabelText("Password")).toHaveAttribute(
      "type",
      "password",
    );
    expect(screen.getByLabelText("Authentication code")).toHaveAttribute(
      "autocomplete",
      "one-time-code",
    );
  });

  it("gives the submit button the polished editor-action styling", () => {
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LoginForm />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("button", { name: "Sign in" })).toHaveClass(
      "editor-action",
      "editor-action-primary",
    );
  });
});
