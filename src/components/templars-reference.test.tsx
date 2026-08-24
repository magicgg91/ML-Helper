import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { NextIntlClientProvider } from "next-intl";
import messages from "../../messages/fr.json";
import { defaultTemplarParameters } from "../lib/templar-parameters";
import { TemplarsReferenceTable } from "./templars-reference";

afterEach(cleanup);
describe("TemplarsReferenceTable", () => {
  it("shows the full 1-20 level cost table with running totals", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={defaultTemplarParameters} />
      </NextIntlClientProvider>,
    );
    const rows = screen.getAllByRole("row");
    expect(rows).toHaveLength(21);
    const level3 = rows[3].querySelectorAll("td");
    expect(level3[0]).toHaveTextContent("3");
    expect(level3[1]).toHaveTextContent("254");
    expect(level3[2]).toHaveTextContent("599");
  });

  it("uses the administrator-provided named Templar parameters", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={{ base: 999, ratio: 1.3 }} />
      </NextIntlClientProvider>,
    );
    const level1 = screen.getAllByRole("row")[1].querySelectorAll("td");
    expect(level1[1]).toHaveTextContent("999");
  });

  it("links back to the Compétences tools category", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={defaultTemplarParameters} />
      </NextIntlClientProvider>,
    );
    expect(
      screen.getByRole("link", { name: "Ouvrir les Outils Compétences" }),
    ).toHaveAttribute("href", "/tools/competences");
  });
});
