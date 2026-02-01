'use client';

import { useState, useCallback } from 'react';
import {
  createAuthError,
  createNetworkError,
  retryWithBackoff,
  logError,
  parseApiError,
  WidgetErrorCode,
  isNetworkError,
} from '../lib/errorHandling';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1`;

export function useWidgetAuth() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);

  const getAuthToken = useCallback(async (clientId: string): Promise<string | null> => {
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
    if (!API_BASE_URL || API_BASE_URL.includes('undefined')) {
      const error = createAuthError(
        'Widget API base URL is not configured',
        WidgetErrorCode.AUTH_TOKEN_FAILED
      );
      setAuthError('Configuration error. Please contact support.');
      logError(error, { API_BASE_URL });
      return null;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      // Attempt to get auth token with retry logic
      const token = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

          try {
            const response = await fetch(`${API_BASE_URL}/auth/widget-token`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ client_id: clientId }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // Parse response
            let data;
            try {
              data = await response.json();
            } catch (parseError) {
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
  }, []);

  const clearAuth = useCallback(() => {
    setAuthToken(null);
    setAuthError(null);
    setRetryCount(0);
  }, []);

  const refreshToken = useCallback(async (clientId: string): Promise<string | null> => {
    clearAuth();
    return getAuthToken(clientId);
  }, [getAuthToken, clearAuth]);

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
  };
}
