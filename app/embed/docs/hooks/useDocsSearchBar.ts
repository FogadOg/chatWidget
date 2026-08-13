import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Docs-widget equivalent of the chat widget's proactive teaser bubble
 * (see ../../session/hooks/useTeaserBubble): instead of a speech bubble beside
 * a launcher, the docs widget shows a search field pinned to the bottom of the
 * host page. Same config fields — `teaser_message` (the field's placeholder;
 * empty = feature off), `teaser_delay`, `teaser_dismiss_after` — so admins
 * configure it in the same place for both widget types.
 *
 * Difference from the chat teaser: the bar is the docs widget's only entry
 * point, so opening the widget only *hides* it — it comes back when the panel
 * is closed. Only the explicit "×" (or `teaser_dismiss_after`) retires it, and
 * that lasts for the page view only (in-memory, never persisted).
 */
export function useDocsSearchBar({
  configData,
  locale,
  open,
  enabled = true,
}: {
  /** Resolved widget config payload (`widgetConfig.data`), or null before load. */
  configData: Record<string, unknown> | null | undefined;
  locale: string;
  open: boolean;
  /** False suppresses the bar entirely (e.g. hide_on_mobile on a phone). */
  enabled?: boolean;
}) {
  const [delayElapsed, setDelayElapsed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Same locale-resolution priority as the chat teaser: visitor locale → base
  // locale → widget default language → English → first non-empty entry. Blank
  // strings count as missing so an empty entry doesn't block the fallback.
  const rawMessage = configData?.teaser_message as Record<string, string> | undefined;
  const defaultLanguage = typeof configData?.default_language === 'string'
    ? (configData.default_language as string)
    : 'en';
  const placeholder = useMemo<string | null>(() => {
    if (!rawMessage || typeof rawMessage !== 'object') return null;
    const baseLocale = locale.split('-')[0];
    for (const lang of [locale, baseLocale, defaultLanguage, 'en']) {
      const value = rawMessage[lang];
      if (typeof value === 'string' && value.trim()) return value;
    }
    const first = Object.values(rawMessage).find((v) => typeof v === 'string' && v.trim());
    return (first as string | undefined) ?? null;
  }, [rawMessage, locale, defaultLanguage]);

  const delayMs = Math.max(Number(configData?.teaser_delay ?? 3000) || 0, 0);
  const dismissAfterMs = Math.max(Number(configData?.teaser_dismiss_after ?? 0) || 0, 0);

  // Reveal after the configured delay. Deliberately independent of `open` so a
  // visitor who opens and closes the widget gets the bar straight back rather
  // than waiting out the delay again.
  useEffect(() => {
    if (!placeholder || dismissed) return;
    // Always go through a timer (0ms included) so the state change lands in a
    // callback rather than synchronously inside the effect body.
    const timer = setTimeout(() => setDelayElapsed(true), delayMs);
    return () => clearTimeout(timer);
  }, [placeholder, dismissed, delayMs]);

  const visible = enabled && !!placeholder && !dismissed && delayElapsed && !open;

  // Auto-retire after teaser_dismiss_after ms of being on screen (0 = never).
  useEffect(() => {
    if (!visible || dismissAfterMs <= 0) return;
    const timer = setTimeout(() => setDismissed(true), dismissAfterMs);
    return () => clearTimeout(timer);
  }, [visible, dismissAfterMs]);

  const dismiss = useCallback(() => setDismissed(true), []);

  return { visible, placeholder, dismiss };
}
