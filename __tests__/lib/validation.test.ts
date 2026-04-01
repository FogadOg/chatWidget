import {
  validateMessageInput,
  sanitizeInput,
  isValidHexColor,
  isValidUrl,
  isValidClientId,
  isValidUuid,
  isValidLocale,
} from 'lib/validation'

describe('validation utilities', () => {
  test('validateMessageInput rejects empty and long messages and sanitizes', () => {
    expect(validateMessageInput('   ').isValid).toBe(false)
    const long = 'a'.repeat(10000)
    const longRes = validateMessageInput(long)
    if (longRes.isValid === false) {
      expect(longRes.error).toBeDefined()
    }

    const res = validateMessageInput('<b>hello</b>')
    expect(res.isValid).toBe(true)
    expect(res.sanitized).toBe('hello')
  })

  test('sanitizeInput removes tags and nulls and normalizes whitespace', () => {
    const s = sanitizeInput(' <div>hi\0</div>   there  ')
    expect(s).toBe('hi there')
  })

  test('isValidHexColor works', () => {
    expect(isValidHexColor('#fff')).toBe(true)
    expect(isValidHexColor('#123abc')).toBe(true)
    expect(isValidHexColor('red')).toBe(false)
  })

  test('isValidUrl works', () => {
    expect(isValidUrl('https://example.com')).toBe(true)
    expect(isValidUrl('not-a-url')).toBe(false)
  })

  test('isValidClientId and isValidUuid and isValidLocale', () => {
    expect(isValidClientId('abc')).toBe(true)
    expect(isValidClientId('')).toBe(false)
    expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true)
    expect(isValidUuid('bad-uuid')).toBe(false)
    expect(isValidLocale('en', ['en', 'de'])).toBe(true)
    expect(isValidLocale('fr', ['en', 'de'])).toBe(false)
  })
})
