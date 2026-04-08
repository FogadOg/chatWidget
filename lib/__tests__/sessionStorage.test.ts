import { getOrCreateVisitorId, getStoredSessionByKey, storeSessionByKey } from '../sessionStorage';

jest.mock('../logger', () => ({ logError: jest.fn() }));

describe('sessionStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('getOrCreateVisitorId returns existing id from localStorage', () => {
    localStorage.setItem('visitor-key', 'widget-existing');
    const id = getOrCreateVisitorId('visitor-key', 'widget');
    expect(id).toBe('widget-existing');
  });

  test('getOrCreateVisitorId creates and stores new visitor id when none exists', () => {
    const id = getOrCreateVisitorId('new-key', 'widget');
    expect(id).toMatch(/^widget-/);
    expect(localStorage.getItem('new-key')).toBe(id);
  });

  test('getOrCreateVisitorId falls back when localStorage throws and uses crypto.randomUUID', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('fail'); });
    jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('rand-uuid-123');

    const id = getOrCreateVisitorId('visitor-key', 'pref');
    expect(id).toBe('pref-fallback-rand-uuid-123');
  });

  test('getOrCreateVisitorId fallback when createRandomId throws uses timestamp fallback', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('fail'); });
    // Make randomUUID throw so createRandomId throws, triggering the Date.now() fallback
    jest.spyOn(globalThis.crypto, 'randomUUID').mockImplementation(() => { throw new Error('unavail'); });

    const id = getOrCreateVisitorId('visitor-key', 'pref2');
    expect(id).toMatch(/^pref2-fallback-[a-z0-9]+/i);
  });

  test('getStoredSessionByKey returns stored session when unexpired', () => {
    const future = new Date(Date.now() + 10 * 60 * 1000).toISOString();
    const payload = { sessionId: 's1', expiresAt: future };
    localStorage.setItem('sess-key', JSON.stringify(payload));
    const res = getStoredSessionByKey('sess-key');
    expect(res).not.toBeNull();
    expect(res?.sessionId).toBe('s1');
  });

  test('getStoredSessionByKey removes expired sessions and returns null', () => {
    const past = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const payload = { sessionId: 's2', expiresAt: past };
    localStorage.setItem('sess-key', JSON.stringify(payload));
    const res = getStoredSessionByKey('sess-key');
    expect(res).toBeNull();
    expect(localStorage.getItem('sess-key')).toBeNull();
  });

  test('getStoredSessionByKey returns null when session has no expiresAt field', () => {
    localStorage.setItem('no-exp-key', JSON.stringify({ sessionId: 'no-exp' }));
    const res = getStoredSessionByKey('no-exp-key');
    expect(res).toBeNull();
  });

  test('getStoredSessionByKey handles invalid JSON gracefully', () => {
    jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => '{notjson');
    const res = getStoredSessionByKey('bad-key');
    expect(res).toBeNull();
  });

  test('storeSessionByKey stores session JSON with createdAt', () => {
    storeSessionByKey('store-key', 'sess-10', new Date(Date.now() + 10000).toISOString());
    const raw = localStorage.getItem('store-key');
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw as string);
    expect(parsed.sessionId).toBe('sess-10');
    expect(parsed.createdAt).toBeTruthy();
  });

  test('storeSessionByKey logs and continues when setItem throws', () => {
    jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('quota'); });
    expect(() => storeSessionByKey('store-key', 'sess-err', new Date().toISOString())).not.toThrow();
  });
});
