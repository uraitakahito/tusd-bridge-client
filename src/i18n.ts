import { createIntl, createIntlCache } from "@formatjs/intl";
import type { IntlShape } from "@formatjs/intl";
import enMessages from "./locales/en.json";
import jaMessages from "./locales/ja.json";

export type { IntlShape };

const messages: Record<string, Record<string, string>> = {
  en: enMessages,
  ja: jaMessages,
};

const defaultLocale = "en";

function resolveLocale(): string {
  const param = new URLSearchParams(location.search).get("lang");
  if (param && param in messages) return param;

  const browserBase = navigator.language.split("-")[0];
  if (browserBase in messages) return browserBase;

  return defaultLocale;
}

export function setupIntl(): IntlShape<string> {
  const locale = resolveLocale();
  const cache = createIntlCache();
  return createIntl({ locale, messages: messages[locale] }, cache);
}
