import { getAvailableLocales } from "@/i18n/config";

import { LocaleSwitcher } from "./locale-switcher";

export async function ServerLocaleSwitcher() {
  return <LocaleSwitcher locales={await getAvailableLocales()} />;
}
