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
  private errorBuffer: Array<{
    level: LogLevel;
    message: string;
    context?: LogContext;
    timestamp: string;
    userAgent: string;
    url: string;
  }> = [];

  constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  /**
   * Log error - always logged, sent to error tracking in production
   */
  error(message: string, context?: LogContext): void {
    if (this.isDevelopment) {
      console.error(`[Widget Error] ${message}`, context || '');
    } else {
      // In production, send to error tracking service
      // TODO: Integrate with Sentry, LogRocket, or similar
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
      console.debug(`[Widget Debug] ${message}`, context || '');
    }
  }

  /**
   * Send error to tracking service (placeholder for production implementation)
   */
  private sendToErrorTracking(level: LogLevel, message: string, context?: LogContext): void {
    // Placeholder for production error tracking
    // In production, implement integration with:
    // - Sentry: Sentry.captureException()
    // - LogRocket: LogRocket.captureException()
    // - Custom API endpoint

    // For now, store in a buffer that could be sent to backend
    try {
      const errorData = {
        level,
        message,
        context,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // You could send this to your backend
      // fetch('/api/client-errors', {
      //   method: 'POST',
      //   body: JSON.stringify(errorData),
      // });

      // Or store for batch sending
      if (typeof window !== 'undefined') {
        const errors = JSON.parse(localStorage.getItem('widget_errors') || '[]');
        errors.push(errorData);
        // Keep only last 50 errors
        if (errors.length > 50) {
          errors.shift();
        }
        localStorage.setItem('widget_errors', JSON.stringify(errors));
      }
    } catch (e) {
      // Fail silently - don't break app due to logging issues
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
