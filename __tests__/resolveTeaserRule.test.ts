/**
 * Page-rule resolution for the teaser bubble.
 *
 * The rules of the road, all of which have a failure mode worth naming:
 *  - first match wins, so stored order is the semantics;
 *  - a matched-but-untranslated rule falls THROUGH rather than winning and
 *    rendering nothing (otherwise adding a rule silently blanks a nudge that
 *    works today for some locales);
 *  - no rules, or no path, means the org's default teaser — never silence.
 */

import {
  resolveTeaserRule,
  matchesPath,
  resolveLocalizedMessage,
} from '../app/embed/session/hooks/resolveTeaserRule';
import type { TeaserRule, WidgetConfig } from '../types/widget';

function rule(overrides: Partial<TeaserRule> = {}): TeaserRule {
  return {
    id: 'r_1',
    match: { type: 'prefix', value: '/pricing' },
    message: { en: 'Questions about a plan?' },
    delay_ms: 40000,
    dismiss_after_ms: 0,
    action: 'bubble',
    on_exit_intent: false,
    ...overrides,
  };
}

function config(overrides: Partial<WidgetConfig> = {}): WidgetConfig {
  return {
    id: 'cfg-1',
    teaser_message: { en: 'Need a hand?' },
    teaser_delay: 3000,
    teaser_dismiss_after: 0,
    ...overrides,
  } as unknown as WidgetConfig;
}

const resolve = (widgetConfig: WidgetConfig | null, pagePath?: string | null, locale = 'en', exitIntentFired = false) =>
  resolveTeaserRule({ widgetConfig, pagePath, locale, exitIntentFired });

describe('matchesPath', () => {
  it.each([
    ['prefix', '/pricing', '/pricing/enterprise', true],
    ['prefix', '/pricing', '/product/pricing', false],
    ['contains', 'pricing', '/en/pricing/plans', true],
    ['contains', 'pricing', '/plans', false],
    ['regex', '^/rooms/\\d+$', '/rooms/42', true],
    ['regex', '^/rooms/\\d+$', '/rooms/deluxe', false],
  ])('%s "%s" vs %s', (type, value, path, expected) => {
    expect(matchesPath(rule({ match: { type: type as 'prefix', value } }), path)).toBe(expected);
  });

  it('declines an unmatchable rule instead of throwing', () => {
    expect(matchesPath(rule({ match: { type: 'regex', value: '(' } }), '/x')).toBe(false);
    expect(matchesPath(rule({ match: { type: 'nope' as 'prefix', value: '/x' } }), '/x')).toBe(false);
    expect(matchesPath(rule({ match: { type: 'prefix', value: '' } }), '/x')).toBe(false);
  });

  it('declines every rule when the path is unknown', () => {
    // Old loaders don't report a path. Better no nudge than the wrong page's.
    expect(matchesPath(rule(), '')).toBe(false);
    expect(matchesPath(rule(), undefined as unknown as string)).toBe(false);
  });
});

describe('resolveLocalizedMessage', () => {
  it('walks locale → base → default language → en → first non-empty', () => {
    expect(resolveLocalizedMessage({ 'pt-BR': 'A', pt: 'B', en: 'C' }, 'pt-BR')).toBe('A');
    expect(resolveLocalizedMessage({ pt: 'B', en: 'C' }, 'pt-BR')).toBe('B');
    expect(resolveLocalizedMessage({ de: 'D', en: 'C' }, 'fr', 'de')).toBe('D');
    expect(resolveLocalizedMessage({ en: 'C' }, 'fr')).toBe('C');
    expect(resolveLocalizedMessage({ nl: 'E' }, 'fr')).toBe('E');
  });

  it('treats blank entries as missing', () => {
    expect(resolveLocalizedMessage({ fr: '  ', en: 'C' }, 'fr')).toBe('C');
    expect(resolveLocalizedMessage({ fr: '' }, 'fr')).toBeNull();
    expect(resolveLocalizedMessage({}, 'fr')).toBeNull();
    expect(resolveLocalizedMessage(undefined, 'fr')).toBeNull();
  });
});

describe('resolveTeaserRule', () => {
  describe('falling back to the default teaser', () => {
    it('with no rules configured', () => {
      const resolved = resolve(config(), '/pricing');
      expect(resolved).toEqual({
        message: 'Need a hand?',
        delayMs: 3000,
        dismissAfterMs: 0,
        ruleId: null,
        action: 'bubble',
        requiresExitIntent: false,
      });
    });

    it('when no rule matches the path', () => {
      const resolved = resolve(config({ teaser_rules: [rule()] }), '/about');
      expect(resolved?.ruleId).toBeNull();
      expect(resolved?.message).toBe('Need a hand?');
    });

    it('when the loader reports no path at all', () => {
      const resolved = resolve(config({ teaser_rules: [rule()] }), undefined);
      expect(resolved?.ruleId).toBeNull();
      expect(resolved?.message).toBe('Need a hand?');
    });

    it('when the plan stripped the rules server-side', () => {
      const resolved = resolve(config({ teaser_rules: [] }), '/pricing');
      expect(resolved?.message).toBe('Need a hand?');
    });
  });

  describe('matching', () => {
    it('uses the matched rule’s own message, delay and dismissal', () => {
      const resolved = resolve(
        config({ teaser_rules: [rule({ dismiss_after_ms: 15000 })] }),
        '/pricing',
      );
      expect(resolved).toEqual({
        message: 'Questions about a plan?',
        delayMs: 40000,
        dismissAfterMs: 15000,
        ruleId: 'r_1',
        action: 'bubble',
        requiresExitIntent: false,
      });
    });

    it('takes the first match, not the most specific one', () => {
      const resolved = resolve(
        config({
          teaser_rules: [
            rule({ id: 'r_broad', match: { type: 'prefix', value: '/pricing' }, message: { en: 'Broad' } }),
            rule({ id: 'r_narrow', match: { type: 'prefix', value: '/pricing/enterprise' }, message: { en: 'Narrow' } }),
          ],
        }),
        '/pricing/enterprise',
      );
      expect(resolved?.ruleId).toBe('r_broad');
    });

    it('defaults a rule’s delay to 3s and clamps negatives', () => {
      const noDelay = resolve(config({ teaser_rules: [rule({ delay_ms: undefined })] }), '/pricing');
      expect(noDelay?.delayMs).toBe(3000);

      const negative = resolve(config({ teaser_rules: [rule({ delay_ms: -5 })] }), '/pricing');
      expect(negative?.delayMs).toBe(0);
    });

    it('skips malformed entries without discarding the rest of the list', () => {
      const resolved = resolve(
        config({
          teaser_rules: [
            null as unknown as TeaserRule,
            rule({ id: 'r_good', message: { en: 'Still here' } }),
          ],
        }),
        '/pricing',
      );
      expect(resolved?.ruleId).toBe('r_good');
    });
  });

  describe('untranslated rules', () => {
    it('falls through to the next matching rule', () => {
      const resolved = resolve(
        config({
          teaser_rules: [
            rule({ id: 'r_blank', message: { fr: '   ' } }),
            rule({ id: 'r_ok', message: { fr: 'Des questions ?' } }),
          ],
        }),
        '/pricing',
        'fr',
      );
      expect(resolved?.ruleId).toBe('r_ok');
    });

    it('falls back to the default teaser rather than rendering nothing', () => {
      const resolved = resolve(
        config({
          teaser_message: { fr: 'Besoin d’aide ?' },
          teaser_rules: [rule({ message: { en: '' } })],
        }),
        '/pricing',
        'fr',
      );
      expect(resolved?.message).toBe('Besoin d’aide ?');
      expect(resolved?.ruleId).toBeNull();
    });

    it('still uses the rule when only another locale is filled in', () => {
      // The rule resolves via the fallback chain — untranslated means *nothing*
      // usable, not "missing this exact locale".
      const resolved = resolve(config({ teaser_rules: [rule({ message: { en: 'Plans?' } })] }), '/pricing', 'fr');
      expect(resolved?.ruleId).toBe('r_1');
      expect(resolved?.message).toBe('Plans?');
    });
  });

  describe('exit intent', () => {
    const exitRule = rule({ id: 'r_exit', on_exit_intent: true, message: { en: 'Before you go…' } });

    it('is skipped until the host page reports the signal', () => {
      const resolved = resolve(config({ teaser_rules: [exitRule] }), '/pricing', 'en', false);
      expect(resolved?.ruleId).toBeNull();
    });

    it('fires immediately once reported — the visitor is already leaving', () => {
      const resolved = resolve(config({ teaser_rules: [exitRule] }), '/pricing', 'en', true);
      expect(resolved?.ruleId).toBe('r_exit');
      expect(resolved?.delayMs).toBe(0);
      expect(resolved?.requiresExitIntent).toBe(true);
    });
  });

  describe('nothing to show', () => {
    it('returns null with no config', () => {
      expect(resolve(null, '/pricing')).toBeNull();
    });

    it('returns null when neither a rule nor the default resolves', () => {
      expect(resolve(config({ teaser_message: {}, teaser_rules: [] }), '/pricing')).toBeNull();
    });
  });
});
