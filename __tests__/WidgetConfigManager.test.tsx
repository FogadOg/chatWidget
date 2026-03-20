'use client';

import React from 'react';
import { render, waitFor, cleanup } from '@testing-library/react';
import WidgetConfigManager from '../components/WidgetConfigManager';

jest.mock('lib/errorHandling', () => ({
  logError: jest.fn(),
}));

jest.mock('lib/api', () => ({
  API: {
    widgetConfig: (id: string) => `/widget/${id}`,
  },
}));

describe('WidgetConfigManager', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    cleanup();
    // restore fetch
    global.fetch = originalFetch;
    jest.clearAllMocks();
  });

  test('does nothing when configId or authToken missing', async () => {
    const onLoaded = jest.fn();
    const onError = jest.fn();

    global.fetch = jest.fn();

    render(
      <WidgetConfigManager
        configId={''}
        authToken={''}
        onConfigLoaded={onLoaded}
        onConfigError={onError}
      />
    );

    await new Promise((r) => setTimeout(r, 50));

    expect(global.fetch).not.toHaveBeenCalled();
    expect(onLoaded).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });

  test('calls onConfigLoaded on successful fetch with valid response', async () => {
    const onLoaded = jest.fn();
    const onError = jest.fn();

    const fakeConfig = { id: 'cfg1', name: 'Test Widget' };

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: fakeConfig }),
    });

    render(
      <WidgetConfigManager
        configId={'cfg1'}
        authToken={'token'}
        onConfigLoaded={onLoaded}
        onConfigError={onError}
      />
    );

    await waitFor(() => expect(onLoaded).toHaveBeenCalledWith(fakeConfig));

    expect(global.fetch).toHaveBeenCalledWith('/widget/cfg1', expect.objectContaining({
      method: 'GET',
      headers: { Authorization: 'Bearer token' },
    }));

    expect(onError).not.toHaveBeenCalled();
  });

  test('calls onConfigError and logs error when response not ok', async () => {
    const { logError } = require('lib/errorHandling');
    const onLoaded = jest.fn();
    const onError = jest.fn();

    global.fetch = jest.fn().mockResolvedValueOnce({ ok: false, status: 404, json: async () => ({}) });

    render(
      <WidgetConfigManager
        configId={'bad'}
        authToken={'token'}
        onConfigLoaded={onLoaded}
        onConfigError={onError}
      />
    );

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Failed to load widget configuration'));
    expect(onLoaded).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalled();
  });

  test('calls onConfigError when response format is invalid', async () => {
    const { logError } = require('lib/errorHandling');
    const onLoaded = jest.fn();
    const onError = jest.fn();

    global.fetch = jest.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'error' }),
    });

    render(
      <WidgetConfigManager
        configId={'cfg2'}
        authToken={'token'}
        onConfigLoaded={onLoaded}
        onConfigError={onError}
      />
    );

    await waitFor(() => expect(onError).toHaveBeenCalledWith('Failed to load widget configuration'));
    expect(onLoaded).not.toHaveBeenCalled();
    expect(logError).toHaveBeenCalled();
  });
});
