import { logError } from './logger';

const SESSION_EXPIRY_BUFFER_MS = 30 * 1000;

const createRandomId = (): string => {
  const c = (globalThis as unknown as { crypto?: Crypto }).crypto;
  if (typeof c !== 'undefined' && typeof (c as { randomUUID?: () => string }).randomUUID === 'function') {
    return (c as { randomUUID: () => string }).randomUUID();
  }

  if (typeof c !== 'undefined' && typeof (c as Crypto).getRandomValues === 'function') {
    const bytes = new Uint8Array(16);
    (c as Crypto).getRandomValues(bytes as Uint8Array);
    return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
  }

  throw new Error('Secure random generation is unavailable in this environment');
};

export const getOrCreateVisitorId = (storageKey: string, prefix: string = 'widget'): string => {
  try {
    const storedVisitorId = localStorage.getItem(storageKey);
    if (storedVisitorId) {
      return storedVisitorId;
    }

    const visitorId = `${prefix}-${createRandomId()}`;
    localStorage.setItem(storageKey, visitorId);
    return visitorId;
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error), {
      context: 'getOrCreateVisitorId',
      storageKey,
    });
    try {
      // Generate a non-colliding fallback id when localStorage is unavailable.
      // Use secure random where available; fall back to timestamp/random.
      const randomPart = typeof createRandomId === 'function'
        ? createRandomId()
        : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
      return `${prefix}-fallback-${randomPart}`;
    } catch {
      return `${prefix}-fallback-${Date.now().toString(36)}`;
    }
  }
};

export type StoredSession = {
  sessionId: string;
  expiresAt?: string;
  createdAt?: string;
};

export const getStoredSessionByKey = (storageKey: string): StoredSession | null => {
  try {
    const stored = localStorage.getItem(storageKey);
    if (!stored) return null;

    const data = JSON.parse(stored) as StoredSession;
    if (data.expiresAt && new Date(data.expiresAt).getTime() - SESSION_EXPIRY_BUFFER_MS > Date.now()) {
      return data;
    }

    localStorage.removeItem(storageKey);
    return null;
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error), {
      context: 'getStoredSessionByKey',
      storageKey,
    });
    return null;
  }
};

export const storeSessionByKey = (storageKey: string, sessionId: string, expiresAt: string) => {
  try {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        sessionId,
        expiresAt,
        createdAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    logError(error instanceof Error ? error.message : String(error), {
      context: 'storeSessionByKey',
      sessionId,
      storageKey,
    });
  }
};
