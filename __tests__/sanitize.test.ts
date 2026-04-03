/**
 * Sanitize helper tests.
 *
 * DOMPurify requires a real DOM, so this suite runs under the default
 * jsdom test environment (no @jest-environment override needed).
 */

describe('sanitize() helper', () => {
  it('strips <script> tags', async () => {
    const { sanitize } = await import('../src/lib/sanitize');
    const result = sanitize('<p>Hello</p><script>alert(1)</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('<p>Hello</p>');
  });

  it('strips javascript: href', async () => {
    const { sanitize } = await import('../src/lib/sanitize');
    const result = sanitize('<a href="javascript:alert(1)">click</a>');
    expect(result).not.toContain('javascript:');
  });

  it('strips inline event handlers', async () => {
    const { sanitize } = await import('../src/lib/sanitize');
    const result = sanitize('<img src="x" onerror="alert(1)" />');
    expect(result).not.toContain('onerror');
  });

  it('preserves safe HTML', async () => {
    const { sanitize } = await import('../src/lib/sanitize');
    const result = sanitize('<p>Hello <strong>world</strong></p>');
    expect(result).toContain('<p>Hello <strong>world</strong></p>');
  });

  it('sanitizeText strips all tags', async () => {
    const { sanitizeText } = await import('../src/lib/sanitize');
    const result = sanitizeText('<b>bold</b> text');
    expect(result).not.toContain('<b>');
    expect(result).toContain('bold');
  });
});
