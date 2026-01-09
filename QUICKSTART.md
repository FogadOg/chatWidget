# 🚀 Quick Start Guide - Companin Widget

## 1️⃣ Add Widget to Your Website (30 seconds)

Simply paste this script before your closing `</body>` tag:

```html
<script
  src="http://localhost:3001/widget.js"
  data-client-id="YOUR_CLIENT_ID"
  data-assistant-id="YOUR_ASSISTANT_ID"
  data-config-id="YOUR_CONFIG_ID"
  data-locale="en"
  data-start-open="false"
  data-dev="true"
></script>
```

**That's it!** The widget will automatically appear in the bottom-right corner.

---

## 2️⃣ Get Your Credentials

Replace these placeholders with your actual values:

| Parameter | Where to Find It | Example |
|-----------|------------------|---------|
| `YOUR_CLIENT_ID` | OAuth Applications page in dashboard | `u322QLKw...` |
| `YOUR_ASSISTANT_ID` | Assistants page → Copy ID | `aba4e422-...` |
| `YOUR_CONFIG_ID` | Widget Settings → Configuration ID | `88ee4029-...` |

---

## 3️⃣ Optional: Customize Behavior

### Start Widget Open
```html
data-start-open="true"
```

### Change Language
```html
data-locale="es"  <!-- Spanish -->
data-locale="fr"  <!-- French -->
data-locale="de"  <!-- German -->
```

### Production Mode
Remove or set to `false`:
```html
data-dev="false"
```

---

## 4️⃣ Control Widget with JavaScript

After the widget loads, you can control it programmatically:

```javascript
// Show or hide
window.CompaninWidget.show();
window.CompaninWidget.hide();

// Resize (width, height in pixels)
window.CompaninWidget.resize(400, 700);

// Send a message to the widget
window.CompaninWidget.sendMessage({
  type: 'greeting',
  text: 'Welcome!'
});
```

---

## 5️⃣ Test Locally

We've included a test page! Just:

1. Start the widget server:
```bash
cd widget-app
npm run dev
```

2. Open in your browser:
```
http://localhost:3001/test-widget.html
```

You'll see a fully functional demo with interactive controls.

---

## 📱 Mobile Support

The widget automatically adapts to mobile devices. You can control this with the `hide_on_mobile` setting in your widget configuration.

---

## 🎨 Styling

All styling is handled by your widget configuration in the dashboard:
- Colors
- Fonts
- Border radius
- Shadow intensity
- Position
- Size

No CSS needed on your website!

---

## 🔧 Troubleshooting

### Widget doesn't appear?

1. **Check the browser console** for errors (F12)
2. **Verify all data-* attributes** are present and correct
3. **Make sure Next.js server is running** (`npm run dev`)
4. **Check that widget.js loaded** (Network tab in DevTools)

### Still having issues?

1. Try the test page: `http://localhost:3001/test-widget.html`
2. Check the [full documentation](README-WIDGET.md)
3. Contact support: support@companin.tech

---

## 🌟 Full Example

Here's a complete, copy-paste-ready example:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>My Website with Companin</title>
</head>
<body>
  <h1>Welcome to my website!</h1>
  <p>The chat widget is in the bottom-right corner.</p>

  <!-- Companin Widget -->
  <script
    src="http://localhost:3001/widget.js"
    data-client-id="u322QLKwOrY-SRBGIrgMlS42XEq8RYw2RQu9OHlB40k"
    data-assistant-id="aba4e422-97d0-4f8d-917e-a4ffbf19b7bb"
    data-config-id="88ee4029-5d33-4f5b-84d9-ba6a9c5081a1"
    data-locale="en"
    data-start-open="true"
    data-dev="true"
  ></script>
</body>
</html>
```

---

## 🚀 Ready for Production?

When deploying to production:

1. Change `data-dev="true"` to `data-dev="false"`
2. Update the script URL to your production domain
3. Implement [security recommendations](README-WIDGET.md#-security)

---

## 📚 Learn More

- **Full Documentation:** [README-WIDGET.md](README-WIDGET.md)
- **Implementation Details:** [IMPLEMENTATION-SUMMARY.md](IMPLEMENTATION-SUMMARY.md)
- **API Reference:** [README-WIDGET.md#-javascript-api](README-WIDGET.md#-javascript-api)

---

**🎉 That's it! Your widget is now live and ready to chat with your visitors!**
