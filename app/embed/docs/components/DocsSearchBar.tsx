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
   * lets the admin preview lay it out inside the preview canvas.
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
 * anchors bottom-center, so everything outside the bar stays clickable on the
 * host page.
 */
export function DocsSearchBar({
  placeholder,
  theme,
  activeLocale,
  onOpen,
  onDismiss,
  positioning = 'fixed',
}: DocsSearchBarProps) {
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
        padding: '12px 16px calc(16px + env(safe-area-inset-bottom, 0px))',
      }}
    >
      <div
        // A click anywhere on the bar means "search", so the whole surface opens
        // the widget. The inner input exists for the look and for keyboard users
        // who tab in and start typing (onChange below).
        onClick={() => onOpen()}
        style={{
          boxSizing: 'border-box',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          width: '100%',
          maxWidth: '560px',
          padding: '8px 8px 8px 14px',
          background: theme.panelBackground,
          backdropFilter: theme.backdropFilter,
          WebkitBackdropFilter: theme.backdropFilter,
          border: `1px solid ${theme.border}`,
          borderRadius: '9999px',
          boxShadow: '0 8px 30px rgba(0,0,0,0.18)',
          cursor: 'text',
        }}
      >
        <svg
          aria-hidden
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          style={{ width: '18px', height: '18px', flexShrink: 0, color: theme.subtitle }}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
        </svg>
        <input
          type="text"
          defaultValue=""
          aria-label={placeholder || translate(activeLocale, 'docsSearchPlaceholder')}
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
            padding: '4px 0',
          }}
        />
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onDismiss(); }}
          aria-label={translate(activeLocale, 'dismiss')}
          title={translate(activeLocale, 'dismiss')}
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '9999px',
            border: 'none',
            background: 'transparent',
            color: theme.subtitle,
            cursor: 'pointer',
            lineHeight: 1,
          }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} style={{ width: '14px', height: '14px' }}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
