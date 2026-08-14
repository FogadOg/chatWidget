import { useCallback, useEffect, useRef } from 'react';
import { EMBED_EVENTS } from '../../../../lib/embedConstants';
import { isTrustedParentMessage } from '../DocsClient.utils';

/** Matches the chat widget's interceptor round-trip budget. */
const INTERCEPT_TIMEOUT_MS = 500;

export type InterceptType = 'before_send' | 'after_receive';

/**
 * Host-page message interceptors (`beforeSend` / `afterReceive`) for the docs
 * widget — the same protocol the chat widget implements in
 * EmbedClient.controller, so both embeds honor the loader's documented
 * interceptor API instead of silently ignoring it.
 *
 * The host announces its interceptors with HOST_INTERCEPT_ACTIVE; each message
 * then makes one round-trip (WIDGET_INTERCEPT_REQUEST → HOST_INTERCEPT_RESPONSE).
 * A missing or slow host falls back to the original content after 500ms, so a
 * broken interceptor can never wedge the conversation.
 */
export function useHostInterceptors(parentOrigin: string) {
  const activeRef = useRef({ beforeSend: false, afterReceive: false });
  const callbacksRef = useRef(new Map<string, (content: string | null) => void>());

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!isTrustedParentMessage(event, parentOrigin)) return;
      const { type, data, requestId, content } = (event.data || {}) as {
        type?: string;
        data?: Record<string, boolean>;
        requestId?: string;
        content?: string | null;
      };

      if (type === EMBED_EVENTS.INTERCEPT_ACTIVE && data) {
        if (data.beforeSend) activeRef.current.beforeSend = true;
        if (data.afterReceive) activeRef.current.afterReceive = true;
        return;
      }

      if (type === EMBED_EVENTS.INTERCEPT_RESPONSE && requestId) {
        const resolve = callbacksRef.current.get(requestId);
        if (resolve) {
          callbacksRef.current.delete(requestId);
          resolve(content ?? null);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => window.removeEventListener('message', handler);
  }, [parentOrigin]);

  /**
   * Run the host's interceptor for `content`. Resolves to the (possibly
   * rewritten) content, or null when a beforeSend interceptor cancels the send.
   * Short-circuits when the host registered no interceptor of this kind.
   */
  const runInterceptors = useCallback(
    (interceptType: InterceptType, content: string): Promise<string | null> => {
      const kind = interceptType === 'before_send' ? 'beforeSend' : 'afterReceive';
      if (!activeRef.current[kind]) return Promise.resolve(content);
      if (typeof window === 'undefined' || window.parent === window) return Promise.resolve(content);
      if (!parentOrigin || parentOrigin === '*') return Promise.resolve(content);

      return new Promise<string | null>((resolve) => {
        const requestId = `ic-${Math.random().toString(36).slice(2)}-${Date.now()}`;
        const timer = setTimeout(() => {
          callbacksRef.current.delete(requestId);
          resolve(content);
        }, INTERCEPT_TIMEOUT_MS);
        callbacksRef.current.set(requestId, (result) => {
          clearTimeout(timer);
          resolve(result);
        });
        try {
          window.parent.postMessage(
            { type: EMBED_EVENTS.INTERCEPT_REQUEST, interceptType, requestId, content },
            parentOrigin,
          );
        } catch {
          clearTimeout(timer);
          callbacksRef.current.delete(requestId);
          resolve(content);
        }
      });
    },
    [parentOrigin],
  );

  return { runInterceptors };
}
