# Companin Widget - JavaScript Injection Implementation

This is a production-ready, JavaScript-injected widget built with Next.js + TypeScript, following industry best practices used by companies like Intercom, HubSpot, and Calendly.

## 🏗️ Architecture

### How It Works

1. **Third-party sites add a single script tag:**
```html
<script
  src="https://widget.companin.tech/widget.js"
  data-client-id="YOUR_CLIENT_ID"
  data-assistant-id="YOUR_ASSISTANT_ID"
  data-config-id="YOUR_CONFIG_ID"
></script>
```

2. **The script automatically:**
   - Creates an iframe container
   - Loads your Next.js embed page
   - Provides iframe isolation (no CSS/JS conflicts)
   - Exposes a JavaScript API for programmatic control

### Files Structure

```
widget-app/
├── public/
│   ├── widget.js           # JavaScript injection script (vanilla JS)
│   └── test-widget.html    # Test page for development
├── app/
│   └── embed/
│       └── session/
│           ├── page.tsx         # Server component (validates params)
│           └── EmbedClient.tsx  # Client component (widget logic)
├── next.config.ts          # Allows iframe embedding
└── README-WIDGET.md        # This file
```

## 🚀 Quick Start

### 1. Development

Start the Next.js development server:

```bash
cd widget-app
npm run dev
```

Open `http://localhost:3001/test-widget.html` to see the widget in action.

### 2. Testing Locally

Create a simple HTML file on any website or local server:

```html
<!DOCTYPE html>
<html>
<body>
  <h1>My Website</h1>

  <script
    src="http://localhost:3001/widget.js"
    data-client-id="u322QLKwOrY-SRBGIrgMlS42XEq8RYw2RQu9OHlB40k"
    data-assistant-id="aba4e422-97d0-4f8d-917e-a4ffbf19b7bb"
    data-config-id="88ee4029-5d33-4f5b-84d9-ba6a9c5081a1"
    data-locale="en"
    data-dev="true"
  ></script>
</body>
</html>
```

## 📋 Configuration

### Required Attributes

| Attribute | Description | Example |
|-----------|-------------|---------|
| `data-client-id` | OAuth client ID from your backend | `u322QLKw...` |
| `data-assistant-id` | Assistant's unique identifier | `aba4e422-...` |
| `data-config-id` | Widget configuration ID | `88ee4029-...` |

### Optional Attributes

| Attribute | Description | Default | Example |
|-----------|-------------|---------|---------|
| `data-locale` | Language code (ISO 639-1) | `en` | `es`, `fr`, `de` |
| `data-dev` | Use localhost instead of production | `false` | `true` |

## 🎮 JavaScript API

The widget exposes a global `CompaninWidget` object for programmatic control:

```javascript
// Show or hide the widget
window.CompaninWidget.show();
window.CompaninWidget.hide();

// Resize the widget (width, height in pixels)
window.CompaninWidget.resize(400, 700);

// Send messages to the widget
window.CompaninWidget.sendMessage({
  type: 'greeting',
  text: 'Hello from the host page!'
});

// Subscribe to lifecycle and message events
window.CompaninWidget.onOpen(() => console.log('Widget opened'));
window.CompaninWidget.onClose(() => console.log('Widget closed'));
window.CompaninWidget.onMessage((msg) => console.log('Message event', msg));
window.CompaninWidget.onResponse((resp) => console.log('Response event', resp));
window.CompaninWidget.onAuthFailure((err) => console.warn('Auth failure', err));
```

## 📨 PostMessage Events

The widget can send events to the parent page:

### Widget → Parent

```javascript
window.addEventListener('message', (event) => {
  if (event.data.type === 'WIDGET_RESIZE') {
    console.log('Widget resized:', event.data);
  }
});
```

Available event types:
- `WIDGET_RESIZE` - Widget dimensions changed
- `WIDGET_MINIMIZE` - Widget minimized
- `WIDGET_RESTORE` - Widget restored to normal size
- `WIDGET_HIDE` - Widget hidden
- `WIDGET_SHOW` - Widget shown

### Parent → Widget

```javascript
iframe.contentWindow.postMessage(
  { type: 'HOST_MESSAGE', data: { ... } },
  'https://widget.companin.tech'
);
```

Supported `HOST_MESSAGE` payloads:
- `"your text"` → sends a user message into the widget
- `{ text: "your text" }` (also `message`, `content`, `prompt`, `query`)
- `{ action: 'open' | 'close' | 'toggle' }` (also `show`/`hide`/`restore`/`minimize`)

Example host commands:

```javascript
// Send a message
window.CompaninWidget.sendMessage('Summarize this page');

// Open / close with commands
window.CompaninWidget.sendMessage({ action: 'open' });
window.CompaninWidget.sendMessage({ action: 'close' });
window.CompaninWidget.sendMessage({ action: 'toggle' });
```

## 🔐 Security

### Current Implementation (Development)

```javascript
// widget.js allows any origin
frame-ancestors *;
```

### Production Recommendations

1. **Restrict frame-ancestors** in `next.config.ts`:
```typescript
{
  key: "Content-Security-Policy",
  value: "frame-ancestors https://trusted-domain.com https://another-domain.com;",
}
```

2. **Validate embed tokens** (implement JWT):
```typescript
// app/embed/session/page.tsx
const decoded = verifyJWT(clientId);
if (!decoded || decoded.exp < Date.now()) {
  return <ErrorPage />;
}
```

3. **Verify postMessage origins**:
```javascript
// widget.js
if (!event.origin.includes('companin.tech')) {
  return;
}
```

## 🏭 Production Deployment

### 1. Update widget.js

Change the base URL:

```javascript
// public/widget.js
const baseUrl = isDev
  ? "http://localhost:3001"
  : "https://widget.companin.tech";
```

### 2. Deploy Next.js App

```bash
npm run build
npm start
```

Or deploy to Vercel/Railway/your hosting provider.

### 3. Host widget.js on CDN (Recommended)

For best performance and caching:

1. Upload `public/widget.js` to your CDN
2. Version the file: `widget-v1.2.3.js`
3. Set cache headers: `Cache-Control: public, max-age=31536000`

Users then load:
```html
<script src="https://cdn.companin.tech/widget-v1.2.3.js" ...></script>
```

## 🧪 Testing Checklist

- [ ] Widget loads on third-party sites
- [ ] No CSS conflicts with host page
- [ ] No JavaScript errors in console
- [ ] Responsive on mobile devices
- [ ] postMessage events work correctly
- [ ] API methods (show/hide/resize) work
- [ ] Multi-language support works
- [ ] Authentication/token validation works
- [ ] Widget persists across page navigation
- [ ] Works across different browsers

## 🔄 Migration from Iframe Embed

**Old way** (iframe in HTML):
```html
<iframe src="https://widget.companin.tech/embed/session?..."></iframe>
```

**New way** (JavaScript injection):
```html
<script src="https://widget.companin.tech/widget.js" data-client-id="..."></script>
```

### Benefits

✅ No manual iframe HTML needed
✅ Automatic positioning and styling
✅ JavaScript API for control
✅ Version management via script URL
✅ Better UX (animations, resize, etc.)
✅ Industry-standard approach

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [postMessage API](https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage)
- [Content Security Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP)
- [JWT Best Practices](https://jwt.io/introduction)

## 🐛 Troubleshooting

### Widget doesn't appear

1. Check browser console for errors
2. Verify all required `data-*` attributes are present
3. Check that Next.js server is running
4. Verify CSP headers allow iframe embedding

### postMessage not working

1. Check origin restrictions
2. Verify iframe has loaded completely
3. Check browser console for CORS errors

### Widget conflicts with site CSS

This shouldn't happen due to iframe isolation, but if it does:
1. Check z-index values (widget uses 999999)
2. Verify widget container has `position: fixed`
3. Check for global CSS that might affect iframes

## 💡 Future Enhancements

- [ ] JWT token validation
- [ ] Scoped permissions (read-only, limited actions)
- [ ] NPM SDK wrapper
- [ ] Multiple widget instances
- [ ] Custom themes via `data-theme`
- [ ] Analytics/tracking integration
- [ ] Offline support with service worker
- [ ] Real-time typing indicators
- [ ] File upload support
- [ ] Voice input
- [ ] Mobile-optimized UI

## Bundle size enforcement — CI checks & performance budgets (future)

Automated bundle size enforcement is configured to run in CI and helps prevent regressions in shipped bundle weight. The CI workflow runs a build and then `size-limit` to measure built assets against configured performance budgets. When budgets are exceeded the workflow fails and blocks merges so teams can address large regressions early.

- How it works:
  - `npm run ci:size-limit` builds the app and runs `size-limit` against Next.js build artifacts.
  - Budgets live in `.size-limit.js` and are kept intentionally conservative; adjust them over time as the product grows.
  - Developers investigate violations with bundle analyzers (for example `webpack-bundle-analyzer` or `next-bundle-analyzer`), replace heavy libraries, and adopt lazy-loading.

- Files added:
  - `.size-limit.js` — performance budgets for CI
  - `.github/workflows/size-limit.yml` — CI job that runs the size checks
  - `package.json` scripts: `size-limit` and `ci:size-limit`

- Next steps for the team:
  - Tweak limits in `.size-limit.js` to match realistic budgets.
  - Optionally add a `--why` step or `size-limit --why` for pull requests to show the dependency tree causing the weight.
  - Add bundle analysis scripts (e.g. `analyze`) and document mitigation guidance for oversized packages.

  Viewing the analyzer report quickly

  - After running `npm run analyze`, open the static report in your browser:
    - Serve and open automatically: `npm run analyze:open` (starts a static server on port 8000)
    - Or manually open: `.next/analyze/client.html`

  If you want, I can also:
  - Open the analyzer report for you now, or
  - Propose specific modules to tree-shake or replace after you review the report.

---

**Need help?** Contact [support@companin.tech](mailto:support@companin.tech) or visit our [documentation](https://companin.tech/docs).
