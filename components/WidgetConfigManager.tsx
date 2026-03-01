'use client';

/* eslint-disable @typescript-eslint/no-unused-vars */
import { useState, useEffect } from 'react';
import { logError } from 'lib/errorHandling';
import { API } from 'lib/api';
import type { WidgetConfig } from 'types/widget';

type WidgetConfigManagerProps = {
  configId: string;
  authToken: string;
  onConfigLoaded: (config: WidgetConfig) => void;
  onConfigError: (error: string) => void;
};

export default function WidgetConfigManager({
  configId,
  authToken,
  onConfigLoaded,
  onConfigError
}: WidgetConfigManagerProps) {
  const [config, setConfig] = useState<WidgetConfig | null>(null);

  useEffect(() => {
    if (!configId || !authToken) return;

    const fetchWidgetConfig = async () => {
      try {
        const response = await fetch(API.widgetConfig(configId), {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${authToken}`,
          },
        });

        if (!response.ok) {
          throw new Error(`Failed to fetch config: ${response.status}`);
        }

        const data = await response.json();

        if (data.status === 'success' && data.data) {
          setConfig(data.data);
          onConfigLoaded(data.data);
        } else {
          throw new Error('Invalid config response format');
        }
      } catch (err) {
        logError(err, { configId, action: 'fetchWidgetConfig' });
        onConfigError('Failed to load widget configuration');
      }
    };

    fetchWidgetConfig();
  }, [configId, authToken, onConfigLoaded, onConfigError]);

  return null; // This component doesn't render anything
}