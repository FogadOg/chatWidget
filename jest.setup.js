import '@testing-library/jest-dom'
import React from 'react'
import { act as realAct } from 'react-dom/test-utils'

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

// Ensure React.act is available for testing libraries that expect it.
// Some combinations of React and testing-library expect `React.act` to exist.
// Importing from 'react-dom/test-utils' and assigning provides compatibility.
// Ensure `React.act` exists for testing libraries that expect it.
if (React && !React.act) {
  // Minimal compatibility shim: assign the test-utils `act` directly to
  // `React.act`. Use `require()` with an inline eslint-disable to avoid
  // ESM/CJS interop issues in some Jest setups and keep the assignment simple
  // which has worked reliably in this environment.
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  try {
    // Use require to avoid transforming ESM imports in the test runtime.
    const _react = require('react')
    const { act: _act } = require('react-dom/test-utils')
    if (_react && !_react.act && _act) {
      _react.act = _act
    }
  } catch (err) {
    // ignore
  }
}