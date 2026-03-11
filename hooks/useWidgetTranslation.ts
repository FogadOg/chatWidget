import { useState, useEffect } from 'react';
import { getTranslations, Locale, resolveLocaleCandidates } from '../lib/i18n';

const getInitialLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return 'en';
  }

  const urlParams = new URLSearchParams(window.location.search);
  const localeParam = urlParams.get('locale');

  let storedLocale: string | null = null;
  try {
    storedLocale = window.localStorage.getItem('companin-widget-locale');
  } catch {
    storedLocale = null;
  }

  const docLang = document?.documentElement?.lang;
  const browserLocales = navigator.languages || [navigator.language];

  const detected = resolveLocaleCandidates([
    localeParam,
    storedLocale,
    docLang,
    ...browserLocales,
  ]);

  return detected;
};

export { getInitialLocale };

export function useWidgetTranslation() {
  const [locale, setLocale] = useState<Locale>(() => getInitialLocale());
  const [translations, setTranslations] = useState(() => getTranslations(getInitialLocale()));

  useEffect(() => {
    // Ensure locale is updated on client if initially set to 'en' due to SSR
    if (typeof window !== 'undefined') {
      const correctLocale = getInitialLocale();
      if (correctLocale !== locale) {
        // Defer state updates to avoid synchronous setState inside effect
        const id = window.setTimeout(() => {
          setLocale(correctLocale);
          setTranslations(getTranslations(correctLocale));
        }, 0);
        return () => window.clearTimeout(id);
      }
    }
  }, [locale]); // run when locale changes

  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem('companin-widget-locale', locale);
      } catch {
        // ignore storage errors
      }
    }
  }, [locale]);

  return { translations, locale };
}