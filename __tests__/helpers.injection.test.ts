/**
 * Tests for helpers.ts using dependency injection to achieve 100% coverage
 * These tests inject mock window/document objects to properly test all code paths
 */

import * as helpers from '../app/embed/session/helpers';

describe('helpers.ts - dependency injection tests for full coverage', () => {
  describe('getPageContext with injected mocks', () => {
    test('lines 37-38: catch block when window.top access throws (cross-origin iframe)', () => {
      // Mock window where accessing 'top' throws SecurityError
      const mockWindow = {
        get top(): Window {
          throw new Error('SecurityError: Blocked a frame with origin from accessing a cross-origin frame');
        },
        self: {} as Window,
        location: {
          href: 'https://iframe-content.example.com/widget',
          pathname: '/widget',
        },
      } as unknown as Window;

      const mockDocument = {
        referrer: 'https://parent-site.example.com/page',
        title: 'Widget',
      } as unknown as Document;

      const result = helpers.getPageContext(mockWindow, mockDocument);

      // When window.top throws, isEmbedded returns true (line 38)
      // Then takes the embedded + referrer branch (lines 42-48)
      expect(result.url).toBe('https://parent-site.example.com/page');
      expect(result.pathname).toBe('/page');
      expect(result.title).toBeNull();
      expect(result.referrer).toBe('https://parent-site.example.com/page');
    });

    test('lines 42-48: embedded iframe with valid referrer URL', () => {
      // Mock window in an iframe (top !== self)
      const mockTop = { mockTop: true } as unknown as Window;
      const mockSelf = { mockSelf: true } as unknown as Window;

      const mockWindow = {
        top: mockTop,
        self: mockSelf,
        location: {
          href: 'https://widget.example.com/embed',
          pathname: '/embed',
        },
      } as unknown as Window;

      const mockDocument = {
        referrer: 'https://parent-site.com/blog/article',
        title: 'Embedded Widget',
      } as unknown as Document;

      const result = helpers.getPageContext(mockWindow, mockDocument);

      // Lines 42-48: valid referrer URL path
      expect(result.url).toBe('https://parent-site.com/blog/article');
      expect(result.pathname).toBe('/blog/article');
      expect(result.title).toBeNull();
      expect(result.referrer).toBe('https://parent-site.com/blog/article');
    });

    test('lines 49-56: embedded iframe with invalid referrer URL', () => {
      // Mock window in an iframe
      const mockTop = { mockTop: true } as unknown as Window;
      const mockSelf = { mockSelf: true } as unknown as Window;

      const mockWindow = {
        top: mockTop,
        self: mockSelf,
        location: {
          href: 'https://widget.example.com/embed',
          pathname: '/embed',
        },
      } as unknown as Window;

      const mockDocument = {
        referrer: 'not-a-valid-url-format',
        title: 'Embedded Widget',
      } as unknown as Document;

      const result = helpers.getPageContext(mockWindow, mockDocument);

      // Lines 49-56: catch block for invalid URL
      expect(result.url).toBe('not-a-valid-url-format');
      expect(result.pathname).toBeNull();
      expect(result.title).toBeNull();
      expect(result.referrer).toBe('not-a-valid-url-format');
    });

    test('lines 60-66: non-embedded (normal page) scenario', () => {
      // Mock window in normal (non-iframe) context
      const mockSelf = { mockSelf: true } as unknown as Window;

      const mockWindow = {
        top: mockSelf,  // top === self means not embedded
        self: mockSelf,
        location: {
          href: 'https://example.com/contact',
          pathname: '/contact',
        },
      } as unknown as Window;

      const mockDocument = {
        referrer: 'https://google.com/',
        title: 'Contact Us',
      } as unknown as Document;

      const result = helpers.getPageContext(mockWindow, mockDocument);

      // Lines 60-66: normal page context
      expect(result.url).toBe('https://example.com/contact');
      expect(result.pathname).toBe('/contact');
      expect(result.title).toBe('Contact Us');
      expect(result.referrer).toBe('https://google.com/');
    });

    test('lines 67-73: outer catch block with Unknown Page', () => {
      // Mock window where document.title throws to trigger outer catch
      const mockWindow = {
        top: {} as Window,
        self: {} as Window,
        location: {
          href: 'https://example.com/',
          pathname: '/',
        },
      } as unknown as Window;

      const mockDocument = {
        referrer: '',
        get title(): string {
          throw new Error('Cannot access title');
        },
      } as unknown as Document;

      const result = helpers.getPageContext(mockWindow, mockDocument);

      // Lines 67-73: outer catch returns 'Unknown Page'
      expect(result.title).toBe('Unknown Page');
      expect(result.referrer).toBeNull();
      expect(result.url).toBe('https://example.com/');
      expect(result.pathname).toBe('/');
    });

    test('embedded with empty referrer falls back to normal path', () => {
      // Test that empty referrer doesn't trigger embedded branch
      const mockTop = { mockTop: true } as unknown as Window;
      const mockSelf = { mockSelf: true } as unknown as Window;

      const mockWindow = {
        top: mockTop,
        self: mockSelf,
        location: {
          href: 'https://widget.example.com/',
          pathname: '/',
        },
      } as unknown as Window;

      const mockDocument = {
        referrer: '',  // Empty referrer
        title: 'Widget',
      } as unknown as Document;

      const result = helpers.getPageContext(mockWindow, mockDocument);

      // With empty referrer, should use normal path (lines 60-66)
      expect(result.url).toBe('https://widget.example.com/');
      expect(result.pathname).toBe('/');
      expect(result.title).toBe('Widget');
      expect(result.referrer).toBeNull();
    });

    test('normal page with null referrer', () => {
      const mockSelf = { mockSelf: true } as unknown as Window;

      const mockWindow = {
        top: mockSelf,
        self: mockSelf,
        location: {
          href: 'https://example.com/',
          pathname: '/',
        },
      } as unknown as Window;

      const mockDocument = {
        referrer: '',
        title: 'Home',
      } as unknown as Document;

      const result = helpers.getPageContext(mockWindow, mockDocument);

      expect(result.url).toBe('https://example.com/');
      expect(result.pathname).toBe('/');
      expect(result.title).toBe('Home');
      expect(result.referrer).toBeNull();
    });
  });
});
