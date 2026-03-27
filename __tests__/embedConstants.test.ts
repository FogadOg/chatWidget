import { EMBED_EVENTS, STORAGE_KEYS, targetOrigin, sensitiveOrigin } from '../lib/embedConstants'
import { STORAGE_PREFIX } from '../lib/constants'

describe('embedConstants', () => {
  test('EMBED_EVENTS contains keys', () => {
    expect(EMBED_EVENTS.INIT_CONFIG).toBeTruthy()
  })

  test('STORAGE_KEYS functions produce strings', () => {
    expect(STORAGE_KEYS.sessionPrefix('c','a')).toContain(`${STORAGE_PREFIX}session-c-a`)
    expect(STORAGE_KEYS.visitorPrefix('c')).toContain(`${STORAGE_PREFIX}visitor-c`)
  })

  test('targetOrigin fallback and explicit', () => {
    expect(targetOrigin()).toBe('*')
    expect(targetOrigin('https://x')).toBe('https://x')
  })
})

describe('targetOrigin', () => {
  it('returns explicit origin when provided', () => {
    expect(targetOrigin('https://example.com')).toBe('https://example.com');
  });

  it('falls back to * when absent', () => {
    expect(targetOrigin()).toBe('*');
    expect(targetOrigin(undefined)).toBe('*');
  });
});

describe('sensitiveOrigin', () => {
  it('returns the explicit origin when provided', () => {
    expect(sensitiveOrigin('https://example.com')).toBe('https://example.com');
  });

  it('returns null when no origin is provided', () => {
    expect(sensitiveOrigin()).toBeNull();
    expect(sensitiveOrigin(undefined)).toBeNull();
    expect(sensitiveOrigin('')).toBeNull();
  });
});
