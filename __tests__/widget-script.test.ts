// allow accessing the global flag used by the widget script
declare global {
  interface Window {
    __COMPANIN_WIDGET__?: boolean;
  }
}

import fs from 'fs';
import path from 'path';

describe('public/widget.js loader', () => {
  let code: string;

  beforeAll(() => {
    code = fs.readFileSync(path.resolve(__dirname, '../public/widget.js'), 'utf8');
  });

  function inject(attrs: Record<string, string> = {}) {
    const script = document.createElement('script');
    Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v));
    // make currentScript point at this element while code runs
    Object.defineProperty(document, 'currentScript', {
      configurable: true,
      get: () => script,
    });
    // ensure the script is executed when appended
    script.text = code;
    document.head.appendChild(script);
    return script;
  }

  afterEach(() => {
    const container = document.getElementById('companin-widget-container');
    if (container && container.parentNode) container.parentNode.removeChild(container);
    // reset global flag so subsequent injections can run
    window.__COMPANIN_WIDGET__ = false;
  });

  it('injects iframe immediately with no placeholder button', () => {
    inject({
      'data-client-id': 'c',
      'data-assistant-id': 'a',
      'data-config-id': 'cfg',
    });

    const iframe = document.querySelector('#companin-widget-container iframe');
    expect(iframe).toBeTruthy();
    // no button should exist at all
    expect(document.querySelector('#companin-widget-container button')).toBeNull();

    // document head should now include connection hints
    const links = Array.from(document.head.querySelectorAll('link'));
    expect(links.some(l => l.rel === 'preconnect' && l.href.includes('widget.companin.tech'))).toBe(true);
    expect(links.some(l => l.rel === 'dns-prefetch' && l.href.includes('widget.companin.tech'))).toBe(true);
    expect(links.some(l => l.rel === 'prefetch' && l.href.includes('/embed/session'))).toBe(true);
  });

  it('still renders iframe when startOpen attribute is true', () => {
    inject({
      'data-client-id': 'c',
      'data-assistant-id': 'a',
      'data-config-id': 'cfg',
      'data-start-open': 'true',
    });

    const iframe = document.querySelector('#companin-widget-container iframe');
    expect(iframe).toBeTruthy();
    expect(document.querySelector('#companin-widget-container button')).toBeNull();
  });

  describe('host hooks API', () => {
    it('invokes onOpen/onClose hooks when show/hide called', () => {
      inject({
        'data-client-id': 'c',
        'data-assistant-id': 'a',
        'data-config-id': 'cfg',
      });

      const openSpy = jest.fn();
      const closeSpy = jest.fn();
      window.CompaninWidget.onOpen(openSpy);
      window.CompaninWidget.onClose(closeSpy);

      window.CompaninWidget.show();
      expect(openSpy).toHaveBeenCalled();

      window.CompaninWidget.hide();
      expect(closeSpy).toHaveBeenCalled();
    });

    it('delivers cached message event when registered late', () => {
      inject({
        'data-client-id': 'c',
        'data-assistant-id': 'a',
        'data-config-id': 'cfg',
      });

      // simulate widget posting a message before host registers
      const msg = { id: 'foo', text: 'bar' };
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'WIDGET_MESSAGE', data: msg }, origin: 'https://widget.companin.tech' }));

      const spy = jest.fn();
      window.CompaninWidget.onMessage(spy);
      expect(spy).toHaveBeenCalledWith(msg);
    });

    it('suppresses duplicate message after sendMessage', () => {
      inject({
        'data-client-id': 'c',
        'data-assistant-id': 'a',
        'data-config-id': 'cfg',
      });

      const spy = jest.fn();
      window.CompaninWidget.onMessage(spy);

      // send a message from host
      const myMsg = { id: 'foo', text: 'hello' };
      window.CompaninWidget.sendMessage(myMsg);
      expect(spy).toHaveBeenCalledTimes(1);

      // same message posts back from iframe - should be ignored
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'WIDGET_MESSAGE', data: myMsg }, origin: 'https://widget.companin.tech' }));
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('invokes response and authFailure hooks generically', () => {
      inject({
        'data-client-id': 'c',
        'data-assistant-id': 'a',
        'data-config-id': 'cfg',
      });

      const respSpy = jest.fn();
      const authSpy = jest.fn();
      window.CompaninWidget.onResponse(respSpy);
      window.CompaninWidget.onAuthFailure(authSpy);

      const resp = { result: 42 };
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'WIDGET_RESPONSE', data: resp }, origin: 'https://widget.companin.tech' }));
      expect(respSpy).toHaveBeenCalledWith(resp);

      const auth = { error: 'auth expired' };
      window.dispatchEvent(new MessageEvent('message', { data: { type: 'WIDGET_ERROR', data: auth }, origin: 'https://widget.companin.tech' }));
      expect(authSpy).toHaveBeenCalledWith(auth);
    });
  });
});
