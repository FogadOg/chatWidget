"use client";

import React from 'react';
import ActionButton from './ActionButton';
import type { RichAction } from '../../types/widget';
import type { BlockProps } from './types';

type Props = BlockProps & { buttons: RichAction[] };

/**
 * Standalone actions under a reply — "Book now", "Show me more", "Talk to a
 * human". The same shape as the greeting/flow buttons the widget already has,
 * but attached to an agent turn rather than to the widget config.
 *
 * Wraps rather than scrolls: a row of choices the visitor can't see all of is
 * a row of choices they won't take.
 */
export default function ButtonRow({ buttons, theme, onAction, context }: Props) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {buttons.map((action, index) => (
        <ActionButton
          key={action.id}
          action={action}
          theme={theme}
          onAction={onAction}
          context={context}
          variant={index === 0 ? 'primary' : 'secondary'}
        />
      ))}
    </div>
  );
}
