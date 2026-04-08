// =============================================================================
// AUTO-GENERATED FILE — DO NOT EDIT DIRECTLY
// Source: src/embed/persistent-widget.js
// Regenerate: npm run build:embed
// =============================================================================
/* Persistent Widget embed script
   Scaffolded from previous implementation; corrected name to 'persistent-widget'.
*/
(function () {
  const SCRIPT_ID = 'companin-persistent-widget';
  const COMPANY_NAME = 'Companin';
  const BASE_WIDGET_HOST = 'https://widget.companin.tech';

  const sanitizeInstanceId = (value) => String(value || 'default').replace(/[^a-zA-Z0-9_-]/g, '-');
  const getOrCreateRegistry = () => {
    const key = `__${COMPANY_NAME.toUpperCase()}_WIDGET_INSTANCES__`;
    if (!window[key] || typeof window[key] !== 'object') window[key] = {};
    return window[key];
  };

  const logError = (message, context) => {
    console.error(COMPANY_NAME + ' Persistent Widget Error:', message, context || {});
  };

  try {
    let script = document.currentScript;
    if (!script) {
      script = document.getElementById(SCRIPT_ID) || Array.from(document.getElementsByTagName('script')).find(s => (s.src||'').indexOf('persistent-widget.js') !== -1) || null;
    }

    if (!script) {
      logError('Embed <script> not found');
      return;
    }

    const clientId = script.getAttribute('data-client-id');
    const assistantId = script.getAttribute('data-assistant-id');
    const configId = script.getAttribute('data-config-id');
    const explicitInstanceId = script.getAttribute('data-instance-id') || script.getAttribute('data-widget-id');
    const locale = script.getAttribute('data-locale') || ((navigator.languages && navigator.languages[0]) || navigator.language) || 'en';
    const isDev = script.getAttribute('data-dev') === 'true';
    const explicitTargetOrigin = script.getAttribute('data-target-origin') || script.getAttribute('data-parent-origin');

    if (!clientId || !assistantId || !configId) {
      const missing = [];
      if (!clientId) missing.push('data-client-id');
      if (!assistantId) missing.push('data-assistant-id');
      if (!configId) missing.push('data-config-id');
      logError('Missing required embed attributes: ' + missing.join(', '));
      return;
    }

    const baseUrl = isDev ? 'http://localhost:3001' : BASE_WIDGET_HOST;
    const targetOrigin = (explicitTargetOrigin && explicitTargetOrigin.trim()) || baseUrl;

    const registry = getOrCreateRegistry();
    const requestedInstanceId = explicitInstanceId || `${clientId}::${assistantId}::${configId}::${locale}`;
    let instanceId = sanitizeInstanceId(requestedInstanceId);
    if (registry[instanceId]) {
      let i = 1;
      while (registry[`${instanceId}-${i}`]) i += 1;
      instanceId = `${instanceId}-${i}`;
    }

    const containerId = `${SCRIPT_ID}-container-${instanceId}`;

    // build iframe URL — reuse the /embed/session route with startOpen=true
    const params = new URLSearchParams({
      clientId,
      assistantId,
      configId,
      locale,
      startOpen: 'true',
      persistent: 'true',
      pagePath: window.location.pathname,
      parentOrigin: window.location.origin,
    });
    if (isDev) params.set('dev', 'true');

    const iframe = document.createElement('iframe');
    iframe.src = `${baseUrl}/embed/session?${params.toString()}`;
    iframe.style.cssText = 'width:100%;height:100%;border:0;background-color:transparent;';
    iframe.setAttribute('allow', 'clipboard-write');
    iframe.setAttribute('title', 'Companin Assistant');

    // If host page provides a placeholder container with this id, mount widget there
    const hostPlaceholder = document.getElementById('companin-persistent-widget-container');
    let container = null;
    if (hostPlaceholder) {
      try {
        hostPlaceholder.setAttribute('role', 'region');
        hostPlaceholder.setAttribute('aria-label', 'Assistant');
        hostPlaceholder.tabIndex = 0;
        // ensure reasonable height if empty
        if (!hostPlaceholder.style.height) hostPlaceholder.style.minHeight = '360px';
        hostPlaceholder.appendChild(iframe);
        container = hostPlaceholder;
      } catch (e) {
        logError('Failed to mount into host placeholder, falling back to floating container', { error: e && e.message });
      }
    }

    // create floating container fallback if no placeholder or mounting failed
    if (!container) {
      container = document.createElement('div');
      container.id = containerId;
      container.setAttribute('role', 'region');
      container.setAttribute('aria-label', 'Assistant');
      container.tabIndex = 0;
      container.style.cssText = [
        'position: fixed',
        'bottom: 20px',
        'right: 20px',
        'width: 360px',
        'max-width: 100vw',
        'height: 480px',
        'box-sizing: border-box',
        'background: #fff',
        'border-radius: 8px',
        'box-shadow: 0 10px 30px rgba(0,0,0,0.12)',
        'overflow: hidden',
        'z-index: 999999',
        'display: block'
      ].join(';') + ';';
      container.appendChild(iframe);
    }

    // attach and register — only append to body for the floating fallback;
    // if using the host placeholder it's already in the DOM
    const usingHostPlaceholder = (container === hostPlaceholder);
    (function mount() {
      try {
        if (!document.body) {
          document.addEventListener('DOMContentLoaded', mount);
          return;
        }
        if (!usingHostPlaceholder) {
          document.body.appendChild(container);
        }
        registry[instanceId] = { id: instanceId, containerId };
        // expose simple host API to parent page so host hooks can interact
        try {
          window.__COMPANIN_PERSISTENT_WIDGET__ = true;
          if (!window.CompaninPersistentWidget || typeof window.CompaninPersistentWidget !== 'object') {
            const listeners = {};
            const api = {
              sendMessage: function (payload) {
                try {
                  if (iframe && iframe.contentWindow) {
                    iframe.contentWindow.postMessage(payload, targetOrigin);
                    return true;
                  }
                } catch (e) {
                  logError('CompaninPersistentWidget.sendMessage failed', { error: e && e.message });
                }
                return false;
              },
              on: function (eventName, cb) {
                try {
                  if (!listeners[eventName]) listeners[eventName] = [];
                  listeners[eventName].push(cb);
                  return function unsubscribe(){
                    try { listeners[eventName] = listeners[eventName].filter(fn => fn !== cb); } catch(e){}
                  };
                } catch (e) { return function(){}; }
              },
              _listeners: listeners
            };
            window.CompaninPersistentWidget = api;
          }
        } catch (e) {}
      } catch (err) {
        logError('Failed to mount Persistent Widget', { error: err && err.message });
      }
    })();

    // forward messages FROM the iframe to registered listeners only
    window.addEventListener('message', function(ev) {
      try {
        if (!ev || !ev.data || ev.source !== iframe.contentWindow) return;
        if (window.CompaninPersistentWidget && window.CompaninPersistentWidget._listeners) {
          var data = ev.data;
          var name = (data && data.type) || 'message';
          var payload = (data && data.payload !== undefined) ? data.payload : data;
          var fns = window.CompaninPersistentWidget._listeners[name] || [];
          for (var i = 0; i < fns.length; i++) {
            try { fns[i](payload); } catch (e) {}
          }
        }
      } catch (e) {}
    }, false);

  } catch (err) {
    logError('Critical error in Persistent Widget script', { error: err && err.message });
  }
})();
