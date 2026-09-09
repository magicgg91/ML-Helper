import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";

import { routing } from "./routing";
import { getMessagesForLocale } from "./config";

// Bloc 91/E1: the render locale now comes from the URL (`requestLocale`,
// resolved from the /[locale]/ segment via the X-NEXT-INTL-LOCALE header the
// middleware sets) rather than the NEXT_LOCALE cookie. Admin routes are not
// locale-prefixed; the middleware sets that same header to the admin-clamped
// locale (EN/FR, Bloc 90) for them. A locale that has been disabled for the
// public (Bloc 90) is redirected to English in src/app/[locale]/layout.tsx,
// which — unlike this Edge-adjacent config — can read the database.
export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested)
    ? requested
    : routing.defaultLocale;

  return {
    locale,
    messages: await getMessagesForLocale(locale),
  };
});
