/**
 * widget-app — package entry point
 *
 * Re-exports all public TypeScript types so host applications can import
 * them from the package root without knowing internal paths.
 *
 * Usage:
 *   import type { WidgetConfig, WidgetAPI, MessageEvent } from '@yourco/widget';
 */

// Bootstrap runs side-effects on import:
//   • detects debug mode and logs confirmation
//   • attaches enableDebug / disableDebug to window.CompaninWidget
import './bootstrap';

export type {
  // Domain types
  WidgetConfig,
  Message,
  MessageData,
  SourceData,
  FlowButton,
  FlowResponse,
  Flow,
  ApiResponse,
  SessionData,
  PageContext,
  UnsureMessage,
  // Developer-experience types
  LogLevel,
  ErrorReport,
  MessageEvent,
  WidgetAPI,
} from '../types';

// Re-export runtime helpers that are safe for host consumption
export { logger, logError, logWarn, logInfo, logDebug, createLogger } from '../lib/logger';
export { initMonitoring, reportError, reportEvent, isMonitoringInitialized } from '../lib/monitoring';
export { MissingFieldError, InvalidValueError, validateConfig } from '../lib/validateConfig';
export {
  detectDebugMode,
  enableDebug,
  disableDebug,
  useDebugMode,
  pushDevEvent,
} from './components/DevOverlay';
