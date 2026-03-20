// allow accessing the global flag used by the widget script
declare global {
  interface Window {
    __COMPANIN_WIDGET__?: boolean;
  }
}

import fs from 'fs';
import path from 'path';
import { WIDGET_SCRIPT_ID } from '../lib/constants';

describe('public/widget.js loader', () => {
  let code: string;

  beforeAll(() => {
    code = fs.readFileSync(path.resolve(__dirname, '../public/widget.js'), 'utf8');
  });

  function inject(attrs: Record<string, string> = {}) {
    const script = document.createElement('script');
    Object.entries(attrs).forEach(([k, v]) => script.setAttribute(k, v));
    Object.defineProperty(document, 'currentScript', {
      configurable: true,
      get: () => script,
    });
    script.text = code;
    document.head.appendChild(script);
    return script;
  }

  afterEach(() => {
    const container = document.getElementById('companin-widget-container');
    if (container && container.parentNode) container.parentNode.removeChild(container);
    // reset global flag so subsequent injections can run
     
    // @ts-ignore
    window.__COMPANIN_WIDGET__ = false;
  });

  it('injects iframe and connection hints', () => {
    inject({
      'data-client-id': 'c',
      'data-assistant-id': 'a',
      'data-config-id': 'cfg',
    });

    const iframe = document.querySelector(`#${WIDGET_SCRIPT_ID}-container iframe`);
    expect(iframe).toBeTruthy();
    // no button should exist at all
    expect(document.querySelector(`#${WIDGET_SCRIPT_ID}-container button`)).toBeNull();

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

    const iframe = document.querySelector(`#${WIDGET_SCRIPT_ID}-container iframe`);
    expect(iframe).toBeTruthy();
    expect(document.querySelector(`#${WIDGET_SCRIPT_ID}-container button`)).toBeNull();
  });
});
