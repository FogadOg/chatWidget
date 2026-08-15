/**
 * Tests for the docs widget's host-page interceptor round-trip
 * (app/embed/docs/hooks/useHostInterceptors).
 *
 * Protocol under test — the same one the chat widget implements in
 * EmbedClient.controller, so both embeds honor the loader's documented
 * beforeSend/afterReceive API:
 *   1. the host announces its interceptors with HOST_INTERCEPT_ACTIVE,
 *   2. each message makes one round-trip (WIDGET_INTERCEPT_REQUEST →
 *      HOST_INTERCEPT_RESPONSE),
 *   3. a missing/slow host falls back to the original content after 500ms so a
 *      broken interceptor can never wedge the conversation.
 */

import { renderHook, act } from '@testing-library/react';
import { useHostInterceptors } from '../app/embed/docs/hooks/useHostInterceptors';
import { EMBED_EVENTS } from '../lib/embedConstants';

const PARENT_ORIGIN = 'https://host.example';

let postMessage: jest.Mock;
const origParentDescriptor = Object.getOwnPropertyDescriptor(window, 'parent');

/** Announce which interceptors the host registered. */
function announce(data: Record<string, boolean>, origin = PARENT_ORIGIN) {
  window.dispatchEvent(
    new MessageEvent('message', {
      data: { type: EMBED_EVENTS.INTERCEPT_ACTIVE, data },
      origin,
    }),
  );
}

/** Reply to the request the hook just posted. */
function respond(content: string | null, requestIdOverride?: string) {
  const call = postMessage.mock.calls.find(
    (c) => c[0]?.type === EMBED_EVENTS.INTERCEPT_REQUEST,
  );
  window.dispatchEvent(
    new MessageEvent('message', {
      data: {
        type: EMBED_EVENTS.INTERCEPT_RESPONSE,
        requestId: requestIdOverride ?? call?.[0]?.requestId,
        content,
      },
      origin: PARENT_ORIGIN,
    }),
  );
}

function lastRequest() {
  const calls = postMessage.mock.calls.filter(
    (c) => c[0]?.type === EMBED_EVENTS.INTERCEPT_REQUEST,
  );
  return calls[calls.length - 1];
}

describe('useHostInterceptors', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    postMessage = jest.fn();
    // jsdom defaults window.parent === window, which the trust gate (and the
    // hook's own framing check) rejects — simulate a framed widget.
    Object.defineProperty(window, 'parent', {
      value: { postMessage },
      configurable: true,
    });
  });

  afterEach(() => {
    jest.useRealTimers();
    if (origParentDescriptor) {
      Object.defineProperty(window, 'parent', origParentDescriptor);
    }
  });

  it('returns the content unchanged when the host registered no interceptor', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));

    const out = await result.current.runInterceptors('before_send', 'hello');

    expect(out).toBe('hello');
    expect(lastRequest()).toBeUndefined();
  });

  it('round-trips beforeSend and applies the host rewrite', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => announce({ beforeSend: true }));

    let settled: string | null | undefined;
    act(() => {
      result.current.runInterceptors('before_send', 'hello').then((v) => { settled = v; });
    });

    const [payload, targetOrigin] = lastRequest();
    expect(payload.type).toBe(EMBED_EVENTS.INTERCEPT_REQUEST);
    expect(payload.interceptType).toBe('before_send');
    expect(payload.content).toBe('hello');
    expect(typeof payload.requestId).toBe('string');
    expect(targetOrigin).toBe(PARENT_ORIGIN);

    await act(async () => {
      respond('HELLO (rewritten)');
    });

    expect(settled).toBe('HELLO (rewritten)');
  });

  it('resolves null when a beforeSend interceptor cancels the send', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => announce({ beforeSend: true }));

    let settled: string | null | undefined = 'unset';
    act(() => {
      result.current.runInterceptors('before_send', 'hello').then((v) => { settled = v; });
    });
    await act(async () => {
      respond(null);
    });

    expect(settled).toBeNull();
  });

  it('routes afterReceive independently of beforeSend', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => announce({ afterReceive: true }));

    // beforeSend was never announced, so it short-circuits without a round-trip.
    await expect(result.current.runInterceptors('before_send', 'sent')).resolves.toBe('sent');
    expect(lastRequest()).toBeUndefined();

    let settled: string | null | undefined;
    act(() => {
      result.current.runInterceptors('after_receive', 'reply').then((v) => { settled = v; });
    });
    expect(lastRequest()[0].interceptType).toBe('after_receive');

    await act(async () => {
      respond('reply (annotated)');
    });
    expect(settled).toBe('reply (annotated)');
  });

  it('falls back to the original content when the host never replies', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => announce({ beforeSend: true }));

    let settled: string | null | undefined;
    act(() => {
      result.current.runInterceptors('before_send', 'hello').then((v) => { settled = v; });
    });
    expect(settled).toBeUndefined();

    await act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(settled).toBe('hello');
  });

  it('ignores a late reply that arrives after the timeout fallback', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => announce({ beforeSend: true }));

    let settled: string | null | undefined;
    act(() => {
      result.current.runInterceptors('before_send', 'hello').then((v) => { settled = v; });
    });
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(settled).toBe('hello');

    // The callback was already dropped, so the stale response resolves nothing.
    await act(async () => {
      respond('too late');
    });
    expect(settled).toBe('hello');
  });

  it('ignores a response whose requestId does not match a pending request', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => announce({ beforeSend: true }));

    let settled: string | null | undefined;
    act(() => {
      result.current.runInterceptors('before_send', 'hello').then((v) => { settled = v; });
    });

    await act(async () => {
      respond('from another request', 'ic-unknown-id');
    });
    expect(settled).toBeUndefined();

    // The real request still times out into its fallback.
    await act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(settled).toBe('hello');
  });

  it('ignores a response with no requestId at all', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => announce({ beforeSend: true }));

    let settled: string | null | undefined;
    act(() => {
      result.current.runInterceptors('before_send', 'hello').then((v) => { settled = v; });
    });

    await act(async () => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: EMBED_EVENTS.INTERCEPT_RESPONSE, content: 'no id' },
          origin: PARENT_ORIGIN,
        }),
      );
    });
    expect(settled).toBeUndefined();
  });

  it('ignores an announcement from an untrusted origin', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => announce({ beforeSend: true }, 'https://evil.example'));

    // Never marked active → short-circuits with no round-trip.
    await expect(result.current.runInterceptors('before_send', 'hello')).resolves.toBe('hello');
    expect(lastRequest()).toBeUndefined();
  });

  it('ignores an announcement with no data payload', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: EMBED_EVENTS.INTERCEPT_ACTIVE },
          origin: PARENT_ORIGIN,
        }),
      );
    });

    await expect(result.current.runInterceptors('before_send', 'hello')).resolves.toBe('hello');
    expect(lastRequest()).toBeUndefined();
  });

  it('ignores unrelated message types', async () => {
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', {
          data: { type: 'SOMETHING_ELSE', data: { beforeSend: true } },
          origin: PARENT_ORIGIN,
        }),
      );
      // Also exercise the `event.data == null` guard.
      window.dispatchEvent(new MessageEvent('message', { origin: PARENT_ORIGIN }));
    });

    await expect(result.current.runInterceptors('before_send', 'hello')).resolves.toBe('hello');
    expect(lastRequest()).toBeUndefined();
  });

  it('skips the round-trip when the parent origin is unknown or a wildcard', async () => {
    for (const origin of ['', '*']) {
      const { result } = renderHook(() => useHostInterceptors(origin));
      // With no usable origin the trust gate falls back to `event.source`, which
      // our synthetic events don't set — announce through a matching origin is
      // impossible, so drive the guard directly via a wildcard announcement.
      act(() => {
        window.dispatchEvent(
          new MessageEvent('message', {
            data: { type: EMBED_EVENTS.INTERCEPT_ACTIVE, data: { beforeSend: true } },
            origin: 'https://host.example',
            source: window.parent as Window,
          }),
        );
      });

      await expect(result.current.runInterceptors('before_send', 'hello')).resolves.toBe('hello');
      expect(lastRequest()).toBeUndefined();
    }
  });

  it('falls back to the original content when postMessage throws', async () => {
    postMessage.mockImplementation(() => {
      throw new Error('cross-origin');
    });
    const { result } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    act(() => announce({ beforeSend: true }));

    await expect(result.current.runInterceptors('before_send', 'hello')).resolves.toBe('hello');
  });

  it('stops listening once unmounted', async () => {
    const { result, unmount } = renderHook(() => useHostInterceptors(PARENT_ORIGIN));
    const removeSpy = jest.spyOn(window, 'removeEventListener');
    unmount();
    expect(removeSpy).toHaveBeenCalledWith('message', expect.any(Function));

    // A post-unmount announcement can no longer flip the hook active.
    act(() => announce({ beforeSend: true }));
    await expect(result.current.runInterceptors('before_send', 'hello')).resolves.toBe('hello');
    removeSpy.mockRestore();
  });
});
