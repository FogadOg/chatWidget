"use client";

import React, { useState } from 'react';
import { withAlpha } from '../../lib/colors';
import type { RichAction } from '../../types/widget';
import type { BlockTheme, OnRichAction, RichActionContext } from './types';

type Props = {
  action: RichAction;
  theme: BlockTheme;
  onAction?: OnRichAction;
  context: RichActionContext;
  /** The first action on a card is the call-to-action; the rest are quieter. */
  variant?: 'primary' | 'secondary';
  fullWidth?: boolean;
};

const ExternalIcon = () => (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    <polyline points="15 3 21 3 21 9" />
    <line x1="10" y1="14" x2="21" y2="3" />
  </svg>
);

/**
 * One call-to-action on a card or button row.
 *
 * `link` actions render as a real anchor so they keep the browser's own
 * affordances — middle-click, copy link address, and a status-bar preview of
 * where the visitor is about to go. That last one matters: a button that
 * navigates somewhere unnamed inside someone else's site is exactly the shape
 * of a phishing control, and merchants embed this on their own domain.
 *
 * `reply` and `conversion` are buttons, and disable themselves once taken so a
 * double-tap can't send the same message twice.
 */
export default function ActionButton({
  action,
  theme,
  onAction,
  context,
  variant = 'secondary',
  fullWidth = false,
}: Props) {
  const [taken, setTaken] = useState(false);

  const isPrimary = variant === 'primary';
  const disabled = taken && action.kind !== 'link';

  const style: React.CSSProperties = {
    borderRadius: `${theme.buttonRadius}px`,
    backgroundColor: isPrimary ? theme.primaryColor : 'transparent',
    color: isPrimary ? theme.onPrimaryColor : theme.textColor,
    border: `1px solid ${isPrimary ? 'transparent' : theme.borderColor}`,
    opacity: disabled ? 0.5 : 1,
    ['--tw-ring-color' as string]: withAlpha(theme.textColor, 0.4),
    ...theme.fontStyles,
  };

  const className = [
    'px-3 py-1.5 text-sm font-medium inline-flex items-center justify-center gap-1.5',
    'transition-opacity focus:outline-none focus-visible:ring-2',
    disabled ? 'cursor-not-allowed' : 'hover:opacity-90',
    fullWidth ? 'w-full' : 'w-fit max-w-full',
  ].join(' ');

  const label = <span className="truncate">{action.label}</span>;

  if (action.kind === 'link' && action.url) {
    return (
      <a
        href={action.url}
        target="_blank"
        rel="noopener noreferrer"
        style={style}
        className={className}
        onClick={(event) => {
          setTaken(true);
          onAction?.(action, context, event);
        }}
      >
        {label}
        {!isPrimary && <ExternalIcon />}
      </a>
    );
  }

  return (
    <button
      type="button"
      disabled={disabled}
      style={style}
      className={className}
      onClick={(event) => {
        if (disabled) return;
        setTaken(true);
        onAction?.(action, context, event);
      }}
    >
      {label}
    </button>
  );
}
