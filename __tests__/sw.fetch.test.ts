/**
 * Regression tests for public/sw.js's fetch handler.
 *
 * A production incident traced to this file: the service worker called
 * respondWith() for the widget's own /embed/* iframe navigations, and when the
 * inner fetch rejected the browser turned it into "FetchEvent … resulted in a
 * network error response". The iframe stayed on about:blank, so every later
 * postMessage from the host page failed with an origin mismatch and the widget
 * never loaded. These tests pin the two rules that prevent it: never intercept
 * the embed surfaces, and never let respondWith() reject.
 */
import fs from 'fs';
import path from 'path';
import vm from 'vm';

type Listener = (evt: any) => void;

const ORIGIN = 'https://widget.companin.tech';

/** jsdom ships no fetch/Response, so the worker gets a minimal stand-in. */
class FakeResponse {
  status: number;
  statusText: string;
  redirected = false;
  constructor(public body = '', init: { status?: number; statusText?: string } = {}) {
    this.status = init.status ?? 200;
    this.statusText = init.statusText ?? '';
  }
  get ok() { return this.status >= 200 && this.status < 300; }
  clone() { return this; }
}

function loadServiceWorker(fetchImpl: jest.Mock) {
  const code = fs.readFileSync(path.join(process.cwd(), 'public', 'sw.js'), 'utf8');
  const listeners: Record<string, Listener> = {};
  const scope: any = {
    addEventListener: (type: string, fn: Listener) => { listeners[type] = fn; },
    location: { origin: ORIGIN },
    skipWaiting: () => {},
    clients: { claim: () => {}, matchAll: async () => [] },
  };
  const context: any = {
    self: scope,
    caches: {
      open: async () => ({ addAll: async () => {}, put: async () => {} }),
      keys: async () => [],
      match: async () => undefined,
      delete: async () => {},
    },
    fetch: fetchImpl,
    // A fresh vm context has none of Node's globals; without URL the
    // worker's own try/catch would swallow every request and the
    // assertions below would pass vacuously.
    URL,
    Response: FakeResponse,
    indexedDB: {},
    console,
    setTimeout,
  };
  vm.createContext(context);
  vm.runInContext(code, context);
  return { fetchHandler: listeners.fetch, context };
}

/** Build a FetchEvent double that records whether respondWith was called. */
function makeEvent(url: string, request: Record<string, unknown> = {}) {
  const calls: Promise<unknown>[] = [];
  return {
    request: { url, method: 'GET', redirect: 'follow', mode: 'no-cors', destination: '', ...request },
    respondWith: (p: Promise<unknown>) => { calls.push(p); },
    get responded() { return calls.length > 0; },
    get response() { return calls[0]; },
  };
}

describe('service worker fetch handler', () => {
  it('never intercepts the embed surfaces', () => {
    const fetchMock = jest.fn();
    const { fetchHandler } = loadServiceWorker(fetchMock);

    for (const url of [
      `${ORIGIN}/embed/docs?locale=en&key=wgt_abc`,
      `${ORIGIN}/embed/session?locale=en&clientId=abc`,
      `${ORIGIN}/preview?type=docs`,
    ]) {
      const evt = makeEvent(url, { mode: 'navigate', destination: 'iframe' });
      fetchHandler(evt);
      expect(evt.responded).toBe(false);
    }
    // Handing the request back to the browser means the worker makes no request
    // of its own for these documents.
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('never intercepts document/frame navigations', () => {
    const fetchMock = jest.fn();
    const { fetchHandler } = loadServiceWorker(fetchMock);

    for (const destination of ['document', 'iframe', 'frame']) {
      const evt = makeEvent(`${ORIGIN}/some/page`, { destination });
      fetchHandler(evt);
      expect(evt.responded).toBe(false);
    }
  });

  it('resolves rather than rejects when the network fetch fails', async () => {
    // First call = fetch(request) (fails), second = the plain-URL retry.
    const fetchMock = jest
      .fn()
      .mockRejectedValueOnce(new TypeError('Failed to fetch'))
      .mockResolvedValueOnce(new FakeResponse('ok', { status: 200 }));
    const { fetchHandler } = loadServiceWorker(fetchMock);

    const evt = makeEvent(`${ORIGIN}/companin-mark.svg`, { destination: 'image' });
    fetchHandler(evt);

    expect(evt.responded).toBe(true);
    const response = (await evt.response) as FakeResponse;
    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('degrades to a 504 response when every attempt fails', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new TypeError('Failed to fetch'));
    const { fetchHandler } = loadServiceWorker(fetchMock);

    const evt = makeEvent(`${ORIGIN}/companin-mark.svg`, { destination: 'image' });
    fetchHandler(evt);

    // The page gets a real (if unhappy) response instead of a network error.
    const response = (await evt.response) as FakeResponse;
    expect(response.status).toBe(504);
  });

  it('still leaves app bundles and non-GET requests alone', () => {
    const fetchMock = jest.fn();
    const { fetchHandler } = loadServiceWorker(fetchMock);

    const bundle = makeEvent(`${ORIGIN}/_next/static/chunks/main.js`, { destination: 'script' });
    fetchHandler(bundle);
    expect(bundle.responded).toBe(false);

    const post = makeEvent(`${ORIGIN}/companin-mark.svg`, { method: 'POST' });
    fetchHandler(post);
    expect(post.responded).toBe(false);
  });
});
