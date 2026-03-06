/**
 * Tests specifically for covering missing branches in helpers.ts
 * Lines to cover: 38 (return true), 42-58 (embedded/referrer), 67-73 (outer catch), 101-102 (storeSession error)
 * NOTE: These tests are replaced by helpers.branches.test.ts which uses a better approach
 */

describe.skip('helpers.ts - Coverage for missing branches (SKIPPED - see helpers.branches.test.ts)', () => {
  const originalWindow = global.window;
  const originalDocument = global.document;

  afterEach(() => {
    global.window = originalWindow;
    global.document = originalDocument;
    jest.resetModules();
  });

  test('getPageContext - lines 42-48: embedded with valid referrer URL', () => {
    jest.resetModules();

    // Create a window object where top throws
    Object.defineProperty(global.window, 'top', {
      get() {
        throw new Error('cross-origin');
      },
      configurable: true,
    });

    // Set a valid referrer on document
    Object.defineProperty(global.document, 'referrer', {
      get() {
        return 'https://parent.com/page';
      },
      configurable: true,
    });

    // Now require the module - it will use our mocked globals
    const helpers = require('../app/embed/session/helpers');
    const result = helpers.getPageContext();

    // Verify the embedded path with valid URL was taken (lines 42-48)
    expect(result.url).toBe('https://parent.com/page');
    expect(result.pathname).toBe('/page');
    expect(result.title).toBeNull();
    expect(result.referrer).toBe('https://parent.com/page');
  });

  test('getPageContext - lines 49-56: embedded with invalid referrer URL', () => {
    // Mock window.top access to throw (embedded case)
    const mockWindow = {
      self: {},
      get top() {
        throw new Error('cross-origin');
      },
      location: {
        href: 'http://iframe.local/',
        pathname: '/iframe',
      },
    };

    // Mock document with an INVALID referrer
    const mockDocument = {
      get referrer() {
        return 'not-a-valid-url';
      },
      title: 'Iframe Title',
    };

    // Replace globals before requiring the module
    global.window = mockWindow as any;
    global.document = mockDocument as any;

    // Now require the module - it will use our mocked globals
    const helpers = require('../app/embed/session/helpers');
    const result = helpers.getPageContext();

    // Verify the catch block for invalid URL was entered (lines 49-56)
    expect(result.url).toBe('not-a-valid-url');
    expect(result.pathname).toBeNull();
    expect(result.title).toBeNull();
    expect(result.referrer).toBe('not-a-valid-url');
  });

  test('getPageContext - line 38: window.top access throws, returns true', () => {
    // Mock window.top to throw
    const mockWindow = {
      self: {},
      get top() {
        throw new Error('SecurityError');
      },
      location: {
        href: 'http://iframe.local/',
        pathname: '/iframe',
      },
    };

    // Mock document with a referrer so the embedded branch is taken
    const mockDocument = {
      get referrer() {
        return 'http://parent.example.com/';
      },
      title: '',
    };

    global.window = mockWindow as any;
    global.document = mockDocument as any;

    const helpers = require('../app/embed/session/helpers');
    const result = helpers.getPageContext();

    // The catch block (line 38) should return true, causing the embedded path to run
    expect(result.url).toBe('http://parent.example.com/');
  });

  test('getPageContext - lines 67-73: outer catch with Unknown Page', () => {
    // Mock window with location that works
    const mockWindow = {
      self: {},
      top: {},
      location: {
        href: 'http://test.local/',
        pathname: '/test',
      },
    };

    // Mock document.title to throw an error
    const mockDocument = {
      get referrer() {
        return '';
      },
      get title() {
        throw new Error('Cannot access title');
      },
    };

    global.window = mockWindow as any;
    global.document = mockDocument as any;

    const helpers = require('../app/embed/session/helpers');
    const result = helpers.getPageContext();

    // Verify the outer catch block was entered (lines 67-73)
    expect(result.title).toBe('Unknown Page');
    expect(result.referrer).toBeNull();
    expect(result.url).toBe('http://test.local/');
    expect(result.pathname).toBe('/test');
  });

  test('storeSession - lines 101-102: catch error block', () => {
    // Mock localStorage.setItem to throw
    const mockLocalStorage = {
      setItem: jest.fn(() => {
        throw new Error('QuotaExceededError');
      }),
      getItem: jest.fn(() => null),
      removeItem: jest.fn(),
    };

    global.localStorage = mockLocalStorage as any;

    const helpers = require('../app/embed/session/helpers');

    // This should not throw, even though setItem throws
    expect(() => {
      helpers.storeSession('test-key', 'session-123', new Date(Date.now() + 10000).toISOString());
    }).not.toThrow();

    // Verify setItem was called (which then threw)
    expect(mockLocalStorage.setItem).toHaveBeenCalled();
  });
});
