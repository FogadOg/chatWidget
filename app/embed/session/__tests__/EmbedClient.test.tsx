import { injectCustomAssets, applyCustomAssetsFromQuery, getButtonPixelSize, parseHostMessageCommand, resolveParentTargetOrigin } from '../EmbedClient';

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
});
