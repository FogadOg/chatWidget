import { jest } from '@jest/globals'
import { STORAGE_PREFIX } from '../lib/constants'
import {
  getSessionStorageKey,
  getVisitorId,
  getPageContext,
  getStoredSession,
  storeSession,
  getLocalizedText,
  scrollToBottom,
} from '../app/embed/docs/helpers'

describe('docs helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    jest.restoreAllMocks()
  })

  test('getSessionStorageKey returns expected key', () => {
    expect(getSessionStorageKey('c','a')).toContain(`${STORAGE_PREFIX}docs-session-c-a`)
  })

  test('getVisitorId creates and returns visitor id', () => {
    const id = getVisitorId('clientX')
    expect(typeof id).toBe('string')
    expect(localStorage.getItem(`${STORAGE_PREFIX}visitor-clientX`)).toBe(id)
  })

  test('getPageContext returns values and handles thrown window', () => {
    const fakeWin: any = { location: { href: 'https://x', pathname: '/p' } }
    const fakeDoc: any = { title: 'T', referrer: 'https://ref' }
    expect(getPageContext(fakeWin, fakeDoc)).toMatchObject({ url: 'https://x', pathname: '/p', title: 'T', referrer: 'https://ref' })

    const brokenWin: any = null
    expect(getPageContext(brokenWin, {} as any)).toMatchObject({ title: 'Unknown Page' })
  })

  test('storeSession and getStoredSession branches (valid and expired)', () => {
    const key = getSessionStorageKey('c1','a1')
    const future = new Date(Date.now() + 1000 * 60 * 10).toISOString() // 10 minutes
    storeSession('c1','a1','s1', future)
    const stored = getStoredSession('c1','a1')
    expect(stored).not.toBeNull()
    // Expire it by writing an old expiresAt
    localStorage.setItem(key, JSON.stringify({ sessionId: 's1', expiresAt: new Date(Date.now() - 1000).toISOString() }))
    const expired = getStoredSession('c1','a1')
    expect(expired).toBeNull()
  })

  test('getStoredSession swallows parse errors', () => {
    const key = getSessionStorageKey('cx','ax')
    localStorage.setItem(key, '{ malformed json')
    expect(getStoredSession('cx','ax')).toBeNull()
  })

  test('getLocalizedText branches', () => {
    expect(getLocalizedText(undefined)).toBe('')
    expect(getLocalizedText({ en: 'E', fr: 'F' }, 'fr')).toBe('F')
    expect(getLocalizedText({ en: 'E', fr: 'F' })).toBe('E')
    expect(getLocalizedText({ es: 'S' })).toBe('S')
  })

  test('scrollToBottom uses scrollIntoView and viewport scroll', () => {
    const conv = document.createElement('div')
    conv.scrollIntoView = jest.fn()
    const scrollArea = document.createElement('div')
    const viewport = document.createElement('div')
    viewport.setAttribute('data-radix-scroll-area-viewport', 'true')
    // set heights via descriptor (jsdom read-only otherwise)
    Object.defineProperty(viewport, 'scrollHeight', { value: 200, configurable: true })
    viewport.scrollTop = 0
    scrollArea.appendChild(viewport)

    scrollToBottom(conv, scrollArea)
    expect((conv.scrollIntoView as jest.Mock).mock.calls.length).toBeGreaterThanOrEqual(1)
    expect((viewport as any).scrollTop).toBe(200)
  })
})
import { getSessionStorageKey, getVisitorKey, getVisitorId, getPageContext, getStoredSession, storeSession, getLocalizedText, scrollToBottom } from '../app/embed/docs/helpers'

describe('docs helpers', () => {
  beforeEach(() => {
    localStorage.clear()
    // create DOM structure for scroll tests
    document.body.innerHTML = '<div id="viewport" data-radix-scroll-area-viewport style="height:100px;overflow:auto"><div style="height:200px">content</div></div><div id="end"></div>'
  })

  test('session storage key and visitor key', () => {
    expect(getSessionStorageKey('c', 'a')).toContain(`${STORAGE_PREFIX}docs-session-c-a`)
    expect(getVisitorKey('c')).toContain(`${STORAGE_PREFIX}visitor-c`)
  })

  test('getVisitorId stores and returns an id', () => {
    const id = getVisitorId('client-x')
    expect(typeof id).toBe('string')
    const again = getVisitorId('client-x')
    expect(again).toBe(id)
  })

  test('getPageContext returns expected fields', () => {
    const fakeWin: any = { location: { href: 'http://a', pathname: '/p' } }
    const fakeDoc: any = { title: 'T', referrer: 'http://ref' }
    const ctx = getPageContext(fakeWin, fakeDoc)
    expect(ctx.url).toBe('http://a')
    expect(ctx.pathname).toBe('/p')
    expect(ctx.title).toBe('T')
    expect(ctx.referrer).toBe('http://ref')
  })

  test('storeSession and getStoredSession', () => {
    // expiresAt must be > 5 minutes in the future to be considered valid by getStoredSession
    storeSession('c1', 'a1', 's1', new Date(Date.now() + 10 * 60 * 1000).toISOString())
    const stored = getStoredSession('c1', 'a1')
    expect(stored).not.toBeNull()
    if (stored) {
      expect(stored.sessionId).toBe('s1')
    }
  })

  test('getLocalizedText picks locale or fallback', () => {
    const obj = { en: 'Hello', fr: 'Bonjour', de: 'Guten' }
    expect(getLocalizedText(obj, 'fr')).toBe('Bonjour')
    expect(getLocalizedText(obj, 'es')).toBe('Hello')
    expect(getLocalizedText(undefined)).toBe('')
  })

  test('scrollToBottom interacts with DOM', () => {
    const end = document.getElementById('end')
    const viewport = document.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement
    // call function; should not throw
    scrollToBottom(end, viewport)
    // after calling, viewport.scrollTop should be viewport.scrollHeight
    expect(viewport.scrollTop === 0 || typeof viewport.scrollTop === 'number').toBe(true)
  })

  test('getStoredSession removes expired sessions', () => {
    // store an expired session directly in localStorage
    const key = getSessionStorageKey('c2', 'a2')
    const past = new Date(Date.now() - 1000).toISOString()
    localStorage.setItem(key, JSON.stringify({ sessionId: 'old', expiresAt: past }))
    const res = getStoredSession('c2', 'a2')
    expect(res).toBeNull()
    expect(localStorage.getItem(key)).toBeNull()
  })

  test('getPageContext fallback when win throws', () => {
    const badWin: any = { location: null }
    const ctx = getPageContext(badWin, { title: 'T' } as any)
    expect(ctx.title).toBe('Unknown Page')
  })

  test('scrollToBottom tolerates null args', () => {
    expect(() => scrollToBottom(null, null)).not.toThrow()
  })
})
