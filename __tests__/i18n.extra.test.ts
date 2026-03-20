import { getLocaleDirection, resolveLocaleCandidates } from '../lib/i18n'

describe('i18n extra branches', () => {
  it('detects rtl locales and returns short code', () => {
    expect(getLocaleDirection('ar')).toBe('rtl')
    const res = resolveLocaleCandidates([null, 'ar-EG', 'en'])
    expect(res).toBe('ar')
  })

  it('skips invalid locale tags and falls back to en', () =>
    expect(resolveLocaleCandidates(['', '@@bad!!', undefined, 'zz-ZZ'])).toBe('en'))
})
