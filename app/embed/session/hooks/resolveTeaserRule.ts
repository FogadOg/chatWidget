import type { TeaserRule, WidgetConfig } from '../../../../types/widget';

/**
 * The nudge the widget should show right now: either a page-targeted rule or
 * the org's default teaser.
 *
 * Kept pure and separate from `useTeaserBubble` so the matching semantics —
 * which are the whole feature — can be tested without timers or React.
 */
export type ResolvedTeaser = {
  /** Locale-resolved text. Never an empty string. */
  message: string;
  delayMs: number;
  dismissAfterMs: number;
  /** `null` for the default teaser; a rule id when a page rule matched. */
  ruleId: string | null;
  action: 'bubble' | 'open';
  requiresExitIntent: boolean;
};

/**
 * Locale fallback: exact locale → base locale → widget default language →
 * English → first non-empty entry. Blank strings count as missing so a
 * half-translated entry doesn't block the fallback (and never renders an empty
 * bubble). This mirrors `getLocalizedText` in EmbedClient.
 */
export function resolveLocalizedMessage(
  message: Record<string, string> | undefined | null,
  locale: string,
  defaultLanguage?: string,
): string | null {
  if (!message || typeof message !== 'object') return null;
  const baseLocale = (locale || '').split('-')[0];
  const candidates = [locale, baseLocale, defaultLanguage || 'en', 'en'];
  for (const lang of candidates) {
    const value = message[lang];
    if (typeof value === 'string' && value.trim()) return value;
  }
  const first = Object.values(message).find((v) => typeof v === 'string' && v.trim());
  return first ?? null;
}

/** Whether a rule's match clause applies to `path`. */
export function matchesPath(rule: TeaserRule, path: string): boolean {
  const match = rule?.match;
  if (!match || typeof match.value !== 'string' || !match.value) return false;
  // No path means the loader is too old to tell us where the visitor is. Page
  // rules can't be evaluated, so they all decline and the default teaser runs —
  // never a nudge fired at the wrong page.
  if (typeof path !== 'string' || !path) return false;

  switch (match.type) {
    case 'prefix':
      return path.startsWith(match.value);
    case 'contains':
      return path.includes(match.value);
    case 'regex':
      try {
        // Validated and length-capped server-side; the try/catch covers configs
        // injected by a host page via WIDGET_INIT_CONFIG.
        return new RegExp(match.value).test(path);
      } catch {
        return false;
      }
    default:
      return false;
  }
}

/**
 * First rule that both matches the path and has a usable message wins.
 *
 * A rule that matches but is untranslated for this visitor falls through to the
 * next rule rather than winning and rendering nothing — otherwise adding a rule
 * would silently blank a nudge that works today for some locales.
 *
 * Returns `null` when nothing applies, which is the signal to keep the iframe
 * launcher-sized.
 */
export function resolveTeaserRule({
  widgetConfig,
  pagePath,
  locale,
  exitIntentFired = false,
}: {
  widgetConfig: WidgetConfig | null;
  pagePath: string | null | undefined;
  locale: string;
  exitIntentFired?: boolean;
}): ResolvedTeaser | null {
  if (!widgetConfig) return null;
  const defaultLanguage = widgetConfig.default_language;
  const rules = Array.isArray(widgetConfig.teaser_rules) ? widgetConfig.teaser_rules : [];
  const path = typeof pagePath === 'string' ? pagePath : '';

  for (const rule of rules) {
    if (!rule || typeof rule !== 'object') continue;
    if (!matchesPath(rule, path)) continue;
    // An exit-intent rule waits for the host page to report the signal. Older
    // loaders never send it, so such rules simply never fire there.
    if (rule.on_exit_intent && !exitIntentFired) continue;
    const message = resolveLocalizedMessage(rule.message, locale, defaultLanguage);
    if (!message) continue;

    return {
      message,
      // An exit-intent nudge has already waited for its trigger; delaying it
      // again would land after the visitor is gone.
      delayMs: rule.on_exit_intent ? 0 : Math.max(0, rule.delay_ms ?? 3000),
      dismissAfterMs: Math.max(0, rule.dismiss_after_ms ?? 0),
      ruleId: typeof rule.id === 'string' ? rule.id : null,
      action: rule.action === 'open' ? 'open' : 'bubble',
      requiresExitIntent: !!rule.on_exit_intent,
    };
  }

  const fallback = resolveLocalizedMessage(widgetConfig.teaser_message, locale, defaultLanguage);
  if (!fallback) return null;

  return {
    message: fallback,
    delayMs: Math.max(0, widgetConfig.teaser_delay ?? 3000),
    dismissAfterMs: Math.max(0, widgetConfig.teaser_dismiss_after ?? 0),
    ruleId: null,
    action: 'bubble',
    requiresExitIntent: false,
  };
}
