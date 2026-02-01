import { renderHook, act } from '@testing-library/react';
import { useWidgetTranslation } from '../hooks/useWidgetTranslation';

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

  it('handles SSR correctly by defaulting to English', () => {
    // Mock server-side rendering
    const originalWindow = global.window;
    delete (global as any).window;

    const { result } = renderHook(() => useWidgetTranslation());

    expect(result.current.locale).toBe('en');

    // Restore window
    global.window = originalWindow;
  });
});