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
  // Create a safe shim that prevents recursion by temporarily removing
  // `React.act` while calling the real `act` implementation.
  function actShim(...args) {
    const prev = React.act
    try {
      // temporarily remove to avoid realAct delegating back to React.act
      // which would cause recursion
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete React.act
      return realAct(...args)
    } finally {
      React.act = prev
    }
  }

  actShim.__isActShim = true
  React.act = actShim
}