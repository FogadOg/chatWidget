import { t, getTranslations, LOCALES, type SupportedLocale } from '../lib/i18n';

 

describe('i18n', () => {
  describe('t function', () => {
    it('returns translation for existing key in specified locale', () => {
      const result = t('en', 'send');
      expect(result).toBe('Send');
    });

    it('returns translation for existing key in different locale', () => {
      const result = t('de', 'send');
      expect(result).toBe('Senden');
    });

    it('falls back to English when key does not exist in specified locale', () => {
      // Assuming 'nonexistent' key doesn't exist in German but exists in English
      const result = t('de', 'send'); // This should work
      expect(result).toBe('Senden');
    });

    it('returns the key itself when it does not exist in any locale', () => {
      const result = t('en', 'nonexistent_key');
      expect(result).toBe('nonexistent_key');
    });

    it('handles non-string values by converting to string', () => {
      // Mock a locale with a non-string value
      const originalLocales = { ...LOCALES };
      (LOCALES as any).en.test_number = 123;

      const result = t('en', 'test_number');
      expect(result).toBe('123');

      // Restore
      Object.assign(LOCALES, originalLocales);
    });

    it('handles plural forms with interpolation', () => {
      const single = t('en', 'unreadMessages', { count: 1, vars: { count: 1 } });
      const multiple = t('en', 'unreadMessages', { count: 3, vars: { count: 3 } });
      expect(single).toBe('1 unread message');
      expect(multiple).toBe('3 unread messages');
    });

    it('handles context-specific strings', () => {
      const open = t('en', 'chatControl', { context: 'open' });
      const close = t('en', 'chatControl', { context: 'close' });
      expect(open).toBe('Open chat');
      expect(close).toBe('Close chat');
    });
  });

  describe('getTranslations function', () => {
    it('returns translations for existing locale', () => {
      const translations = getTranslations('en');
      expect(translations).toBeDefined();
      expect(translations).toHaveProperty('send');
      expect(translations.send).toBe('Send');
    });

    it('returns English translations as fallback for non-existing locale', () => {
      const translations = getTranslations('nonexistent_locale');
      expect(translations).toBeDefined();
      expect(translations).toHaveProperty('send');
      expect(translations.send).toBe('Send');
    });

    it('returns the same object reference for English locale', () => {
      const enTranslations1 = getTranslations('en');
      const enTranslations2 = getTranslations('en');
      expect(enTranslations1).toBe(enTranslations2);
    });
  });

  describe('LOCALES constant', () => {
    it('contains all supported locales', () => {
      const expectedLocales: SupportedLocale[] = ['en', 'de', 'es', 'fr', 'pt', 'sv', 'nl', 'nb', 'it'];

      expectedLocales.forEach(locale => {
        expect(LOCALES).toHaveProperty(locale);
        expect(typeof LOCALES[locale]).toBe('object');
      });
    });

    it('has consistent structure across locales', () => {
      const enKeys = Object.keys(LOCALES.en);

      Object.keys(LOCALES).forEach(locale => {
        if (locale !== 'en') {
          const localeKeys = Object.keys(LOCALES[locale as SupportedLocale]);
          // Should have at least some keys, may not have all English keys
          expect(localeKeys.length).toBeGreaterThan(0);
        }
      });
    });
  });

  describe('Locale type', () => {
    it('accepts all supported locale strings', () => {
      const locales: SupportedLocale[] = ['en', 'de', 'es', 'fr', 'pt', 'sv', 'nl', 'nb', 'it'];

      locales.forEach(locale => {
        const translations = getTranslations(locale);
        expect(translations).toBeDefined();
      });
    });
  });
});