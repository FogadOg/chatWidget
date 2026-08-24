import type React from 'react';
import type { RichAction } from '../../types/widget';

/**
 * Resolved colors and geometry for a rich block, derived once by MessageBubble
 * from the widget config and passed down.
 *
 * Blocks never read `widgetConfig` themselves: every value here is already
 * theme-resolved (dark mode, branded palettes, contrast-corrected foregrounds),
 * so a block renders correctly wherever it's mounted — including the dashboard
 * preview and the transcript viewer, which have no widget config at all.
 */
export type BlockTheme = {
  /** Body text on the message surface. */
  textColor: string;
  /** Secondary text — subtitles, meta labels. */
  mutedTextColor: string;
  /** Hairlines and card outlines. */
  borderColor: string;
  /** Card fill, sitting on the message surface. */
  surfaceColor: string;
  /** Brand color for primary calls-to-action. */
  primaryColor: string;
  /** Readable foreground for `primaryColor` — never assume white. */
  onPrimaryColor: string;
  cardRadius: number;
  buttonRadius: number;
  fontStyles: React.CSSProperties;
  /** When true, scrolling and transitions jump instead of animating. */
  reducedMotion?: boolean;
};

export type RichActionContext = {
  /** Message the action belongs to; half of the conversion dedup key. */
  messageId: string;
  blockIndex: number;
};

/**
 * Called when a visitor takes an action. `link` actions still navigate on their
 * own — the handler runs first so the host page can be told, and may call
 * `preventDefault()` on the event to take over navigation entirely.
 */
export type OnRichAction = (
  action: RichAction,
  context: RichActionContext,
  event?: React.MouseEvent,
) => void;

export type BlockProps = {
  theme: BlockTheme;
  locale: string;
  onAction?: OnRichAction;
  context: RichActionContext;
};
