import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LocaleSwitcher } from "./locale-switcher";

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    refresh.mockReset();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true }));
  });

  it("persists the selected language and refreshes the route", async () => {
    render(
      <NextIntlClientProvider locale="fr" messages={{}}>
        <LocaleSwitcher locales={["en", "fr"]} />
      </NextIntlClientProvider>,
    );

    fireEvent.change(screen.getByLabelText("Language / Langue"), {
      target: { value: "en" },
    });

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledWith("/api/locale", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ locale: "en" }),
      });
      expect(refresh).toHaveBeenCalledOnce();
    });
  });
});
