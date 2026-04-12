import { injectCustomAssets, applyCustomAssetsFromQuery, getButtonPixelSize, parseHostMessageCommand, resolveParentTargetOrigin } from '../EmbedClient';
import { getNormalizedEdgeOffset } from '../EmbedClient';

jest.mock('../../../../lib/logger', () => ({ logError: jest.fn() }));
jest.mock('../../../../lib/cssValidator', () => ({ sanitizeCss: jest.fn((s) => s) }));

describe('EmbedClient helpers', () => {
  beforeEach(() => {
    // ensure clean head and restore any spies from previous tests
    document.head.innerHTML = '';
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  test('getButtonPixelSize returns configured and fallback sizes', () => {
    // Known size (md) should return a number
    const md = getButtonPixelSize('md');
    expect(typeof md).toBe('number');
    // Unknown size returns default numeric size
    const x = getButtonPixelSize('unknown-size');
    expect(typeof x).toBe('number');
  });

  test('parseHostMessageCommand handles strings and objects', () => {
    expect(parseHostMessageCommand('open')).toEqual({ kind: 'action', action: 'open' });
    expect(parseHostMessageCommand('SHOW')).toEqual({ kind: 'action', action: 'open' });
    expect(parseHostMessageCommand('close')).toEqual({ kind: 'action', action: 'close' });
    expect(parseHostMessageCommand('toggle')).toEqual({ kind: 'action', action: 'toggle' });
    expect(parseHostMessageCommand('  hello world  ')).toEqual({ kind: 'message', text: 'hello world' });
    expect(parseHostMessageCommand('')).toBeNull();

    expect(parseHostMessageCommand({ action: 'restore' })).toEqual({ kind: 'action', action: 'open' });
    expect(parseHostMessageCommand({ command: 'TOGGLE' })).toEqual({ kind: 'action', action: 'toggle' });
    expect(parseHostMessageCommand({ message: '  hi ' })).toEqual({ kind: 'message', text: 'hi' });
    expect(parseHostMessageCommand({})).toBeNull();
  });

  test('injectCustomAssets appends sanitized style when safe', () => {
    injectCustomAssets('body{color:red}');
    const style = document.head.querySelector('style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toBe('body{color:red}');
  });

  test('injectCustomAssets does nothing when css is falsy or empty', () => {
    injectCustomAssets();
    injectCustomAssets('');
    injectCustomAssets(undefined);
    expect(document.head.querySelector('style')).toBeNull();
  });

  test('injectCustomAssets does nothing when sanitizeCss returns empty string', () => {
    const { sanitizeCss } = require('../../../../lib/cssValidator');
    (sanitizeCss as jest.Mock).mockReturnValueOnce('');
    injectCustomAssets('body{}');
    expect(document.head.querySelector('style')).toBeNull();
  });

  test('injectCustomAssets handles DOM errors gracefully', () => {
    jest.spyOn(document.head, 'appendChild').mockImplementation(() => { throw new Error('dom error'); });
    expect(() => injectCustomAssets('body{color:red}')).not.toThrow();
  });

  test('injectCustomAssets handles sanitizeCss throwing an error gracefully', () => {
    const { sanitizeCss } = require('../../../../lib/cssValidator');
    (sanitizeCss as jest.Mock).mockImplementationOnce(() => { throw new Error('bad css'); });
    expect(() => injectCustomAssets('body{color:red}')).not.toThrow();
  });

  test('applyCustomAssetsFromQuery reads customCss from explicit search string', () => {
    const css = 'p{color:blue}';
    applyCustomAssetsFromQuery(`?customCss=${encodeURIComponent(css)}`);
    const style = document.head.querySelector('style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toBe(css);
  });

  test('applyCustomAssetsFromQuery does nothing when customCss param is absent', () => {
    applyCustomAssetsFromQuery('?other=value');
    expect(document.head.querySelector('style')).toBeNull();
  });

  test('applyCustomAssetsFromQuery falls back to window.location.search when no arg given', () => {
    // In JSDOM, window.location.search === '' → no customCss → no style injected
    applyCustomAssetsFromQuery();
    expect(document.head.querySelector('style')).toBeNull();
  });

  test('applyCustomAssetsFromQuery handles malformed percent-encoding gracefully', () => {
    // '%' alone causes decodeURIComponent to throw URIError; function must not propagate it
    expect(() => applyCustomAssetsFromQuery('?customCss=%')).not.toThrow();
  });

  test('parseHostMessageCommand handles close aliases as strings', () => {
    expect(parseHostMessageCommand('hide')).toEqual({ kind: 'action', action: 'close' });
    expect(parseHostMessageCommand('minimize')).toEqual({ kind: 'action', action: 'close' });
    expect(parseHostMessageCommand('restore')).toEqual({ kind: 'action', action: 'open' });
  });

  test('parseHostMessageCommand handles object payload.event and payload.text', () => {
    expect(parseHostMessageCommand({ event: 'close' })).toEqual({ kind: 'action', action: 'close' });
    expect(parseHostMessageCommand({ type: 'toggle' })).toEqual({ kind: 'action', action: 'toggle' });
    expect(parseHostMessageCommand({ text: ' hello ' })).toEqual({ kind: 'message', text: 'hello' });
    expect(parseHostMessageCommand({ content: 'hi' })).toEqual({ kind: 'message', text: 'hi' });
    expect(parseHostMessageCommand({ prompt: 'ask me' })).toEqual({ kind: 'message', text: 'ask me' });
    expect(parseHostMessageCommand({ query: 'search' })).toEqual({ kind: 'message', text: 'search' });
  });

  test('parseHostMessageCommand returns null for non-string/non-object inputs', () => {
    expect(parseHostMessageCommand(123)).toBeNull();
    expect(parseHostMessageCommand(null)).toBeNull();
    expect(parseHostMessageCommand(undefined)).toBeNull();
  });

  test('resolveParentTargetOrigin uses explicit referrer param, wildcard, and strict mode', () => {
    // explicit origin wins
    expect(resolveParentTargetOrigin('https://example.com', undefined, false)).toBe('https://example.com');

    // referrer supplied as 2nd param (valid URL)
    expect(resolveParentTargetOrigin('', 'https://host.example/path', false)).toBe('https://host.example');

    // invalid referrer falls back to wildcard when not strict
    expect(resolveParentTargetOrigin('', 'not a url', false)).toBe('*');

    // strict mode refuses wildcard
    expect(resolveParentTargetOrigin('', 'not a url', true)).toBeNull();

    // no referrer at all, not strict → wildcard
    expect(resolveParentTargetOrigin('', '', false)).toBe('*');
  });

  test('resolveParentTargetOrigin falls back to document.referrer when referrer param is undefined', () => {
    // referrer is undefined → use document.referrer ('' in JSDOM) → wildcard
    expect(resolveParentTargetOrigin('', undefined, false)).toBe('*');
  });

  test('resolveParentTargetOrigin uses document.referrer when present', () => {
    const originalRef = (document as any).referrer;
    try {
      Object.defineProperty(document, 'referrer', { value: 'https://parent.example/path', configurable: true });
      expect(resolveParentTargetOrigin('', undefined, false)).toBe('https://parent.example');
    } finally {
      Object.defineProperty(document, 'referrer', { value: originalRef });
    }
  });

  test('injectCustomAssets does nothing when sanitizeCss returns null or undefined', () => {
    const { sanitizeCss } = require('../../../../lib/cssValidator');
    (sanitizeCss as jest.Mock).mockReturnValueOnce(null).mockReturnValueOnce(undefined);
    injectCustomAssets('a{}');
    expect(document.head.querySelector('style')).toBeNull();
    injectCustomAssets('b{}');
    expect(document.head.querySelector('style')).toBeNull();
  });

  test('getButtonPixelSize returns explicit sizes for sm and lg', () => {
    const sm = getButtonPixelSize('sm');
    const lg = getButtonPixelSize('lg');
    expect(typeof sm).toBe('number');
    expect(typeof lg).toBe('number');
    expect(sm).not.toBe(lg);
  });

  test('getNormalizedEdgeOffset handles numeric, string, and invalid values', () => {
    expect(getNormalizedEdgeOffset(undefined)).toBe(20);
    expect(getNormalizedEdgeOffset(null)).toBe(20);
    expect(getNormalizedEdgeOffset({ edgeOffset: 10 } as any)).toBe(10);
    expect(getNormalizedEdgeOffset({ edgeOffset: '12.5' } as any)).toBe(12.5);
    expect(getNormalizedEdgeOffset({ edgeOffset: 'not-a-number' } as any)).toBe(20);
    // also test alias edge_offset
    expect(getNormalizedEdgeOffset({ edge_offset: 7 } as any)).toBe(7);
  });

  test('getNormalizedEdgeOffset returns default for non-finite numbers and strings', () => {
    // Non-finite number (Infinity) should fall through to default 20
    expect(getNormalizedEdgeOffset({ edgeOffset: Infinity } as any)).toBe(20);
    expect(getNormalizedEdgeOffset({ edgeOffset: NaN } as any)).toBe(20);
    // String that parses to non-finite
    expect(getNormalizedEdgeOffset({ edgeOffset: 'Infinity' } as any)).toBe(20);
    // No edgeOffset or edge_offset key → undefined raw → default 20
    expect(getNormalizedEdgeOffset({} as any)).toBe(20);
  });

  test('parseHostMessageCommand handles object with unrecognized command and no text', () => {
    // command value present but not recognized, and no text fields → null
    expect(parseHostMessageCommand({ action: 'unknown-action' })).toBeNull();
    // whitespace-only command → falls through to text; no text → null
    expect(parseHostMessageCommand({ action: '   ' })).toBeNull();
  });

  test('parseHostMessageCommand falls through to text when command is unrecognized but text present', () => {
    // unrecognized command but has text → message kind
    expect(parseHostMessageCommand({ action: 'refresh', text: 'hello' })).toEqual({ kind: 'message', text: 'hello' });
  });

  test('resolveParentTargetOrigin handles strict mode with valid referrer', () => {
    // strict mode with valid referrer → returns referrer origin (not null)
    expect(resolveParentTargetOrigin('', 'https://parent.example/page', true)).toBe('https://parent.example');
  });

  test('resolveParentTargetOrigin returns null in strict mode with no referrer and no document', () => {
    // strict=true, empty explicit, invalid referrer → null
    expect(resolveParentTargetOrigin('', 'not-a-url', true)).toBeNull();
    expect(resolveParentTargetOrigin('', '', true)).toBeNull();
  });

  test('applyCustomAssetsFromQuery injects style when customCss param present in explicit search string', () => {
    // Use the explicit-search-string overload (already tested for window.location fallback above)
    const css = 'div{color:green}';
    applyCustomAssetsFromQuery(`?customCss=${encodeURIComponent(css)}`);
    const style = document.head.querySelector('style');
    expect(style).not.toBeNull();
    expect(style?.textContent).toBe(css);
  });
});
