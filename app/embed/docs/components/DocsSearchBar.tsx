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
 * Collapsed entry point for the docs widget: a search field pinned to the
 * bottom of the host page. It is the docs counterpart of the chat widget's
 * teaser bubble + launcher — clicking it (or typing into it) opens the full
 * docs panel, carrying the typed query across.
 *
 * Rendered inside an iframe that the loader sizes to DOCS_SEARCH_BAR_SIZE and
 * anchors bottom-center, so everything outside the pill stays clickable on the
 * host page. It floats over the host's own content, so it stays deliberately
 * compact and leans on elevation — not width — to read as a separate surface.
 * Hover/focus/entrance motion lives in globals.css (`.docs-search-bar`) so the
 * reduced-motion block can strip it.
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
        // A click anywhere on the pill means "search", so the whole surface
        // opens the widget. The inner input exists for the look and for
        // keyboard users who tab in and start typing (onChange below).
        onClick={() => onOpen()}
        className="docs-search-bar"
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          maxWidth: '440px',
          padding: '6px 6px 6px 16px',
          // Deliberately the opaque surface color rather than theme.panelBackground:
          // a translucent/glassmorphism config is fine for the panel, which sits
          // over its own scrim, but the collapsed pill floats over the host
          // page's text — showing it through the launcher makes both unreadable.
          background: 'var(--background)',
          border: `1px solid ${theme.border}`,
          borderRadius: '9999px',
          cursor: 'text',
        }}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          // Brand-tinted so the pill reads as part of the product rather than
          // a stray input the host page happens to render.
          style={{ width: '17px', height: '17px', flexShrink: 0, color: 'var(--primary)' }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
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
            flex: 1,
            minWidth: 0,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            color: theme.title,
            fontSize: '14px',
            fontWeight: 500,
            padding: '4px 0',
          }}
        />
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
            width: '24px',
            height: '24px',
            borderRadius: '9999px',
            border: 'none',
            background: 'transparent',
            color: theme.subtitle,
            cursor: 'pointer',
            lineHeight: 1,
            padding: 0,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '13px', height: '13px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        {/* Accent affordance: says "this opens something" and carries the
            brand color. Decorative — the whole pill is the click target, and
            the input above already exposes the accessible name. */}
        <span
          aria-hidden
          className="docs-search-bar__go"
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '32px',
            height: '32px',
            borderRadius: '9999px',
            background: 'var(--primary)',
            color: 'var(--primary-foreground)',
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    </div>
  );
}
