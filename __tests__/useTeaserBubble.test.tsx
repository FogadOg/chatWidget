/**
 * Behaviour lock for the chat widget's proactive teaser bubble
 * (app/embed/session/hooks/useTeaserBubble).
 *
 * Written BEFORE page-rule targeting (`teaser_rules`) was added, and kept
 * unmodified through that work: with no rules configured the hook must behave
 * exactly as it does here. The teaser is free on every plan and live on every
 * install, so "adding targeting changed nothing for everyone else" is the one
 * claim this feature has to be able to prove.
 */

import { renderHook, act } from '@testing-library/react';
import { useTeaserBubble } from '../app/embed/session/hooks/useTeaserBubble';
import type { WidgetConfig } from '../types/widget';

const BUBBLE_LAG_MS = 350;

function makeConfig(overrides: Record<string, unknown> = {}): WidgetConfig {
  return {
    id: 'cfg-1',
    teaser_message: { en: 'Need a hand?' },
    ...overrides,
  } as unknown as WidgetConfig;
}

function setup(overrides: Partial<Parameters<typeof useTeaserBubble>[0]> = {}) {
  const props = {
    widgetConfig: makeConfig(),
    isCollapsed: true,
    locale: 'en',
    ...overrides,
  } as Parameters<typeof useTeaserBubble>[0];
  return renderHook((p: Parameters<typeof useTeaserBubble>[0] = props) => useTeaserBubble(p), {
    initialProps: props,
  });
}

/** Advance past the delay AND the bubble's post-resize render lag. */
function fireTeaser(delayMs = 3000) {
  act(() => { jest.advanceTimersByTime(delayMs); });
  act(() => { jest.advanceTimersByTime(BUBBLE_LAG_MS); });
}

describe('useTeaserBubble', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    // Dismissal is remembered for the browsing session, so one test's dismiss
    // would otherwise suppress the teaser in every test after it.
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  describe('timing', () => {
    it('defaults to a 3s delay, then renders the bubble 350ms later', () => {
      const { result } = setup();

      expect(result.current.showTeaser).toBe(false);
      expect(result.current.teaserExpanded).toBe(false);

      act(() => { jest.advanceTimersByTime(2999); });
      expect(result.current.teaserExpanded).toBe(false);

      // The delay fires the resize first; the bubble itself is still hidden so
      // it never paints into an iframe that is mid-transition.
      act(() => { jest.advanceTimersByTime(1); });
      expect(result.current.teaserExpanded).toBe(true);
      expect(result.current.showTeaser).toBe(false);

      act(() => { jest.advanceTimersByTime(BUBBLE_LAG_MS); });
      expect(result.current.showTeaser).toBe(true);
    });

    it('honours an explicit teaser_delay', () => {
      const { result } = setup({ widgetConfig: makeConfig({ teaser_delay: 8000 }) });

      act(() => { jest.advanceTimersByTime(7999 + BUBBLE_LAG_MS); });
      expect(result.current.showTeaser).toBe(false);

      fireTeaser(1);
      expect(result.current.showTeaser).toBe(true);
    });

    it('treats teaser_delay: 0 as immediate', () => {
      const { result } = setup({ widgetConfig: makeConfig({ teaser_delay: 0 }) });

      fireTeaser(0);
      expect(result.current.showTeaser).toBe(true);
    });
  });

  describe('dismissal', () => {
    it('auto-dismisses after teaser_dismiss_after', () => {
      const { result } = setup({
        widgetConfig: makeConfig({ teaser_delay: 1000, teaser_dismiss_after: 5000 }),
      });

      fireTeaser(1000);
      expect(result.current.showTeaser).toBe(true);

      act(() => { jest.advanceTimersByTime(5000); });
      expect(result.current.teaserExpanded).toBe(false);
      act(() => { jest.advanceTimersByTime(BUBBLE_LAG_MS); });
      expect(result.current.showTeaser).toBe(false);
    });

    it('never auto-dismisses when teaser_dismiss_after is 0', () => {
      const { result } = setup({
        widgetConfig: makeConfig({ teaser_delay: 1000, teaser_dismiss_after: 0 }),
      });

      fireTeaser(1000);
      act(() => { jest.advanceTimersByTime(600000); });
      expect(result.current.showTeaser).toBe(true);
    });

    it('stays retired for the rest of the page view once dismissed', () => {
      const { result } = setup({ widgetConfig: makeConfig({ teaser_delay: 1000 }) });

      fireTeaser(1000);
      act(() => { result.current.dismissTeaser(); });
      act(() => { jest.advanceTimersByTime(BUBBLE_LAG_MS); });
      expect(result.current.showTeaser).toBe(false);

      // The delay must not re-arm and show it a second time.
      act(() => { jest.advanceTimersByTime(60000); });
      expect(result.current.showTeaser).toBe(false);
      expect(result.current.teaserExpanded).toBe(false);
    });

    it('hides while the panel is open and does not re-show on its own', () => {
      const { result, rerender } = setup({ widgetConfig: makeConfig({ teaser_delay: 1000 }) });

      fireTeaser(1000);
      expect(result.current.showTeaser).toBe(true);

      rerender({ widgetConfig: makeConfig({ teaser_delay: 1000 }), isCollapsed: false, locale: 'en' });
      act(() => { jest.advanceTimersByTime(BUBBLE_LAG_MS); });
      expect(result.current.showTeaser).toBe(false);
      expect(result.current.teaserExpanded).toBe(false);
    });
  });

  describe('locale resolution', () => {
    const config = (message: Record<string, string>, extra: Record<string, unknown> = {}) =>
      makeConfig({ teaser_message: message, ...extra });

    it('prefers the exact locale', () => {
      const { result } = setup({
        widgetConfig: config({ en: 'Need a hand?', 'pt-BR': 'Precisa de ajuda?' }),
        locale: 'pt-BR',
      });
      expect(result.current.teaserMessage).toBe('Precisa de ajuda?');
    });

    it('falls back to the base locale', () => {
      const { result } = setup({
        widgetConfig: config({ en: 'Need a hand?', pt: 'Precisa de ajuda?' }),
        locale: 'pt-BR',
      });
      expect(result.current.teaserMessage).toBe('Precisa de ajuda?');
    });

    it('falls back to the widget default language, then English', () => {
      const withDefault = setup({
        widgetConfig: config({ de: 'Brauchen Sie Hilfe?', en: 'Need a hand?' }, { default_language: 'de' }),
        locale: 'fr',
      });
      expect(withDefault.result.current.teaserMessage).toBe('Brauchen Sie Hilfe?');

      const withoutDefault = setup({
        widgetConfig: config({ en: 'Need a hand?' }),
        locale: 'fr',
      });
      expect(withoutDefault.result.current.teaserMessage).toBe('Need a hand?');
    });

    it('falls back to the first non-empty entry when nothing else matches', () => {
      const { result } = setup({
        widgetConfig: config({ nl: 'Hulp nodig?' }),
        locale: 'fr',
      });
      expect(result.current.teaserMessage).toBe('Hulp nodig?');
    });

    it('skips blank entries rather than rendering an empty bubble', () => {
      const { result } = setup({
        widgetConfig: config({ fr: '   ', en: 'Need a hand?' }),
        locale: 'fr',
      });
      expect(result.current.teaserMessage).toBe('Need a hand?');
    });
  });

  describe('no teaser configured', () => {
    it.each([
      ['an empty message map', makeConfig({ teaser_message: {} })],
      ['a message map of blanks', makeConfig({ teaser_message: { en: '' } })],
      ['a missing message', makeConfig({ teaser_message: undefined })],
      ['no config at all', null],
    ])('stays inert with %s', (_label, widgetConfig) => {
      const { result } = setup({ widgetConfig: widgetConfig as WidgetConfig | null });

      expect(result.current.teaserConfigured).toBe(false);
      expect(result.current.teaserMessage).toBeNull();

      fireTeaser(60000);
      expect(result.current.showTeaser).toBe(false);
      // Nothing to show means the iframe must stay launcher-sized.
      expect(result.current.teaserExpanded).toBe(false);
    });
  });
});
