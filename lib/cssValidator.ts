/**
 * Sanitizes a CSS string to prevent injection of executable or
 * exfiltrating constructs while preserving normal styling rules.
 *
 * Strips: javascript: urls, expression(), @import, data: URIs.
 */
export function sanitizeCss(css: string | undefined): string {
  if (!css) return '';

  return css
    // Remove @import rules entirely (line by line)
    .replace(/@import\b[^;]*;?/gi, '')
    // Remove javascript: inside url()
    .replace(/url\s*\(\s*["']?\s*javascript:[^"')]*(?:["'][^"']*["'][^"')]*)*\)/gi, 'url()')
    // Remove data: URIs inside url()
    .replace(/url\s*\(\s*["']?\s*data:[^"')]*(?:["'][^"']*["'][^"')]*)*\)/gi, 'url()')
    // Remove IE expression() — NOTE: does not handle comment-insertion bypass
    // (expression/**/()), which only affects IE6-8 and is not a modern concern.
    .replace(/expression\s*\([^)]*\)/gi, '')
    .trim();
}
