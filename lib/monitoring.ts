/**
 * Monitoring & reporting abstraction.
 *
 * Provides a unified surface for error/event reporting that can be backed by
 * Sentry, a custom HTTP endpoint, or left as a no-op in environments where
 * reporting is disabled.
 *
 * Usage:
 *   import { initMonitoring, reportError, reportEvent } from 'lib/monitoring';
 *   initMonitoring({ endpoint: '/api/telemetry', sendReports: true });
 *   reportError(new Error('oops'), { userId: '123' });
 *   reportEvent('widget.open', { locale: 'en' });
 */

export type MonitoringMeta = Record<string, unknown>;

export interface MonitoringOptions {
  /**
   * Whether to actually transmit reports. Defaults to `false` in test
   * environments (NODE_ENV === 'test') and `true` otherwise.
   */
  sendReports?: boolean;
  /**
   * HTTP endpoint that receives POST requests with JSON payloads.
   * Defaults to the NEXT_PUBLIC_LOG_ENDPOINT env variable or '/api/client-errors'.
   */
  endpoint?: string;
  /**
   * Optional Sentry-compatible DSN.  When provided, errors are forwarded to
   * Sentry via the globally available `Sentry` object (loaded separately).
   */
  sentryDsn?: string;
  /**
   * Application release/version string attached to every report.
   */
  release?: string;
}

interface MonitoringState {
  initialized: boolean;
  opts: Required<MonitoringOptions>;
}

const DEFAULT_ENDPOINT =
  (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_LOG_ENDPOINT) ||
  '/api/client-errors';

const state: MonitoringState = {
  initialized: false,
  opts: {
    sendReports: typeof process !== 'undefined' && process.env.NODE_ENV !== 'test',
    endpoint: DEFAULT_ENDPOINT,
    sentryDsn: '',
    release: '',
  },
};

/**
 * Call once at application bootstrap to configure monitoring.
 * Safe to call multiple times — subsequent calls update configuration.
 */
export function initMonitoring(opts: MonitoringOptions = {}): void {
  state.opts = {
    sendReports:
      opts.sendReports ??
      (typeof process !== 'undefined' && process.env.NODE_ENV !== 'test'),
    endpoint: opts.endpoint ?? DEFAULT_ENDPOINT,
    sentryDsn: opts.sentryDsn ?? '',
    release: opts.release ?? '',
  };
  state.initialized = true;
}

/**
 * Post a JSON payload to the configured endpoint.  Failures are silently
 * swallowed so monitoring never breaks the host application.
 */
function post(payload: Record<string, unknown>): void {
  if (!state.opts.sendReports) return;
  if (typeof fetch === 'undefined') return;
  try {
    const body = JSON.stringify({
      ...payload,
      release: state.opts.release || undefined,
      timestamp: new Date().toISOString(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      url: typeof window !== 'undefined' ? window.location?.href : undefined,
    });
    fetch(state.opts.endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
    }).catch(() => {});
  } catch {
    // Fail silently
  }
}

/**
 * Report an error to the configured monitoring backend.
 *
 * @param err  The error to report.
 * @param meta Optional key/value metadata attached to the report.
 */
export function reportError(err: Error | unknown, meta?: MonitoringMeta): void {
  const error = err instanceof Error ? err : new Error(String(err));

  // Forward to Sentry when a DSN is configured and Sentry is available.
  if (state.opts.sentryDsn) {
    try {
      const Sentry = (globalThis as Record<string, unknown>)['Sentry'] as
        | { captureException: (e: unknown, ctx?: unknown) => void }
        | undefined;
      if (Sentry && typeof Sentry.captureException === 'function') {
        Sentry.captureException(error, meta ? { extra: meta } : undefined);
      }
    } catch {
      // Sentry not loaded — fall through to HTTP report
    }
  }

  post({
    type: 'error',
    message: error.message,
    stack: error.stack,
    meta,
  });
}

/**
 * Report a named analytics/telemetry event.
 *
 * @param name    Event name, e.g. `'widget.open'` or `'chat.message.sent'`.
 * @param payload Optional event payload.
 */
export function reportEvent(name: string, payload?: MonitoringMeta): void {
  post({ type: 'event', name, payload });
}

/**
 * Returns true when monitoring has been explicitly initialised via
 * `initMonitoring()`.  Useful in tests.
 */
export function isMonitoringInitialized(): boolean {
  return state.initialized;
}

/**
 * Reset monitoring state — intended for use in tests only.
 * @internal
 */
export function _resetMonitoring(): void {
  state.initialized = false;
  state.opts = {
    sendReports: typeof process !== 'undefined' && process.env.NODE_ENV !== 'test',
    endpoint: DEFAULT_ENDPOINT,
    sentryDsn: '',
    release: '',
  };
}
