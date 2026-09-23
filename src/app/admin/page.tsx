import Link from "next/link";
import { getLocale, getTranslations } from "next-intl/server";
import { can } from "@/auth/permissions";
import { requireAdminSession } from "@/auth/require-session";
import { AdminButton } from "@/components/admin-button";
import { PageHeader } from "@/components/admin-page-header";
import { Pill, type PillTone } from "@/components/admin-pill";
import { groupConsecutiveActivity } from "@/lib/admin-activity";
import { referenceToolSlugs } from "@/lib/admin-tools";
import {
  adminDayKey,
  formatAdminDateTime,
  formatAdminTime,
} from "@/lib/admin-dates";
import { auditTranslator, renderAuditMessage } from "@/lib/audit-message";
import {
  countLegalNoticePlaceholders,
  defaultLegalNoticeContent,
  legalNoticeKey,
} from "@/lib/legal-notice";
import { getLocaleActiveState } from "@/lib/locale-settings";
import { prisma } from "@/lib/prisma";
import {
  hasLocalizedText,
  launchLocales,
  translationRecord,
} from "@/lib/translations";

/** How many audit rows the "Activité récente" block reads before folding. */
const recentActivitySize = 12;

export default async function AdminPage() {
  const session = await requireAdminSession();
  const [t, languages, logMessages, locale] = await Promise.all([
    getTranslations("admin.dashboard"),
    // The language names already live with the Configuration screen, which
    // lists the same five; `has` keeps a sixth language file from throwing
    // before anyone has named it (Bloc 120).
    getTranslations("admin.config.languages"),
    getTranslations("admin.logs.messages"),
    getLocale(),
  ]);
  const languageName = (code: string) =>
    languages.has(code) ? languages(code) : code.toUpperCase();

  const mayViewCalculators = can(session.user.role, "calculators.read");
  const mayViewGuides = can(session.user.role, "guides.read");
  const mayViewReferences = can(session.user.role, "references.read");
  const mayViewUsers = can(session.user.role, "users.read");
  const mayViewLogs = can(session.user.role, "logs.view");
  const mayViewContent = can(session.user.role, "content.read");

  const toolFilter = { slug: { notIn: [...referenceToolSlugs] } };
  const referenceFilter = { slug: { in: [...referenceToolSlugs] } };
  const [
    activeTools,
    totalTools,
    publishedGuides,
    totalGuides,
    activeReferences,
    totalReferences,
    activeUsers,
    totalUsers,
    recentLogs,
    guideContents,
    legalNotice,
    localeState,
  ] = await Promise.all([
    mayViewCalculators
      ? prisma.calculator.count({ where: { ...toolFilter, active: true } })
      : Promise.resolve(0),
    mayViewCalculators
      ? prisma.calculator.count({ where: toolFilter })
      : Promise.resolve(0),
    mayViewGuides
      ? prisma.guide.count({ where: { status: "published" } })
      : Promise.resolve(0),
    mayViewGuides ? prisma.guide.count() : Promise.resolve(0),
    mayViewReferences
      ? prisma.calculator.count({ where: { ...referenceFilter, active: true } })
      : Promise.resolve(0),
    mayViewReferences
      ? prisma.calculator.count({ where: referenceFilter })
      : Promise.resolve(0),
    mayViewUsers
      ? prisma.user.count({ where: { active: true } })
      : Promise.resolve(0),
    mayViewUsers ? prisma.user.count() : Promise.resolve(0),
    mayViewLogs
      ? prisma.auditLog.findMany({
          include: { user: { select: { username: true } } },
          orderBy: { createdAt: "desc" },
          take: recentActivitySize,
        })
      : Promise.resolve([]),
    mayViewGuides
      ? prisma.guide.findMany({ select: { content: true } })
      : Promise.resolve([]),
    mayViewContent
      ? prisma.staticContent.findUnique({ where: { key: legalNoticeKey } })
      : Promise.resolve(null),
    getLocaleActiveState(),
  ]);

  // ── The four cards ────────────────────────────────────────────────────
  type Card = {
    key: string;
    href: string;
    label: string;
    /** The two numbers, big — "11 / 11". */
    ratio: string;
    /** And the sentence that says what they count. */
    value: string;
    tone: PillTone;
    pill: string;
  };
  const cards: Card[] = [];
  if (mayViewCalculators)
    cards.push({
      key: "tools",
      href: "/admin/tools",
      ratio: t("card-ratio", { active: activeTools, total: totalTools }),
      label: t("tools"),
      value: t("tools-summary", { active: activeTools, total: totalTools }),
      tone: activeTools === totalTools ? "ok" : "warn",
      pill:
        activeTools === totalTools
          ? t("all-visible")
          : t("hidden-count", { count: totalTools - activeTools }),
    });
  if (mayViewReferences)
    cards.push({
      key: "referentiels",
      href: "/admin/referentiels",
      ratio: t("card-ratio", {
        active: activeReferences,
        total: totalReferences,
      }),
      label: t("references"),
      value: t("references-summary", {
        active: activeReferences,
        total: totalReferences,
      }),
      tone: activeReferences === totalReferences ? "ok" : "warn",
      pill:
        activeReferences === totalReferences
          ? t("all-visible")
          : t("hidden-count", {
              count: totalReferences - activeReferences,
            }),
    });
  if (mayViewGuides)
    cards.push({
      key: "guides",
      href: "/admin/guides",
      ratio: t("card-ratio", { active: publishedGuides, total: totalGuides }),
      label: t("guides"),
      value: t("guides-summary", {
        published: publishedGuides,
        total: totalGuides,
      }),
      // A draft is work in progress, not a fault: neutral, where a hidden
      // tool is something to look at.
      tone: publishedGuides === totalGuides ? "ok" : "neutral",
      pill:
        publishedGuides === totalGuides
          ? t("all-published")
          : t("drafts-count", { count: totalGuides - publishedGuides }),
    });
  if (mayViewUsers)
    cards.push({
      key: "users",
      href: "/admin/users",
      ratio: t("card-ratio", { active: activeUsers, total: totalUsers }),
      label: t("users"),
      value: t("users-summary", { active: activeUsers, total: totalUsers }),
      tone: activeUsers === totalUsers ? "ok" : "neutral",
      pill:
        activeUsers === totalUsers
          ? t("all-active")
          : t("inactive-count", { count: totalUsers - activeUsers }),
    });

  // ── "À traiter" ───────────────────────────────────────────────────────
  type Todo = {
    key: string;
    href: string;
    label: string;
    detail?: string;
    action: string;
  };
  const todos: Todo[] = [];

  if (mayViewContent) {
    const stored = translationRecord(legalNotice?.content);
    const notice = (code: string) =>
      stored[code] ||
      (code === "fr" || code === "en" ? defaultLegalNoticeContent[code] : "");
    // The count is the French one: it is the reference language the others
    // are translated from. The other languages are named rather than added
    // up, so the number stays the number of fields, not of occurrences.
    const french = countLegalNoticePlaceholders(notice("fr"));
    const others = launchLocales.filter(
      (code) => code !== "fr" && countLegalNoticePlaceholders(notice(code)) > 0,
    );
    if (french > 0 || others.length > 0)
      todos.push({
        key: "legal",
        href: "/admin/content",
        label: t("todo-legal", { count: french }),
        detail: others.length
          ? t("todo-legal-others", {
              locales: others.map(languageName).join(", "),
            })
          : undefined,
        action: t("todo-legal-action"),
      });
  }

  if (mayViewGuides && guideContents.length > 0)
    for (const code of launchLocales) {
      const missing = guideContents.filter(
        (guide) => !hasLocalizedText(guide.content, code),
      ).length;
      if (missing === 0) continue;
      todos.push({
        key: `guides-${code}`,
        href: "/admin/guides",
        label: t("todo-guides", {
          language: languageName(code),
          count: missing,
        }),
        // Worth saying: a missing translation costs nothing while the
        // language is not served to anyone.
        detail: localeState[code] ? undefined : t("todo-guides-hidden"),
        action: t("todo-guides-action"),
      });
    }

  // ── Recent activity ───────────────────────────────────────────────────
  const translate = auditTranslator(logMessages);
  const activity = groupConsecutiveActivity(
    recentLogs.map((log) => ({
      id: log.id,
      author: log.user.username,
      message: renderAuditMessage(log, translate),
      at: log.createdAt,
    })),
  );

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("subtitle")}
      />

      {cards.length > 0 && (
        <section
          aria-label={t("metrics-label")}
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        >
          {cards.map((card) => (
            <Link
              key={card.key}
              href={card.href}
              className="admin-focus flex flex-col gap-2 rounded-admin-card border border-admin-card-border bg-admin-card p-5 transition-colors hover:border-admin-accent"
            >
              <span className="admin-eyebrow text-admin-dim">{card.label}</span>
              <span className="font-admin-display text-2xl leading-none font-semibold">
                {card.ratio}
              </span>
              <span className="text-xs text-admin-dim">{card.value}</span>
              <span>
                <Pill tone={card.tone}>{card.pill}</Pill>
              </span>
            </Link>
          ))}
        </section>
      )}

      {todos.length > 0 && (
        <section className="rounded-admin-card border border-admin-card-border bg-admin-card p-5">
          <h2 className="admin-section-title">{t("todo")}</h2>
          <ul className="mt-3 flex flex-col">
            {todos.map((todo) => (
              <li
                key={todo.key}
                className="flex flex-wrap items-center justify-between gap-3 border-t border-admin-rule-soft py-3 first:border-t-0 first:pt-0"
              >
                <div className="min-w-0">
                  <p>{todo.label}</p>
                  {todo.detail && (
                    <p className="text-xs text-admin-dim">{todo.detail}</p>
                  )}
                </div>
                <AdminButton asChild size="sm">
                  <Link href={todo.href}>{todo.action}</Link>
                </AdminButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      {mayViewLogs && (
        <section className="rounded-admin-card border border-admin-card-border bg-admin-card p-5">
          <div className="flex items-center justify-between gap-4">
            <h2 className="admin-section-title">{t("recent-actions")}</h2>
            <Link
              href="/admin/logs"
              className="admin-focus text-sm text-admin-accent-soft-ink hover:underline"
            >
              {t("see-all")}
            </Link>
          </div>
          {activity.length === 0 ? (
            <p className="mt-3 text-sm text-admin-dim">{t("empty")}</p>
          ) : (
            <ul className="mt-3 flex flex-col">
              {activity.map((group) => {
                const [newest] = group.times;
                const oldest = group.times[group.times.length - 1];
                const sameDay = adminDayKey(newest) === adminDayKey(oldest);
                return (
                  <li
                    key={group.key}
                    className="border-t border-admin-rule-soft py-3 first:border-t-0 first:pt-0"
                  >
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      {/* The sentence names its own author ("rootadmin a
                          publié…"), so the column that repeated it is gone. */}
                      <span className="flex-1">{group.message}</span>
                      {group.times.length > 1 && (
                        <Pill tone="neutral">
                          {t("repeat", { count: group.times.length })}
                        </Pill>
                      )}
                      <span className="font-admin-mono text-xs text-admin-dim">
                        {group.times.length === 1 || !sameDay
                          ? formatAdminDateTime(newest, locale)
                          : `${formatAdminTime(oldest, locale)} – ${formatAdminTime(newest, locale)}`}
                      </span>
                    </div>
                    {group.times.length > 1 && (
                      <ul
                        aria-label={t("times-label", {
                          count: group.times.length,
                        })}
                        className="mt-1 ml-4 flex flex-wrap gap-x-3 font-admin-mono text-xs text-admin-dim"
                      >
                        {group.times.map((time) => (
                          <li key={time.toISOString()}>
                            {sameDay
                              ? formatAdminTime(time, locale)
                              : formatAdminDateTime(time, locale)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      )}
    </div>
  );
}
