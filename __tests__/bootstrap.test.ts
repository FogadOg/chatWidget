/**
 * __tests__/bootstrap.test.ts
 *
 * Tests for src/bootstrap.ts.
 *
 * Verifies:
 *  1. window.CompaninWidget is populated with enableDebug / disableDebug /
 *     isDebugActive after the module is imported.
 *  2. Named re-exports are present.
 *  3. enableDebug / disableDebug actually toggle localStorage.
 *  4. isDebugActive reflects the current localStorage state.
 *  5. DevOverlay default-export and useDebugMode are re-exported.
 *  6. Existing window.CompaninWidget properties are preserved (not replaced).
 *  7. Logger emits an info message when debug mode is active on import.
 */

// Reset the module registry so we can test side-effect behaviours in isolation.
beforeEach(() => {
  jest.resetModules();
  // Clear debug flag
  try { localStorage.removeItem('widget_debug'); } catch {}
  // Reset the window global
  (window as Record<string, unknown>).CompaninWidget = undefined;
});

afterEach(() => {
  try { localStorage.removeItem('widget_debug'); } catch {}
});

// ---------------------------------------------------------------------------
// 1. window.CompaninWidget API surface
// ---------------------------------------------------------------------------

describe('window.CompaninWidget — API attachment', () => {
  it('attaches enableDebug, disableDebug, and isDebugActive to window.CompaninWidget', async () => {
    await import('../src/bootstrap');
    const api = (window as Record<string, unknown>).CompaninWidget as Record<string, unknown>;
    expect(typeof api).toBe('object');
    expect(typeof api.enableDebug).toBe('function');
    expect(typeof api.disableDebug).toBe('function');
    expect(typeof api.isDebugActive).toBe('function');
  });

  it('preserves existing window.CompaninWidget properties', async () => {
    // Simulate a property set by docs-widget.js before bootstrap runs
    (window as Record<string, unknown>).CompaninWidget = { destroy: jest.fn() };
    await import('../src/bootstrap');
    const api = (window as Record<string, unknown>).CompaninWidget as Record<string, unknown>;
    expect(typeof api.destroy).toBe('function');       // preserved
    expect(typeof api.enableDebug).toBe('function');   // added
  });

  it('window.CompaninWidget.enableDebug() sets localStorage and dispatches event', async () => {
    await import('../src/bootstrap');
    const api = (window as Record<string, unknown>).CompaninWidget as Record<string, unknown>;
    const spy = jest.fn();
    window.addEventListener('companin:debug:change', spy);

    (api.enableDebug as () => void)();

    expect(localStorage.getItem('widget_debug')).toBe('1');
    expect(spy).toHaveBeenCalledTimes(1);
    expect((spy.mock.calls[0][0] as CustomEvent).detail).toEqual({ enabled: true });
    window.removeEventListener('companin:debug:change', spy);
  });

  it('window.CompaninWidget.disableDebug() clears localStorage and dispatches event', async () => {
    localStorage.setItem('widget_debug', '1');
    await import('../src/bootstrap');
    const api = (window as Record<string, unknown>).CompaninWidget as Record<string, unknown>;
    const spy = jest.fn();
    window.addEventListener('companin:debug:change', spy);

    (api.disableDebug as () => void)();

    expect(localStorage.getItem('widget_debug')).toBeNull();
    expect(spy).toHaveBeenCalledTimes(1);
    expect((spy.mock.calls[0][0] as CustomEvent).detail).toEqual({ enabled: false });
    window.removeEventListener('companin:debug:change', spy);
  });

  it('window.CompaninWidget.isDebugActive() reflects localStorage state', async () => {
    await import('../src/bootstrap');
    const api = (window as Record<string, unknown>).CompaninWidget as Record<string, unknown>;
    const isDebugActive = api.isDebugActive as () => boolean;

    localStorage.removeItem('widget_debug');
    expect(isDebugActive()).toBe(false);

    localStorage.setItem('widget_debug', '1');
    expect(isDebugActive()).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Named re-exports
// ---------------------------------------------------------------------------

describe('bootstrap re-exports', () => {
  it('exports detectDebugMode, enableDebug, disableDebug, useDebugMode', async () => {
    const mod = await import('../src/bootstrap');
    expect(typeof mod.detectDebugMode).toBe('function');
    expect(typeof mod.enableDebug).toBe('function');
    expect(typeof mod.disableDebug).toBe('function');
    expect(typeof mod.useDebugMode).toBe('function');
  });

  it('exports DevOverlay as default', async () => {
    const mod = await import('../src/bootstrap');
    // DevOverlay is a React component function or class
    expect(mod.DevOverlay).toBeDefined();
    expect(typeof mod.DevOverlay).toBe('function');
  });
});

// ---------------------------------------------------------------------------
// 3. Logger side-effect when debug mode is active at import time
// ---------------------------------------------------------------------------

describe('bootstrap logger side-effect', () => {
  it('calls logger.info when debug mode is already active', async () => {
    localStorage.setItem('widget_debug', '1');
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    await import('../src/bootstrap');

    // logger.info internally calls console.info with a %c prefix
    expect(infoSpy).toHaveBeenCalledWith(
      expect.stringContaining('[Widget]'),
      expect.any(String),
      expect.anything(),
    );
    infoSpy.mockRestore();
  });

  it('does NOT call logger.info when debug mode is inactive', async () => {
    localStorage.removeItem('widget_debug');
    const infoSpy = jest.spyOn(console, 'info').mockImplementation(() => {});

    await import('../src/bootstrap');

    expect(infoSpy).not.toHaveBeenCalled();
    infoSpy.mockRestore();
  });
});
