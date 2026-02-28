import { normalizeHexColor, hexToRgb } from '../../lib/colors';

describe('colors utilities', () => {
  test('normalizeHexColor returns fallback on undefined', () => {
    expect(normalizeHexColor(undefined, '#123456')).toBe('#123456');
  });

  test('normalizeHexColor allows valid 3‑digit hex', () => {
    expect(normalizeHexColor('#abc', '#000')).toBe('#abc');
  });

  test('normalizeHexColor allows valid 6‑digit hex', () => {
    expect(normalizeHexColor('#a1b2c3', '#000')).toBe('#a1b2c3');
  });

  test('normalizeHexColor falls back on invalid string', () => {
    expect(normalizeHexColor('not-a-color', '#000')).toBe('#000');
  });

  test('hexToRgb converts correctly', () => {
    expect(hexToRgb('#000000')).toBe('0, 0, 0');
    expect(hexToRgb('#ffffff')).toBe('255, 255, 255');
  });

  test('hexToRgb returns white for invalid input', () => {
    expect(hexToRgb('foo')).toBe('255, 255, 255');
  });
});
