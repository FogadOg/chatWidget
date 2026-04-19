import { EMBED_EVENTS } from 'lib/embedConstants';

describe('GA_INIT postMessage', () => {
  it('sends WIDGET_GA_INIT with measurement id when config has ga_measurement_id', () => {
    const postMessageSpy = jest.fn();
    const origParent = window.parent;
    Object.defineProperty(window, 'parent', { value: { postMessage: postMessageSpy }, configurable: true });

    const gaMeasurementId = 'G-TEST456';
    const config = { ga_measurement_id: gaMeasurementId };

    function sendGAInit(cfg: { ga_measurement_id?: string | null }, parentOrigin: string) {
      if (cfg.ga_measurement_id) {
        window.parent.postMessage(
          { type: EMBED_EVENTS.GA_INIT, data: { gaMeasurementId: cfg.ga_measurement_id } },
          parentOrigin || '*'
        );
      }
    }

    sendGAInit(config, 'https://example.com');

    expect(postMessageSpy).toHaveBeenCalledWith(
      { type: 'WIDGET_GA_INIT', data: { gaMeasurementId: 'G-TEST456' } },
      'https://example.com'
    );

    Object.defineProperty(window, 'parent', { value: origParent, configurable: true });
  });

  it('does NOT send WIDGET_GA_INIT when ga_measurement_id is absent', () => {
    const postMessageSpy = jest.fn();
    const origParent = window.parent;
    Object.defineProperty(window, 'parent', { value: { postMessage: postMessageSpy }, configurable: true });

    function sendGAInit(cfg: { ga_measurement_id?: string | null }, parentOrigin: string) {
      if (cfg.ga_measurement_id) {
        window.parent.postMessage(
          { type: 'WIDGET_GA_INIT', data: { gaMeasurementId: cfg.ga_measurement_id } },
          parentOrigin || '*'
        );
      }
    }

    sendGAInit({}, 'https://example.com');
    expect(postMessageSpy).not.toHaveBeenCalled();

    Object.defineProperty(window, 'parent', { value: origParent, configurable: true });
  });
});
