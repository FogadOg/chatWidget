/** @jest-environment node */

/**
 * Tests for scripts/generate-sri.js.
 *
 * The script exports sha384, walk, ASSET_PREDICATE, and run() so tests can
 * import and call them in-process, giving Jest full coverage visibility.
 * A final smoke-test suite still spawns the CLI to verify the require.main guard.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const { sha384, walk, ASSET_PREDICATE, run } = require('../scripts/generate-sri');
const scriptPath = path.resolve(__dirname, '..', 'scripts', 'generate-sri.js');

// ---------------------------------------------------------------------------
// sha384
// ---------------------------------------------------------------------------

describe('sha384()', () => {
  test('returns a base64 sha384 digest of the given buffer', () => {
    const buf = Buffer.from('hello world');
    const expected = crypto.createHash('sha384').update(buf).digest('base64');
    expect(sha384(buf)).toBe(expected);
  });

  test('produces different digests for different inputs', () => {
    expect(sha384(Buffer.from('foo'))).not.toBe(sha384(Buffer.from('bar')));
  });

  test('is deterministic – same input gives same digest', () => {
    const buf = Buffer.from('deterministic');
    expect(sha384(buf)).toBe(sha384(buf));
  });
});

// ---------------------------------------------------------------------------
// ASSET_PREDICATE
// ---------------------------------------------------------------------------

describe('ASSET_PREDICATE', () => {
  test.each([
    ['main.js',          true],
    ['chunk-abc123.js',  true],
    ['styles.css',       true],
    ['theme.min.css',    true],
    ['image.png',        false],
    ['font.woff2',       false],
    ['data.json',        false],
    ['README.md',        false],
    ['noextension',      false],
  ])('ASSET_PREDICATE("%s") === %s', (name, expected) => {
    expect(ASSET_PREDICATE(name)).toBe(expected);
  });
});

// ---------------------------------------------------------------------------
// walk()
// ---------------------------------------------------------------------------

describe('walk()', () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'walk-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  test('returns [] for a non-existent directory', () => {
    expect(walk('/does/not/exist/at/all', () => true)).toEqual([]);
  });

  test('returns [] when no files match the predicate', () => {
    fs.writeFileSync(path.join(tmp, 'image.png'), '');
    expect(walk(tmp, ASSET_PREDICATE)).toEqual([]);
  });

  test('collects matching files at the top level', () => {
    const jsFile = path.join(tmp, 'app.js');
    fs.writeFileSync(jsFile, '');
    const result = walk(tmp, ASSET_PREDICATE);
    expect(result).toContain(jsFile);
    expect(result).toHaveLength(1);
  });

  test('collects matching files recursively through sub-directories', () => {
    const subDir = path.join(tmp, 'chunks', 'nested');
    fs.mkdirSync(subDir, { recursive: true });
    const jsFile = path.join(subDir, 'vendor.js');
    const cssFile = path.join(tmp, 'styles.css');
    fs.writeFileSync(jsFile, '');
    fs.writeFileSync(cssFile, '');
    const result = walk(tmp, ASSET_PREDICATE);
    expect(result).toContain(jsFile);
    expect(result).toContain(cssFile);
    expect(result).toHaveLength(2);
  });

  test('accumulates into a provided acc array', () => {
    const existing = ['/prior/entry.js'];
    const jsFile = path.join(tmp, 'new.js');
    fs.writeFileSync(jsFile, '');
    const result = walk(tmp, ASSET_PREDICATE, existing);
    expect(result[0]).toBe('/prior/entry.js');
    expect(result).toContain(jsFile);
  });

  test('ignores non-matching files', () => {
    fs.writeFileSync(path.join(tmp, 'app.js'), '');
    fs.writeFileSync(path.join(tmp, 'logo.svg'), '');
    fs.writeFileSync(path.join(tmp, 'data.json'), '');
    const result = walk(tmp, ASSET_PREDICATE);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatch(/app\.js$/);
  });
});

// ---------------------------------------------------------------------------
// run()
// ---------------------------------------------------------------------------

describe('run()', () => {
  let tmp;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sri-run-'));
  });

  afterEach(() => {
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  function makeAssets(buildDir, files) {
    for (const [rel, content] of Object.entries(files)) {
      const full = path.join(buildDir, 'static', rel);
      fs.mkdirSync(path.dirname(full), { recursive: true });
      fs.writeFileSync(full, content, 'utf8');
    }
  }

  test('writes manifest JSON with correct sha384 hashes', () => {
    const buildDir = path.join(tmp, '.next');
    const manifestOut = path.join(tmp, 'sri-manifest.json');
    const jsContent = "console.log('hi');\n";
    const cssContent = 'body{}\n';

    makeAssets(buildDir, {
      'chunks/app.js': jsContent,
      'css/styles.css': cssContent,
    });

    const manifest = run(buildDir, manifestOut);

    expect(fs.existsSync(manifestOut)).toBe(true);
    expect(manifest['/_next/static/chunks/app.js']).toBe(
      `sha384-${sha384(Buffer.from(jsContent))}`
    );
    expect(manifest['/_next/static/css/styles.css']).toBe(
      `sha384-${sha384(Buffer.from(cssContent))}`
    );
  });

  test('manifest written to disk equals the returned object', () => {
    const buildDir = path.join(tmp, '.next');
    const manifestOut = path.join(tmp, 'out.json');
    makeAssets(buildDir, { 'chunks/main.js': 'var x=1;' });

    const returned = run(buildDir, manifestOut);
    const onDisk = JSON.parse(fs.readFileSync(manifestOut, 'utf8'));
    expect(onDisk).toEqual(returned);
  });

  test('all manifest keys start with /_next/', () => {
    const buildDir = path.join(tmp, '.next');
    const manifestOut = path.join(tmp, 'out.json');
    makeAssets(buildDir, { 'chunks/a.js': '' });

    const manifest = run(buildDir, manifestOut);
    expect(Object.keys(manifest).every((k) => k.startsWith('/_next/'))).toBe(true);
  });

  test('excludes non-JS/CSS files from the manifest', () => {
    const buildDir = path.join(tmp, '.next');
    const manifestOut = path.join(tmp, 'out.json');
    makeAssets(buildDir, {
      'chunks/a.js': 'a',
      'css/b.css': 'b',
      'media/logo.png': 'img',
    });

    const manifest = run(buildDir, manifestOut);
    expect(Object.keys(manifest)).toHaveLength(2);
  });

  test('calls process.exit(1) and logs an error when no assets exist', () => {
    const buildDir = path.join(tmp, '.next');
    fs.mkdirSync(path.join(buildDir, 'static'), { recursive: true });

    const exitSpy = jest.spyOn(process, 'exit').mockImplementation(() => {
      throw new Error('process.exit called');
    });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    expect(() => run(buildDir, path.join(tmp, 'out.json'))).toThrow('process.exit called');
    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('No assets found'));

    exitSpy.mockRestore();
    errorSpy.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// CLI smoke-test — verifies the require.main guard works end-to-end
// ---------------------------------------------------------------------------

describe('CLI invocation', () => {
  test('exits 0 and writes a manifest when run as a script', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sri-cli-'));
    try {
      const buildDir = path.join(tmp, '.next');
      fs.mkdirSync(path.join(buildDir, 'static', 'chunks'), { recursive: true });
      fs.writeFileSync(path.join(buildDir, 'static', 'chunks', 'app.js'), 'var x=1;\n', 'utf8');

      const manifestOut = path.join(tmp, 'sri-manifest.json');
      const res = spawnSync(process.execPath, [scriptPath, buildDir, manifestOut], {
        encoding: 'utf8',
      });

      expect(res.status).toBe(0);
      expect(fs.existsSync(manifestOut)).toBe(true);
      expect(Object.keys(JSON.parse(fs.readFileSync(manifestOut, 'utf8')))).toHaveLength(1);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });

  test('exits non-zero with error message when no assets found', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sri-cli-empty-'));
    try {
      const buildDir = path.join(tmp, '.next');
      fs.mkdirSync(path.join(buildDir, 'static'), { recursive: true });

      const res = spawnSync(process.execPath, [scriptPath, buildDir, path.join(tmp, 'out.json')], {
        encoding: 'utf8',
      });

      expect(res.status).not.toBe(0);
      expect(res.stderr).toMatch(/No assets found/);
    } finally {
      fs.rmSync(tmp, { recursive: true, force: true });
    }
  });
});
