import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, describe, expect, it, vi } from "vitest";
import { signIn } from "next-auth/react";
import messages from "../../messages/en.json";
import { LoginForm } from "./login-form";
vi.mock("next-auth/react", () => ({ signIn: vi.fn() }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
afterEach(() => {
  cleanup();
  vi.mocked(signIn).mockReset();
});
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

  it("shows the generic error for invalid credentials", async () => {
    vi.mocked(signIn).mockResolvedValue({
      ok: false,
      error: "CredentialsSignin",
      status: 401,
      url: null,
    });
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LoginForm />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "alice" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "wrong-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Invalid username or password",
    );
  });

  it("shows a distinct message for a disabled account", async () => {
    vi.mocked(signIn).mockResolvedValue({
      ok: false,
      error: "account_disabled",
      status: 401,
      url: null,
    });
    render(
      <NextIntlClientProvider locale="en" messages={messages}>
        <LoginForm />
      </NextIntlClientProvider>,
    );
    fireEvent.change(screen.getByLabelText("Username"), {
      target: { value: "alice" },
    });
    fireEvent.change(screen.getByLabelText("Password"), {
      target: { value: "correct-password" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Sign in" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Account disabled, contact the administrator.",
    );
  });
});
