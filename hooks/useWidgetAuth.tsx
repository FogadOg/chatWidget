'use client';

import { useState } from 'react';

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1`

export function useWidgetAuth() {
  const [authToken, setAuthToken] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);

  const getAuthToken = async (clientId: string): Promise<string | null> => {
    console.log('WIDGET: Getting auth token for clientId:', clientId);
    try {
      const response = await fetch(`${API_BASE_URL}/auth/widget-token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ client_id: clientId }),
      });
      console.log('WIDGET: Auth token response:', response.status, response.ok);

      const data = await response.json();
      console.log('WIDGET: Auth token data:', data);

      if (response.ok && data.token) {
        setAuthToken(data.token);
        setAuthError(null);
        return data.token;
      } else {
        setAuthError(data.detail || 'Failed to get authentication token');
        return null;
      }
    } catch (err) {
      setAuthError('Network error: Could not get authentication token');
      console.error('Token request error:', err);
      return null;
    }
  };

  return {
    getAuthToken,
    authToken,
    authError,
    setAuthToken,
    setAuthError,
  };
}
