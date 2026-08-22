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
