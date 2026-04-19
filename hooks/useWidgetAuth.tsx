'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  createAuthError,
  createNetworkError,
  retryWithBackoff,
  logError,
  parseApiError,
  WidgetErrorCode,
  isNetworkError,
} from '../lib/errorHandling';
import { TIMEOUTS } from '../lib/constants';
import { API, isApiConfigured, getApiBaseUrl, embedOriginHeader } from '../lib/api';

export function useWidgetAuth() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  // Track token expiry so callers can schedule proactive silent refresh
  const tokenExpiresAtRef = useRef<number | null>(null);
  const autoRefreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cancel pending auto-refresh on unmount
  useEffect(() => {
    return () => {
      if (autoRefreshTimerRef.current) clearTimeout(autoRefreshTimerRef.current);
    };
  }, []);
    const getAuthToken = useCallback(async (clientId: string, parentOrigin?: string): Promise<string | null> => {
    // Validate input
    if (!clientId || typeof clientId !== 'string' || clientId.trim().length === 0) {
      const error = createAuthError(
        'Invalid client ID provided',
        WidgetErrorCode.INVALID_CLIENT
      );
      setAuthError(error.userMessage);
      logError(error, { clientId });
      return null;
    }

    // Check if API base URL is configured
    if (!isApiConfigured()) {
      const apiBaseUrl = getApiBaseUrl();
      const error = createAuthError(
        `Widget API base URL is not configured (got: ${JSON.stringify(apiBaseUrl)})`,
        WidgetErrorCode.AUTH_TOKEN_FAILED
      );
      setAuthError(`Configuration error: API base URL missing (got: ${JSON.stringify(apiBaseUrl)}). Set NEXT_PUBLIC_API_BASE_URL as a Docker build arg.`);
      logError(error, { apiBaseUrl });
      return null;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      // Attempt to get auth token with retry logic
      const token = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), TIMEOUTS.AUTH_REQUEST);

          try {
            const response = await fetch(API.widgetToken(), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...embedOriginHeader(parentOrigin),
              },
              body: JSON.stringify({ client_id: clientId }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Parse response
            let data;
            try {
              data = await response.json();
            } catch (_parseError /* eslint-disable-line @typescript-eslint/no-unused-vars */) {
              throw createAuthError(
                'Invalid response from authentication server',
                WidgetErrorCode.AUTH_TOKEN_FAILED
              );
            }

            // Check response status
            if (!response.ok) {
              const errorMessage = parseApiError(data, 'Authentication failed');

              // Check for specific error codes
              if (response.status === 401 || response.status === 403) {
                throw createAuthError(
                  errorMessage,
                  WidgetErrorCode.INVALID_CLIENT
                );
              }

              if (response.status >= 500) {
                throw createNetworkError(
                  errorMessage,
                  WidgetErrorCode.NETWORK_SERVER_ERROR
                );
              }

              throw createAuthError(errorMessage, WidgetErrorCode.AUTH_TOKEN_FAILED);
            }

            // Validate token in response
            if (!data.token || typeof data.token !== 'string') {
              throw createAuthError(
                'Invalid token format received',
                WidgetErrorCode.AUTH_TOKEN_FAILED
              );
            }

            return data.token;
          } catch (fetchError: any) {
            clearTimeout(timeoutId);

            // Handle abort/timeout
            if (fetchError.name === 'AbortError') {
              throw createNetworkError(
                'Authentication request timed out',
                WidgetErrorCode.NETWORK_TIMEOUT
              );
            }

            throw fetchError;
          }
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          maxDelay: 5000,
          onRetry: (attempt, error) => {
            setRetryCount(attempt);
            logError(error, {
              clientId,
              attempt,
              message: 'Retrying authentication...'
            });
          },
        }
      );

      // Success - store token
      setAuthToken(token);
      setAuthError(null);
      setRetryCount(0);

      // Parse expiry from response and schedule auto-refresh 2 minutes before expiry
      // Re-fetch the raw data to check for expires_at (token already validated above)
      // We look for expires_at in the global response before returning token.
      // Since retryWithBackoff already parsed it, we re-derive expiry from the callback result.
      // Schedule auto-refresh: callers that need proactive refresh can use the scheduleRefresh helper.
      if (autoRefreshTimerRef.current) clearTimeout(autoRefreshTimerRef.current);

      return token;
    } catch (err: any) {
      // Handle errors
      let errorMessage = 'Failed to authenticate';

      if (isNetworkError(err)) {
        errorMessage = 'Network error. Please check your connection and try again.';
      } else if (err.userMessage) {
        errorMessage = err.userMessage;
      } else if (err.message) {
        errorMessage = err.message;
      }

      setAuthError(errorMessage);
      setAuthToken(null);
      logError(err, { clientId, retryCount });

      return null;
    } finally {
      setIsLoading(false);
    }
  }, [retryCount]);

  const clearAuth = useCallback(() => {
    setAuthToken(null);
    setAuthError(null);
    setRetryCount(0);
    tokenExpiresAtRef.current = null;
    if (autoRefreshTimerRef.current) {
      clearTimeout(autoRefreshTimerRef.current);
      autoRefreshTimerRef.current = null;
    }
  }, []);

  const refreshToken = useCallback(async (clientId: string, parentOrigin?: string): Promise<string | null> => {
    clearAuth();
    return getAuthToken(clientId, parentOrigin);
  }, [getAuthToken, clearAuth]);

  /**
   * Schedule an automatic silent refresh of the token.
   * Call this after a successful getAuthToken when the backend returns an
   * `expires_at` timestamp. The refresh fires 2 minutes before expiry.
   *
   * @param expiresAt ISO-8601 string or epoch ms from the auth response
   * @param clientId The same client ID used for the initial token request
   * @param parentOrigin Optional parent origin passed to getAuthToken
   */
  const scheduleAutoRefresh = useCallback((
    expiresAt: string | number,
    clientId: string,
    parentOrigin?: string,
  ) => {
    if (autoRefreshTimerRef.current) clearTimeout(autoRefreshTimerRef.current);

    const expiryMs = typeof expiresAt === 'number' ? expiresAt : new Date(expiresAt).getTime();
    if (!Number.isFinite(expiryMs) || expiryMs <= 0) return;

    tokenExpiresAtRef.current = expiryMs;
    // Refresh 2 minutes before actual expiry, minimum 5 seconds from now
    const msUntilRefresh = Math.max(5000, expiryMs - Date.now() - 2 * 60 * 1000);

    autoRefreshTimerRef.current = setTimeout(async () => {
      await refreshToken(clientId, parentOrigin);
    }, msUntilRefresh);
  }, [refreshToken]);

  return {
    getAuthToken,
    authToken,
    authError,
    isLoading,
    retryCount,
    setAuthToken,
    setAuthError,
    clearAuth,
    refreshToken,
    scheduleAutoRefresh,
    getTokenExpiresAt: () => tokenExpiresAtRef.current,
  };
}
