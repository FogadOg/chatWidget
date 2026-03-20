import { onInitConfig } from '../app/embed/session/events'
import { EMBED_EVENTS } from '../lib/embedConstants'

describe('onInitConfig', () => {
  afterEach(() => {
    // remove any listeners
    window._removeTestHandlers && window._removeTestHandlers()
    jest.clearAllMocks()
  })

  test('calls callback for same-origin when allowlist empty', () => {
    // ensure env allowlist empty
    process.env.NEXT_PUBLIC_EMBED_ALLOWLIST = ''
    const cb = jest.fn()
    const res = onInitConfig(cb)
    // store remove fn for cleanup
    // simulate message with no origin (jsdom)
    window.dispatchEvent(new MessageEvent('message', { data: { type: EMBED_EVENTS.INIT_CONFIG, data: { foo: 'bar' } }, origin: '' }))
    expect(cb).toHaveBeenCalledWith({ foo: 'bar' })
    res.remove()
  })

  test('respects explicit allowlist', () => {
    process.env.NEXT_PUBLIC_EMBED_ALLOWLIST = 'https://allowed.com'
    // reload module to pick up allowlist - require fresh
    jest.resetModules()
    const { onInitConfig: onInit } = require('../app/embed/session/events')
    const cb = jest.fn()
    const r = onInit(cb)
    window.dispatchEvent(new MessageEvent('message', { data: { type: EMBED_EVENTS.INIT_CONFIG, data: { ok: true } }, origin: 'https://allowed.com' }))
    expect(cb).toHaveBeenCalledWith({ ok: true })
    // not called for disallowed origin
    const cb2 = jest.fn()
    const r2 = onInit(cb2)
    window.dispatchEvent(new MessageEvent('message', { data: { type: EMBED_EVENTS.INIT_CONFIG, data: { ok: true } }, origin: 'https://bad.com' }))
    expect(cb2).not.toHaveBeenCalled()
    r.remove(); r2.remove()
  })
})
import { onInitConfig } from '../app/embed/session/events';

describe('onInitConfig helper', () => {
  it('calls callback when correct message posted', () => {
    const callback = jest.fn();
    const data = { foo: 'bar' };
    const { handler, remove } = onInitConfig(callback);
    handler(new MessageEvent('message', { data: { type: 'WIDGET_INIT_CONFIG', data } }));
    expect(callback).toHaveBeenCalledWith(data);

    remove();
  });

  it('ignores unrelated messages', () => {
    const callback = jest.fn();
    const { handler, remove } = onInitConfig(callback);
    handler(new MessageEvent('message', { data: { type: 'OTHER', data: {} } }));
    expect(callback).not.toHaveBeenCalled();

    remove();
  });

  // edge cases covering error handling and fallbacks
  it('does not crash when event.data is undefined (|| {} fallback)', () => {
    const callback = jest.fn();
    const { handler, remove } = onInitConfig(callback);

    // simulate a message without any data payload
    handler(new MessageEvent('message', { data: undefined }));
    expect(callback).not.toHaveBeenCalled();

    remove();
  });

  it('catches errors thrown while reading message data', () => {
    const callback = jest.fn();
    const { handler, remove } = onInitConfig(callback);

    // create an object whose property access throws

    const badData: any = {};
    Object.defineProperty(badData, 'type', {
      get() {
        throw new Error('access error');
      },
    });

    // post the event and ensure it does not propagate the error
    expect(() => {
      handler(new MessageEvent('message', { data: badData }));
    }).not.toThrow();
    expect(callback).not.toHaveBeenCalled();

    remove();
  });
});