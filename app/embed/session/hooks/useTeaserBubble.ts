import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import type { WidgetConfig } from '../../../../types/widget';
import { resolveTeaserRule } from './resolveTeaserRule';

// Historic versions persisted dismissal here; cleared on load so the teaser
// isn't still suppressed for visitors who dismissed it under the old scheme.
const DISMISSED_PREFIX = 'companin-teaser-dismissed-';
// Dismissal is remembered for the browsing session, not just the page view:
// with page rules a visitor moving between pages would otherwise be nudged
// again on every navigation after having already waved one away.
const SESSION_DISMISSED_PREFIX = 'companin-teaser-session-dismissed-';

function readSessionDismissed(key: string | null): boolean {
  if (!key) return false;
  try {
    return sessionStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function useTeaserBubble({
  widgetConfig,
  isCollapsed,
  locale,
  pagePath,
  exitIntentFired = false,
}: {
  widgetConfig: WidgetConfig | null;
  isCollapsed: boolean;
  locale: string;
  /**
   * Host page path, forwarded by the loader as `pagePath`. Undefined on loaders
   * too old to send it — page rules then never match and the default teaser
   * runs, which is the intended degradation.
   */
  pagePath?: string | null;
  /** Set once the host page reports exit intent (newer loaders only). */
  exitIntentFired?: boolean;
}) {
  const [visible, setVisible] = useState(false);
  // Lags `visible` by the parent iframe's resize transition (300ms) so the
  // bubble never renders into a viewport that is still growing around it.
  const [bubbleShown, setBubbleShown] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  const storageKey = widgetConfig?.id ? `${DISMISSED_PREFIX}${widgetConfig.id}` : null;
  const sessionKey = widgetConfig?.id ? `${SESSION_DISMISSED_PREFIX}${widgetConfig.id}` : null;

  // Clean up the legacy persisted-dismissal flag from older widget versions,
  // and adopt a dismissal the visitor already made earlier this session.
  useEffect(() => {
    if (storageKey) {
      try { localStorage.removeItem(storageKey); } catch {}
    }
    if (readSessionDismissed(sessionKey)) setDismissed(true);
  }, [storageKey, sessionKey]);

  const resolved = useMemo(
    () => resolveTeaserRule({ widgetConfig, pagePath, locale, exitIntentFired }),
    [widgetConfig, pagePath, locale, exitIntentFired],
  );

  const teaserMessage = resolved?.message ?? null;
  const activeRuleId = resolved?.ruleId ?? null;

  // Re-arm the delay when the resolved nudge changes — an SPA navigating from a
  // matched page to a different one gets that page's rule, not a stale timer.
  const ruleKey = resolved ? `${activeRuleId ?? '__default__'}:${teaserMessage}` : null;
  // Once a nudge has actually been shown, later navigations must not show
  // another one. Without this a five-page browse produces five bubbles.
  const alreadyShownRef = useRef(false);

  // Show the teaser after the resolved delay
  useEffect(() => {
    if (!teaserMessage || dismissed || alreadyShownRef.current) {
      const timer = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(timer);
    }
    const delayMs = resolved?.delayMs ?? 3000;
    const timer = setTimeout(() => {
      alreadyShownRef.current = true;
      setVisible(true);
    }, Math.max(delayMs, 0));
    return () => clearTimeout(timer);
  // ruleKey re-arms the timer when the matched rule changes; delayMs is a
  // primitive read from the same resolution.
  }, [teaserMessage, ruleKey, resolved?.delayMs, dismissed]);

  // Render the bubble only after the iframe has finished expanding: `visible`
  // triggers the resize; the bubble follows once the parent's 0.3s CSS
  // transition has run. Hiding is immediate (shrink happens after removal).
  useEffect(() => {
    if (!visible) {
      const timer = setTimeout(() => setBubbleShown(false), 0);
      return () => clearTimeout(timer);
    }
    const timer = setTimeout(() => setBubbleShown(true), 350);
    return () => clearTimeout(timer);
  }, [visible]);

  // Hide when the widget panel is opened
  useEffect(() => {
    if (!isCollapsed) {
      const timer = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  // Auto-dismiss after the resolved dismiss-after window (0 = never)
  useEffect(() => {
    if (!visible) return;
    const dismissAfter = resolved?.dismissAfterMs ?? 0;
    if (dismissAfter <= 0) return;
    const timer = setTimeout(() => {
      setVisible(false);
      setDismissed(true);
    }, dismissAfter);
    return () => clearTimeout(timer);
  }, [visible, resolved?.dismissAfterMs]);

  const dismissTeaser = useCallback(() => {
    setVisible(false);
    setDismissed(true);
    if (sessionKey) {
      try { sessionStorage.setItem(sessionKey, '1'); } catch {}
    }
  }, [sessionKey]);

  return {
    showTeaser: bubbleShown && isCollapsed && !!teaserMessage,
    // True while the iframe must be sized to fit the bubble — from the moment
    // the teaser fires until it is dismissed/hidden. While false the iframe
    // stays button-sized so it doesn't cover the host page.
    teaserExpanded: visible && isCollapsed && !!teaserMessage,
    teaserConfigured: !!teaserMessage,
    teaserMessage,
    /** Rule that produced the current nudge (null = the org's default teaser). */
    activeRuleId,
    dismissTeaser,
  };
}
