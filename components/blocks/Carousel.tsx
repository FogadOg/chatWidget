"use client";

import React, { useCallback, useRef } from 'react';
import Card from './Card';
import { t as translate } from '../../lib/i18n';
import { RICH_CARD_MIN_WIDTH } from '../../lib/constants';
import { withAlpha } from '../../lib/colors';
import type { RichCard } from '../../types/widget';
import type { BlockProps } from './types';

type Props = BlockProps & { items: RichCard[] };

const Chevron = ({ direction }: { direction: 'prev' | 'next' }) => (
  <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {direction === 'prev' ? <polyline points="15 18 9 12 15 6" /> : <polyline points="9 18 15 12 9 6" />}
  </svg>
);

/**
 * Two or more cards on a horizontal rail.
 *
 * The rail itself is the scroll container and is focusable, so a keyboard user
 * can arrow through it without touching the prev/next buttons — those are a
 * pointer affordance. They still carry labels rather than `aria-hidden`,
 * because a screen-reader user navigating by control benefits from knowing
 * there is more to the right.
 */
export default function Carousel({ items, theme, locale, onAction, context }: Props) {
  const railRef = useRef<HTMLDivElement | null>(null);

  const scrollBy = useCallback((direction: 'prev' | 'next') => {
    const rail = railRef.current;
    if (!rail) return;
    const step = RICH_CARD_MIN_WIDTH + 8; // card + gap
    rail.scrollBy({
      left: direction === 'next' ? step : -step,
      behavior: theme.reducedMotion ? 'auto' : 'smooth',
    });
  }, [theme.reducedMotion]);

  const navButtonStyle: React.CSSProperties = {
    color: theme.textColor,
    border: `1px solid ${theme.borderColor}`,
    backgroundColor: theme.surfaceColor,
    borderRadius: '999px',
    ['--tw-ring-color' as string]: withAlpha(theme.textColor, 0.4),
  };

  return (
    <div className="w-full">
      <div
        ref={railRef}
        tabIndex={0}
        role="group"
        aria-roledescription={translate(locale, 'cardsCarousel')}
        className="flex gap-2 overflow-x-auto pb-1 focus:outline-none focus-visible:ring-2"
        style={{
          scrollSnapType: 'x mandatory',
          scrollbarWidth: 'thin',
          ['--tw-ring-color' as string]: withAlpha(theme.textColor, 0.4),
        }}
      >
        {items.map((card, index) => (
          <div
            key={`${card.title}-${index}`}
            style={{ scrollSnapAlign: 'start', width: `${RICH_CARD_MIN_WIDTH}px` }}
            className="shrink-0"
          >
            <Card
              card={card}
              theme={theme}
              locale={locale}
              onAction={onAction}
              context={context}
              fixedWidth
            />
          </div>
        ))}
      </div>

      <div className="mt-1 flex justify-end gap-1">
        <button
          type="button"
          onClick={() => scrollBy('prev')}
          aria-label={translate(locale, 'cardsPrevious')}
          className="p-1 opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2"
          style={navButtonStyle}
        >
          <Chevron direction="prev" />
        </button>
        <button
          type="button"
          onClick={() => scrollBy('next')}
          aria-label={translate(locale, 'cardsNext')}
          className="p-1 opacity-70 hover:opacity-100 transition-opacity focus:outline-none focus-visible:ring-2"
          style={navButtonStyle}
        >
          <Chevron direction="next" />
        </button>
      </div>
    </div>
  );
}
