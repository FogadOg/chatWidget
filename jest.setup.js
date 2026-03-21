import '@testing-library/jest-dom'
import React from 'react'
import { act } from 'react-dom/test-utils'

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
  // Create a lazy shim to avoid circular module initialization that can
  // cause `act` to call back into `React.act`, producing recursion.
  // Use `require` at call-time so the real `act` is loaded only when used.
  /* eslint-disable-next-line @typescript-eslint/no-require-imports */
  const makeShim = () => {
    const { act: realAct } = require('react-dom/test-utils')
    return function actShim(...args) {
      return realAct(...args)
    }
  }

  const shim = makeShim()
  // mark shim to avoid double-wrapping
  shim.__isActShim = true
  React.act = shim
}