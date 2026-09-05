import { z } from "zod";

export const contactSubjects = [
  "data-error",
  "improvement-suggestion",
  "technical-bug",
  "other",
] as const;

export type ContactSubject = (typeof contactSubjects)[number];

export const contactMessageSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.enum(contactSubjects),
  message: z.string().trim().min(1).max(5000),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

// Libellés utilisés pour composer l'email envoyé à l'équipe éditoriale
// (courrier interne, toujours en français, indépendant de la langue du
// site vue par l'expéditeur).
export const contactSubjectLabels: Record<ContactSubject, string> = {
  "data-error": "Signaler une erreur de donnée",
  "improvement-suggestion": "Suggestion d'amélioration",
  "technical-bug": "Problème technique / bug",
  other: "Autre",
};
