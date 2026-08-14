'use client'

import { t as translate } from '../../../../lib/i18n'
import type { DocsTheme } from '../DocsClient.types'

interface DocsSearchBarProps {
  /** Placeholder copy — the localized `teaser_message` from the widget config. */
  placeholder: string;
  /** Resolved docs theme (CSS custom properties + chrome colors). */
  theme: DocsTheme;
  activeLocale: string;
  /**
   * Open the widget. `seed` carries anything the visitor typed into the bar
   * before it opened so the query isn't lost.
   */
  onOpen: (seed?: string) => void;
  /** Retire the bar for this page view. */
  onDismiss: () => void;
  /**
   * `fixed` (default) fills the bar-sized iframe on the host page; `static`
   * lets a host surface lay it out in normal flow.
   */
  positioning?: 'fixed' | 'static';
}

/**
 * Collapsed entry point for the docs widget: an ask box pinned to the bottom of
 * the host page. It is the docs counterpart of the chat widget's teaser bubble
 * + launcher — clicking it (or typing into it) opens the full docs panel,
 * carrying the typed query across.
 *
 * Shaped like the panel's composer — a two-row card with the question line on
 * top and a circular send affordance below — so the collapsed and open states
 * read as the same product. Rendered inside an iframe the loader sizes to
 * DOCS_SEARCH_BAR_SIZE and anchors bottom-center, so everything outside the
 * card stays clickable on the host page. It floats over the host's own content,
 * so it leans on elevation to read as a separate surface. Hover/focus/entrance
 * motion lives in globals.css (`.docs-search-bar`) so the reduced-motion block
 * can strip it.
 */
export function DocsSearchBar({
  placeholder,
  theme,
  activeLocale,
  onOpen,
  onDismiss,
  positioning = 'fixed',
}: DocsSearchBarProps) {
  const openLabel = placeholder || translate(activeLocale, 'docsSearchPlaceholder');

  return (
    <div
      style={{
        ...theme.vars,
        boxSizing: 'border-box',
        ...(positioning === 'fixed'
          ? { position: 'fixed' as const, inset: 0 }
          : { position: 'relative' as const }),
        width: '100%',
        height: positioning === 'fixed' ? '100%' : 'auto',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '14px 16px calc(18px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        // A click anywhere on the card means "ask", so the whole surface opens
        // the widget. The inner input exists for the look and for keyboard
        // users who tab in and start typing (onChange below).
        onClick={() => onOpen()}
        className="docs-search-bar"
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          width: '100%',
          maxWidth: '560px',
          padding: '14px 14px 12px',
          // Deliberately the opaque surface color rather than theme.panelBackground:
          // a translucent/glassmorphism config is fine for the panel, which sits
          // over its own scrim, but the collapsed card floats over the host
          // page's text — showing it through the launcher makes both unreadable.
          background: 'var(--background)',
          border: `1px solid ${theme.border}`,
          borderRadius: '16px',
          cursor: 'text',
        }}
      >
        <input
          type="text"
          defaultValue=""
          aria-label={openLabel}
          placeholder={placeholder}
          // Typing is the other way in: hand the first keystroke to the panel's
          // search box rather than dropping it.
          onChange={(e) => onOpen(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              onOpen(e.currentTarget.value);
            }
          }}
          style={{
            width: '100%',
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: theme.title,
            fontSize: '15px',
            lineHeight: 1.4,
            padding: '2px 2px 0',
          }}
        />
        {/* Control row — mirrors the composer's footer: quiet affordance on the
            left, send on the right. */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDismiss(); }}
            aria-label={translate(activeLocale, 'dismiss')}
            title={translate(activeLocale, 'dismiss')}
            className="docs-search-bar__dismiss"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '30px',
              height: '30px',
              borderRadius: '9999px',
              border: `1px solid ${theme.border}`,
              background: 'transparent',
              color: theme.subtitle,
              cursor: 'pointer',
              lineHeight: 1,
              padding: 0,
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          {/* Send affordance. Decorative — the whole card is the click target,
              and the input above already carries the accessible name. */}
          <span
            aria-hidden
            className="docs-search-bar__go"
            style={{
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '34px',
              height: '34px',
              borderRadius: '9999px',
              background: 'var(--primary)',
              color: 'var(--primary-foreground)',
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '15px', height: '15px' }}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19V5M5 12l7-7 7 7" />
            </svg>
          </span>
        </div>
      </div>
    </div>
  );
}
