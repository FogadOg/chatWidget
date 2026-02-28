// ensure logger treats this as development mode
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(process.env as any).NODE_ENV = 'development';

import { logError, logWarn, logInfo, logDebug, logPerf } from '../lib/logger';

describe('logger convenience functions', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    jest.spyOn(console, 'info').mockImplementation(() => {});
    jest.spyOn(console, 'debug').mockImplementation(() => {});
    // stub fetch for perf tests
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).fetch = jest.fn().mockResolvedValue({});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logError calls console.error in development', () => {
    logError('test error', { foo: 'bar' });
    expect(console.error).toHaveBeenCalledWith('[Widget Error] test error', { foo: 'bar' });
  });

  it('logWarn calls console.warn in development', () => {
    logWarn('test warn');
    expect(console.warn).toHaveBeenCalledWith('[Widget Warning] test warn', '');
  });

  it('logInfo calls console.info in development', () => {
    logInfo('test info');
    expect(console.info).toHaveBeenCalledWith('[Widget Info] test info', '');
  });

  it('logDebug calls console.debug in development', () => {
    logDebug('test debug');
    expect(console.debug).toHaveBeenCalledWith('test debug', '');
  });

  it('logPerf logs a perf message', () => {
    logPerf('load', 123, { page: 'home' });
    expect(console.debug).toHaveBeenCalledWith('load: 123ms', { page: 'home' });
  });

  it('logPerf ignores blacklisted names', () => {
    logPerf('fetchAssistantDetails', 50);
    logPerf('fetchWidgetConfig', 60);
    // should not call console.debug at all for blacklisted names
    expect(console.debug).toHaveBeenCalledTimes(0);
  });
});