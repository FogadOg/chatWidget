import { beforeEach, describe, expect, jest, test } from '@jest/globals';

declare const require: (path: string) => any;
declare const global: any;

jest.mock('../lib/errorHandling', () => ({ logError: jest.fn() }));

const EmbedClient = require('../app/embed/session/EmbedClient');

describe('EmbedClient helpers', () => {
  beforeEach(() => {
    // remove any injected styles between tests
    document.head.querySelectorAll('style').forEach((s) => s.remove());
    jest.restoreAllMocks();
  });

  test('getButtonPixelSize returns mapped sizes and default', () => {
    expect(EmbedClient.getButtonPixelSize('sm')).toBe(48);
    expect(EmbedClient.getButtonPixelSize('md')).toBe(56);
    expect(EmbedClient.getButtonPixelSize('lg')).toBe(64);
    // unknown size -> default
    expect(EmbedClient.getButtonPixelSize('unknown')).toBe(56);
  });

  test('injectCustomAssets appends a style element with provided css', () => {
    const css = '.test-foo{color:red}';
    EmbedClient.injectCustomAssets(css);
    const styles = Array.from(document.head.querySelectorAll('style'));
    expect(styles.length).toBeGreaterThan(0);
    const last = styles[styles.length - 1];
    expect(last.textContent).toBe(css);
  });

  test('applyCustomAssetsFromQuery injects decoded css from provided search string', () => {
    const css = '.test-bar{background:blue}';
    const encoded = encodeURIComponent(css);
    EmbedClient.applyCustomAssetsFromQuery(`?customCss=${encoded}`);
    const styles = Array.from(document.head.querySelectorAll('style'));
    expect(styles.length).toBeGreaterThan(0);
    const last = styles[styles.length - 1];
    expect(last.textContent).toBe(css);
  });

  test('applyCustomAssetsFromQuery logs error when injectCustomAssets throws', () => {
    const encoded = encodeURIComponent('.test-fail{color:red}');

    const mockedErrorHandling = require('../lib/errorHandling') as { logError: jest.Mock };
    mockedErrorHandling.logError.mockClear();
    const decodeSpy = jest.spyOn(global, 'decodeURIComponent').mockImplementation(() => {
      throw new Error('decode failed');
    });

    EmbedClient.applyCustomAssetsFromQuery(`?customCss=${encoded}`);

    expect(mockedErrorHandling.logError).toHaveBeenCalled();
    decodeSpy.mockRestore();
  });

  test('parseHostMessageCommand parses plain string payloads', () => {
    expect(EmbedClient.parseHostMessageCommand('hello from host')).toEqual({
      kind: 'message',
      text: 'hello from host',
    });
    expect(EmbedClient.parseHostMessageCommand(' SHOW ')).toEqual({
      kind: 'action',
      action: 'open',
    });
    expect(EmbedClient.parseHostMessageCommand('hide')).toEqual({
      kind: 'action',
      action: 'close',
    });
  });

  test('parseHostMessageCommand parses action payloads', () => {
    expect(EmbedClient.parseHostMessageCommand({ action: 'open' })).toEqual({
      kind: 'action',
      action: 'open',
    });
    expect(EmbedClient.parseHostMessageCommand({ type: 'MINIMIZE' })).toEqual({
      kind: 'action',
      action: 'close',
    });
    expect(EmbedClient.parseHostMessageCommand({ command: 'toggle' })).toEqual({
      kind: 'action',
      action: 'toggle',
    });
    expect(EmbedClient.parseHostMessageCommand({ event: 'restore' })).toEqual({
      kind: 'action',
      action: 'open',
    });
    expect(EmbedClient.parseHostMessageCommand({ type: 'hide' })).toEqual({
      kind: 'action',
      action: 'close',
    });
  });

  test('parseHostMessageCommand parses object message payloads and ignores invalid payloads', () => {
    expect(EmbedClient.parseHostMessageCommand({ text: 'host text' })).toEqual({
      kind: 'message',
      text: 'host text',
    });
    expect(EmbedClient.parseHostMessageCommand({ message: 'hello there' })).toEqual({
      kind: 'message',
      text: 'hello there',
    });
    expect(EmbedClient.parseHostMessageCommand({ content: 'question?' })).toEqual({
      kind: 'message',
      text: 'question?',
    });

    expect(EmbedClient.parseHostMessageCommand({})).toBeNull();
    expect(EmbedClient.parseHostMessageCommand(null)).toBeNull();
    expect(EmbedClient.parseHostMessageCommand('   ')).toBeNull();
  });

  test('resolveParentTargetOrigin prefers explicit origin', () => {
    expect(EmbedClient.resolveParentTargetOrigin('https://host.example.com', 'https://referrer.example.com/path')).toBe(
      'https://host.example.com'
    );
  });

  test('resolveParentTargetOrigin falls back to referrer origin', () => {
    expect(EmbedClient.resolveParentTargetOrigin(undefined, 'https://referrer.example.com/path?a=1')).toBe(
      'https://referrer.example.com'
    );
  });

  test('resolveParentTargetOrigin falls back to wildcard when explicit and referrer are missing/invalid', () => {
    expect(EmbedClient.resolveParentTargetOrigin(undefined, '')).toBe('*');
    expect(EmbedClient.resolveParentTargetOrigin(undefined, 'not-a-valid-url')).toBe('*');
  });

  test('resolveParentTargetOrigin returns null in strict mode when no safe origin is available', () => {
    expect(EmbedClient.resolveParentTargetOrigin(undefined, '', true)).toBe('null');
    expect(EmbedClient.resolveParentTargetOrigin(undefined, 'not-a-valid-url', true)).toBe('null');
  });

  test('applyCustomAssetsFromQuery ignores missing customCss parameter', () => {
    EmbedClient.applyCustomAssetsFromQuery('?foo=bar');
    expect(document.head.querySelectorAll('style')).toHaveLength(0);
  });
});
