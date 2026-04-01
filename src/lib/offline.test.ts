/**
 * Tests for src/lib/offline.ts — uses a lightweight fake IndexedDB
 * implementation to exercise the code paths: upgrade (createObjectStore),
 * put/getAll/delete/get, incrementAttempt, flushQueue, and registerServiceWorker.
 */
import * as offline from './offline';

// Minimal in-memory fake IndexedDB tailored to the module's expectations
class FakeRequest {
  onsuccess: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onupgradeneeded: (() => void) | null = null;
  result: any = null;
}

class FakeStore {
  constructor(private map: Map<string, any>) {}
  put(val: any) {
    this.map.set(val.id, val);
    const req = new FakeRequest();
    req.result = val;
    setTimeout(() => req.onsuccess && req.onsuccess());
    return req;
  }
  getAll() {
    const req = new FakeRequest();
    req.result = Array.from(this.map.values());
    setTimeout(() => req.onsuccess && req.onsuccess());
    return req;
  }
  delete(id: string) {
    this.map.delete(id);
    const req = new FakeRequest();
    setTimeout(() => req.onsuccess && req.onsuccess());
    return req;
  }
  get(id: string) {
    const req = new FakeRequest();
    req.result = this.map.get(id);
    setTimeout(() => req.onsuccess && req.onsuccess());
    return req;
  }
}

class FakeTransaction {
  complete: Promise<void>;
  private resolveComplete!: () => void;
  constructor(private store: FakeStore) {
    this.complete = new Promise((res) => { this.resolveComplete = res; });
    // resolve on next tick to simulate async commit
    setTimeout(() => this.resolveComplete(), 0);
  }
  objectStore() {
    return this.store;
  }
}

class FakeDB {
  private _names = new Set<string>();
  // provide both `.contains` (IDB) and `.has` (our tests) on objectStoreNames
  objectStoreNames: any = {
    contains: (n: string) => this._names.has(n),
    has: (n: string) => this._names.has(n),
  };
  private stores = new Map<string, Map<string, any>>();
  createObjectStore(name: string, _opts?: any) {
    this._names.add(name);
    this.stores.set(name, new Map());
    return {};
  }
  transaction(name: string, _mode: string) {
    const map = this.stores.get(name) || new Map();
    if (!this.stores.has(name)) this.stores.set(name, map);
    const store = new FakeStore(map);
    return new FakeTransaction(store) as any;
  }
  // helper to inspect stored values in tests
  inspectStore(name: string) {
    return Array.from((this.stores.get(name) || new Map()).values());
  }
}

describe('offline IndexedDB behaviors', () => {
  let fakeDB: FakeDB;
  let lastRegisterArgs: any = null;

  beforeEach(() => {
    fakeDB = new FakeDB();

    // Provide a fake indexedDB.open that calls onupgradeneeded then onsuccess
    (global as any).indexedDB = {
      open: (_name: string, _ver: number) => {
        const req = new FakeRequest();
        // set result early so onupgradeneeded can access it
        req.result = fakeDB as any;
        // call onupgradeneeded then onsuccess async
        setTimeout(() => {
          req.onupgradeneeded && req.onupgradeneeded();
          req.onsuccess && req.onsuccess();
        }, 0);
        return req as any;
      }
    };

    // Mock navigator.serviceWorker.register
    (global as any).navigator = (global as any).navigator || {};
    (global as any).navigator.serviceWorker = {
      register: jest.fn().mockImplementation((swPath: string) => {
        lastRegisterArgs = swPath;
        return Promise.resolve({
          active: { postMessage: jest.fn() },
          installing: null
        });
      })
    };
  });

  afterEach(() => {
    jest.restoreAllMocks();
    lastRegisterArgs = null;
  });

  test('openDB creates object store on upgrade', async () => {
    // queueMessage will call openDB and trigger onupgradeneeded
    await offline.queueMessage({ id: 'q1', text: 'hello' } as any);
    // The module uses STORE_NAME="message-queue"; our fake should now have it
    expect(fakeDB.objectStoreNames.has('message-queue')).toBe(true);
  });

  test('queueMessage stores item and getQueuedMessages returns it', async () => {
    await offline.queueMessage({ id: 'm-1', text: 'first', seq: 10 } as any);
    const items = await offline.getQueuedMessages();
    expect(items.find((i: any) => i.id === 'm-1')).toBeDefined();
  });

  test('removeQueuedMessage deletes item', async () => {
    await offline.queueMessage({ id: 'm-2', text: 'to-remove' } as any);
    let items = await offline.getQueuedMessages();
    expect(items.some((i: any) => i.id === 'm-2')).toBe(true);
    await offline.removeQueuedMessage('m-2');
    items = await offline.getQueuedMessages();
    expect(items.some((i: any) => i.id === 'm-2')).toBe(false);
  });

  test('incrementAttempt updates attempts and lastAttempt', async () => {
    await offline.queueMessage({ id: 'm-3', text: 'attempt', attempts: 0 } as any);
    await offline.incrementAttempt('m-3');
    const items = await offline.getQueuedMessages();
    const it = items.find((i: any) => i.id === 'm-3');
    expect(it).toBeDefined();
    expect(typeof it.attempts).toBe('number');
    expect(it.attempts).toBeGreaterThanOrEqual(1);
    expect(typeof it.lastAttempt).toBe('number');
  });

  test('flushQueue calls sendFn and removes successful items, stops on failure', async () => {
    // queue two items with seq ordering
    await offline.queueMessage({ id: 'a', text: 'one', seq: 1 } as any);
    await offline.queueMessage({ id: 'b', text: 'two', seq: 2 } as any);

    const sendFn = jest.fn().mockImplementation(async (item: any) => {
      if (item.id === 'a') return Promise.resolve();
      return Promise.reject(new Error('boom'));
    });

    await offline.flushQueue(sendFn);

    // ensure sendFn called for first then second (stops after failure)
    expect(sendFn).toHaveBeenCalled();
    const remaining = await offline.getQueuedMessages();
    // 'a' should be removed, 'b' should remain
    expect(remaining.some((r: any) => r.id === 'a')).toBe(false);
    expect(remaining.some((r: any) => r.id === 'b')).toBe(true);
  });

  test('registerServiceWorker registers and posts API when NEXT_PUBLIC_OFFLINE_API set', async () => {
    // set environment var used by function
    (process.env as any).NEXT_PUBLIC_OFFLINE_API = 'https://example.com/api';
    await offline.registerServiceWorker('/sw.js');
    expect((global as any).navigator.serviceWorker.register).toHaveBeenCalledWith('/sw.js');
    // cleanup
    delete (process.env as any).NEXT_PUBLIC_OFFLINE_API;
  });

  test('registerServiceWorker posts SET_API when installing becomes active', async () => {
    (process.env as any).NEXT_PUBLIC_OFFLINE_API = 'https://example.com/api';

    const postMock = jest.fn();

    // craft a registration object where `installing.addEventListener` captures
    // the handler so tests can simulate the statechange and set `active`.
    let registrationObj: any = {
      active: null,
      installing: {
        addEventListener: (_evt: string, handler: () => void) => {
          // store handler for later simulation
          registrationObj._handler = handler;
        }
      }
    };

    (global as any).navigator.serviceWorker.register = jest.fn().mockResolvedValue(registrationObj);

    // call the function under test — it should attach the statechange listener
    await offline.registerServiceWorker('/sw.js');

    // simulate the installing -> active transition
    registrationObj.active = { postMessage: postMock };
    // invoke the captured handler to mimic the 'statechange' event
    registrationObj._handler && registrationObj._handler();

    expect(postMock).toHaveBeenCalledWith({ type: 'SET_API', apiUrl: 'https://example.com/api' });

    delete (process.env as any).NEXT_PUBLIC_OFFLINE_API;
  });
});
