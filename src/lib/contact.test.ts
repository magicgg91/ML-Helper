import { describe, expect, it } from "vitest";
import { contactMessageSchema, contactSubjectLabels } from "./contact";

describe("contactMessageSchema", () => {
  it("accepts a valid message", () => {
    const result = contactMessageSchema.parse({
      email: "Player@Example.com",
      subject: "data-error",
      message: "Le taux d'XP semble faux en Légende.",
    });
    expect(result).toEqual({
      email: "player@example.com",
      subject: "data-error",
      message: "Le taux d'XP semble faux en Légende.",
    });
  });

  it("trims the message and lowercases the email", () => {
    const result = contactMessageSchema.parse({
      email: "  Player@Example.com  ",
      subject: "other",
      message: "  Bonjour  ",
    });
    expect(result.email).toBe("player@example.com");
    expect(result.message).toBe("Bonjour");
  });

  it("rejects an invalid email", () => {
    expect(() =>
      contactMessageSchema.parse({
        email: "not-an-email",
        subject: "other",
        message: "Bonjour",
      }),
    ).toThrow();
  });

  it("rejects a subject outside the confirmed list", () => {
    expect(() =>
      contactMessageSchema.parse({
        email: "player@example.com",
        subject: "unknown-subject",
        message: "Bonjour",
      }),
    ).toThrow();
  });

  it("rejects an empty message", () => {
    expect(() =>
      contactMessageSchema.parse({
        email: "player@example.com",
        subject: "other",
        message: "   ",
      }),
    ).toThrow();
  });

  // Bloc 129 §3.6 : « technical-bug » laisse la place à « question ». Le
  // brief remplace le motif « Problème technique / bug » par « Question », et
  // garder l'ancienne clé aurait fait arriver les questions sous une
  // étiquette qui ne les décrit pas.
  it("has a label for every confirmed subject", () => {
    expect(Object.keys(contactSubjectLabels)).toEqual([
      "data-error",
      "improvement-suggestion",
      "question",
      "other",
    ]);
  });
});
