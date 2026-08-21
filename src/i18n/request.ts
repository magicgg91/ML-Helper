import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

import {
  defaultLocale,
  getMessagesForLocale,
  isAvailableLocale,
} from "./config";

export default getRequestConfig(async () => {
  const requestedLocale = (await cookies()).get("NEXT_LOCALE")?.value;
  const locale =
    requestedLocale && (await isAvailableLocale(requestedLocale))
      ? requestedLocale
      : defaultLocale;

  return {
    locale,
    messages: await getMessagesForLocale(locale),
  };
});
