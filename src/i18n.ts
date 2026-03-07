import { createIntl, createIntlCache } from "@formatjs/intl";
import type { IntlShape } from "@formatjs/intl";

export type { IntlShape };

type LocaleMessages = Record<string, Record<string, string>>;

const defaultLocale = "en";

function resolveLocale(messages: LocaleMessages): string {
  const param = new URLSearchParams(location.search).get("lang");
  if (param && param in messages) return param;

  const browserBase = navigator.language.split("-")[0];
  if (browserBase in messages) return browserBase;

  return defaultLocale;
}

export function setupIntl(messages: LocaleMessages): IntlShape<string> {
  const locale = resolveLocale(messages);
  const cache = createIntlCache();
  return createIntl({ locale, messages: messages[locale] }, cache);
}
