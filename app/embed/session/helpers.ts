import { API } from '../../../lib/api';
import { logError } from '../../../lib/logger';
import type { Message } from '../../../types/widget';

/**
 * Storage keys for widget instances.
 */
export function sessionStorageKey(clientId: string, assistantId: string) {
  return `companin-session-${clientId}-${assistantId}`;
}

export function unreadStorageKey(clientId: string, assistantId: string) {
  return `companin-unread-${clientId}-${assistantId}`;
}

export function lastReadStorageKey(clientId: string, assistantId: string) {
  return `companin-lastread-${clientId}-${assistantId}`;
}

export function getVisitorId(clientId: string) {
  const visitorKey = `companin-visitor-${clientId}`;
  let visitorId = localStorage.getItem(visitorKey);
  if (!visitorId) {
    visitorId = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    localStorage.setItem(visitorKey, visitorId);
  }
  return visitorId;
}

export function getPageContext() {
  try {
    const isEmbedded = (() => {
      try {
        return window.top !== window.self;
      } catch {
        return true;
      }
    })();

    if (isEmbedded && document.referrer) {
      try {
        const referrerUrl = new URL(document.referrer);
        return {
          url: document.referrer,
          pathname: referrerUrl.pathname,
          title: null,
          referrer: document.referrer,
        };
      } catch {
        return {
          url: document.referrer,
          pathname: null,
          title: null,
          referrer: document.referrer,
        };
      }
    }

    return {
      url: window.location.href,
      pathname: window.location.pathname,
      title: document.title,
      referrer: document.referrer || null,
    };
  } catch (e) {
    return {
      url: window.location.href,
      pathname: window.location.pathname,
      title: 'Unknown Page',
      referrer: null,
    };
  }
}

export function getStoredSession(sessionStorageKey: string) {
  try {
    const stored = localStorage.getItem(sessionStorageKey);
    if (stored) {
      const data = JSON.parse(stored);
      if (data.expiresAt && new Date(data.expiresAt).getTime() - 5 * 60 * 1000 > Date.now()) {
        return data;
      } else {
        localStorage.removeItem(sessionStorageKey);
      }
    }
  } catch (e) {
    logError((e as Error).message || String(e), { context: 'getStoredSession', sessionStorageKey });
  }
  return null;
}

export function storeSession(sessionStorageKey: string, sessionId: string, expiresAt: string) {
  try {
    localStorage.setItem(sessionStorageKey, JSON.stringify({
      sessionId,
      expiresAt,
      createdAt: new Date().toISOString(),
    }));
  } catch (e) {
    logError((e as Error).message || String(e), { context: 'storeSession', sessionId });
  }
}

export async function loadSessionMessages(sessionId: string, token: string, setMessages: (msgs: Message[]) => void) {
  try {
    const response = await fetch(API.sessionMessages(sessionId), {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to load messages: ${response.status}`);
    }

    const data = await response.json();
    if (data.status === 'success' && Array.isArray(data.data?.messages)) {
      const loaded: Message[] = (data.data.messages as unknown[]).map((msg: any) => ({
        id: msg.id,
        text: msg.content,
        from: msg.sender === 'user' ? 'user' : 'assistant',
        timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
        sources: msg.sources || [],
      }));
      setMessages(loaded);
    }
  } catch (e) {
    logError((e as Error).message || String(e), { action: 'loadSessionMessages', sessionId });
  }
}
