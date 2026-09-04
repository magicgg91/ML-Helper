import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import { getActiveLocales, resolveRenderLocale } from "@/lib/locale-settings";
import { getMessagesForLocale } from "./config";

export default getRequestConfig(async () => {
  const requestedLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  // Bloc 90/E: a cookie pointing at a now-disabled (or unknown) locale sends
  // the visitor to English — EN is guaranteed always active (guardrail D). A
  // request with no cookie is still the first-visit default (FR); the
  // middleware sets that cookie from the browser's Accept-Language. Admin
  // routes never reach the disabled branch: the middleware already clamps
  // their cookie to EN/FR, so admin editing stays available in every language
  // through the per-field editorial locale picker (point F).
  const locale = resolveRenderLocale(requestedLocale, await getActiveLocales());

  return {
    locale,
    messages: await getMessagesForLocale(locale),
  };
});
