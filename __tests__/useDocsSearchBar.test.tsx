/**
 * Tests for the docs widget's collapsed search-bar visibility rules
 * (app/embed/docs/hooks/useDocsSearchBar) — the docs counterpart of the chat
 * widget's teaser bubble, driven by the same `teaser_*` config fields.
 *
 * The behavior that distinguishes it from the chat teaser: the bar is the docs
 * widget's only entry point, so opening the widget merely *hides* it — only an
 * explicit dismiss (or `teaser_dismiss_after`) retires it, for the page view.
 */

import { renderHook, act } from '@testing-library/react';
import { useDocsSearchBar } from '../app/embed/docs/hooks/useDocsSearchBar';

const message = { en: 'Ask the docs', fr: 'Interroger la doc' };

function setup(overrides: Record<string, unknown> = {}) {
  const props = {
    configData: { teaser_message: message, teaser_delay: 3000 } as Record<string, unknown> | null,
    locale: 'en',
    open: false,
    ...overrides,
  } as Parameters<typeof useDocsSearchBar>[0];
  return renderHook((p: Parameters<typeof useDocsSearchBar>[0] = props) => useDocsSearchBar(p), {
    initialProps: props,
  });
}

describe('useDocsSearchBar', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('stays hidden until the configured delay elapses, then reveals', () => {
    const { result } = setup();

    expect(result.current.visible).toBe(false);
    expect(result.current.placeholder).toBe('Ask the docs');

    act(() => { jest.advanceTimersByTime(2999); });
    expect(result.current.visible).toBe(false);

    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current.visible).toBe(true);
  });

  it('defaults to a 3s delay when teaser_delay is absent', () => {
    const { result } = setup({ configData: { teaser_message: message } });

    act(() => { jest.advanceTimersByTime(2999); });
    expect(result.current.visible).toBe(false);
    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current.visible).toBe(true);
  });

  it('treats a non-numeric or negative teaser_delay as no delay', () => {
    for (const teaser_delay of ['not-a-number', -5000]) {
      const { result } = setup({ configData: { teaser_message: message, teaser_delay } });
      act(() => { jest.advanceTimersByTime(0); });
      expect(result.current.visible).toBe(true);
    }
  });

  it('is off entirely when teaser_message is unset or empty', () => {
    for (const configData of [null, {}, { teaser_message: {} }, { teaser_message: 'not-an-object' }]) {
      const { result } = setup({ configData });
      act(() => { jest.advanceTimersByTime(10000); });
      expect(result.current.placeholder).toBeNull();
      expect(result.current.visible).toBe(false);
    }
  });

  describe('placeholder locale resolution', () => {
    it('prefers the exact visitor locale', () => {
      const { result } = setup({ locale: 'fr' });
      expect(result.current.placeholder).toBe('Interroger la doc');
    });

    it('falls back from a regional locale to its base', () => {
      const { result } = setup({ locale: 'fr-CA' });
      expect(result.current.placeholder).toBe('Interroger la doc');
    });

    it('falls back to the widget default language', () => {
      const { result } = setup({
        locale: 'de',
        configData: { teaser_message: { fr: 'Interroger la doc' }, default_language: 'fr' },
      });
      expect(result.current.placeholder).toBe('Interroger la doc');
    });

    it('falls back to English when the default language has no entry', () => {
      const { result } = setup({ locale: 'de', configData: { teaser_message: message } });
      expect(result.current.placeholder).toBe('Ask the docs');
    });

    it('skips blank entries and lands on the first non-empty one', () => {
      const { result } = setup({
        locale: 'de',
        configData: { teaser_message: { de: '   ', en: '', es: 'Pregunta a los docs' } },
      });
      expect(result.current.placeholder).toBe('Pregunta a los docs');
    });

    it('is null when every entry is blank', () => {
      const { result } = setup({ configData: { teaser_message: { en: '  ', fr: '' } } });
      expect(result.current.placeholder).toBeNull();
    });
  });

  it('hides while the widget is open and comes straight back on close', () => {
    const { result, rerender } = setup();
    act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current.visible).toBe(true);

    rerender({ configData: { teaser_message: message, teaser_delay: 3000 }, locale: 'en', open: true } as any);
    expect(result.current.visible).toBe(false);

    // No second wait-out of the delay — the reveal timer is independent of `open`.
    rerender({ configData: { teaser_message: message, teaser_delay: 3000 }, locale: 'en', open: false } as any);
    expect(result.current.visible).toBe(true);
  });

  it('is suppressed entirely when disabled (e.g. hide_on_mobile)', () => {
    const { result } = setup({ enabled: false });
    act(() => { jest.advanceTimersByTime(10000); });
    expect(result.current.visible).toBe(false);
    // The placeholder still resolves — only the rendering is suppressed.
    expect(result.current.placeholder).toBe('Ask the docs');
  });

  it('stays retired for the page view once dismissed', () => {
    const { result } = setup();
    act(() => { jest.advanceTimersByTime(3000); });
    expect(result.current.visible).toBe(true);

    act(() => { result.current.dismiss(); });
    expect(result.current.visible).toBe(false);

    act(() => { jest.advanceTimersByTime(60000); });
    expect(result.current.visible).toBe(false);
  });

  it('auto-retires after teaser_dismiss_after ms on screen', () => {
    const { result } = setup({
      configData: { teaser_message: message, teaser_delay: 1000, teaser_dismiss_after: 5000 },
    });

    act(() => { jest.advanceTimersByTime(1000); });
    expect(result.current.visible).toBe(true);

    // The auto-dismiss clock starts when the bar becomes visible, not at mount.
    act(() => { jest.advanceTimersByTime(4999); });
    expect(result.current.visible).toBe(true);
    act(() => { jest.advanceTimersByTime(1); });
    expect(result.current.visible).toBe(false);
  });

  it('never auto-retires when teaser_dismiss_after is 0 or unset', () => {
    const { result } = setup({
      configData: { teaser_message: message, teaser_delay: 0, teaser_dismiss_after: 0 },
    });
    act(() => { jest.advanceTimersByTime(0); });
    expect(result.current.visible).toBe(true);

    act(() => { jest.advanceTimersByTime(600000); });
    expect(result.current.visible).toBe(true);
  });
});
