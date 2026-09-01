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

  // Bloc 53/F: this link used to point at the generic /tools/competences
  // category (landing on whichever tab happened to be firstAvailable) —
  // now it points at the exact Templiers calculator tab.
  it("links back to the precise Templiers calculator, not the generic Compétences category", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={defaultTemplarParameters} />
      </NextIntlClientProvider>,
    );
    // Bloc 54/B: the label is now folded inside the button itself, so the
    // link's accessible name is the label + title together.
    expect(screen.getByRole("link", { name: /Templiers$/ })).toHaveAttribute(
      "href",
      "/tools/competences?open=templars",
    );
  });

  it("Bloc38/M: shares the .reference-simple-table class with Gemmes/Level Up, for the same alternating-row style", () => {
    render(
      <NextIntlClientProvider locale="fr" messages={messages}>
        <TemplarsReferenceTable parameters={defaultTemplarParameters} />
      </NextIntlClientProvider>,
    );
    expect(screen.getByRole("table")).toHaveClass("reference-simple-table");
  });
});
