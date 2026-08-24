/**
 * Loader-side handling of rich-block card actions (src/embed/widget.js).
 *
 * "Add to cart" should navigate the page the shopper is already on, not open a
 * new tab — and only the host page can do that. Two halves are tested here: the
 * loader announcing that it can, and the loader refusing to navigate anywhere
 * it shouldn't when asked.
 */
import { VALID } from './__fixtures__/embed.widget.fixtures';
import { loadWidget, mockCW, fromIframe } from './__helpers__/embed.widget.helpers';

const originalLocation = window.location;

/**
 * jsdom's `Location.assign` is read-only, so it can't be spied on — the whole
 * object has to be swapped and put back.
 */
function stubLocation() {
  const assign = jest.fn();
  Object.defineProperty(window, 'location', {
    value: { href: 'https://shop.example/products/x', assign },
    writable: true,
    configurable: true,
  });
  return assign;
}

beforeEach(() => {
  document.body.innerHTML = '';
  document.head.innerHTML = '';
  (window as any).CompaninWidget = undefined;
  (window as any).CompaninWidgets = undefined;
  (window as any).__COMPANIN_WIDGET_INSTANCES__ = undefined;
});

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: originalLocation,
    writable: true,
    configurable: true,
  });
  // Drop the iframe before the environment tears down: `mockCW` leaves it with
  // a stub contentWindow that jsdom then tries, and fails, to close.
  document.body.innerHTML = '';
});

describe('loader — capability announcement', () => {
  it('tells the iframe it can handle card actions', () => {
    // Installs pin widget-<ver>.js with SRI, so an older loader simply never
    // sends this and the iframe falls back to opening a new tab.
    const { iframe } = loadWidget(VALID);
    const cw = mockCW(iframe!);
    iframe!.onload!(new Event('load'));
    expect(cw.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'HOST_MESSAGE',
        data: expect.objectContaining({ action: 'capabilities', features: ['card_action'] }),
      }),
      expect.anything(),
    );
  });
});

describe('loader — WIDGET_CARD_ACTION', () => {
  it('navigates the host page to an https card URL', () => {
    const assign = stubLocation();
    const { iframe } = loadWidget(VALID);
    mockCW(iframe!);
    fromIframe(iframe!, { type: 'WIDGET_CARD_ACTION', data: { url: 'https://shop.example/cart/add/123' } });
    expect(assign).toHaveBeenCalledWith('https://shop.example/cart/add/123');
  });

  it('refuses a javascript: URL', () => {
    // The message already passed the origin check, but navigation is the most
    // damaging thing the loader can be talked into and this one executes in the
    // merchant's own page.
    const assign = stubLocation();
    const { iframe } = loadWidget(VALID);
    mockCW(iframe!);
    fromIframe(iframe!, { type: 'WIDGET_CARD_ACTION', data: { url: 'javascript:alert(1)' } });
    expect(assign).not.toHaveBeenCalled();
  });

  it('refuses a data: URL', () => {
    const assign = stubLocation();
    const { iframe } = loadWidget(VALID);
    mockCW(iframe!);
    fromIframe(iframe!, { type: 'WIDGET_CARD_ACTION', data: { url: 'data:text/html,<script>alert(1)</script>' } });
    expect(assign).not.toHaveBeenCalled();
  });

  it('ignores a card action with no URL', () => {
    const assign = stubLocation();
    const { iframe } = loadWidget(VALID);
    mockCW(iframe!);
    fromIframe(iframe!, { type: 'WIDGET_CARD_ACTION', data: {} });
    expect(assign).not.toHaveBeenCalled();
  });

  it('ignores a card action from an unauthorized origin', () => {
    const assign = stubLocation();
    const { iframe } = loadWidget(VALID);
    mockCW(iframe!);
    fromIframe(
      iframe!,
      { type: 'WIDGET_CARD_ACTION', data: { url: 'https://evil.example/steal' } },
      'https://evil.example',
    );
    expect(assign).not.toHaveBeenCalled();
  });
});
