'use client';

import React from 'react';
import type { FlowButton } from '../types/widget';

// generic button type, falls back to FlowButton for most widgets
export type ButtonType = FlowButton & { [key: string]: unknown };

interface Props {
  buttons: ButtonType[];
  clickedButtons: Set<string>;
  onButtonClick: (button: ButtonType) => void;
  primaryColor: string;
  buttonBorderRadius: number;
  fontStyles: Record<string, unknown>;
  showMessageAvatars?: boolean;
  getLocalizedText?: (textObj: Record<string, string> | undefined) => string;
};

export default function InteractionButtons({
  buttons,
  clickedButtons,
  onButtonClick,
  primaryColor,
  buttonBorderRadius,
  fontStyles,
  getLocalizedText,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      {buttons.map((button: ButtonType) => {
        const buttonId = button.id || button.button_id;
        const isClicked = clickedButtons.has(buttonId);
        return (
          <button
            key={buttonId}
            onClick={() => onButtonClick(button)}
            disabled={isClicked}
            style={{
              backgroundColor: isClicked ? '#9ca3af' : primaryColor,
              borderRadius: `${buttonBorderRadius}px`,
              ...fontStyles
            }}
            className={`w-fit px-3 py-2 text-white text-sm transition-opacity flex items-center gap-2 ${
              isClicked ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-90'
            }`}
          >
            {button.icon && <span>{button.icon}</span>}
            {getLocalizedText ? getLocalizedText(button.label) || 'Button' : (button.label?.en || button.label || 'Button')}
          </button>
        );
      })}
    </div>
  );
}
