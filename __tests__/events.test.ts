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