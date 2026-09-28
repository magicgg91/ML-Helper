import type { Prisma } from "@prisma/client";

export type LogFilterInput = {
  user?: string;
  message?: string;
  from?: string;
  to?: string;
};

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

function firstValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function parseLogFilters(
  searchParams: Record<string, string | string[] | undefined>,
): LogFilterInput {
  return {
    user: firstValue(searchParams.user)?.trim() || undefined,
    message: firstValue(searchParams.q)?.trim() || undefined,
    from: firstValue(searchParams.from)?.trim() || undefined,
    to: firstValue(searchParams.to)?.trim() || undefined,
  };
}

export const logsPageSize = 20;

export function parseLogPage(
  searchParams: Record<string, string | string[] | undefined>,
): number {
  const raw = firstValue(searchParams.page);
  const page = raw ? Number.parseInt(raw, 10) : 1;
  return Number.isInteger(page) && page > 0 ? page : 1;
}

export function logsPageHref(filters: LogFilterInput, page: number): string {
  const params = new URLSearchParams();
  if (filters.user) params.set("user", filters.user);
  if (filters.message) params.set("q", filters.message);
  if (filters.from) params.set("from", filters.from);
  if (filters.to) params.set("to", filters.to);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/logs?${query}` : "/admin/logs";
}

export function buildLogsWhere(
  filters: LogFilterInput,
  /**
   * Bloc 116/C review: the keys whose sentence contains the searched word, in
   * the reader's own language (auditKeysMatching). The page computes them
   * from its own messages; this function stays free of next-intl.
   */
  matchingKeys: string[] = [],
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (filters.user) {
    where.user = { username: { contains: filters.user } };
  }
  if (filters.message) {
    // Bloc 116/C: the message is no longer one French string to match
    // against. It is a key and its parameters, and the parameters are what an
    // admin actually types into this box — a username, a guide title, a slug.
    // Stored as JSON *text* precisely so `contains` still reaches them. The
    // key is searched too (so "guide.publish" finds those rows), and so is
    // the French sentence of entries written before this bloc.
    where.OR = [
      // The sentences the word appears in, resolved before the query.
      ...(matchingKeys.length ? [{ messageKey: { in: matchingKeys } }] : []),
      // The names the sentence interpolates — a username, a guide title, a
      // slug — which is the other half of what an admin types. Stored as JSON
      // text precisely so `contains` reaches them.
      { messageParams: { contains: filters.message } },
      // The key itself, so "guide.publish" finds those rows too.
      { messageKey: { contains: filters.message } },
      // And the French sentence of entries written before Bloc 116/C.
      { legacyMessage: { contains: filters.message } },
    ];
  }
  const from =
    filters.from && isoDatePattern.test(filters.from)
      ? new Date(`${filters.from}T00:00:00.000`)
      : undefined;
  const to =
    filters.to && isoDatePattern.test(filters.to)
      ? new Date(`${filters.to}T23:59:59.999`)
      : undefined;
  if (from || to) {
    where.createdAt = {
      ...(from && { gte: from }),
      ...(to && { lte: to }),
    };
  }
  return where;
}
