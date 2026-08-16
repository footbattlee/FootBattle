import type { Locale } from "@/lib/i18n/config";

const dictionaries = {
  tr: () => import("@/messages/tr.json").then((module) => module.default),
  en: () => import("@/messages/en.json").then((module) => module.default),
};

export async function getDictionary(locale: Locale) {
  return dictionaries[locale]();
}
