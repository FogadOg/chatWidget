// Lightweight helpers for setting up iframe message listeners
import { EMBED_EVENTS } from '../../../lib/embedConstants';

/**
 * Attach a listener for INIT_CONFIG events from the host page.
 * callback will receive the `data` payload when a valid event is posted.
 */
export function onInitConfig(callback: (data: Record<string, unknown>) => void) {
  const handler = (event: MessageEvent) => {
    try {
      const { type, data } = event.data || {};
      if (type !== EMBED_EVENTS.INIT_CONFIG || !data) return;
      callback(data);
    } catch {
      // ignore
    }
  };
  window.addEventListener('message', handler);
  return {
    remove: () => window.removeEventListener('message', handler),
    handler,
  };
}
