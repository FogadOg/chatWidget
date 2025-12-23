import { useState, useEffect } from 'react';
import { getTranslations, Locale } from '../lib/i18n';

export function useWidgetTranslation() {
  const [locale, setLocale] = useState<Locale>('en');
  const [translations, setTranslations] = useState(getTranslations('en'));

  useEffect(() => {
    // Get locale from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    const localeParam = urlParams.get('locale') as Locale;

    if (localeParam && ['en', 'de', 'es', 'fr', 'pt', 'sv', 'nl', 'nb', 'it'].includes(localeParam)) {
      setLocale(localeParam);
      setTranslations(getTranslations(localeParam));
    }
  }, []);

  return { translations, locale };
}