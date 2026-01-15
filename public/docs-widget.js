(function () {
  if (window.__COMPANIN_DOCS_WIDGET__) return;
  window.__COMPANIN_DOCS_WIDGET__ = true;

  const script = document.currentScript;
  if (!script) return;

  const clientId = script.getAttribute("data-client-id");
  const assistantId = script.getAttribute("data-assistant-id");
  const configId = script.getAttribute("data-config-id");
  const locale = script.getAttribute("data-locale") || "en";
  const startOpen = script.getAttribute("data-start-open") === "true";
  const suggestions = script.getAttribute("data-suggestions");

  if (!clientId || !assistantId || !configId) {
    console.error("Companin Docs Widget: Missing required attributes (data-client-id, data-assistant-id, or data-config-id)");
    return;
  }

  // Determine the base URL
  const isDev = script.getAttribute("data-dev") === "true";
  const baseUrl = isDev ? "http://localhost:3001" : "https://widget.companin.tech";

  // Create container (initially hidden)
  const container = document.createElement("div");
  container.id = "companin-docs-widget-container";
  container.style.position = "fixed";
  container.style.top = "0";
  container.style.left = "0";
  container.style.width = "0";
  container.style.height = "0";
  container.style.zIndex = "999999";
  container.style.transition = "all 0.3s ease";
  container.style.display = "none";

  // Reset body margins and padding to ensure proper positioning
  document.body.style.margin = "0";
  document.body.style.padding = "0";

  // Create iframe
  const iframe = document.createElement("iframe");
  const params = new URLSearchParams({
    clientId,
    assistantId,
    configId,
    locale,
    startOpen: startOpen.toString(),
  });

  if (suggestions) {
    params.set('suggestions', suggestions);
  }

  iframe.src = `${baseUrl}/embed/docs?${params.toString()}`;
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  iframe.style.backgroundColor = "transparent";
  iframe.setAttribute("allow", "clipboard-write");

  container.appendChild(iframe);
  document.body.appendChild(container);

  // Listen for widget events
  window.addEventListener("message", (event) => {
    // Verify origin in production
    if (!isDev && !event.origin.includes("companin.tech")) {
      return;
    }

    const { type, data } = event.data || {};

    switch (type) {
      case "WIDGET_RESIZE":
        if (data?.hide) {
          // Hide the container
          container.style.display = 'none';
          container.style.width = '0';
          container.style.height = '0';
        } else if (data?.height) {
          if (data.height === '100vh') {
            // Full screen mode
            container.style.display = 'block';
            container.style.height = '100vh';
            container.style.width = '100vw';
            container.style.top = '0';
            container.style.left = '0';
          } else {
            container.style.height = `${data.height}px`;
          }
        }
        if (data?.width && data.width !== '100vw') {
          container.style.width = `${data.width}px`;
        }
        break;

      case "WIDGET_HIDE":
        container.style.display = "none";
        break;

      case "WIDGET_SHOW":
        container.style.display = "block";
        break;

      default:
        break;
    }
  });

  // Expose API for programmatic control
  window.CompaninDocsWidget = {
    open: () => {
      iframe.contentWindow?.postMessage(
        { type: "OPEN_DOCS_DIALOG" },
        baseUrl
      );
    },
    close: () => {
      iframe.contentWindow?.postMessage(
        { type: "CLOSE_DOCS_DIALOG" },
        baseUrl
      );
    },
    show: () => {
      container.style.display = "block";
    },
    hide: () => {
      container.style.display = "none";
    },
    sendMessage: (message) => {
      iframe.contentWindow?.postMessage(
        { type: "HOST_MESSAGE", data: message },
        baseUrl
      );
    },
  };
})();