// Production-safe logging utilities

type LogLevel = 'error' | 'warn' | 'info' | 'debug';

interface LogContext {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

/**
 * Logger that respects environment settings
 * In production, errors should be sent to a logging service
 * In development, logs to console
 */
class Logger {
  private isDevelopment: boolean;
  private perfBlacklist: Set<string> = new Set(['fetchAssistantDetails','fetchWidgetConfig']);
  private errorBuffer: Array<{
    level: LogLevel;
    message: string;
    context?: LogContext;
    timestamp: string;
    userAgent: string;
    url: string;
  }> = [];

  constructor() {
    // consider anything other than production as "development" for logging purposes
    // this ensures jest (NODE_ENV="test") will still produce console output in tests
    this.isDevelopment = process.env.NODE_ENV !== 'production';
  }

  /**
   * Log error - always logged, sent to error tracking in production
   */
  error(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.error(`[Widget Error] ${message}`, context || '');
    } else {
      // In production, send to a configurable tracking endpoint
      this.sendToErrorTracking('error', message, context);
    }
  }

  /**
   * Log warning - logged in development only
   */
  warn(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.warn(`[Widget Warning] ${message}`, context || '');
    }
  }

  /**
   * Log info - logged in development only
   */
  info(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.info(`[Widget Info] ${message}`, context || '');
    }
  }

  /**
   * Log debug - logged in development only
   */
  debug(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      // omit prefix to reduce verbosity
      console.debug(message, context || '');
    }
  }

  /**
   * Send error to tracking service (placeholder for production implementation)
   */
  private sendToErrorTracking(level: LogLevel, message: string, context?: LogContext): void {
    // Endpoint can be configured via environment variable
    const endpoint = (process.env.NEXT_PUBLIC_LOG_ENDPOINT || '/api/client-errors');

    try {
      const errorData = {
        level,
        message,
        context,
        timestamp: new Date().toISOString(),
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
        url: typeof window !== 'undefined' ? window.location.href : undefined,
      };

      // send asynchronously, ignore errors
      fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData),
      }).catch(() => {});
    } catch (e) {
      // Fail silently - don't break app due to logging issues
    }
  }

  /**
   * Log a performance metric (duration in ms) for a named event.
   */
  perf(name: string, durationMs: number, context?: LogContext): void {
    // ignore certain internal calls
    if (this.perfBlacklist.has(name)) return;
    if (this.isDevelopment) {
      // log perf without extra prefix
      console.debug(`${name}: ${durationMs}ms`, context || '');
    } else {
      const endpoint = (process.env.NEXT_PUBLIC_LOG_ENDPOINT || '/api/client-errors');
      const perfData = { name, durationMs, context, timestamp: new Date().toISOString() };
      // avoid runtime errors in environments without fetch (node/jest)
      if (typeof fetch !== 'undefined') {
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: 'perf', ...perfData }),
        }).catch(() => {});
      }
    }
  }
}

// Export singleton instance
export const logger = new Logger();

// Convenience exports
export const logError = (message: string, context?: LogContext) => logger.error(message, context);
export const logWarn = (message: string, context?: LogContext) => logger.warn(message, context);
export const logInfo = (message: string, context?: LogContext) => logger.info(message, context);
export const logDebug = (message: string, context?: LogContext) => logger.debug(message, context);
export const logPerf = (name: string, durationMs: number, context?: LogContext) => logger.perf(name, durationMs, context);
