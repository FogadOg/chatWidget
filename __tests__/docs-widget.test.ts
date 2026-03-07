// allow accessing the global flag used by the docs widget script

declare global {
  interface Window {
    __COMPANIN_DOCS_WIDGET__?: boolean;
    CompaninDocsWidget?: any;
  }
}

import fs from 'fs';
import path from 'path';

describe('public/docs-widget.js loader', () => {
  let code: string;

  beforeAll(() => {
    code = fs.readFileSync(path.resolve(__dirname, '../public/docs-widget.js'), 'utf8');
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
    const container = document.getElementById('companin-docs-widget-container');
    if (container && container.parentNode) container.parentNode.removeChild(container);
    window.__COMPANIN_DOCS_WIDGET__ = false;
    delete window.CompaninDocsWidget;
  });

  it('injects container and iframe correctly', () => {
    inject({
      'data-client-id': 'c',
      'data-assistant-id': 'a',
      'data-config-id': 'cfg',
    });

    const container = document.getElementById('companin-docs-widget-container');
    expect(container).toBeTruthy();
    expect(container?.style.display).toBe('none');

    const iframe = container?.querySelector('iframe');
    expect(iframe).toBeTruthy();
    expect((iframe as HTMLIFrameElement).src).toContain('/embed/docs');
  });

  it('requires required attributes', () => {
    // no attrs -> error path: container not created
    inject({});
    expect(document.getElementById('companin-docs-widget-container')).toBeNull();
  });

  it('exports API methods', () => {
    inject({
      'data-client-id': 'c',
      'data-assistant-id': 'a',
      'data-config-id': 'cfg',
    });

    expect(window.CompaninDocsWidget).toBeDefined();
    const methods = ['open', 'close', 'show', 'hide', 'sendMessage'];
    methods.forEach(m => expect(typeof window.CompaninDocsWidget[m]).toBe('function'));
  });

  it('open/close buttons post messages to iframe when iframe exists', () => {
    inject({
      'data-client-id': 'c',
      'data-assistant-id': 'a',
      'data-config-id': 'cfg',
    });

    // create fake iframe contentWindow
    const iframe = document.querySelector('#companin-docs-widget-container iframe') as HTMLIFrameElement;
    const postSpy = jest.fn();
    Object.defineProperty(iframe, 'contentWindow', {
      writable: true,
      value: { postMessage: postSpy },
    });

    window.CompaninDocsWidget.open();
    expect(postSpy).toHaveBeenCalledWith({ type: 'OPEN_DOCS_DIALOG' }, expect.any(String));

    window.CompaninDocsWidget.close();
    expect(postSpy).toHaveBeenCalledWith({ type: 'CLOSE_DOCS_DIALOG' }, expect.any(String));

    window.CompaninDocsWidget.sendMessage('foo');
    expect(postSpy).toHaveBeenCalledWith({ type: 'HOST_MESSAGE', data: 'foo' }, expect.any(String));
  });

  it('show/hide manipulate container display', () => {
    inject({
      'data-client-id': 'c',
      'data-assistant-id': 'a',
      'data-config-id': 'cfg',
    });
    const container = document.getElementById('companin-docs-widget-container')!;
    window.CompaninDocsWidget.show();
    expect(container.style.display).toBe('block');
    window.CompaninDocsWidget.hide();
    expect(container.style.display).toBe('none');
  });
});