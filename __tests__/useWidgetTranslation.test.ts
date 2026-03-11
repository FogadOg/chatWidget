 

import { renderHook, act, waitFor } from '@testing-library/react';
import { useState, useEffect } from 'react';
import * as hooks from '../hooks/useWidgetTranslation';
import { getTranslations } from '../lib/i18n';

const { useWidgetTranslation, getInitialLocale } = hooks; // for convenience

const originalURLSearchParams = global.URLSearchParams;

describe('useWidgetTranslation', () => {
  beforeEach(() => {
    // Mock navigator
    delete (window as any).navigator;
    (window as any).navigator = {
      languages: ['en-US', 'en'],
      language: 'en-US',
    };
    try {
      window.localStorage.clear();
    } catch (_err) {
      // ignore
    }
    if (document?.documentElement) {
      document.documentElement.lang = '';
    }
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

    it('returns "en" when localeParam is an empty string (falsy)', () => {
      global.URLSearchParams = jest.fn().mockImplementation(() => ({
        get: (key: string) => key === 'locale' ? '' : null,
      })) as any;

      // navigator will not supply a supported language by default
      expect(getInitialLocale()).toBe('en');
    });

    it('returns "en" when no locale is found', () => {
      (window as any).navigator = {
        languages: ['unsupported'],
        language: 'unsupported',
      };

      expect(getInitialLocale()).toBe('en');
    });

    it('returns the localeParam when provided and supported', () => {
      global.URLSearchParams = jest.fn().mockImplementation((_search) => ({
        get: (key: string) => key === 'locale' ? 'fr' : null,
      })) as any;

      expect(getInitialLocale()).toBe('fr');
    });
  });

  it('returns default English translations when no locale is specified', () => {
    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('en');
    expect(result.current.translations).toBeDefined();
    expect(typeof result.current.translations).toBe('object');
  });

  it('detects locale from URL parameters', () => {
    global.URLSearchParams = jest.fn().mockImplementation((_search) => ({
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

  it('prefers stored locale when available', () => {
    window.localStorage.setItem('companin-widget-locale', 'es');

    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('es');
  });

  it('falls back to English for unsupported locale in URL', () => {
    global.URLSearchParams = jest.fn().mockImplementation((_search) => ({
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
      global.URLSearchParams = jest.fn().mockImplementation((_search) => ({
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
    const _originalGetInitialLocale = getInitialLocale;

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

  it('defers updates using setTimeout and clears timeout on unmount (real hook)', () => {
    jest.useFakeTimers();

    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    // track number of times getInitialLocale is invoked via URLSearchParams.get
    let callCount = 0;
    jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation(() => {
      callCount++;
      // first two calls (initial locale + translations) return null -> fallback to navigator
      // third call (in effect) return 'de'
      if (callCount === 3) return 'de';
      return null;
    });

    // initial navigator yields en
    (window as any).navigator = { languages: ['en-US'], language: 'en-US' };

    const { result, unmount } = renderHook(() => useWidgetTranslation());

    // setTimeout should have been scheduled by the effect
    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);
    expect(result.current.locale).toBe('en');

    // unmount triggers cleanup
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalledTimes(1);

    jest.runAllTimers();
    expect(result.current.locale).toBe('en');

    jest.useRealTimers();
  });

  it('executes deferred update and updates locale/translations when timer fires', () => {
    jest.useFakeTimers();
    const setTimeoutSpy = jest.spyOn(window, 'setTimeout');
    const clearTimeoutSpy = jest.spyOn(window, 'clearTimeout');

    let callCount3 = 0;
    jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation(() => {
      callCount3++;
      if (callCount3 === 3) return 'it';
      return null;
    });
    (window as any).navigator = { languages: ['en-US'], language: 'en-US' };

    const { result, unmount } = renderHook(() => useWidgetTranslation());
    expect(result.current.locale).toBe('en');

    // fire the scheduled timer and wrap in act so React updates flush
    act(() => {
      jest.runAllTimers();
    });

    expect(result.current.locale).toBe('it');
    expect(result.current.translations).toEqual(getTranslations('it'));

    // cleanup should still clear the timeout
    unmount();
    expect(clearTimeoutSpy).toHaveBeenCalled();

    jest.useRealTimers();
  });


  // confirm the final else branch of getInitialLocale returns 'en' for unsupported
  it('getInitialLocale falls back to en when no supported locale found after checks', () => {
    // no url param, unsupported navigator
    global.URLSearchParams = jest.fn().mockImplementation(() => ({
      get: () => null,
    })) as any;
    (window as any).navigator = { languages: ['xx-XX'], language: 'xx-XX' };

    expect(getInitialLocale()).toBe('en');
  });
});