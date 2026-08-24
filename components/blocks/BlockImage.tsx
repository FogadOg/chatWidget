"use client";

import React, { useState } from 'react';
import { withAlpha } from '../../lib/colors';
import type { BlockTheme } from './types';

type Props = {
  url: string;
  alt?: string;
  theme: BlockTheme;
  /** CSS aspect-ratio for the image box. Cards use 16/9, standalone images 4/3. */
  aspectRatio?: string;
  className?: string;
};

/**
 * An image inside a rich block, with the two states that actually happen in
 * production: still loading, and gone.
 *
 * A card's image comes from a merchant's CDN or a crawled page, neither of
 * which we control. A dead URL must collapse the image slot silently — a broken
 * image icon inside a product card looks like the product is broken, and a card
 * with a title, a price and a CTA is still a perfectly good card without one.
 */
export default function BlockImage({ url, alt, theme, aspectRatio = '16 / 9', className = '' }: Props) {
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');

  if (status === 'error') return null;

  return (
    <div
      className={`w-full overflow-hidden ${className}`}
      style={{
        aspectRatio,
        backgroundColor: status === 'ready' ? 'transparent' : withAlpha(theme.textColor, 0.06),
      }}
    >
      <img
        src={url}
        alt={alt || ''}
        loading="lazy"
        decoding="async"
        onLoad={() => setStatus('ready')}
        onError={() => setStatus('error')}
        className="w-full h-full object-cover"
        style={{
          opacity: status === 'ready' ? 1 : 0,
          transition: theme.reducedMotion ? undefined : 'opacity 150ms ease-out',
        }}
      />
    </div>
  );
}
