/**
 * Bloc 116/C: what an audit entry says, as a key and its values.
 *
 * Until this bloc the sentence was assembled in French at the 21 sites that
 * write an AuditLog row — "toto a supprimé l'utilisateur bob" — and stored as
 * a finished string. That froze the journal into one language for readers the
 * rest of the admin already serves in two, and it put user-facing prose in
 * service and route code, which AGENTS.md forbids everywhere else.
 *
 * A row now carries the key of a whole sentence and the values it
 * interpolates. /admin/logs resolves it against admin.logs.messages in the
 * reader's own language. Whole sentences, not a verb glued to a noun phrase:
 * a translator reads one complete line, and neither language has to borrow
 * the other's word order or articles.
 *
 * Scope is English and French, the two languages the admin has everywhere
 * else — deliberately not the five the public site carries.
 */

/** Everything an entry needs to be re-read later, in any of the two. */
export type AuditMessage = {
  /** A key under admin.logs.messages, e.g. "guide.publish". */
  key: string;
  /** Its interpolated values, e.g. { actor: "toto", title: "Débuter" }. */
  params: Record<string, string | number>;
};

/**
 * The reference tables and parameter sets an admin can save, as the stable
 * slug each one is known by. The slug is half of the message key — a save of
 * `events` reads as `events.create` or `events.update` — so adding a
 * reference here means adding those two sentences to fr.json and en.json.
 */
export const auditTargets = [
  "city-parameters",
  "combat-equipment",
  "combat-equipment-increments",
  "combat-equipment-secondary",
  "consumables",
  "demo-attack-troops",
  "events",
  "expedition-equipment",
  "expedition-equipment-increments",
  "expedition-equipment-secondary",
  "gems",
  "level-up",
  "ranking",
  "templars",
  "templars-reference",
  "xp-gain-rate",
] as const;

export type AuditTarget = (typeof auditTargets)[number];

export function auditMessage(
  key: string,
  params: Record<string, string | number> = {},
): AuditMessage {
  return { key, params };
}

/** The two columns an AuditLog row stores an AuditMessage in. */
export function auditMessageColumns(message: AuditMessage) {
  return {
    messageKey: message.key,
    messageParams: JSON.stringify(message.params),
  };
}

/**
 * Reads the params back off a row. A row whose JSON is unreadable — hand-
 * edited, or written by something that did not go through
 * auditMessageColumns — still renders its sentence, with whatever the
 * template can fill in; swallowing the parse error here is deliberate, since
 * one malformed row must not take the whole log page down.
 */
export function parseAuditParams(raw: string): Record<string, unknown> {
  try {
    const parsed: unknown = JSON.parse(raw || "{}");
    return parsed && typeof parsed === "object" && !Array.isArray(parsed)
      ? (parsed as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

/**
 * What renderAuditMessage needs of a translator.
 *
 * next-intl types a translator's key against the shape of the messages, and
 * ours is data — a column — so the two cannot meet in the type system. The
 * cast lives in auditTranslator below and nowhere else; `has` is what makes
 * it safe at runtime.
 */
export type AuditTranslator = {
  (key: string, params?: Record<string, unknown>): string;
  has(key: string): boolean;
};

/** Adapts next-intl's admin.logs.messages translator to the above. */
export function auditTranslator(translator: unknown): AuditTranslator {
  return translator as AuditTranslator;
}

/**
 * The sentence for one row, in the reader's language.
 *
 * A key the messages do not carry — a row written by a newer version than the
 * one rendering it, or one whose sentence was later renamed — falls back to
 * the key itself rather than throwing: a log page must show the rows it has.
 */
export function renderAuditMessage(
  row: { messageKey: string; messageParams: string; legacyMessage: string },
  t: AuditTranslator,
): string {
  // Entries written before Bloc 116/C have their French sentence and nothing
  // else. Showing it verbatim keeps an install's history readable.
  if (!row.messageKey) return row.legacyMessage;
  if (!t.has(row.messageKey)) return row.messageKey;
  return t(row.messageKey, parseAuditParams(row.messageParams));
}
