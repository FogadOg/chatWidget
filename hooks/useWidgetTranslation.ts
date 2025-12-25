import { useState, useEffect } from 'react';
import { getTranslations, Locale } from '../lib/i18n';

const getInitialLocale = (): Locale => {
  if (typeof window === 'undefined') {
    return 'en';
  }
  const urlParams = new URLSearchParams(window.location.search);
  let localeParam = urlParams.get('locale') as Locale;

  if (!localeParam) {
    const supportedLocales: Locale[] = ['en', 'de', 'es', 'fr', 'pt', 'sv', 'nl', 'nb', 'it'];
    for (const lang of navigator.languages || [navigator.language]) {
      const shortLang = lang.split('-')[0] as Locale;
      if (supportedLocales.includes(shortLang)) {
        localeParam = shortLang;
        break;
      }
    }
  }

  if (localeParam && ['en', 'de', 'es', 'fr', 'pt', 'sv', 'nl', 'nb', 'it'].includes(localeParam)) {
    return localeParam;
  } else {
    return 'en';
  }
};

export function useWidgetTranslation() {
  const [locale, setLocale] = useState<Locale>(getInitialLocale);
  const [translations, setTranslations] = useState(getTranslations(getInitialLocale()));

  useEffect(() => {
    // Ensure locale is updated on client if initially set to 'en' due to SSR
    if (typeof window !== 'undefined') {
      const correctLocale = getInitialLocale();
      if (correctLocale !== locale) {
        setLocale(correctLocale);
        setTranslations(getTranslations(correctLocale));
      }
    }
  }, [locale]);

  return { translations, locale };
}