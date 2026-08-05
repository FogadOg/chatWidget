'use client';

import React from 'react';

import { withAlpha } from '../../lib/colors';

// Zero-state prompt shown in the message area when a conversation has nothing
// to display yet AND the org configured neither a greeting nor suggestions.
// Without it a visitor opens the widget to a blank panel with no cue to type
// (see EASE_OF_USE_AUDIT T3-1). Shared across all layout shells (classic
// floating/embedded, minimal, panel) so the fallback never drifts.
export function EmptyStatePrompt({
  label,
  textColor,
  mutedTextColor,
  fontStyles = {},
}: {
  label: string;
  textColor: string;
  mutedTextColor: string;
  fontStyles?: Record<string, unknown>;
}) {
  return (
    <div
      className="flex min-h-full flex-col items-center justify-center gap-3 px-6 py-8 text-center"
      style={fontStyles}
    >
      <span
        aria-hidden
        className="flex h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: withAlpha(textColor, 0.06), color: mutedTextColor }}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
        </svg>
      </span>
      <p className="text-sm" style={{ color: mutedTextColor }}>
        {label}
      </p>
    </div>
  );
}
