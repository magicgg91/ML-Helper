import { describe, expect, it, vi } from "vitest";
import { metadata } from "./login/page";

vi.mock("next-intl/server", () => ({
  getTranslations: async () => (key: string) => key,
}));
vi.mock("@/components/login-form", () => ({
  LoginForm: () => <div>form</div>,
}));

// Bloc 42/J: an admin login page has no organic-search value.
describe("LoginPage metadata (Bloc 42/J)", () => {
  it("sets robots noindex/nofollow", () => {
    expect(metadata.robots).toEqual({ index: false, follow: false });
  });
});
