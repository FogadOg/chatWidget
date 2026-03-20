import { EMBED_EVENTS, STORAGE_KEYS, targetOrigin } from '../lib/embedConstants'

describe('embedConstants', () => {
  test('EMBED_EVENTS contains keys', () => {
    expect(EMBED_EVENTS.INIT_CONFIG).toBeTruthy()
  })

  test('STORAGE_KEYS functions produce strings', () => {
    expect(STORAGE_KEYS.sessionPrefix('c','a')).toContain('companin-session-c-a')
    expect(STORAGE_KEYS.visitorPrefix('c')).toContain('companin-visitor-c')
  })

  test('targetOrigin fallback and explicit', () => {
    expect(targetOrigin()).toBe('*')
    expect(targetOrigin('https://x')).toBe('https://x')
  })
})
