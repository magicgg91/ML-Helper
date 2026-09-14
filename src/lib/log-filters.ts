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
): Prisma.AuditLogWhereInput {
  const where: Prisma.AuditLogWhereInput = {};
  if (filters.user) {
    where.user = { username: { contains: filters.user } };
  }
  if (filters.message) {
    where.message = { contains: filters.message };
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
