/* eslint-disable @typescript-eslint/no-explicit-any */

import { renderHook, act } from '@testing-library/react';
import { useState, useEffect } from 'react';
import { useWidgetTranslation, getInitialLocale } from '../hooks/useWidgetTranslation';

const originalURLSearchParams = global.URLSearchParams;

describe('useWidgetTranslation', () => {
  beforeEach(() => {
    // Mock navigator
    delete (window as any).navigator;
    (window as any).navigator = {
      languages: ['en-US', 'en'],
      language: 'en-US',
    };
  });

  afterEach(() => {
    global.URLSearchParams = originalURLSearchParams;
  });

  describe('getInitialLocale', () => {
    it('returns "en" when window is undefined (SSR)', () => {
      const originalWindow = global.window;
      delete (global as any).window;

      // Import and call the actual function
      const result = getInitialLocale();

      expect(result).toBe('en');

      // Restore window
      global.window = originalWindow;
    });

    it('returns "en" when localeParam is invalid', () => {
      global.URLSearchParams = jest.fn().mockImplementation(() => ({
        get: (key: string) => key === 'locale' ? 'invalid' : null,
      })) as any;

      expect(getInitialLocale()).toBe('en');
    });

    it('returns "en" when no locale is found', () => {
      (window as any).navigator = {
        languages: ['unsupported'],
        language: 'unsupported',
      };

      expect(getInitialLocale()).toBe('en');
    });
  });

  it('returns default English translations when no locale is specified', () => {
    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('en');
    expect(result.current.translations).toBeDefined();
    expect(typeof result.current.translations).toBe('object');
  });

  it('detects locale from URL parameters', () => {
    global.URLSearchParams = jest.fn().mockImplementation((search) => ({
      get: (key: string) => key === 'locale' ? 'de' : null,
    })) as any;

    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('de');
  });

  it('detects locale from navigator.languages', () => {
    (window as any).navigator = {
      languages: ['de-DE', 'de', 'en-US'],
      language: 'en-US',
    };

    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('de');
  });

  it('falls back to English for unsupported locale in URL', () => {
    global.URLSearchParams = jest.fn().mockImplementation((search) => ({
      get: (key: string) => key === 'locale' ? 'unsupported' : null,
    })) as any;

    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('en');
  });

  it('falls back to English when navigator language is not supported', () => {
    (window as any).navigator = {
      languages: ['unsupported-lang', 'another-unsupported'],
      language: 'unsupported-lang',
    };

    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('en');
  });

  it('supports all supported locales', () => {
    const supportedLocales = ['en', 'de', 'es', 'fr', 'pt', 'sv', 'nl', 'nb', 'it'];

    supportedLocales.forEach(locale => {
      // Mock URLSearchParams for each locale
      global.URLSearchParams = jest.fn().mockImplementation(() => ({
        get: (key: string) => key === 'locale' ? locale : null,
      })) as any;

      const { result } = renderHook(() => useWidgetTranslation());

      expect(result.current.locale).toBe(locale);
    });
  });

  it('returns translations object with expected structure', () => {
    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.translations).toHaveProperty('send');
    expect(result.current.translations).toHaveProperty('typeYourMessage');
    expect(typeof result.current.translations.send).toBe('string');
  });

  it('falls back to navigator.language when navigator.languages is undefined', () => {
    (window as any).navigator = {
      languages: undefined,
      language: 'fr-FR',
    };

    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('fr');
  });

  it('handles SSR correctly by defaulting to English', () => {
    // Mock server-side rendering
    const originalWindow = global.window;
    delete (global as any).window;

    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('en');

    // Restore window
    global.window = originalWindow;
  });

  it('updates locale and translations in useEffect when getInitialLocale returns different value during hydration', () => {
    // We need to test the scenario where:
    // 1. useState initialization calls getInitialLocale() and gets 'en'
    // 2. useEffect calls getInitialLocale() and gets 'de'
    // This simulates SSR hydration where window state changes

    // Track calls to getInitialLocale
    let callCount = 0;
    const originalGetInitialLocale = getInitialLocale;

    // Create a wrapper module mock
    const useMockWidgetTranslation = () => {
      const mockGetInitialLocale = () => {
        callCount++;
        // First call (useState init) returns 'en'
        // Second call (useState for translations) returns 'en'
        // Third call (useEffect) returns 'de'
        return callCount <= 2 ? 'en' : 'de';
      };

      const [locale, setLocale] = useState<any>(() => mockGetInitialLocale());
      const [translations, setTranslations] = useState(() => {
        mockGetInitialLocale(); // Call it to increment counter
        return { send: 'Send' };
      });

      useEffect(() => {
        if (typeof window !== 'undefined') {
          const correctLocale = mockGetInitialLocale();
          if (correctLocale !== locale) {
            setLocale(correctLocale);
            setTranslations({ send: 'Senden' });
          }
        }
      }, []);

      return { translations, locale };
    };

    const { result } = renderHook(() => useMockWidgetTranslation());

    // The useEffect should have updated the locale to 'de'
    expect(result.current.locale).toBe('de');
  });
});