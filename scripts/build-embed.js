#!/usr/bin/env node
/**
 * build-embed.js
 *
 * Copies each source embed script from src/embed/ → public/ and prepends a
 * "DO NOT EDIT" header so editors know where the real source lives.
 *
 * Files managed:
 *   src/embed/docs-widget.js  →  public/docs-widget.js
 *   src/embed/widget.js       →  public/widget.js
 *
 * Usage:
 *   node scripts/build-embed.js
 *   npm run build:embed
 */

const fs   = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const FILES = [
  { src: 'src/embed/docs-widget.js', dst: 'public/docs-widget.js' },
  { src: 'src/embed/widget.js',      dst: 'public/widget.js' },
];

function buildEmbedFile(src, dst) {
  const srcPath = path.join(ROOT, src);
  const dstPath = path.join(ROOT, dst);

  const header = `// =============================================================================
// AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY
// Source: ${src}
// Regenerate: npm run build:embed
// =============================================================================
`;

  const source = fs.readFileSync(srcPath, 'utf8');

  // Strip any existing generated header so re-runs stay idempotent
  const stripped = source.startsWith('// ===')
    ? source.replace(/^\/\/ =+[\s\S]*?\/\/ =+\n/, '')
    : source;

  fs.writeFileSync(dstPath, header + stripped, 'utf8');
  console.log(`build:embed  ${src} → ${dst}`);
}

for (const { src, dst } of FILES) {
  buildEmbedFile(src, dst);
}

