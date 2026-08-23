/**
 * Page-rule behaviour of the teaser hook — the parts that only show up once
 * timers, navigation and storage are involved.
 *
 * The regressions being guarded here are the ones that damage the *host* page
 * rather than the widget: an iframe left expanded over the customer's content
 * after navigating away from a matched page, and a nudge that re-fires on every
 * route change of a single-page app.
 */

import { renderHook, act } from '@testing-library/react';
import { useTeaserBubble } from '../app/embed/session/hooks/useTeaserBubble';
import type { TeaserRule, WidgetConfig } from '../types/widget';

const BUBBLE_LAG_MS = 350;

const pricingRule: TeaserRule = {
  id: 'r_pricing',
  match: { type: 'prefix', value: '/pricing' },
  message: { en: 'Questions about a plan?' },
  delay_ms: 2000,
  dismiss_after_ms: 0,
  action: 'bubble',
  on_exit_intent: false,
};

function makeConfig(overrides: Record<string, unknown> = {}): WidgetConfig {
  return {
    id: 'cfg-rules',
    teaser_message: { en: 'Need a hand?' },
    teaser_delay: 3000,
    teaser_rules: [pricingRule],
    ...overrides,
  } as unknown as WidgetConfig;
}

type Props = Parameters<typeof useTeaserBubble>[0];

function setup(overrides: Partial<Props> = {}) {
  const props = {
    widgetConfig: makeConfig(),
    isCollapsed: true,
    locale: 'en',
    pagePath: '/pricing',
    ...overrides,
  } as Props;
  return renderHook((p: Props = props) => useTeaserBubble(p), { initialProps: props });
}

function advance(ms: number) {
  act(() => { jest.advanceTimersByTime(ms); });
}

/**
 * The hook toggles visibility through 0ms timers, and React flushes the
 * resulting state after `advanceTimersByTime` has already returned — so the
 * follow-on timer (the 350ms bubble lag, or the immediate hide) is scheduled
 * one tick later. Settling twice mirrors what a real frame does.
 */
function settle(ms = BUBBLE_LAG_MS) {
  advance(ms);
  advance(ms);
}

describe('useTeaserBubble with page rules', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    sessionStorage.clear();
    localStorage.clear();
  });
  afterEach(() => jest.useRealTimers());

  it('uses the matched rule’s message and delay, not the default teaser’s', () => {
    const { result } = setup();

    // The default teaser would have fired at 3000ms; the rule fires at 2000ms.
    advance(2000);
    advance(BUBBLE_LAG_MS);

    expect(result.current.showTeaser).toBe(true);
    expect(result.current.teaserMessage).toBe('Questions about a plan?');
    expect(result.current.activeRuleId).toBe('r_pricing');
  });

  it('falls back to the default teaser off the matched path', () => {
    const { result } = setup({ pagePath: '/about' });

    advance(3000);
    advance(BUBBLE_LAG_MS);

    expect(result.current.teaserMessage).toBe('Need a hand?');
    expect(result.current.activeRuleId).toBeNull();
  });

  it('keeps the iframe launcher-sized on a page with nothing to show', () => {
    // teaserConfigured pre-sizes the iframe BEFORE the delay fires, so with no
    // default teaser and no matching rule it must stay false — otherwise the
    // widget reserves a click-blocking strip of the customer's page.
    const { result } = setup({
      widgetConfig: makeConfig({ teaser_message: {} }),
      pagePath: '/about',
    });

    expect(result.current.teaserConfigured).toBe(false);
    advance(10000);
    expect(result.current.teaserExpanded).toBe(false);
    expect(result.current.showTeaser).toBe(false);
  });

  it('shrinks back when an SPA navigates away from a matched page', () => {
    const config = makeConfig({ teaser_message: {} });
    const { result, rerender } = setup({ widgetConfig: config, pagePath: '/pricing' });

    advance(2000);
    advance(BUBBLE_LAG_MS);
    expect(result.current.teaserExpanded).toBe(true);

    rerender({ widgetConfig: config, isCollapsed: true, locale: 'en', pagePath: '/about' });
    advance(BUBBLE_LAG_MS);

    expect(result.current.teaserConfigured).toBe(false);
    expect(result.current.teaserExpanded).toBe(false);
    expect(result.current.showTeaser).toBe(false);
  });

  it('nudges once per session, not once per route change', () => {
    const config = makeConfig({
      teaser_rules: [
        pricingRule,
        { ...pricingRule, id: 'r_rooms', match: { type: 'prefix', value: '/rooms' }, message: { en: 'Room questions?' } },
      ],
    });
    const { result, rerender } = setup({ widgetConfig: config, pagePath: '/pricing' });

    advance(2000);
    advance(BUBBLE_LAG_MS);
    expect(result.current.showTeaser).toBe(true);

    act(() => { result.current.dismissTeaser(); });
    advance(BUBBLE_LAG_MS);
    expect(result.current.showTeaser).toBe(false);

    rerender({ widgetConfig: config, isCollapsed: true, locale: 'en', pagePath: '/rooms' });
    advance(60000);
    expect(result.current.showTeaser).toBe(false);
  });

  it('does not re-fire on a second matching page even without a dismiss', () => {
    const config = makeConfig({
      teaser_rules: [
        pricingRule,
        { ...pricingRule, id: 'r_rooms', match: { type: 'prefix', value: '/rooms' }, message: { en: 'Room questions?' } },
      ],
    });
    const { result, rerender } = setup({ widgetConfig: config, pagePath: '/pricing' });

    advance(2000);
    advance(BUBBLE_LAG_MS);
    expect(result.current.showTeaser).toBe(true);

    rerender({ widgetConfig: config, isCollapsed: true, locale: 'en', pagePath: '/rooms' });
    settle(2000 + BUBBLE_LAG_MS);

    expect(result.current.showTeaser).toBe(false);
  });

  it('remembers a dismissal for the rest of the browsing session', () => {
    const first = setup();
    advance(2000);
    advance(BUBBLE_LAG_MS);
    act(() => { first.result.current.dismissTeaser(); });

    // A fresh mount stands in for the next page load on a multi-page site.
    const second = setup();
    advance(60000);
    expect(second.result.current.showTeaser).toBe(false);
  });

  it('clears the legacy localStorage dismissal flag', () => {
    localStorage.setItem('companin-teaser-dismissed-cfg-rules', '1');
    setup();
    expect(localStorage.getItem('companin-teaser-dismissed-cfg-rules')).toBeNull();
  });

  it('waits for the host page before firing an exit-intent rule', () => {
    const config = makeConfig({
      teaser_message: {},
      teaser_rules: [{ ...pricingRule, id: 'r_exit', on_exit_intent: true, message: { en: 'Before you go…' } }],
    });
    const { result, rerender } = setup({ widgetConfig: config, exitIntentFired: false });

    advance(10000);
    expect(result.current.showTeaser).toBe(false);

    rerender({ widgetConfig: config, isCollapsed: true, locale: 'en', pagePath: '/pricing', exitIntentFired: true });
    settle();

    expect(result.current.showTeaser).toBe(true);
    expect(result.current.teaserMessage).toBe('Before you go…');
  });

  it('survives a config with no rules array at all', () => {
    const { result } = setup({ widgetConfig: makeConfig({ teaser_rules: undefined }) });

    advance(3000);
    advance(BUBBLE_LAG_MS);
    expect(result.current.teaserMessage).toBe('Need a hand?');
  });
});
