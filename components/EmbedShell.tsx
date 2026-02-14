'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWidgetTranslation } from '../hooks/useWidgetTranslation';
import { logWarn } from '../lib/logger';
import { DEFAULT_COLORS, DEFAULTS, SHADOW_INTENSITY } from '../lib/constants';
import type { Message, WidgetConfig, FlowButton, FlowResponse, UnsureMessage } from '../types/widget';

type Props = {
  isEmbedded: boolean;
  isCollapsed: boolean;
  toggleCollapsed: () => void;
  messages: Message[];
  isTyping: boolean;
  input: string;
  setInput: (v: string) => void;
  handleSubmit: (e: React.FormEvent) => void;
  error?: string | null;
  title?: string;
  assistantName?: string;
  widgetConfig?: WidgetConfig;
  onInteractionButtonClick?: (button: FlowButton) => void;
  onFollowUpButtonClick?: (button: FlowButton) => void;
  flowResponses?: FlowResponse[];
  getLocalizedText?: (textObj: Record<string, string> | undefined) => string;
  showFeedbackDialog?: boolean;
  feedbackDialog?: React.ReactNode;
  messageFeedbackSubmitted?: Set<string>;
  onSubmitMessageFeedback?: (messageId: string, feedbackType?: string) => void;
  unsureModal?: React.ReactNode;
  unsureMessages?: UnsureMessage[];
  onShowUnsureModal?: () => void;
};

const normalizeHexColor = (color: string | undefined, fallback: string) => {
  if (typeof color !== 'string') return fallback;
  const trimmed = color.trim();

  // Valid 3 or 6 character hex color
  if (/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed)) {
    return trimmed;
  }

  // Invalid or truncated color - return fallback instead of guessing
  logWarn(`Invalid color value "${color}", using fallback "${fallback}"`);
  return fallback;
};

// Helper function to convert hex to rgb values
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` : '255, 255, 255';
};

export default function EmbedShell({
  isEmbedded,
  isCollapsed,
  toggleCollapsed,
  messages,
  isTyping,
  input,
  setInput,
  handleSubmit,
  error,
  title,
  assistantName,
  widgetConfig,
  onInteractionButtonClick,
  onFollowUpButtonClick,
  flowResponses = [],
  getLocalizedText,
  showFeedbackDialog = false,
  feedbackDialog,
  messageFeedbackSubmitted = new Set(),
  onSubmitMessageFeedback,
  unsureModal,
  unsureMessages = [],
  onShowUnsureModal,
}: Props) {
  const { translations: t } = useWidgetTranslation();

  // State to track clicked buttons
  const [clickedButtons, setClickedButtons] = useState<Set<string>>(new Set());

  // Ref for scroll container
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages or flow responses change
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
    }
  }, [messages, flowResponses, isTyping]);

  // Use widget config colors or defaults
  const primaryColor = normalizeHexColor(widgetConfig?.primary_color, DEFAULT_COLORS.PRIMARY);
  const secondaryColor = normalizeHexColor(widgetConfig?.secondary_color, DEFAULT_COLORS.SECONDARY);
  const backgroundColor = normalizeHexColor(widgetConfig?.background_color, DEFAULT_COLORS.BACKGROUND);
  const textColor = normalizeHexColor(widgetConfig?.text_color, DEFAULT_COLORS.TEXT);
  const borderRadius = widgetConfig?.border_radius || DEFAULTS.BORDER_RADIUS;

  // New appearance values
  const fontFamily = widgetConfig?.font_family || DEFAULTS.FONT_FAMILY;
  const fontSize = widgetConfig?.font_size || DEFAULTS.FONT_SIZE;
  const fontWeight = widgetConfig?.font_weight || DEFAULTS.FONT_WEIGHT;
  const shadowIntensity = widgetConfig?.shadow_intensity || DEFAULTS.SHADOW_INTENSITY;
  const shadowColor = normalizeHexColor(widgetConfig?.shadow_color, DEFAULT_COLORS.SHADOW);
  const widgetWidth = widgetConfig?.widget_width || DEFAULTS.WIDGET_WIDTH;
  const widgetHeight = widgetConfig?.widget_height || DEFAULTS.WIDGET_HEIGHT;
  const buttonSize = widgetConfig?.button_size || DEFAULTS.BUTTON_SIZE;
  const messageBubbleRadius = widgetConfig?.message_bubble_radius || borderRadius;
  const buttonBorderRadius = widgetConfig?.button_border_radius || borderRadius;
  const backgroundOpacity = widgetConfig?.opacity || DEFAULTS.OPACITY;

  // Helper function to get shadow styles
  const getShadowStyle = () => {
    const shadowValue = SHADOW_INTENSITY[shadowIntensity as keyof typeof SHADOW_INTENSITY] || SHADOW_INTENSITY.md;
    return shadowValue !== 'none' ? `${shadowValue} ${shadowColor}40` : 'none';
  };

  // Helper function to get button size
  const getButtonSize = () => {
    const sizeMap = {
      sm: { width: 'w-12', height: 'h-12', icon: 'w-5 h-5' },
      md: { width: 'w-14', height: 'h-14', icon: 'w-6 h-6' },
      lg: { width: 'w-16', height: 'h-16', icon: 'w-7 h-7' }
    };
    return sizeMap[buttonSize as keyof typeof sizeMap] || sizeMap.md;
  };

  // Apply font styles
  const fontStyles = {
    fontFamily,
    fontSize: `${fontSize}px`,
    fontWeight
  };

  // Get localized text helper
  const getText = (textObj: any) => {
    if (getLocalizedText) return getLocalizedText(textObj);
    return textObj?.en || '';
  };

  // Wrapper functions to handle button clicks and prevent multiple clicks
  const handleInteractionButtonClickWrapper = (button: any) => {
    const buttonId = button.id || button.button_id;
    if (clickedButtons.has(buttonId)) return; // Prevent multiple clicks

    setClickedButtons(prev => new Set(prev).add(buttonId));
    onInteractionButtonClick?.(button);
  };

  const handleFollowUpButtonClickWrapper = (button: any) => {
    const buttonId = button.id || button.button_id;
    if (clickedButtons.has(buttonId)) return; // Prevent multiple clicks

    setClickedButtons(prev => new Set(prev).add(buttonId));
    onFollowUpButtonClick?.(button);
  };

  // Show greeting message and buttons always (not just when no user messages)
  const hasGreetingMessage = messages.some(m => m.id.startsWith('greeting-'));
  const showGreeting = widgetConfig?.greeting_message && !hasGreetingMessage;
  const greetingText = showGreeting ? getText(widgetConfig.greeting_message.text) : '';
  // Always show interaction buttons if they exist
  const interactionButtons = widgetConfig?.greeting_message?.buttons || [];
  const showButtons = interactionButtons.length > 0;

  // Merge messages and flow responses, then sort by timestamp
  const mergedContent = [
    ...messages.map(msg => ({ type: 'message' as const, data: msg, timestamp: msg.timestamp || 0 })),
    ...flowResponses.map(flow => ({ type: 'flow' as const, data: flow, timestamp: flow.timestamp || 0 }))
  ].sort((a, b) => a.timestamp - b.timestamp);

  return (
    <>
      {isEmbedded ? (
        <>
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 999999,
                backgroundColor: primaryColor,
                borderRadius: `${buttonBorderRadius * 2}px`,
                ...fontStyles
              }}
              className={`${getButtonSize().width} ${getButtonSize().height} text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 hover:opacity-90`}
              title="Open Chat"
            >
              <svg className={getButtonSize().icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
              </svg>
            </button>
          ) : (
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${widgetWidth}px`,
                height: `${widgetHeight}px`,
                zIndex: 999999,
                boxShadow: 'rgba(0, 0, 0, 0.2) 0px 10px 40px',
                borderRadius: `${borderRadius}px`,
                overflow: 'hidden',
                backgroundColor: 'transparent',
                transition: '0.3s'
              }}
            >
              <div
                className="h-full flex flex-col"
                style={{
                  backgroundColor: `rgba(${hexToRgb(backgroundColor)}, ${backgroundOpacity})`,
                  ...fontStyles
                }}
              >
              <div className="text-white p-3 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                <div className="flex flex-col">
                  <h3 className="font-semibold">{getText(widgetConfig?.title) || title || t.chat}</h3>
                  <p className="text-sm text-gray-300">{getText(widgetConfig?.subtitle)}</p>
                </div>
                <div className="flex items-center space-x-2">
                  {unsureMessages.length > 0 && onShowUnsureModal && (
                    <button
                      type="button"
                      onClick={onShowUnsureModal}
                      style={{ backgroundColor: secondaryColor }}
                      className="px-2 py-1 rounded text-sm flex items-center justify-center hover:opacity-90 relative"
                      aria-label="View assistant uncertainty log"
                      title="Assistant has indicated uncertainty in some responses"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="12" cy="12" r="10"/>
                        <path d="m15 9-6 6"/>
                        <path d="m9 9 6 6"/>
                      </svg>
                      <span className="ml-1 text-xs">{unsureMessages.length}</span>
                      <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
                        !
                      </span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={toggleCollapsed}
                    style={{ backgroundColor: secondaryColor }}
                    className="px-2 py-1 rounded text-sm flex items-center justify-center hover:opacity-90"
                    aria-label={isCollapsed ? 'Open chat' : 'Close chat'}
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mx-3 mt-3 rounded">
                  <p className="text-sm">{error}</p>
                </div>
              )}

              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">
                {showGreeting && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] p-2 rounded-lg bg-gray-200" style={{ color: textColor, borderRadius: `${messageBubbleRadius}px`, ...fontStyles }}>
                      {greetingText}
                    </div>
                  </div>
                )}

                {showButtons && (
                  <div className="flex flex-col gap-2">
                    {interactionButtons.map((button: any) => {
                      const buttonId = button.id || button.button_id;
                      const isClicked = clickedButtons.has(buttonId);
                      return (
                        <button
                          key={buttonId}
                          onClick={() => handleInteractionButtonClickWrapper(button)}
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
                          {getText(button.label) || 'Button'}
                        </button>
                      );
                    })}
                  </div>
                )}

                {mergedContent.map((item, index) => {
                  if (item.type === 'message') {
                    const message = item.data;
                    const hasFeedback = messageFeedbackSubmitted.has(message.id);
                    const hasSources = message.from === 'assistant' && message.sources && message.sources.length > 0;
                    return (
                      <div key={message.id} className={`flex flex-col ${message.from === 'user' ? 'items-end' : 'items-start'}`}>
                        <div
                          className={`max-w-[80%] p-2`}
                          style={{
                            backgroundColor: message.from === 'user' ? primaryColor : '#e5e7eb',
                            color: message.from === 'user' ? '#ffffff' : textColor,
                            borderRadius: `${messageBubbleRadius}px`,
                            ...fontStyles
                          }}
                        >
                          <div>{message.text}</div>
                          {hasSources && (
                            <div className="mt-2 pt-2 border-t border-gray-300">
                              <div className="text-xs font-semibold mb-1 opacity-70">
                                📚 Sources ({message.sources!.length}):
                              </div>
                              <div className="space-y-1">
                                {message.sources!.map((source, idx) => (
                                  <div key={idx} className="text-xs">
                                    {source.url ? (
                                      <a
                                        href={source.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="hover:underline flex items-start gap-1"
                                        style={{ color: textColor }}
                                      >
                                        <span className="opacity-70">•</span>
                                        <span className="flex-1">
                                          <span className="font-medium">{source.title}</span>
                                          {source.snippet && (
                                            <span className="opacity-70"> — {source.snippet.substring(0, 80)}{source.snippet.length > 80 ? '...' : ''}</span>
                                          )}
                                        </span>
                                      </a>
                                    ) : (
                                      <div className="flex items-start gap-1">
                                        <span className="opacity-70">•</span>
                                        <span className="flex-1">
                                          <span className="font-medium">{source.title}</span>
                                          {source.snippet && (
                                            <span className="opacity-70"> — {source.snippet.substring(0, 80)}{source.snippet.length > 80 ? '...' : ''}</span>
                                          )}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                        {message.from === 'assistant' && !hasFeedback && onSubmitMessageFeedback && (
                          <div className="mt-1 flex gap-2">
                            <button
                              onClick={() => onSubmitMessageFeedback(message.id, 'thumbs_up')}
                              className="text-xs opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
                              style={{ color: textColor }}
                              title="Thumbs up"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
                              </svg>
                            </button>
                            <button
                              onClick={() => onSubmitMessageFeedback(message.id, 'thumbs_down')}
                              className="text-xs opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1"
                              style={{ color: textColor }}
                              title="Thumbs down"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.737 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m6-10h-2" />
                              </svg>
                            </button>
                          </div>
                        )}
                        {message.from === 'assistant' && hasFeedback && (
                          <span className="mt-1 text-xs opacity-50" style={{ color: textColor }}>
                            Feedback submitted
                          </span>
                        )}
                      </div>
                    );
                  } else {
                    const flowResponse = item.data;
                    return (
                      <div key={`flow-${index}`} className="space-y-2">
                        {flowResponse.text && (
                          <div className="flex justify-start">
                            <div className="max-w-[80%] p-2" style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${messageBubbleRadius}px`, ...fontStyles }}>
                              {flowResponse.text}
                            </div>
                          </div>
                        )}
                        {flowResponse.buttons.length > 0 && (
                          <div className="flex flex-col gap-2">
                            {flowResponse.buttons.map((button: any) => {
                              const buttonId = button.id || button.button_id;
                              const isClicked = clickedButtons.has(buttonId);
                              return (
                                <button
                                  key={buttonId}
                                  onClick={() => handleFollowUpButtonClickWrapper(button)}
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
                                  {getText(button.label) || 'Button'}
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  }
                })}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="p-3" style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${messageBubbleRadius}px` }}>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Feedback Dialog Overlay for Embedded View */}
              {showFeedbackDialog && feedbackDialog && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="max-w-md w-full">
                    {feedbackDialog}
                  </div>
                </div>
              )}

              {/* Unsure Messages Modal Overlay for Embedded View */}
              {unsureModal && (
                <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                  <div className="max-w-md w-full">
                    {unsureModal}
                  </div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="p-3 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={getText(widgetConfig?.placeholder) || t.typeYourMessage}
                    className="flex-1 p-2 border focus:outline-none focus:ring-2"
                    style={{
                      borderRadius: `${buttonBorderRadius}px`,
                      borderColor: primaryColor,
                      ...fontStyles
                    }}
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    style={{
                      backgroundColor: primaryColor,
                      borderRadius: `${buttonBorderRadius}px`,
                      ...fontStyles
                    }}
                    className="px-4 py-2 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t.send}
                  </button>
                </div>
              </form>
              <div className="p-2 text-center text-xs text-gray-500">
                Powered by <a href="https://companin.tech" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">Companin</a>
              </div>
            </div>
          </div>
          )}
        </>
      ) : (
        <>
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 999999,
                backgroundColor: primaryColor,
                borderRadius: `${buttonBorderRadius * 2}px`,
                ...fontStyles
              }}
              className={`${getButtonSize().width} ${getButtonSize().height} text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 hover:opacity-90`}
              title="Open Chat"
            >
              <svg className={getButtonSize().icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
              </svg>
            </button>
          ) : (
            <div
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: `${widgetWidth}px`,
                height: `${widgetHeight}px`,
                zIndex: 999999,
                boxShadow: 'rgba(0, 0, 0, 0.2) 0px 10px 40px',
                borderRadius: `${borderRadius}px`,
                overflow: 'hidden',
                backgroundColor: 'transparent',
                transition: '0.3s'
              }}
            >
              <div className="h-full flex flex-col overflow-hidden" style={{ backgroundColor: `rgba(${hexToRgb(backgroundColor)}, ${backgroundOpacity})`, ...fontStyles }}>
                <div className="text-white p-3 flex items-center justify-between" style={{ backgroundColor: primaryColor, borderRadius: `${borderRadius}px` }}>
                  <div className="flex flex-col">
                    <h3 className="font-semibold">{getText(widgetConfig?.title) || title || t.chat}</h3>
                    <p className="text-sm text-gray-300">{getText(widgetConfig?.subtitle)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleCollapsed}
                    style={{ backgroundColor: secondaryColor }}
                    className="w-6 h-6 rounded flex items-center justify-center transition-opacity hover:opacity-90"
                    title="Minimize Chat"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="6,9 12,15 18,9" />
                    </svg>
                  </button>
                </div>

                {error && (
                  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mx-3 mt-3 rounded">
                    <p className="text-sm">{error}</p>
                  </div>
                )}

                <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-3 space-y-3">

                  {showGreeting && (
                    <div className="flex justify-start">
                      <div className="max-w-[80%] p-2 bg-gray-200" style={{ color: textColor, borderRadius: `${messageBubbleRadius}px`, ...fontStyles }}>
                        {greetingText}
                      </div>
                    </div>
                  )}

                  {showButtons && (
                    <div className="flex flex-col gap-2">
                      {interactionButtons.map((button: any) => {
                        const buttonId = button.id || button.button_id;
                        const isClicked = clickedButtons.has(buttonId);
                        return (
                          <button
                            key={buttonId}
                            onClick={() => handleInteractionButtonClickWrapper(button)}
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
                            {getText(button.label) || 'Button'}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {mergedContent.map((item, index) => {
                    if (item.type === 'message') {
                      const message = item.data;
                      const hasSources = message.from === 'assistant' && message.sources && message.sources.length > 0;
                      return (
                        <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                          <div
                            className="max-w-[80%] p-2"
                            style={{
                              backgroundColor: message.from === 'user' ? primaryColor : '#e5e7eb',
                              color: message.from === 'user' ? '#ffffff' : textColor,
                              borderRadius: `${messageBubbleRadius}px`,
                              ...fontStyles
                            }}
                          >
                            <div>{message.text}</div>
                            {hasSources && (
                              <div className="mt-2 pt-2 border-t border-gray-300">
                                <div className="text-xs font-semibold mb-1 opacity-70">
                                  📚 Sources ({message.sources!.length}):
                                </div>
                                <div className="space-y-1">
                                  {message.sources!.map((source, idx) => (
                                    <div key={idx} className="text-xs">
                                      {source.url ? (
                                        <a
                                          href={source.url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="hover:underline flex items-start gap-1"
                                          style={{ color: textColor }}
                                        >
                                          <span className="opacity-70">•</span>
                                          <span className="flex-1">
                                            <span className="font-medium">{source.title}</span>
                                            {source.snippet && (
                                              <span className="opacity-70"> — {source.snippet.substring(0, 80)}{source.snippet.length > 80 ? '...' : ''}</span>
                                            )}
                                          </span>
                                        </a>
                                      ) : (
                                        <div className="flex items-start gap-1">
                                          <span className="opacity-70">•</span>
                                          <span className="flex-1">
                                            <span className="font-medium">{source.title}</span>
                                            {source.snippet && (
                                              <span className="opacity-70"> — {source.snippet.substring(0, 80)}{source.snippet.length > 80 ? '...' : ''}</span>
                                            )}
                                          </span>
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    } else {
                      const flowResponse = item.data;
                      return (
                        <div key={`flow-${index}`} className="space-y-2">
                          {flowResponse.text && (
                            <div className="flex justify-start">
                              <div className="max-w-[80%] p-2" style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${messageBubbleRadius}px`, ...fontStyles }}>
                                {flowResponse.text}
                              </div>
                            </div>
                          )}
                          {flowResponse.buttons.length > 0 && (
                            <div className="flex flex-col gap-2">
                              {flowResponse.buttons.map((button: any) => {
                                const buttonId = button.id || button.button_id;
                                const isClicked = clickedButtons.has(buttonId);
                                return (
                                  <button
                                    key={buttonId}
                                    onClick={() => handleFollowUpButtonClickWrapper(button)}
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
                                    {getText(button.label) || 'Button'}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    }
                  })}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="p-3" style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${messageBubbleRadius}px` }}>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Feedback Dialog Overlay */}
                {showFeedbackDialog && feedbackDialog && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="max-w-md w-full">
                      {feedbackDialog}
                    </div>
                  </div>
                )}

                {/* Unsure Messages Modal Overlay */}
                {unsureModal && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="max-w-md w-full">
                      {unsureModal}
                    </div>
                  </div>
                )}

                <form onSubmit={handleSubmit} className="p-3 border-t">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={getText(widgetConfig?.placeholder) || t.typeYourMessage}
                      className="flex-1 p-2 border focus:outline-none focus:ring-2"
                      style={{
                        borderRadius: `${buttonBorderRadius}px`,
                        borderColor: primaryColor,
                        ...fontStyles
                      }}
                      disabled={isTyping}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      style={{
                        backgroundColor: primaryColor,
                        borderRadius: `${buttonBorderRadius}px`,
                        ...fontStyles
                      }}
                      className="px-4 py-2 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {t.send}
                    </button>
                  </div>
                </form>
                <div className="p-2 text-center text-xs text-gray-500">
                  Powered by <a href="https://companin.com" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:text-blue-700">Companin</a>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      {unsureModal}
    </>
  );
}
