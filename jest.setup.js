import '@testing-library/jest-dom'

// ---------------------------------------------------------------------------
// Polyfill Web Fetch API globals (Request, Response, Headers, fetch)
// Jest's jsdom environment may not expose Node 18+'s native fetch globals.
// We promote them from the Node process global into jsdom's globalThis so
// that any code referencing Request/Response/Headers at module-evaluation
// time (e.g. next/server internals) can find them.
// Files that test server-side Next.js code should also add:
//   /** @jest-environment node */
// at the top of the file so they run in an environment that has all Node
// globals natively, without needing this polyfill at all.
// ---------------------------------------------------------------------------
if (typeof globalThis.Request === 'undefined') {
  // Node 18+ exposes these on the process global; access via Function scope
  // to avoid jsdom's window proxy interfering.
  const nodeGlobal = Function('return globalThis')();
  if (typeof nodeGlobal.Request !== 'undefined') {
    if (!globalThis.fetch)     globalThis.fetch     = nodeGlobal.fetch;
    if (!globalThis.Request)   globalThis.Request   = nodeGlobal.Request;
    if (!globalThis.Response)  globalThis.Response  = nodeGlobal.Response;
    if (!globalThis.Headers)   globalThis.Headers   = nodeGlobal.Headers;
  }
}

// Set up environment variables for testing
process.env.NEXT_PUBLIC_API_BASE_URL = 'https://api.test.com';

// baseline-browser-mapping prints a warning if its data is old; tests don't need this info
// Some packages pull it in automatically and it logs on import, so instead of
// mocking we simply suppress the warning text so our test output stays clean.
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && args[0].includes('[baseline-browser-mapping]')) {
    return;
  }
  if (args[0] && typeof args[0] === 'string' && args[0].includes('missing widget_type')) {
    return;
  }
  // Suppress widget config validation warnings that arise from tests that
  // deliberately boot the widget without a full config object.
  if (args[0] && typeof args[0] === 'string' && args[0].startsWith('[widget] Missing required field')) {
    return;
  }
  // Suppress cross-test-contamination noise from accumulated window.addEventListener
  // listeners in handshake tests — accumulated listeners reject events fired by
  // later tests, producing harmless but noisy console output.
  if (args[0] && typeof args[0] === 'string' && args[0].startsWith('[handshake]')) {
    return;
  }
  originalWarn.apply(console, args);
};

// we still mock the module so any runtime access is safe
jest.mock('baseline-browser-mapping', () => ({
  // empty stub
}));

// Ensure `React.act` exists when tests are run directly under a production
// `NODE_ENV` (CI production-simulation). Some environments run `jest` directly
// (not via `npm test`), which means the project's `NODE_ENV=test` wrapper is
// bypassed and `React.act` can be missing causing `TypeError: React.act is not a function`.
// We add a conservative, non-recursive shim only when `React.act` is absent.
// Use a synchronous `require`-based shim here because Jest runs this file
// under CommonJS and top-level `await`/ESM dynamic imports may not be supported
// in the test runner environment. We keep this conservative and non-recursive.
try {
  /* eslint-disable @typescript-eslint/no-require-imports */
  const React = require('react');

  if (React && typeof React.act !== 'function') {
    let realAct;
    try {
      realAct = require('react-dom/test-utils').act;
    } catch {
      realAct = undefined;
    }

    if (typeof realAct === 'function') {
      React.act = (...args) => {
        const prev = React.act;
        try {
          try { delete React.act; } catch { React.act = undefined; }
          return realAct(...args);
        } finally {
          if (typeof prev === 'function') React.act = prev;
        }
      };
    }
  }
} catch {
  // Ignore errors — if the shim cannot be applied, tests will surface the issue.
}
