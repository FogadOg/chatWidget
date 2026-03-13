import { API } from '../../../lib/api';
import { logError } from '../../../lib/logger';
import { getOrCreateVisitorId, getStoredSessionByKey, storeSessionByKey } from '../../../lib/sessionStorage';
import type { Message, SourceData } from '../../../types/widget';

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
  return getOrCreateVisitorId(visitorKey, 'widget');
}

export function getPageContext(
  windowObj: Window = window,
  documentObj: Document = document
) {
  try {
    const isEmbedded = (() => {
      try {
        return windowObj.top !== windowObj.self;
      } catch {
        return true;
      }
    })();

    if (isEmbedded && documentObj.referrer) {
      try {
        const referrerUrl = new URL(documentObj.referrer);
        return {
          url: documentObj.referrer,
          pathname: referrerUrl.pathname,
          title: null,
          referrer: documentObj.referrer,
        };
      } catch {
        return {
          url: documentObj.referrer,
          pathname: null,
          title: null,
          referrer: documentObj.referrer,
        };
      }
    }

    return {
      url: windowObj.location.href,
      pathname: windowObj.location.pathname,
      title: documentObj.title,
      referrer: documentObj.referrer || null,
    };
  } catch {
    return {
      url: windowObj.location.href,
      pathname: windowObj.location.pathname,
      title: 'Unknown Page',
      referrer: null,
    };
  }
}

export function getStoredSession(sessionStorageKey: string) {
  return getStoredSessionByKey(sessionStorageKey);
}

export function storeSession(sessionStorageKey: string, sessionId: string, expiresAt: string) {
  storeSessionByKey(sessionStorageKey, sessionId, expiresAt);
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
      type ApiMessage = {
        id: string;
        content: string;
        sender: 'user' | 'assistant';
        created_at?: string;
        sources?: unknown[];
      };
      const loaded: Message[] = (data.data.messages as unknown[]).map((msg: unknown) => {
        const m = msg as ApiMessage;
        return {
          id: m.id,
          text: m.content,
          from: m.sender,
          timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
          sources: (m.sources as SourceData[]) || [],
        };
      });
      setMessages(loaded);
    }
  } catch (_e) {
    logError((_e as Error).message || String(_e), { action: 'loadSessionMessages', sessionId });
  }
}
