import { Prisma } from "@prisma/client";
import { z } from "zod";
import { auditMessage } from "@/lib/audit-message";
import { prisma } from "@/lib/prisma";
import { mergeLaunchTranslations } from "@/lib/translations";

export const guideCategories = [
  "debutants",
  "expeditions",
  "stuff",
  "combat",
  "defense",
  "evenements",
] as const;

const localeContent = z.object({
  title: z.string().trim().max(160),
  excerpt: z.string().trim().max(320),
  content: z.string().max(100_000),
});

export const guideInputSchema = z
  .object({
    slug: z
      .string()
      .trim()
      .min(3)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    category: z.enum(guideCategories),
    coverImage: z.union([z.url(), z.literal("")]),
    translations: z.object({ fr: localeContent, en: localeContent }),
  })
  .superRefine((value, context) => {
    if (!value.translations.fr.title && !value.translations.en.title)
      context.addIssue({
        code: "custom",
        path: ["translations", "fr", "title"],
        message: "Un titre FR ou EN est requis.",
      });
  });

function translations(input: z.infer<typeof guideInputSchema>) {
  return {
    title: { fr: input.translations.fr.title, en: input.translations.en.title },
    excerpt: {
      fr: input.translations.fr.excerpt,
      en: input.translations.en.excerpt,
    },
    content: {
      fr: input.translations.fr.content,
      en: input.translations.en.content,
    },
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
  return prisma.$transaction(async (tx) => {
    const guide = await tx.guide.update({
      where: { id },
      data: {
        slug: input.slug,
        category: input.category,
        title: mergeLaunchTranslations(before.title, {
          fr: input.translations.fr.title,
          en: input.translations.en.title,
        }),
        excerpt: mergeLaunchTranslations(before.excerpt, {
          fr: input.translations.fr.excerpt,
          en: input.translations.en.excerpt,
        }),
        content: mergeLaunchTranslations(before.content, {
          fr: input.translations.fr.content,
          en: input.translations.en.content,
        }),
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
