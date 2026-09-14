import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const sendMail = vi.fn().mockResolvedValue(undefined);
const createTransport = vi.fn((options: unknown) => {
  void options;
  return { sendMail };
});

vi.mock("nodemailer", () => ({
  default: {
    createTransport: (options: unknown) => createTransport(options),
  },
}));

const ENV_KEYS = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "CONTACT_EMAIL",
] as const;

describe("sendContactMessage", () => {
  const original: Record<string, string | undefined> = {};

  beforeEach(() => {
    for (const key of ENV_KEYS) original[key] = process.env[key];
    sendMail.mockClear();
    createTransport.mockClear();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) {
      if (original[key] === undefined) delete process.env[key];
      else process.env[key] = original[key];
    }
    vi.resetModules();
  });

  it("throws ContactNotConfiguredError when SMTP env vars are missing", async () => {
    for (const key of ENV_KEYS) delete process.env[key];
    const { sendContactMessage, ContactNotConfiguredError } =
      await import("./contact");
    await expect(
      sendContactMessage({
        email: "player@example.com",
        subject: "other",
        message: "Bonjour",
      }),
    ).rejects.toBeInstanceOf(ContactNotConfiguredError);
    expect(sendMail).not.toHaveBeenCalled();
  });

  it("sends the message via SMTP using the configured env vars", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "no-reply@example.com";
    process.env.SMTP_PASSWORD = "secret";
    process.env.CONTACT_EMAIL = "editor@example.com";
    const { sendContactMessage } = await import("./contact");

    await sendContactMessage({
      email: "player@example.com",
      subject: "data-error",
      message: "Le taux d'XP semble faux.",
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.com",
        port: 465,
        secure: true,
        auth: { user: "no-reply@example.com", pass: "secret" },
      }),
    );
    expect(sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "no-reply@example.com",
        to: "editor@example.com",
        replyTo: "player@example.com",
        subject: expect.stringContaining("Signaler une erreur de donnée"),
        text: expect.stringContaining("Le taux d'XP semble faux."),
      }),
    );
  });

  it("uses an unencrypted connection for a non-465 port", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "587";
    process.env.SMTP_USER = "no-reply@example.com";
    process.env.SMTP_PASSWORD = "secret";
    process.env.CONTACT_EMAIL = "editor@example.com";
    const { sendContactMessage } = await import("./contact");

    await sendContactMessage({
      email: "player@example.com",
      subject: "other",
      message: "Bonjour",
    });

    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ port: 587, secure: false }),
    );
  });

  it("rejects an invalid message before touching SMTP", async () => {
    process.env.SMTP_HOST = "smtp.example.com";
    process.env.SMTP_PORT = "465";
    process.env.SMTP_USER = "no-reply@example.com";
    process.env.SMTP_PASSWORD = "secret";
    process.env.CONTACT_EMAIL = "editor@example.com";
    const { sendContactMessage } = await import("./contact");

    await expect(
      sendContactMessage({
        email: "not-an-email",
        subject: "other",
        message: "Bonjour",
      }),
    ).rejects.toThrow();
    expect(createTransport).not.toHaveBeenCalled();
  });
});
