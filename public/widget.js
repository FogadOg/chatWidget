(function () {
  if (window.__COMPANIN_WIDGET__) return;
  window.__COMPANIN_WIDGET__ = true;

  const script = document.currentScript;
  if (!script) return;

  const clientId = script.getAttribute("data-client-id");
  const assistantId = script.getAttribute("data-assistant-id");
  const configId = script.getAttribute("data-config-id");
  const locale = script.getAttribute("data-locale") || "en";
  const startOpen = script.getAttribute("data-start-open") === "true";

  if (!clientId || !assistantId || !configId) {
    console.error("Companin Widget: Missing required attributes (data-client-id, data-assistant-id, or data-config-id)");
    return;
  }

  // Determine the base URL
  const isDev = script.getAttribute("data-dev") === "true";
  const baseUrl = isDev ? "http://localhost:3001" : "https://widget.companin.tech";

  // Create container
  const container = document.createElement("div");
  container.id = "companin-widget-container";
  container.style.position = "fixed";
  container.style.bottom = "20px";
  container.style.right = "20px";
  container.style.width = "auto";
  container.style.height = "auto";
  container.style.zIndex = "999999";
  container.style.transition = "all 0.3s ease";

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

  iframe.src = `${baseUrl}/embed/session?${params.toString()}`;
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
        if (data?.height) {
          container.style.height = `${data.height}px`;
        }
        if (data?.width) {
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
  window.CompaninWidget = {
    show: () => {
      container.style.display = "block";
    },
    hide: () => {
      container.style.display = "none";
    },
    resize: (width, height) => {
      if (width) container.style.width = `${width}px`;
      if (height) container.style.height = `${height}px`;
    },
    sendMessage: (message) => {
      iframe.contentWindow?.postMessage(
        { type: "HOST_MESSAGE", data: message },
        baseUrl
      );
    },
  };
})();
