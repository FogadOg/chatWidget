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
  const requiresExitIntent = !!resolved?.requiresExitIntent;
  // Nudges are budgeted per *trigger class*, not per session. Dwell nudges get
  // one showing between them, so a five-page browse produces one bubble rather
  // than five — but an exit-intent rule keeps its own budget. Sharing one
  // counter made exit intent unreachable in the ordinary setup: it fires by
  // definition after dwell, so the plain teaser (free on every plan, and
  // usually configured) would always spend the budget first.
  const shownTriggersRef = useRef<Set<string>>(new Set());
  // Which nudge is currently on screen, so a spent budget can distinguish
  // "same bubble still showing" from "stale bubble that must go".
  const shownKeyRef = useRef<string | null>(null);

  // Show the teaser after the resolved delay
  useEffect(() => {
    const hideSoon = () => {
      const timer = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(timer);
    };

    if (!teaserMessage || dismissed) return hideSoon();

    const triggerClass = requiresExitIntent ? 'exit_intent' : 'dwell';
    if (shownTriggersRef.current.has(triggerClass)) {
      // Budget spent. Only pull the bubble if what it's showing no longer
      // matches what should be shown here — yanking a bubble the visitor is
      // reading (a locale switch, a config refetch) would be gratuitous.
      return ruleKey === shownKeyRef.current ? undefined : hideSoon();
    }

    const delayMs = resolved?.delayMs ?? 3000;
    const timer = setTimeout(() => {
      shownTriggersRef.current.add(triggerClass);
      shownKeyRef.current = ruleKey;
      setVisible(true);
    }, Math.max(delayMs, 0));
    return () => clearTimeout(timer);
  // ruleKey re-arms the timer when the matched rule changes; delayMs is a
  // primitive read from the same resolution.
  }, [teaserMessage, ruleKey, resolved?.delayMs, dismissed, requiresExitIntent]);

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
