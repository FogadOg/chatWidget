import {
  validateMessageInput,
  sanitizeInput,
  isValidHexColor,
  isValidUrl,
  isValidClientId,
  isValidUuid,
  isValidLocale,
} from '../lib/validation';
import { INPUT_LIMITS } from '../lib/constants';

describe('validation utilities', () => {
  describe('validateMessageInput', () => {
    it('rejects empty or whitespace-only messages', () => {
      const res = validateMessageInput('   ');
      expect(res.isValid).toBe(false);
      expect(res.error).toBe('Message cannot be empty');
      expect(res.sanitized).toBe('');
    });

    it('rejects messages exceeding max length', () => {
      const long = 'x'.repeat(INPUT_LIMITS.MAX_MESSAGE_LENGTH + 1);
      const res = validateMessageInput(long);
      expect(res.isValid).toBe(false);
      expect(res.error).toContain(`maximum length of ${INPUT_LIMITS.MAX_MESSAGE_LENGTH}`);
      expect(res.sanitized.length).toBe(long.length);
    });

    it('sanitizes dangerous input and returns valid result', () => {
      const input = '<script>alert(1)</script> hello\0   world';
      const res = validateMessageInput(input);
      expect(res.isValid).toBe(true);
      expect(res.sanitized).toBe('alert(1) hello world');
    });
  });

  describe('sanitizeInput', () => {
    it('removes tags, nulls, and collapses whitespace', () => {
      const raw = 'foo <b>bar</b>\0 baz   qux';
      expect(sanitizeInput(raw)).toBe('foo bar baz qux');
    });
  });

  describe('isValidHexColor', () => {
    it('accepts 3 and 6 digit hex', () => {
      expect(isValidHexColor('#abc')).toBe(true);
      expect(isValidHexColor('#abcdef')).toBe(true);
    });
    it('rejects invalid hex codes', () => {
      expect(isValidHexColor('abc')).toBe(false);
      expect(isValidHexColor('#abcd')).toBe(false);
      expect(isValidHexColor('#12345g')).toBe(false);
    });
  });

  describe('isValidUrl', () => {
    it('recognizes valid URLs', () => {
      expect(isValidUrl('https://example.com')).toBe(true);
      expect(isValidUrl('http://localhost:3000/path')).toBe(true);
    });
    it('rejects malformed URLs', () => {
      expect(isValidUrl('not a url')).toBe(false);
      expect(isValidUrl('ftp://example.com')).toBe(true); // URL constructor accepts ftp
      expect(isValidUrl('')).toBe(false);
    });
  });

  describe('isValidClientId', () => {
    it('validates non-empty string under 255 chars', () => {
      expect(isValidClientId('abc')).toBe(true);
      expect(isValidClientId(' '.repeat(10))).toBe(false);
      expect(isValidClientId('a'.repeat(256))).toBe(false);
    });
  });

  describe('isValidUuid', () => {
    it('accepts proper UUID formats', () => {
      expect(isValidUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isValidUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true); // case insensitive
    });
    it('rejects invalid UUIDs', () => {
      expect(isValidUuid('not-a-uuid')).toBe(false);
      expect(isValidUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false); // too short
    });
  });

  describe('isValidLocale', () => {
    const supported = ['en', 'de', 'fr'];
    it('returns true for supported locale', () => {
      expect(isValidLocale('de', supported)).toBe(true);
    });
    it('returns false for unsupported locale', () => {
      expect(isValidLocale('es', supported)).toBe(false);
    });
  });
});
