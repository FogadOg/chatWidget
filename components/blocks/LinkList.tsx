"use client";

import React from 'react';
import { withAlpha } from '../../lib/colors';
import type { BlockProps } from './types';

type Props = BlockProps & { items: Array<{ label: string; url: string }> };

/**
 * A short list of related links — size guides, policies, the deeper page an
 * answer was drawn from. Distinct from a card row: no image, no commitment,
 * just somewhere else to look.
 */
export default function LinkList({ items, theme, onAction, context }: Props) {
  return (
    <ul
      className="flex flex-col overflow-hidden"
      style={{
        border: `1px solid ${theme.borderColor}`,
        borderRadius: `${theme.cardRadius}px`,
        backgroundColor: theme.surfaceColor,
        ...theme.fontStyles,
      }}
    >
      {items.map((item, index) => (
        <li
          key={item.url}
          style={{ borderTop: index === 0 ? undefined : `1px solid ${theme.borderColor}` }}
        >
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(event) => onAction?.(
              { id: `l${index}`, kind: 'link', label: item.label, url: item.url },
              context,
              event,
            )}
            className="flex items-center justify-between gap-2 px-3 py-2 text-sm hover:opacity-80 transition-opacity focus:outline-none focus-visible:ring-2 focus-visible:ring-inset"
            style={{ color: theme.textColor, ['--tw-ring-color' as string]: withAlpha(theme.textColor, 0.4) }}
          >
            <span className="truncate">{item.label}</span>
            <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ color: theme.mutedTextColor }}>
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </a>
        </li>
      ))}
    </ul>
  );
}
