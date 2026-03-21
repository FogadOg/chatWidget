import '@testing-library/jest-dom'

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
try {
  // Use dynamic ESM imports to avoid `require()` lint rules and keep this file ESM.
  // Top-level await is supported in Node 20+ (CI uses 20.x).
  const ReactModule = await import('react');
  const React = ReactModule && ReactModule.default ? ReactModule.default : ReactModule;

  if (React && typeof React.act !== 'function') {
    const utils = await import('react-dom/test-utils');
    const realAct = utils && (utils.act || utils.default?.act);
    if (typeof realAct === 'function') {
      // Wrap the real `act` to avoid accidental recursion if `react-dom` tries to
      // call `React.act` internally. The wrapper temporarily removes the shim
      // while calling the real `act`.
      React.act = (...args) => {
        const prev = React.act;
        try {
          // remove shim so internal calls don't recurse
          try { delete React.act; } catch (e) { React.act = undefined; }
          return realAct(...args);
        } finally {
          // restore shim
          if (typeof prev === 'function') React.act = prev;
        }
      };
    }
  }
} catch (e) {
  // If anything goes wrong here, it's safe to continue without the shim;
  // the failing tests will indicate that and we can iterate.
}
