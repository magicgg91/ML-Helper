import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auditMessage } from "@/lib/audit-message";
import { prisma } from "@/lib/prisma";
import {
  launchLocales,
  mergeLaunchTranslations,
  type LaunchLocale,
} from "@/lib/translations";
import { guideCategories } from "@/lib/guide-categories";

const localeContent = z.object({
  title: z.string().trim().max(160),
  excerpt: z.string().trim().max(320),
  content: z.string().max(100_000),
});
const emptyLocaleContent = { title: "", excerpt: "", content: "" };
// Bloc 44 review: a request that omits a DE/ES/TR locale entirely (every
// caller predating this bloc, e.g. e2e's raw API calls) is just as valid
// as one that sends it empty — defaults to blank rather than rejecting
// the whole request with a 400 for a locale nothing requires yet.
const optionalLocaleContent = localeContent
  .optional()
  .transform((value) => value ?? emptyLocaleContent);

// Bloc 44: fr/en stay the 2 locales the editorial workflow actually
// requires (superRefine below) — DE/ES/TR are activated but their content
// arrives gradually via admin, never invented here.
const requiredLocales: readonly LaunchLocale[] = ["fr", "en"];

export const guideInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: z.array(z.enum(guideCategories)).min(1),
    coverImage: z.union([z.url(), z.literal("")]),
    translations: z.object({
      fr: localeContent,
      en: localeContent,
      de: optionalLocaleContent,
      es: optionalLocaleContent,
      tr: optionalLocaleContent,
    }),
  })
  .superRefine((value, context) => {
    if (!value.translations.fr.title && !value.translations.en.title)
      context.addIssue({
        code: "custom",
        path: ["translations", "fr", "title"],
        message: "Un titre FR ou EN est requis.",
      });
  });

// Bloc 44: fr/en are always written (even blank — an admin can deliberately
// clear one, unchanged prior behavior). A not-yet-translated DE/ES/TR field
// is left out of the result entirely instead of being written as "" — an
// explicit empty string would permanently defeat localizedText()'s fr/en
// fallback for that locale, where an absent key doesn't.
function nonEmptyLocaleValues(
  pick: (locale: LaunchLocale) => string,
): Partial<Record<LaunchLocale, string>> {
  return Object.fromEntries(
    launchLocales
      .map((locale) => [locale, pick(locale)] as const)
      .filter(([locale, value]) => requiredLocales.includes(locale) || value),
  );
}

function translations(input: z.infer<typeof guideInputSchema>) {
  return {
    title: nonEmptyLocaleValues((locale) => input.translations[locale].title),
    excerpt: nonEmptyLocaleValues(
      (locale) => input.translations[locale].excerpt,
    ),
    content: nonEmptyLocaleValues(
      (locale) => input.translations[locale].content,
    ),
  };
}

export async function createGuide(
  actor: { id: string; name: string; role: string },
  raw: unknown,
) {
  const input = guideInputSchema.parse(raw);
  const translated = translations(input);
  return prisma.$transaction(async (tx) => {
    const guide = await tx.guide.create({
      data: {
        slug: input.slug,
        category: input.category,
        title: translated.title,
        excerpt: translated.excerpt,
        content: translated.content,
        coverImage: input.coverImage || null,
        author: actor.name,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        actorRole: actor.role,
        action: "create",
        entityType: "guide",
        entityId: guide.id,
        message: auditMessage(
          actor.name,
          "create",
          `le guide ${input.translations.fr.title || input.translations.en.title}`,
        ),
        diff: {
          after: {
            slug: guide.slug,
            status: guide.status,
            active: guide.active,
          },
        },
      },
    });
    return guide;
  });
}

export async function updateGuide(
  actor: { id: string; name: string; role: string },
  id: string,
  raw: unknown,
) {
  const input = guideInputSchema.parse(raw);
  const before = await prisma.guide.findUniqueOrThrow({ where: { id } });
  const translated = translations(input);
  return prisma.$transaction(async (tx) => {
    const guide = await tx.guide.update({
      where: { id },
      data: {
        slug: input.slug,
        category: input.category,
        title: mergeLaunchTranslations(before.title, translated.title),
        excerpt: mergeLaunchTranslations(before.excerpt, translated.excerpt),
        content: mergeLaunchTranslations(before.content, translated.content),
        coverImage: input.coverImage || null,
      },
    });
    await tx.auditLog.create({
      data: {
        userId: actor.id,
        actorRole: actor.role,
        action: "update",
        entityType: "guide",
        entityId: id,
        message: auditMessage(
          actor.name,
          "update",
          `le guide ${input.translations.fr.title || input.translations.en.title}`,
        ),
        diff: { before: { slug: before.slug }, after: { slug: guide.slug } },
      },
    });
    return guide;
  });
}

export function isUniqueConflict(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}
