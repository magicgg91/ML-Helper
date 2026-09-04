import type { ReactNode } from "react";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { setRequestLocale } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getActiveLocales, isAlwaysActiveLocale } from "@/lib/locale-settings";
import { fallbackLocale } from "@/i18n/config";

// Bloc 91/E1: pre-renders the 5 locale segments.
export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  // Unknown segment (not one of the 5 launched locales) → 404.
  if (!hasLocale(routing.locales, locale)) notFound();

  // Bloc 90 under URL routing: a locale an admin disabled for the public site
  // is redirected to its English equivalent (EN is always active, guardrail D)
  // — preserving Bloc 90/E's "disabled language → English" behaviour. EN/FR are
  // always active and skip the DB lookup entirely.
  if (!isAlwaysActiveLocale(locale)) {
    const active = await getActiveLocales();
    if (!active.includes(locale)) {
      const pathname = (await headers()).get("x-pathname") ?? `/${locale}`;
      const rest = pathname.replace(new RegExp(`^/${locale}(?=/|$)`), "");
      redirect(`/${fallbackLocale}${rest}`);
    }
  }

  // Enables static rendering for this locale's subtree (next-intl reads the
  // locale from here instead of the request headers when prerendering).
  setRequestLocale(locale);

  return children;
}
