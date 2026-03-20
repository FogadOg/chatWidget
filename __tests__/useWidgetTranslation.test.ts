import { renderHook, act } from '@testing-library/react'
import * as hooks from '../hooks/useWidgetTranslation'

// Simple lightweight mock of i18n that mirrors behavior needed for tests
jest.mock('../lib/i18n', () => {
  const SUPPORTED = ['en', 'de', 'es', 'fr', 'pt', 'sv', 'nl', 'nb', 'it']
  return {
    getTranslations: (locale: string) => ({
      send: locale === 'it' ? 'Invia' : 'Send',
      typeYourMessage: 'Type your message',
    }),
    resolveLocaleCandidates: (candidates: Array<string | null | undefined>) => {
      for (const c of candidates) {
        if (!c) continue
        const norm = String(c).split('-')[0].toLowerCase()
        if (SUPPORTED.includes(norm)) return norm
      }
      return 'en'
    },
  }
})

const { useWidgetTranslation, getInitialLocale } = hooks

describe('useWidgetTranslation', () => {
  const originalURLSearchParams = global.URLSearchParams
  const origNavigator = global.navigator

  beforeEach(() => {
    // reset environment pieces tests mutate
    try {
      window.localStorage.clear()
    } catch {}
    document.documentElement.lang = ''
    global.URLSearchParams = originalURLSearchParams
    // ensure navigator exists
    // @ts-ignore
    global.navigator = { languages: ['en-US'], language: 'en-US' }
  })

  afterEach(() => {
    global.URLSearchParams = originalURLSearchParams
    global.navigator = origNavigator
  })

  it('getInitialLocale returns en on SSR', () => {
    // isolate modules so we can simulate SSR without mutating the shared global
    jest.isolateModules(() => {
      const origWindow = (global as any).window
      try {
        // @ts-ignore
        delete (global as any).window
        // require a fresh copy of the hook module and call the exported fn
         
        const mod = require('../hooks/useWidgetTranslation')
        const out = mod.getInitialLocale()
        expect(out).toBe('en')
      } finally {
        (global as any).window = origWindow
      }
    })
  })

  it('resolves locale from URL param when supported', () => {
    global.URLSearchParams = jest.fn().mockImplementation(() => ({ get: (_k: string) => 'fr' })) as any
    expect(getInitialLocale()).toBe('fr')
  })

  it('falls back to en for unsupported locales', () => {
    global.URLSearchParams = jest.fn().mockImplementation(() => ({ get: () => 'xx' })) as any
    // navigator languages also unsupported
    // @ts-ignore
    global.navigator = { languages: ['xx-XX'], language: 'xx-XX' }
    expect(getInitialLocale()).toBe('en')
  })

  it('useWidgetTranslation returns translations and updates when deferred timer fires', () => {
    jest.useFakeTimers()
    // initial: navigator gives en
    // make URLSearchParams return 'it' on the third call (deferred update)
    let calls = 0
    jest.spyOn(URLSearchParams.prototype, 'get').mockImplementation(() => {
      calls++
      if (calls === 3) return 'it'
      return null
    })

    const { result } = renderHook(() => useWidgetTranslation())
    expect(result.current.locale).toBe('en')

    act(() => jest.runAllTimers())

    expect(result.current.locale).toBe('it')
    expect(result.current.translations).toHaveProperty('send')

    jest.useRealTimers()
  })

  it('handles localStorage.getItem throwing gracefully', () => {
    // cause localStorage.getItem to throw to hit the catch branch in getInitialLocale
    jest.spyOn(window.localStorage.__proto__, 'getItem').mockImplementation(() => {
      throw new Error('fail')
    })

    const { result } = renderHook(() => useWidgetTranslation())
    // still returns a locale string (falls back to navigator)
    expect(typeof result.current.locale).toBe('string')

    // restore mock
    ;(window.localStorage.__proto__.getItem as any).mockRestore()
  })

  it('handles localStorage.setItem throwing gracefully', () => {
    jest.spyOn(window.localStorage.__proto__, 'setItem').mockImplementation(() => {
      throw new Error('nope')
    })

    const { result } = renderHook(() => useWidgetTranslation())
    expect(typeof result.current.locale).toBe('string')

    ;(window.localStorage.__proto__.setItem as any).mockRestore()
  })

  it('getInitialLocale SSR via resetModules returns en', () => {
    const origWindow = (global as any).window
    try {
      // simulate SSR
      // @ts-ignore
      delete (global as any).window
      jest.resetModules()
       
      const mod = require('../hooks/useWidgetTranslation')
      expect(mod.getInitialLocale()).toBe('en')
    } finally {
      (global as any).window = origWindow
    }
  })
})
