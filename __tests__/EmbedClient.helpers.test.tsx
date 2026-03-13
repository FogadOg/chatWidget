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
    // Use malformed percent-encoding so decodeURIComponent throws and is caught
    const malformed = '%';

      const { logError } = require('../lib/errorHandling');
      const logErrorSpy = jest.spyOn(require('../lib/errorHandling'), 'logError').mockImplementation(() => {});

      EmbedClient.applyCustomAssetsFromQuery(`?customCss=${malformed}`);

      expect(logErrorSpy).toHaveBeenCalled();

      logErrorSpy.mockRestore();
  });
});
