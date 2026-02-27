/**
 * Centralized API utility for consistent API endpoint construction
 */

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

if (!BASE_URL) {
  console.warn('NEXT_PUBLIC_API_BASE_URL is not defined. API calls may fail.');
}

/**
 * Get the full API base URL
 */
export const getApiBaseUrl = (): string => {
  return BASE_URL || '';
};

/**
 * Get API v1 base URL
 */
export const getApiV1BaseUrl = (): string => {
  return `${getApiBaseUrl()}/api/v1`;
};

/**
 * Construct full API endpoint URLs
 */
export const API = {
  // Auth endpoints
  widgetToken: () => `${getApiV1BaseUrl()}/auth/widget-token`,

  // Session endpoints
  sessions: () => `${getApiV1BaseUrl()}/sessions/`,
  session: (sessionId: string) => `${getApiV1BaseUrl()}/sessions/${sessionId}`,
  sessionMessages: (sessionId: string) => `${getApiV1BaseUrl()}/sessions/${sessionId}/messages`,
  sessionFeedback: (sessionId: string) => `${getApiV1BaseUrl()}/sessions/${sessionId}/feedback`,

  // Message endpoints
  messageFeedback: (messageId: string) => `${getApiV1BaseUrl()}/message/${messageId}/feedback`,

  // Assistant endpoints
  assistant: (assistantId: string) => `${getApiV1BaseUrl()}/assistants/${assistantId}`,

  // Config endpoints
  widgetConfig: (configId: string) => `${getApiBaseUrl()}/widget-config/${configId}`,
} as const;

/**
 * Check if API base URL is configured
 */
export const isApiConfigured = (): boolean => {
  return Boolean(BASE_URL && !BASE_URL.includes('undefined'));
};

/**
 * Returns the X-Embed-Origin header so the backend enforces the host app's
 * origin rather than the widget iframe's own origin.
 *
 * @param explicitOrigin - The parent page's origin passed in via URL param by
 *   widget.js (window.location.origin on the host page). When provided this is
 *   always used. Falls back to window.location.origin for non-iframe usage.
 */
export const embedOriginHeader = (explicitOrigin?: string): Record<string, string> => {
  if (explicitOrigin) {
    return { 'X-Embed-Origin': explicitOrigin };
  }

  if (typeof window !== 'undefined' && window.location && window.location.origin) {
    return { 'X-Embed-Origin': window.location.origin };
  }
  return {};
};
