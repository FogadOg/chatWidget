// Centralized embed-related event names and storage key prefixes
// Centralized embed-related event names and storage key helpers
export const EMBED_EVENTS = {
  INIT_CONFIG: 'WIDGET_INIT_CONFIG',
  RESIZE: 'WIDGET_RESIZE',
  MINIMIZE: 'WIDGET_MINIMIZE',
  RESTORE: 'WIDGET_RESTORE',
  ERROR: 'WIDGET_ERROR',
  // Messages from iframe to host
  MESSAGE: 'WIDGET_MESSAGE',
  RESPONSE: 'WIDGET_RESPONSE',
  AUTH_FAILURE: 'WIDGET_AUTH_FAILURE',
} as const;

export const STORAGE_KEYS = {
  sessionPrefix: (clientId: string, assistantId: string) => `companin-session-${clientId}-${assistantId}`,
  unreadPrefix: (clientId: string, assistantId: string) => `companin-unread-${clientId}-${assistantId}`,
  lastReadPrefix: (clientId: string, assistantId: string) => `companin-lastread-${clientId}-${assistantId}`,
  visitorPrefix: (clientId: string) => `companin-visitor-${clientId}`,
};

/**
 * Helper to get safest postMessage target origin.
 * Prefer explicit origin (provided by host page), otherwise fallback to '*'.
 */
export const targetOrigin = (explicit?: string) => explicit || '*';
