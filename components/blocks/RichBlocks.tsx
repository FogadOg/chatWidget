"use client";

import React from 'react';
import Card from './Card';
import Carousel from './Carousel';
import BlockImage from './BlockImage';
import LinkList from './LinkList';
import ButtonRow from './ButtonRow';
import { RICH_BLOCK_SCHEMA_VERSION } from '../../lib/constants';
import type { RichBlock, RichContent } from '../../types/widget';
import type { BlockTheme, OnRichAction } from './types';

type Props = {
  content?: RichContent | null;
  theme: BlockTheme;
  locale: string;
  messageId: string;
  onAction?: OnRichAction;
};

/**
 * Renders the structured content attached to an agent reply.
 *
 * Two guards define the contract with the backend:
 *
 * 1. **Version.** Content stamped with a `v` this build doesn't know renders as
 *    nothing at all — never a partial or best-effort read. That's what lets the
 *    schema change without corrupting how old widgets display transcripts that
 *    are already in the database.
 * 2. **Unknown types.** An unrecognized block is skipped, the rest still
 *    render. The message text always stands on its own, so a dropped block
 *    costs presentation, never the answer.
 */
export default function RichBlocks({ content, theme, locale, messageId, onAction }: Props) {
  if (!content || content.v !== RICH_BLOCK_SCHEMA_VERSION) return null;

  const blocks = Array.isArray(content.blocks) ? content.blocks : [];
  if (blocks.length === 0) return null;

  const renderBlock = (block: RichBlock, index: number): React.ReactNode => {
    const shared = {
      theme,
      locale,
      onAction,
      context: { messageId, blockIndex: index },
    };

    switch (block.type) {
      case 'card':
        return <Card key={index} card={block} {...shared} />;
      case 'carousel':
        return <Carousel key={index} items={block.items} {...shared} />;
      case 'image':
        return block.link ? (
          <a
            key={index}
            href={block.link}
            target="_blank"
            rel="noopener noreferrer"
            className="block overflow-hidden"
            style={{ borderRadius: `${theme.cardRadius}px`, border: `1px solid ${theme.borderColor}` }}
          >
            <BlockImage url={block.url} alt={block.alt} theme={theme} aspectRatio="4 / 3" />
          </a>
        ) : (
          <div
            key={index}
            className="overflow-hidden"
            style={{ borderRadius: `${theme.cardRadius}px`, border: `1px solid ${theme.borderColor}` }}
          >
            <BlockImage url={block.url} alt={block.alt} theme={theme} aspectRatio="4 / 3" />
          </div>
        );
      case 'links':
        return <LinkList key={index} items={block.items} {...shared} />;
      case 'buttons':
        return <ButtonRow key={index} buttons={block.buttons} {...shared} />;
      default:
        return null;
    }
  };

  return (
    <div className="mt-2 flex w-full flex-col gap-2" data-testid="rich-blocks">
      {blocks.map(renderBlock)}
    </div>
  );
}
