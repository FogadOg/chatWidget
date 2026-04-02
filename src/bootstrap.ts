/**
 * bootstrap.ts — Widget auto-wiring module
 *
 * Runs side-effects that should happen exactly once when the widget package
 * is first loaded:
 *
 *  1. Detects debug mode (URL param / localStorage / script attribute) and
 *     logs a confirmation when active so developers know it worked.
 *
 *  2. Attaches `enableDebug` / `disableDebug` / `isDebugActive` onto
 *     `window.CompaninWidget` so they are reachable from the browser console
 *     without any extra imports:
 *
 *       window.CompaninWidget.enableDebug()   // ← works immediately
 *       window.CompaninWidget.disableDebug()
 *       window.CompaninWidget.isDebugActive() // → true / false
 *
 *  3. Re-exports `DevOverlay` so consumers can conditionally render it:
 *
 *       import { DevOverlay, useDebugMode } from '@yourco/widget/bootstrap';
 *       // or use the re-export from the package root (src/index.ts)
 *
 * This module is imported by `src/index.ts` for its side-effects, and can
 * also be imported directly by host apps that need the `DevOverlay` component.
 *
 * Safe to import in SSR contexts — all `window` access is guarded.
 */

import { detectDebugMode, enableDebug, disableDebug } from './components/DevOverlay';
import { logger } from '../lib/logger';

// ---------------------------------------------------------------------------
// 1. Log debug-mode activation
// ---------------------------------------------------------------------------

if (detectDebugMode()) {
  logger.info('Debug mode active — DevOverlay can now be rendered');
}

// ---------------------------------------------------------------------------
// 2. Attach debug helpers to window.CompaninWidget
// ---------------------------------------------------------------------------

if (typeof window !== 'undefined') {
  // Preserve any existing properties (e.g. set by docs-widget.js or the host)
  const win = window as unknown as Record<string, unknown>;
  const existing = win.CompaninWidget as Record<string, unknown> | undefined;

  win.CompaninWidget = {
    ...existing,
    enableDebug,
    disableDebug,
    isDebugActive: detectDebugMode,
  };
}

// ---------------------------------------------------------------------------
// Re-exports (convenience — host apps can import from here directly)
// ---------------------------------------------------------------------------

export { detectDebugMode, enableDebug, disableDebug } from './components/DevOverlay';
export { default as DevOverlay } from './components/DevOverlay';
export { useDebugMode } from './components/DevOverlay';
