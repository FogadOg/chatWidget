/**
 * Unit tests for lib/monitoring.ts
 */

import {
  initMonitoring,
  reportError,
  reportEvent,
  isMonitoringInitialized,
  _resetMonitoring,
} from '../lib/monitoring';

// ── helpers ──────────────────────────────────────────────────────────────────

const originalFetch = global.fetch;

function mockFetch() {
  const calls: Array<{ url: string; body: Record<string, unknown> }> = [];
  global.fetch = jest.fn(async (url: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(url),
      body: JSON.parse((init?.body as string) ?? '{}'),
    });
    return new Response(null, { status: 200 });
  }) as unknown as typeof fetch;
  return calls;
}

afterEach(() => {
  _resetMonitoring();
  global.fetch = originalFetch;
});

// ── initMonitoring ────────────────────────────────────────────────────────────

describe('initMonitoring', () => {
  it('marks monitoring as initialised', () => {
    expect(isMonitoringInitialized()).toBe(false);
    initMonitoring();
    expect(isMonitoringInitialized()).toBe(true);
  });

  it('can be called multiple times safely', () => {
    initMonitoring({ endpoint: '/api/v1/errors' });
    initMonitoring({ endpoint: '/api/v2/errors' });
    expect(isMonitoringInitialized()).toBe(true);
  });
});

// ── reportError ───────────────────────────────────────────────────────────────

describe('reportError', () => {
  it('does not call fetch when sendReports is false', () => {
    const calls = mockFetch();
    initMonitoring({ sendReports: false });
    reportError(new Error('silent'));
    return Promise.resolve().then(() => {
      expect(calls).toHaveLength(0);
    });
  });

  it('POSTs to the configured endpoint when sendReports is true', () => {
    const calls = mockFetch();
    initMonitoring({ sendReports: true, endpoint: '/api/errors' });
    reportError(new Error('boom'));
    // fetch is called async — advance microtasks
    return Promise.resolve().then(() => {
      expect(calls).toHaveLength(1);
      expect(calls[0].url).toBe('/api/errors');
      expect(calls[0].body.type).toBe('error');
      expect(calls[0].body.message).toBe('boom');
    });
  });

  it('accepts a non-Error value and converts it', () => {
    const calls = mockFetch();
    initMonitoring({ sendReports: true, endpoint: '/api/errors' });
    reportError('plain string error');
    return Promise.resolve().then(() => {
      expect(calls[0].body.message).toBe('plain string error');
    });
  });

  it('attaches meta to the POST payload', () => {
    const calls = mockFetch();
    initMonitoring({ sendReports: true, endpoint: '/api/errors' });
    reportError(new Error('ctx'), { userId: 'u1' });
    return Promise.resolve().then(() => {
      expect((calls[0].body.meta as Record<string, unknown>)['userId']).toBe('u1');
    });
  });

  it('includes a timestamp in the payload', () => {
    const calls = mockFetch();
    initMonitoring({ sendReports: true, endpoint: '/api/errors' });
    reportError(new Error('ts'));
    return Promise.resolve().then(() => {
      expect(typeof calls[0].body.timestamp).toBe('string');
    });
  });

  it('does not throw when fetch is unavailable', () => {
    const saved = global.fetch;
    // @ts-expect-error intentionally removing fetch
    delete global.fetch;
    initMonitoring({ sendReports: true });
    expect(() => reportError(new Error('no fetch'))).not.toThrow();
    global.fetch = saved;
  });
});

// ── reportEvent ───────────────────────────────────────────────────────────────

describe('reportEvent', () => {
  it('POSTs an event payload', () => {
    const calls = mockFetch();
    initMonitoring({ sendReports: true, endpoint: '/api/events' });
    reportEvent('widget.open', { locale: 'en' });
    return Promise.resolve().then(() => {
      expect(calls).toHaveLength(1);
      expect(calls[0].body.type).toBe('event');
      expect(calls[0].body.name).toBe('widget.open');
      expect((calls[0].body.payload as Record<string, unknown>)['locale']).toBe('en');
    });
  });

  it('does not call fetch when sendReports is false', () => {
    const calls = mockFetch();
    initMonitoring({ sendReports: false });
    reportEvent('widget.open');
    return Promise.resolve().then(() => {
      expect(calls).toHaveLength(0);
    });
  });
});

// ── Sentry integration ────────────────────────────────────────────────────────

describe('Sentry forwarding', () => {
  it('calls Sentry.captureException when DSN is configured and Sentry is present', () => {
    const captureException = jest.fn();
    (globalThis as Record<string, unknown>)['Sentry'] = { captureException };

    initMonitoring({ sendReports: false, sentryDsn: 'https://key@sentry.io/1' });
    reportError(new Error('sentry-err'), { tag: 'test' });

    expect(captureException).toHaveBeenCalledTimes(1);
    const [err, ctx] = captureException.mock.calls[0];
    expect(err.message).toBe('sentry-err');
    expect(ctx.extra.tag).toBe('test');

    delete (globalThis as Record<string, unknown>)['Sentry'];
  });

  it('does not throw when Sentry is missing despite DSN being set', () => {
    initMonitoring({ sendReports: false, sentryDsn: 'https://key@sentry.io/1' });
    expect(() => reportError(new Error('no-sentry'))).not.toThrow();
  });
});
