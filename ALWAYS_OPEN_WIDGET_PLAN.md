# Persistent Widget — Implementation Plan

## Summary
Add a third embeddable widget ("Persistent Widget") that mounts and remains visible on page load (no open button). It should follow the same conventions as the existing `widget` and `docs-widget` scripts but render permanently and be accessible, configurable, and easy to embed.

## Goals
- Provide a drop-in embed script (e.g. `persistent-widget.js`) under `src/embed/`.
- Render a persistent widget container visible on load (not behind a button).
- Allow configuration via `data-` attributes (client, assistant, config, locale, position, size).
- Maintain existing patterns for error logging and registry tracking.
- Support strict `postMessage` origin, accessibility, and tests.

## Constraints & Considerations
- Keep behavior consistent with `widget.js` and `docs-widget.js` (registry key, instance sanitization).
- Ensure no breaking changes to existing widgets.
- Minimize cross-origin fetches from embed to avoid CORS issues; rely on `data-powered-by` or global locales.
- Accessibility: widget must be keyboard-focusable, labelable, and announceable to screen readers.

## Implementation Steps
1. Create a new embed script file
   - Path: `src/embed/persistent-widget.js`
   - Base it on `src/embed/widget.js` but remove the compact-open button flow and ensure `display: block`/visible on init.
   - Ensure registry handling and `sanitizeInstanceId` usage are identical.

2. Container & CSS
   - Create the container element and set an always-visible style (e.g., fixed position, anchored to bottom/right or configurable via `data-position`).
   - Add runtime computed padding/size helpers similar to `widget.js` but default to visible layout.
   - Ensure the widget supports responsive widths and `max-width: 100vw`.

3. Initialization (auto-mount)
   - On script load, mount the Persistent Widget immediately (no click required).
   - Provide `data-start-open` and `data-start-closed` compatibility, but default to always open for this script.
   - Add feature flags: `data-dev`, `data-target-origin`, `data-strict-origin` per existing widgets.

4. Messaging & Interaction
   - Implement the same `postMessage` contract used by other widgets, honoring `strictOrigin` and `targetOrigin`.
   - Provide focus management functions: `focusWidget()`, `closeWidget()` (if optional collapse is supported later).

5. Configuration attributes & embed snippet
    - Document required attributes: `data-client-id`, `data-assistant-id`, `data-config-id`.
   - Optional: `data-instance-id`, `data-locale`, `data-position` (`bottom-right`, `top-left`, etc.), `data-width`, `data-height`.
   - Provide example embed snippet for docs and README.

6. Integrate into build
   - Ensure `next.config` or bundler copies `src/embed/always-open-widget.js` into the production `dist` or `public` location used by your current embed publishing flow.
   - Update `components.json` or any asset map if needed.

7. Tests and accessibility
   - Add unit/smoke tests in `__tests__` for:
     - Script initialization and container presence.
     - Keyboard focus and ARIA attributes.
     - Registry uniqueness when embedding multiple instances.
   - Run existing widget tests and update if the build step includes the new file.

8. Documentation
   - Add `widget-app/ALWAYS_OPEN_WIDGET_PLAN.md` (this file) and add an embed example to `README-WIDGET.md` and docs pages.
   - Provide usage snippet and configuration examples.

9. QA & Release
   - Manual test on representative pages (desktop/mobile).
   - Run accessibility audit (axe or Lighthouse) and fix issues.
   - Add bundle to release notes and deploy.

## Files to Add / Modify
- Add: `src/embed/always-open-widget.js` (new)
- Update: `components.json` or asset maps if used
- Update: `README-WIDGET.md` (add embed snippet and docs)
- Add tests: `__tests__/always-open-widget.test.*`
- (Optional) Add style module if you prefer a CSS file under `styles/embed/`.

## Example Embed Snippet
```html
<script id="companin-persistent-widget" src="https://widget.companin.tech/embed/persistent-widget.js"
   data-client-id="your-client-id"
   data-assistant-id="your-assistant-id"
   data-config-id="your-config-id"
   data-instance-id="my-instance"
   data-locale="en"
   data-position="bottom-right">
</script>
```

## Accessibility Checklist
- Ensure the container has an accessible name (e.g., `role="region" aria-label="Assistant"`).
- Ensure interactive controls inside the widget are reachable via Tab and announced by screen readers.
- Provide `aria-live` region for dynamic content updates if relevant.

## Estimated Effort
- Implementation: 4–8 hours
- Tests & Docs: 2–4 hours
- QA & fixes: 1–3 hours

---

If you want, I can:
- scaffold `src/embed/always-open-widget.js` based on `widget.js`,
- add a test skeleton, and
- add the README embed example.
Tell me which step to do next and I'll start implementing it.