// Lightweight helpers for setting up iframe message listeners
import { EMBED_EVENTS } from '../../../lib/embedConstants';

// Allowlist of approved host origins (set via NEXT_PUBLIC_EMBED_ALLOWLIST as comma-separated list)
const RAW_ALLOWLIST = process.env.NEXT_PUBLIC_EMBED_ALLOWLIST || '';
const ALLOWLIST = RAW_ALLOWLIST.split(',').map(s => s.trim()).filter(Boolean);

/**
 * Attach a listener for INIT_CONFIG events from the host page.
 * callback will receive the `data` payload when a valid event is posted.
 */
export function onInitConfig(callback: (data: Record<string, unknown>) => void) {
  const handler = (event: MessageEvent) => {
    try {
      const { type, data } = event.data || {};
      if (type !== EMBED_EVENTS.INIT_CONFIG || !data) return;

      // Validate origin against allowlist. If allowlist is empty fall back
      // to only allowing same-origin messages (safe default).
      const origin = event.origin || '';
      const allowed = ALLOWLIST.length > 0 ? ALLOWLIST.includes(origin) : origin === window.location.origin;
      if (!allowed) return;

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
