/* eslint-disable @typescript-eslint/no-unused-vars */
(function () {
  // Prevent multiple initializations
  if (window.__COMPANIN_WIDGET__) {
    console.warn("Companin Widget: Already initialized");
    return;
  }
  window.__COMPANIN_WIDGET__ = true;

  // Error tracking
  const errors = [];
  const logError = (message, context) => {
    const error = {
      timestamp: new Date().toISOString(),
      message,
      context,
    };
    errors.push(error);
    console.error("Companin Widget Error:", message, context);
  };

  try {
    const script = document.currentScript;
    if (!script) {
      logError("Failed to get current script reference", {});
      return;
    }

    // Get attributes with validation
    const clientId = script.getAttribute("data-client-id");
    const assistantId = script.getAttribute("data-assistant-id");
    const configId = script.getAttribute("data-config-id");
    const detectLocale = () => {
      const explicitLocale = script.getAttribute("data-locale");
      if (explicitLocale) return explicitLocale;
      const browserLocale = (navigator.languages && navigator.languages[0]) || navigator.language;
      return browserLocale || "en";
    };
    const locale = detectLocale();
    const startOpen = script.getAttribute("data-start-open") === "true";

    // Validate required attributes
    if (!clientId || !assistantId || !configId) {
      const missing = [];
      if (!clientId) missing.push("data-client-id");
      if (!assistantId) missing.push("data-assistant-id");
      if (!configId) missing.push("data-config-id");

      logError("Missing required attributes", { missing });

      // Show user-friendly error in widget space
      showErrorWidget(
        "Configuration Error",
        `Missing required attributes: ${missing.join(", ")}. Please check your widget installation.`
      );
      return;
    }

    // Determine the base URL with fallback
    const isDev = script.getAttribute("data-dev") === "true";
    const baseUrl = isDev
      ? "http://localhost:3001"
      : "https://widget.companin.tech";

    // performance hint: warm up connection to widget host
    (function addPreconnectHints() {
      try {
        if (document.head) {
          const pc = document.createElement('link');
          pc.rel = 'preconnect';
          pc.href = baseUrl;
          pc.crossOrigin = 'anonymous';
          document.head.appendChild(pc);

          const dns = document.createElement('link');
          dns.rel = 'dns-prefetch';
          dns.href = baseUrl;
          document.head.appendChild(dns);

          // optional prefetch of the embed page itself; browser may fetch early
          const pf = document.createElement('link');
          pf.rel = 'prefetch';
          pf.href = baseUrl + '/embed/session';
          pf.crossOrigin = 'anonymous';
          document.head.appendChild(pf);
        }
      } catch (e) {
        // silently ignore failures – not critical
      }
    })();

    // Create container with error handling
    const container = document.createElement("div");
    container.id = "companin-widget-container";
    container.style.cssText = `
      position: fixed;
      bottom: 20px;
      right: 20px;
      width: auto;
      height: auto;
      z-index: 999999;
      transition: all 0.3s ease;
    `;

    // Ensure body is ready
    if (!document.body) {
      logError("Document body not ready", {});
      // Wait for DOM to be ready
      if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initWidget);
      } else {
        // DOM is already ready but body is missing - unusual case
        setTimeout(initWidget, 100);
      }
      return;
    }

    function initWidget() {
      try {
        // Reset body margins and padding to ensure proper positioning
        document.body.style.margin = "0";
        document.body.style.padding = "0";

        // we no longer render a placeholder button; build iframe immediately
        const iframe = document.createElement("iframe");
        const params = new URLSearchParams({
          clientId,
          assistantId,
          configId,
          locale,
          startOpen: startOpen.toString(),
          pagePath: window.location.pathname,
          parentOrigin: window.location.origin,
        });

        // Add custom CSS if provided
        const customCss = script.getAttribute("data-custom-css");
        if (customCss) {
          params.set('customCss', customCss);
        }

        iframe.src = `${baseUrl}/embed/session?${params.toString()}`;
        iframe.style.cssText = `
          width: 100%;
          height: 100%;
          border: 0;
          background-color: transparent;
        `;
        iframe.setAttribute("allow", "clipboard-write");
        iframe.setAttribute("title", "Companin Chat Widget");

        // Handle iframe load errors
        let iframeLoaded = false;
        const loadTimeout = setTimeout(() => {
          if (!iframeLoaded) {
            logError("Widget iframe failed to load (timeout)", { src: iframe.src });
            showErrorInContainer(
              container,
              "Failed to load widget. Please refresh the page."
            );
        }
      }, 15000); // 15 second timeout

      iframe.onload = () => {
        iframeLoaded = true;
        clearTimeout(loadTimeout);
        try {
          // If the host page provided an inline ChatWidgetConfig, forward it into the iframe
          if (window.ChatWidgetConfig && iframe.contentWindow) {
            iframe.contentWindow.postMessage(
              { type: 'WIDGET_INIT_CONFIG', data: window.ChatWidgetConfig },
              baseUrl
            );
          }
        } catch (err) {
          logError('Failed to post initial config to iframe', { error: err && err.message });
        }
      };

      iframe.onerror = (error) => {
        clearTimeout(loadTimeout);
        logError("Widget iframe failed to load", { error, src: iframe.src });
        showErrorInContainer(
          container,
          "Failed to load widget. Please check your connection."
        );
      };

      container.appendChild(iframe);
      document.body.appendChild(container);

      // Listen for widget events with error handling
      window.addEventListener("message", handleMessage);

      // Expose API for programmatic control
        // Host callback hooks registry
        const hostHooks = {
          onOpen: null,
          onClose: null,
          onMessage: null,
          onResponse: null,
          onAuthFailure: null,
        };

        // Cache recent events so hosts that register late still receive them
        let __lastHostMessage = null;
        let __lastHostResponse = null;
        let __lastHostAuthFailure = null;

        window.CompaninWidget = {
          // Hook registration helpers
          onOpen: (fn) => { try { hostHooks.onOpen = typeof fn === 'function' ? fn : null; } catch (e) { logError('Failed to register onOpen hook', { error: e && e.message }); } },
          onClose: (fn) => { try { hostHooks.onClose = typeof fn === 'function' ? fn : null; } catch (e) { logError('Failed to register onClose hook', { error: e && e.message }); } },
          onMessage: (fn) => { try { hostHooks.onMessage = typeof fn === 'function' ? fn : null; if (hostHooks.onMessage && __lastHostMessage) { try { hostHooks.onMessage(__lastHostMessage); } catch (e) { logError('Cached onMessage hook threw', { error: e && e.message }); } } } catch (e) { logError('Failed to register onMessage hook', { error: e && e.message }); } },
          onResponse: (fn) => { try { hostHooks.onResponse = typeof fn === 'function' ? fn : null; if (hostHooks.onResponse && __lastHostResponse) { try { hostHooks.onResponse(__lastHostResponse); } catch (e) { logError('Cached onResponse hook threw', { error: e && e.message }); } } } catch (e) { logError('Failed to register onResponse hook', { error: e && e.message }); } },
          onAuthFailure: (fn) => { try { hostHooks.onAuthFailure = typeof fn === 'function' ? fn : null; if (hostHooks.onAuthFailure && __lastHostAuthFailure) { try { hostHooks.onAuthFailure(__lastHostAuthFailure); } catch (e) { logError('Cached onAuthFailure hook threw', { error: e && e.message }); } } } catch (e) { logError('Failed to register onAuthFailure hook', { error: e && e.message }); } },

          // Backwards-compatible registration: accept an object of hooks
          registerHooks: (hooks = {}) => {
            try {
              if (hooks.onOpen) hostHooks.onOpen = typeof hooks.onOpen === 'function' ? hooks.onOpen : hostHooks.onOpen;
              if (hooks.onClose) hostHooks.onClose = typeof hooks.onClose === 'function' ? hooks.onClose : hostHooks.onClose;
              if (hooks.onMessage) hostHooks.onMessage = typeof hooks.onMessage === 'function' ? hooks.onMessage : hostHooks.onMessage;
              if (hooks.onResponse) hostHooks.onResponse = typeof hooks.onResponse === 'function' ? hooks.onResponse : hostHooks.onResponse;
              if (hooks.onAuthFailure) hostHooks.onAuthFailure = typeof hooks.onAuthFailure === 'function' ? hooks.onAuthFailure : hostHooks.onAuthFailure;
              // Deliver cached events if present
              try {
                if (hostHooks.onMessage && __lastHostMessage) {
                  hostHooks.onMessage(__lastHostMessage);
                }
                if (hostHooks.onResponse && __lastHostResponse) {
                  hostHooks.onResponse(__lastHostResponse);
                }
                if (hostHooks.onAuthFailure && __lastHostAuthFailure) {
                  hostHooks.onAuthFailure(__lastHostAuthFailure);
                }
              } catch (e) {
                logError('Cached hook delivery via registerHooks threw', { error: e && e.message });
              }

            } catch (e) {
              logError('Failed to register hooks object', { error: e && e.message });
            }
          },

          // Public API controls
          show: () => {
            try {
              container.style.display = "block";
              if (hostHooks.onOpen) {
                try {
                  hostHooks.onOpen();
                } catch (e) { logError('onOpen hook threw', { error: e && e.message }); }
              }
            } catch (err) {
              logError("Failed to show widget", { error: err.message });
            }
          },
          hide: () => {
            try {
              container.style.display = "none";
              if (hostHooks.onClose) {
                try {
                  hostHooks.onClose();
                } catch (e) { logError('onClose hook threw', { error: e && e.message }); }
              }
            } catch (err) {
              logError("Failed to hide widget", { error: err.message });
            }
          },
          resize: (width, height) => {
            try {
              if (width) container.style.width = `${width}px`;
              if (height) container.style.height = `${height}px`;
            } catch (err) {
              logError("Failed to resize widget", {
                error: err.message,
                width,
                height,
              });
            }
          },
          sendMessage: (message) => {
            try {
              try {
                // Record last host-initiated message to avoid duplicate delivery
                __lastHostMessage = message;
                if (hostHooks.onMessage) {
                  try {
                    hostHooks.onMessage(message);
                  } catch (e) { logError('onMessage hook threw', { error: e && e.message }); }
                }
              } catch (e) { logError('onMessage hook threw', { error: e && e.message }); }
              if (!iframe.contentWindow) {
                throw new Error("iframe not ready");
              }
              iframe.contentWindow.postMessage(
                { type: "HOST_MESSAGE", data: message },
                baseUrl
              );
            } catch (err) {
              logError("Failed to send message to widget", {
                error: err.message,
                message,
              });
            }
          },
          getErrors: () => errors,
          destroy: () => {
            try {
              window.removeEventListener("message", handleMessage);
              if (container.parentNode) {
                container.parentNode.removeChild(container);
              }
              delete window.CompaninWidget;
              window.__COMPANIN_WIDGET__ = false;
            } catch (err) {
              logError("Failed to destroy widget", { error: err.message });
            }
          },
        };

        function handleMessage(event) {
          try {
            // Verify origin - always validate, even in dev mode
            const isValidOrigin = isDev
              ? (event.origin === baseUrl || event.origin.includes('localhost') || event.origin.includes('127.0.0.1'))
              : event.origin.includes("companin.tech");

            if (!isValidOrigin) {
              logError("Message from unauthorized origin", { origin: event.origin });
              return;
            }

            const { type, data } = event.data || {};
            if (!type) return;

            switch (type) {
            case "WIDGET_RESIZE":
                if (data?.height) {
                  container.style.height = `${data.height}px`;
                }
                if (data?.width) {
                  container.style.width = `${data.width}px`;
                }

                // Handle dynamic positioning if provided
                if (data?.position) {
                  const offset = typeof data.edge_offset === 'number' ? data.edge_offset : 20;

                  // Reset all corner properties
                  container.style.bottom = '';
                  container.style.top = '';
                  container.style.right = '';
                  container.style.left = '';

                  if (data.position.includes('bottom')) {
                    container.style.bottom = `${offset}px`;
                  } else {
                    container.style.top = `${offset}px`;
                  }

                  if (data.position.includes('right')) {
                    container.style.right = `${offset}px`;
                  } else {
                    container.style.left = `${offset}px`;
                  }
                }
                break;

              case "WIDGET_HIDE":
                container.style.display = "none";
                try {
                  if (hostHooks.onClose) {
                    try { hostHooks.onClose(data); } catch (e) { logError('onClose hook threw', { error: e && e.message }); }
                  }
                } catch (e) { logError('onClose hook threw', { error: e && e.message }); }
                break;

              case "WIDGET_MINIMIZE":
                // Widget requested minimize -> show minimized button state
                // Don't hide container; let the iframe handle its own UI state
                try {
                  if (hostHooks.onClose) {
                    try { hostHooks.onClose(data); } catch (e) { logError('onClose hook threw', { error: e && e.message }); }
                  }
                } catch (e) { logError('onClose hook threw', { error: e && e.message }); }
                break;

              case "WIDGET_SHOW":
                container.style.display = "block";
                try {
                  if (hostHooks.onOpen) {
                    try { hostHooks.onOpen(data); } catch (e) { logError('onOpen hook threw', { error: e && e.message }); }
                  }
                } catch (e) { logError('onOpen hook threw', { error: e && e.message }); }
                break;

              case "WIDGET_RESTORE":
                // Widget requested restore/expand -> treat as open
                // Container stays visible; iframe handles its own expanded state
                try {
                  if (hostHooks.onOpen) {
                    try { hostHooks.onOpen(data); } catch (e) { logError('onOpen hook threw', { error: e && e.message }); }
                  }
                } catch (e) { logError('onOpen hook threw', { error: e && e.message }); }
                break;

              case "WIDGET_ERROR":
                logError("Widget reported an error", data);
                // If error indicates auth failure, call auth hook
                try {
                  const code = data && (data.code || data.error || '').toString().toLowerCase();
                  if (code && code.includes('auth')) {
                    if (hostHooks.onAuthFailure) {
                      try { hostHooks.onAuthFailure(data); } catch (e) { logError('onAuthFailure hook threw', { error: e && e.message }); }
                    }
                  }
                } catch (e) {
                  logError('onAuthFailure hook check failed', { error: e && e.message });
                }
                break;

              default:
                break;
            }

            // Generic hooks: try to detect responses, auth failures, and message events
            try {
              const t = (type || '').toString().toLowerCase();

              // Response-like events
              if (t.includes('response') || t.endsWith('_response')) {
                try {
                  __lastHostResponse = data;
                  if (hostHooks.onResponse) {
                    try { hostHooks.onResponse(data); } catch (e) { logError('onResponse hook threw', { error: e && e.message }); }
                  }
                } catch (e) { logError('onResponse hook threw', { error: e && e.message }); }
              }

              // Auth failure events
              if (t.includes('auth') && (t.includes('fail') || t.includes('error') || t.includes('failure'))) {
                try {
                  __lastHostAuthFailure = data;
                  if (hostHooks.onAuthFailure) {
                    try { hostHooks.onAuthFailure(data); } catch (e) { logError('onAuthFailure hook threw', { error: e && e.message }); }
                  }
                } catch (e) { logError('onAuthFailure hook threw', { error: e && e.message }); }
              }

              // Message events (e.g., widget notifies about a sent message or incoming message)
              if (t.includes('message') || t.includes('msg')) {
                try {
                  // If this message matches the last host-initiated message, skip duplicate delivery
                  if (__lastHostMessage && data && data.id && __lastHostMessage.id && data.id === __lastHostMessage.id) {
                    // clear cached last message after skipping
                    __lastHostMessage = null;
                  } else {
                    __lastHostMessage = data;
                    if (hostHooks.onMessage) {
                      try { hostHooks.onMessage(data); } catch (e) { logError('onMessage hook threw', { error: e && e.message }); }
                    }
                  }
                } catch (e) { logError('onMessage hook threw', { error: e && e.message }); }
              }
            } catch (e) {
              logError('Failed to process generic hooks', { error: e && e.message, type });
            }
          } catch (err) {
            logError("Error handling message from widget", {
              error: err.message,
              eventType: event?.data?.type,
            });
          }
        }

        // button logic has been removed; nothing to wire up
      } catch (err) {
        logError("Failed to initialize widget", { error: err.message, stack: err.stack });
        showErrorWidget(
          "Initialization Error",
          "Failed to initialize the chat widget. Please try refreshing the page."
        );
      }
    }

    // Initialize immediately if body is ready
    if (document.body) {
      initWidget();
    }
  } catch (err) {
    logError("Critical error in widget script", {
      error: err.message,
      stack: err.stack,
    });
  }

  // Helper function to show error in a styled widget
  function showErrorWidget(title, message) {
    try {
      const errorContainer = document.createElement("div");
      errorContainer.id = "companin-widget-error";
      errorContainer.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 320px;
        background: #fef2f2;
        border: 1px solid #dc2626;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 4px 6px rgba(0,0,0,0.1);
        font-family: system-ui, -apple-system, sans-serif;
        z-index: 999999;
      `;

      errorContainer.innerHTML = `
        <div style="display: flex; align-items: start; gap: 12px;">
          <div style="flex-shrink: 0; width: 20px; height: 20px; color: #dc2626;">
            <svg viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
            </svg>
          </div>
          <div style="flex: 1;">
            <h4 style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #dc2626;">${title}</h4>
            <p style="margin: 0; font-size: 13px; color: #6b7280; line-height: 1.5;">${message}</p>
          </div>
          <button onclick="this.parentElement.parentElement.remove()" style="flex-shrink: 0; background: none; border: none; cursor: pointer; color: #9ca3af; font-size: 20px; line-height: 1; padding: 0;">×</button>
        </div>
      `;

      if (document.body) {
        document.body.appendChild(errorContainer);
      } else {
        document.addEventListener("DOMContentLoaded", () => {
          document.body.appendChild(errorContainer);
        });
      }
    } catch (err) {
      console.error("Failed to show error widget:", err);
    }
  }

  // Helper to show error in existing container
  function showErrorInContainer(container, message) {
    try {
      container.innerHTML = `
        <div style="
          background: #fef2f2;
          border: 1px solid #dc2626;
          border-radius: 8px;
          padding: 16px;
          font-family: system-ui, -apple-system, sans-serif;
          max-width: 320px;
        ">
          <p style="margin: 0; font-size: 14px; color: #dc2626;">${message}</p>
          <button onclick="window.location.reload()" style="
            margin-top: 12px;
            background: #dc2626;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 13px;
            cursor: pointer;
          ">Reload Page</button>
        </div>
      `;
    } catch (err) {
      console.error("Failed to show error in container:", err);
    }
  }
})();
