import * as session from '../lib/sessionStorage'

jest.mock('../lib/logger', () => ({ logError: jest.fn() }))

describe('sessionStorage utils', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.restoreAllMocks()
  })

  test('getOrCreateVisitorId returns stored or creates new', () => {
    const key = 'vk'
    localStorage.setItem(key, 'existing')
    expect(session.getOrCreateVisitorId(key)).toBe('existing')
  })

  test('getOrCreateVisitorId falls back when crypto missing', () => {
    const orig = (global as any).crypto
    try {
      // remove crypto to force error
      // @ts-ignore
      delete (global as any).crypto
      const res = session.getOrCreateVisitorId('k1', 'pre')
      expect(typeof res).toBe('string')
      expect(res).toMatch(/^pre-/)
    } finally {
      // restore
      (global as any).crypto = orig
    }
  })

  test('getStoredSessionByKey handles valid and expired and parse error', () => {
    const key = 's-key'
    const future = new Date(Date.now() + 1000 * 60 * 10).toISOString()
    localStorage.setItem(key, JSON.stringify({ sessionId: 's1', expiresAt: future }))
    expect(session.getStoredSessionByKey(key)).not.toBeNull()
    // expired
    localStorage.setItem(key, JSON.stringify({ sessionId: 's1', expiresAt: new Date(Date.now() - 1000).toISOString() }))
    expect(session.getStoredSessionByKey(key)).toBeNull()
    // malformed
    localStorage.setItem(key, '{bad')
    expect(session.getStoredSessionByKey(key)).toBeNull()
  })

  test('storeSessionByKey writes and swallows errors', () => {
    const key = 'k2'
    session.storeSessionByKey(key, 'sess', new Date(Date.now() + 10000).toISOString())
    expect(localStorage.getItem(key)).toBeTruthy()
    // force setItem to throw
    const orig = localStorage.setItem
    // @ts-ignore
    localStorage.setItem = () => { throw new Error('no') }
    session.storeSessionByKey('k3', 's', new Date().toISOString())
    // restore
    // @ts-ignore
    localStorage.setItem = orig
  })

  test('getOrCreateVisitorId uses crypto.randomUUID when available', () => {
    const orig = (global as any).crypto
    try {
      (global as any).crypto = { randomUUID: () => 'uuid-123' }
      const res = session.getOrCreateVisitorId('k-rnd', 'p')
      expect(res).toContain('uuid-123')
      // cleanup stored value
      localStorage.removeItem('k-rnd')
    } finally {
      (global as any).crypto = orig
    }
  })

  test('getOrCreateVisitorId uses crypto.getRandomValues when available', () => {
    const orig = (global as any).crypto
    try {
      (global as any).crypto = {
        getRandomValues: (arr: Uint8Array) => {
          for (let i = 0; i < arr.length; i++) arr[i] = i
          return arr
        },
      }
      const res = session.getOrCreateVisitorId('k-rand', 'px')
      expect(typeof res).toBe('string')
      expect(res.startsWith('px-')).toBe(true)
      localStorage.removeItem('k-rand')
    } finally {
      (global as any).crypto = orig
    }
  })
})
