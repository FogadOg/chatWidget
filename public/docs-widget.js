(function () {
  // Prevent multiple initializations
  if (window.__COMPANIN_DOCS_WIDGET__) {
    console.warn("Companin Docs Widget: Already initialized");
    return;
  }
  window.__COMPANIN_DOCS_WIDGET__ = true;

  // Error tracking
  const errors = [];
  const logError = (message, context) => {
    const error = {
      timestamp: new Date().toISOString(),
      message,
      context,
    };
    errors.push(error);
    console.error("Companin Docs Widget Error:", message, context);
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
    const locale = script.getAttribute("data-locale") || "en";
    const startOpen = script.getAttribute("data-start-open") === "true";
    const suggestions = script.getAttribute("data-suggestions");

    // Validate required attributes
    if (!clientId || !assistantId || !configId) {
      const missing = [];
      if (!clientId) missing.push("data-client-id");
      if (!assistantId) missing.push("data-assistant-id");
      if (!configId) missing.push("data-config-id");

      logError("Missing required attributes", { missing });

      // Show user-friendly error
      showErrorWidget(
        "Configuration Error",
        `Missing required attributes: ${missing.join(", ")}. Please check your docs widget installation.`
      );
      return;
    }

    // Determine the base URL with fallback
    const isDev = script.getAttribute("data-dev") === "true";
    const baseUrl = isDev
      ? "http://localhost:3001"
      : "https://widget.companin.tech";

    // Create container with error handling (initially hidden)
    const container = document.createElement("div");
    container.id = "companin-docs-widget-container";
    container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 0;
      height: 0;
      z-index: 999999;
      transition: all 0.3s ease;
      display: none;
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

        // Create iframe with error handling
        const iframe = document.createElement("iframe");
        const params = new URLSearchParams({
          clientId,
          assistantId,
          configId,
          locale,
          startOpen: startOpen.toString(),
          pagePath: window.location.pathname,
        });

        if (suggestions) {
          params.set("suggestions", suggestions);
        }

        iframe.src = `${baseUrl}/embed/docs?${params.toString()}`;
        iframe.style.cssText = `
          width: 100%;
          height: 100%;
          border: 0;
          background-color: transparent;
        `;
        iframe.setAttribute("allow", "clipboard-write");
        iframe.setAttribute("title", "Companin Docs Widget");

        // Handle iframe load errors
        let iframeLoaded = false;
        const loadTimeout = setTimeout(() => {
          if (!iframeLoaded) {
            logError("Docs widget iframe failed to load (timeout)", { src: iframe.src });
            showErrorInContainer(
              container,
              "Failed to load docs widget. Please refresh the page."
            );
          }
        }, 15000); // 15 second timeout

        iframe.onload = () => {
          iframeLoaded = true;
          clearTimeout(loadTimeout);
        };

        iframe.onerror = (error) => {
          clearTimeout(loadTimeout);
          logError("Docs widget iframe failed to load", { error, src: iframe.src });
          showErrorInContainer(
            container,
            "Failed to load docs widget. Please check your connection."
          );
        };

        container.appendChild(iframe);
        document.body.appendChild(container);

        // Listen for widget events with error handling
        window.addEventListener("message", handleMessage);

        // Expose API for programmatic control
        window.CompaninDocsWidget = {
          open: () => {
            try {
              if (!iframe.contentWindow) {
                throw new Error("iframe not ready");
              }
              iframe.contentWindow.postMessage(
                { type: "OPEN_DOCS_DIALOG" },
                baseUrl
              );
            } catch (err) {
              logError("Failed to open docs widget", { error: err.message });
            }
          },
          close: () => {
            try {
              if (!iframe.contentWindow) {
                throw new Error("iframe not ready");
              }
              iframe.contentWindow.postMessage(
                { type: "CLOSE_DOCS_DIALOG" },
                baseUrl
              );
            } catch (err) {
              logError("Failed to close docs widget", { error: err.message });
            }
          },
          show: () => {
            try {
              container.style.display = "block";
            } catch (err) {
              logError("Failed to show docs widget", { error: err.message });
            }
          },
          hide: () => {
            try {
              container.style.display = "none";
            } catch (err) {
              logError("Failed to hide docs widget", { error: err.message });
            }
          },
          sendMessage: (message) => {
            try {
              if (!iframe.contentWindow) {
                throw new Error("iframe not ready");
              }
              iframe.contentWindow.postMessage(
                { type: "HOST_MESSAGE", data: message },
                baseUrl
              );
            } catch (err) {
              logError("Failed to send message to docs widget", {
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
              delete window.CompaninDocsWidget;
              window.__COMPANIN_DOCS_WIDGET__ = false;
            } catch (err) {
              logError("Failed to destroy docs widget", { error: err.message });
            }
          },
        };

        function handleMessage(event) {
          try {
            // Verify origin in production
            if (!isDev && !event.origin.includes("companin.tech")) {
              return;
            }

            const { type, data } = event.data || {};
            if (!type) return;

            switch (type) {
              case "WIDGET_RESIZE":
                if (data?.hide) {
                  // Hide the container
                  container.style.display = "none";
                  container.style.width = "0";
                  container.style.height = "0";
                } else if (data?.height) {
                  if (data.height === "100vh") {
                    // Full screen mode
                    container.style.display = "block";
                    container.style.height = "100vh";
                    container.style.width = "100vw";
                    container.style.top = "0";
                    container.style.left = "0";
                  } else {
                    container.style.height = `${data.height}px`;
                  }
                }
                if (data?.width && data.width !== "100vw") {
                  container.style.width = `${data.width}px`;
                }
                break;

              case "WIDGET_HIDE":
                container.style.display = "none";
                break;

              case "WIDGET_SHOW":
                container.style.display = "block";
                break;

              case "WIDGET_ERROR":
                logError("Docs widget reported an error", data);
                break;

              default:
                break;
            }
          } catch (err) {
            logError("Error handling message from docs widget", {
              error: err.message,
              eventType: event?.data?.type,
            });
          }
        }
      } catch (err) {
        logError("Failed to initialize docs widget", {
          error: err.message,
          stack: err.stack,
        });
        showErrorWidget(
          "Initialization Error",
          "Failed to initialize the docs widget. Please try refreshing the page."
        );
      }
    }

    // Initialize immediately if body is ready
    if (document.body) {
      initWidget();
    }
  } catch (err) {
    logError("Critical error in docs widget script", {
      error: err.message,
      stack: err.stack,
    });
  }

  // Helper function to show error in a styled widget
  function showErrorWidget(title, message) {
    try {
      const errorContainer = document.createElement("div");
      errorContainer.id = "companin-docs-widget-error";
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