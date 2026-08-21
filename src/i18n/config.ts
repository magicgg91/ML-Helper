import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

export const defaultLocale = "fr";
export const fallbackLocale = "en";

type Messages = Record<string, unknown>;

function isMessageObject(value: unknown): value is Messages {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function mergeMessages(
  fallback: Messages,
  localized: Messages,
): Messages {
  return Object.fromEntries(
    Object.entries(fallback)
      .map(([key, fallbackValue]) => {
        const localizedValue = localized[key];

        if (isMessageObject(fallbackValue) && isMessageObject(localizedValue)) {
          return [key, mergeMessages(fallbackValue, localizedValue)];
        }

        return [key, localizedValue ?? fallbackValue];
      })
      .concat(Object.entries(localized).filter(([key]) => !(key in fallback))),
  );
}

function messagesDirectory() {
  return path.join(process.cwd(), "messages");
}

export async function getAvailableLocales() {
  const files = await readdir(messagesDirectory());

  return files
    .filter((file) => file.endsWith(".json"))
    .map((file) => file.slice(0, -5))
    .sort();
}

export async function isAvailableLocale(locale: string) {
  return (await getAvailableLocales()).includes(locale);
}

async function readMessages(locale: string): Promise<Messages> {
  const content = await readFile(
    path.join(messagesDirectory(), `${locale}.json`),
    "utf8",
  );

  return JSON.parse(content) as Messages;
}

export async function getMessagesForLocale(locale: string) {
  const fallback = await readMessages(fallbackLocale);

  if (locale === fallbackLocale) return fallback;

  return mergeMessages(fallback, await readMessages(locale));
}
