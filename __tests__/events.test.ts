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
});