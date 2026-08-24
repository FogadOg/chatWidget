"use client";

import React from 'react';
import BlockImage from './BlockImage';
import ActionButton from './ActionButton';
import type { RichCard } from '../../types/widget';
import type { BlockProps } from './types';

type Props = BlockProps & {
  card: RichCard;
  /** Carousel items get a fixed width; a standalone card fills the row. */
  fixedWidth?: boolean;
};

/**
 * A product / room / course card: image, title, a line or two of detail, and
 * up to three actions.
 *
 * Every field is rendered as a text node. Blocks are data, never markup — the
 * server sanitizes them (`core/services/rich_blocks.py`), and this side never
 * reaches for `dangerouslySetInnerHTML`. Both halves of that are load-bearing.
 */
export default function Card({ card, theme, onAction, context, fixedWidth = false }: Props) {
  const actions = card.actions || [];
  const meta = card.meta || [];

  return (
    <div
      className={`flex flex-col overflow-hidden ${fixedWidth ? 'shrink-0' : 'w-full'}`}
      style={{
        backgroundColor: theme.surfaceColor,
        border: `1px solid ${theme.borderColor}`,
        borderRadius: `${theme.cardRadius}px`,
        color: theme.textColor,
        ...theme.fontStyles,
      }}
    >
      {card.image && (
        <BlockImage url={card.image.url} alt={card.image.alt || card.title} theme={theme} />
      )}

      <div className="flex flex-col gap-1 p-3">
        <div className="text-sm font-semibold leading-snug">{card.title}</div>

        {card.subtitle && (
          <div className="text-xs leading-snug" style={{ color: theme.mutedTextColor }}>
            {card.subtitle}
          </div>
        )}

        {meta.length > 0 && (
          <dl className="mt-1 flex flex-col gap-0.5 text-xs">
            {meta.map((row, index) => (
              <div key={`${row.label || 'meta'}-${index}`} className="flex items-baseline gap-1.5">
                {row.label && (
                  <dt className="shrink-0" style={{ color: theme.mutedTextColor }}>
                    {row.label}
                  </dt>
                )}
                <dd className="font-medium truncate">{row.value}</dd>
              </div>
            ))}
          </dl>
        )}

        {actions.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {actions.map((action, index) => (
              <ActionButton
                key={action.id}
                action={action}
                theme={theme}
                onAction={onAction}
                context={context}
                variant={index === 0 ? 'primary' : 'secondary'}
                fullWidth
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
