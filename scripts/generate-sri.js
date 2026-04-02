#!/usr/bin/env node
/**
 * SRI (Subresource Integrity) hash generator.
 *
 * Scans the Next.js build output directory for all JS and CSS assets and
 * writes a `sri-manifest.json` to the project root containing
 * `{ "/_next/static/...": "sha384-<hash>" }` entries.
 *
 * Usage:
 *   node scripts/generate-sri.js [<build-dir>] [<output-manifest>]
 *
 * Defaults:
 *   build-dir        .next
 *   output-manifest  sri-manifest.json
 *
 * The manifest is consumed at runtime by layout.tsx / _document.tsx to inject
 * `integrity` and `crossorigin="anonymous"` attributes into <script> and
 * <link> tags.
 *
 * CI gate: if sri-manifest.json is empty or missing, the build should fail.
 */

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

/**
 * Compute sha384 hash of a file buffer, return base64-encoded digest.
 * @param {Buffer} buf
 * @returns {string}
 */
function sha384(buf) {
  return crypto.createHash('sha384').update(buf).digest('base64');
}

/**
 * Walk a directory tree and collect asset files matching the predicate.
 * @param {string} dir
 * @param {(f: string) => boolean} predicate
 * @param {string[]} acc
 * @returns {string[]}
 */
function walk(dir, predicate, acc = []) {
  if (!fs.existsSync(dir)) return acc;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(full, predicate, acc);
    } else if (predicate(entry.name)) {
      acc.push(full);
    }
  }
  return acc;
}

/** Matches JS and CSS filenames. */
const ASSET_PREDICATE = (name) => /\.(js|css)$/.test(name);

/**
 * Generate an SRI manifest for a Next.js build.
 *
 * @param {string} buildDir  Path to the .next build output directory.
 * @param {string} manifestOut  Path to write the resulting JSON manifest.
 * @returns {Record<string, string>}  The manifest object that was written.
 */
function run(buildDir, manifestOut) {
  const staticDir = path.join(buildDir, 'static');
  const assets = walk(staticDir, ASSET_PREDICATE);

  if (assets.length === 0) {
    console.error(
      `[generate-sri] No assets found under ${staticDir}. Run 'next build' first.`
    );
    process.exit(1);
  }

  /** @type {Record<string, string>} */
  const manifest = {};

  for (const assetPath of assets) {
    const buf = fs.readFileSync(assetPath);
    const hash = sha384(buf);
    // Construct the public URL path relative to the build dir
    const rel = path.relative(buildDir, assetPath).replace(/\\/g, '/');
    manifest[`/_next/${rel}`] = `sha384-${hash}`;
  }

  fs.writeFileSync(manifestOut, JSON.stringify(manifest, null, 2), 'utf-8');
  console.log(
    `[generate-sri] Wrote ${Object.keys(manifest).length} SRI entries → ${manifestOut}`
  );

  return manifest;
}

// Only execute when run directly as a CLI script.
if (require.main === module) {
  const ROOT = path.resolve(__dirname, '..');
  const buildDir = path.resolve(ROOT, process.argv[2] || '.next');
  const manifestOut = path.resolve(ROOT, process.argv[3] || 'sri-manifest.json');
  run(buildDir, manifestOut);
}

module.exports = { sha384, walk, ASSET_PREDICATE, run };
