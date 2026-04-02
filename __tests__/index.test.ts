import {
  logger,
  createLogger,
  logError,
  logWarn,
  logInfo,
  logDebug,
  initMonitoring,
  isMonitoringInitialized,
  reportError,
  reportEvent,
  MissingFieldError,
  InvalidValueError,
  validateConfig,
  detectDebugMode,
  enableDebug,
  disableDebug,
  pushDevEvent,
} from '../src/index';

describe('package entry exports (src/index.ts)', () => {
  beforeEach(() => {
    // ensure a clean debug storage state
    try { localStorage.removeItem('widget_debug'); } catch {}
  });

  it('exports logger helpers and createLogger', () => {
    expect(typeof createLogger).toBe('function');
    expect(typeof logger).toBe('object');
    expect(typeof logError).toBe('function');
    expect(typeof logWarn).toBe('function');
    expect(typeof logInfo).toBe('function');
    expect(typeof logDebug).toBe('function');
  });

  it('logger methods call console without throwing', () => {
    const e = jest.spyOn(console, 'error').mockImplementation(() => {});
    const w = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const i = jest.spyOn(console, 'info').mockImplementation(() => {});
    const l = createLogger('IndexTest');

    expect(() => logger.error('err')).not.toThrow();
    expect(() => logger.warn('warn')).not.toThrow();
    expect(() => logger.info('info')).not.toThrow();
    expect(() => logger.debug('dbg')).not.toThrow();

    expect(() => l.info('ctx')).not.toThrow();

    e.mockRestore();
    w.mockRestore();
    i.mockRestore();
  });

  it('monitoring init/report are callable in test env', () => {
    expect(typeof initMonitoring).toBe('function');
    initMonitoring({ sendReports: false });
    expect(isMonitoringInitialized()).toBe(true);
    // calling report functions should not throw in tests
    expect(() => reportEvent('index.test', { ok: true })).not.toThrow();
    expect(() => reportError(new Error('idx'))).not.toThrow();
  });

  it('enableDebug / disableDebug toggle localStorage', () => {
    expect(detectDebugMode()).toBe(false);
    enableDebug();
    expect(localStorage.getItem('widget_debug')).toBe('1');
    expect(detectDebugMode()).toBe(true);
    disableDebug();
    expect(localStorage.getItem('widget_debug')).toBeNull();
  });

  it('exports MissingFieldError and InvalidValueError classes', () => {
    const a = new MissingFieldError('apiKey');
    expect(a).toBeInstanceOf(Error);
    expect(a.name).toBe('MissingFieldError');
    expect(a.message).toContain('apiKey');

    const opts = ['one', 'two'] as const;
    const b = new InvalidValueError('position', 'invalid', opts);
    expect(b).toBeInstanceOf(Error);
    expect(b.name).toBe('InvalidValueError');
    expect(b.message).toContain('invalid');
  });

  it('pushDevEvent is callable', () => {
    expect(typeof pushDevEvent).toBe('function');
    expect(() => pushDevEvent({ kind: 'event', label: 'idx' })).not.toThrow();
  });
});
