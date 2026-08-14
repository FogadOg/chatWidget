// Helper utilities extracted from DocsClient for testing.
//
// Storage goes through lib/sessionStorage — the same consent-gated layer the
// chat widget uses. Writing to localStorage directly (as this file used to)
// persisted visitor and session IDs even when the visitor had not granted
// storage consent; the shared layer keeps them in memory until they do.

import {
  clearStoredSessionByKey,
  getOrCreateVisitorId,
  getStoredSessionByKey,
  storeSessionByKey,
} from '../../../lib/sessionStorage';

export const getSessionStorageKey = (clientId: string, agentId: string) => {
  return `companin-docs-session-${clientId}-${agentId}`;
}

export const getVisitorKey = (clientId: string) => `companin-visitor-${clientId}`;

export const getVisitorId = (clientId: string) => {
  return getOrCreateVisitorId(getVisitorKey(clientId), 'docs-widget');
}

export const getPageContext = (win: any = window, doc: any = document) => {
  try {
    return {
      url: win.location.href,
      pathname: win.location.pathname,
      title: doc.title,
      referrer: doc.referrer || null,
    };
  } catch (e) {
    return {
      url: (win && win.location && win.location.href) || '',
      pathname: (win && win.location && win.location.pathname) || '',
      title: 'Unknown Page',
      referrer: null,
    };
  }
}

export const getStoredSession = (clientId: string, agentId: string) => {
  return getStoredSessionByKey(getSessionStorageKey(clientId, agentId));
}

export const storeSession = (clientId: string, agentId: string, sessionId: string, expiresAt: string) => {
  storeSessionByKey(getSessionStorageKey(clientId, agentId), sessionId, expiresAt);
}

/** Forget the stored session — used by the host API's reset(). */
export const clearStoredSession = (clientId: string, agentId: string) => {
  clearStoredSessionByKey(getSessionStorageKey(clientId, agentId));
}

export const getLocalizedText = (textObj: { [lang: string]: string } | undefined, locale?: string): string => {
  if (!textObj) return '';
  if (locale && textObj[locale]) return textObj[locale];
  if (textObj['en']) return textObj['en'];
  const values = Object.values(textObj);
  return values.length > 0 ? values[0] : '';
}

export const scrollToBottom = (conversationEndElem: HTMLElement | null, scrollAreaElem: HTMLElement | null) => {
  if (conversationEndElem) {
    try { conversationEndElem.scrollIntoView({ behavior: 'smooth', block: 'end' }); } catch (e) { }
  }
  if (scrollAreaElem) {
    const viewport = scrollAreaElem.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (viewport) {
      try { viewport.scrollTop = viewport.scrollHeight; } catch (e) { }
    }
  }
}
