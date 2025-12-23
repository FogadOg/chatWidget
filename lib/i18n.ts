import en from "../locales/en.json";
import de from "../locales/de.json";
import es from "../locales/es.json";
import fr from "../locales/fr.json";
import pt from "../locales/pt.json";
import sv from "../locales/sv.json";
import nl from "../locales/nl.json";
import nb from "../locales/nb.json";
import it from "../locales/it.json";

const LOCALES: Record<string, Record<string, any>> = {
  en,
  de,
  es,
  fr,
  pt,
  sv,
  nl,
  nb,
  it,
};

export type Locale = keyof typeof LOCALES;

export { LOCALES };

export function t(locale: Locale, key: string): string {
  const val = LOCALES[locale]?.[key] ?? LOCALES["en"][key];
  if (typeof val === "string") return val;
  return String(val ?? key);
}

export function getTranslations(locale: string): Record<string, any> {
  // Check if the requested locale exists in LOCALES
  if (locale in LOCALES) {
    return LOCALES[locale as Locale];
  }
  // Fallback to English
  return LOCALES.en;
}