import React from 'react';
import '@testing-library/jest-dom';

// Mock Next.js font loading
jest.mock('next/font/google', () => ({
  Geist: () => ({ variable: '--font-geist-sans' }),
  Geist_Mono: () => ({ variable: '--font-geist-mono' }),
}));

describe('RootLayout', () => {
  // Skip complex layout tests for Next.js components
  it('can be imported without errors', () => {
    expect(() => {
      require('../app/layout');
    }).not.toThrow();
  });

  it('has expected structure', () => {
    // Test that the layout component exists and has the right exports
    const Layout = require('../app/layout').default;
    expect(typeof Layout).toBe('function');
  });
});