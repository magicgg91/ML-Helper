import { z } from "zod";

// Bloc 129 §3.6 : les quatre objets du formulaire. « technical-bug »
// (« Problème technique / bug ») devient « question » : le brief remplace ce
// motif par « Question », et garder l'ancienne clé aurait fait arriver les
// questions dans la boîte de l'équipe sous l'étiquette « Problème
// technique », ce que personne ne relit correctement. Le changement ne
// touche pas la route — elle valide contre cette liste — et rien ne
// persiste un objet : il n'existe que le temps du courriel.
export const contactSubjects = [
  "data-error",
  "improvement-suggestion",
  "question",
  "other",
] as const;

export type ContactSubject = (typeof contactSubjects)[number];

/**
 * La longueur maximale du message, telle que l'API la valide.
 *
 * Le formulaire la lit aussi : il compose le message en préfixant la page
 * concernée, et sans ce plafond partagé un message valide à lui seul
 * partait en dépassant la limite, pour revenir en « message invalide »
 * sans que rien n'explique pourquoi.
 */
export const contactMessageMaxLength = 5000;

/**
 * La longueur maximale du champ « Page concernée ».
 *
 * Il n'a pas de champ à lui dans l'API (§3.6 : pas de modification d'API
 * sans nécessité) et voyage en tête du message. Le borner borne le préfixe,
 * donc la part du message qu'il peut consommer.
 */
export const contactPageMaxLength = 200;

export const contactMessageSchema = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  subject: z.enum(contactSubjects),
  message: z.string().trim().min(1).max(contactMessageMaxLength),
});

export type ContactMessageInput = z.infer<typeof contactMessageSchema>;

// Libellés utilisés pour composer l'email envoyé à l'équipe éditoriale
// (courrier interne, toujours en français, indépendant de la langue du
// site vue par l'expéditeur).
export const contactSubjectLabels: Record<ContactSubject, string> = {
  "data-error": "Erreur dans les données",
  "improvement-suggestion": "Idée d'amélioration",
  question: "Question",
  other: "Autre",
};
