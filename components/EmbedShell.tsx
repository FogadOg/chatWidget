'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWidgetTranslation } from '../hooks/useWidgetTranslation';

type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
};

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
  widgetConfig?: any;
  onInteractionButtonClick?: (button: any) => void;
  onFollowUpButtonClick?: (button: any) => void;
  flowResponses?: Array<{ text: string; buttons: any[] }>;
  getLocalizedText?: (textObj: { [lang: string]: string } | undefined) => string;
};

const normalizeHexColor = (color: string | undefined, fallback: string) => {
  if (typeof color !== 'string') return fallback;
  const trimmed = color.trim();
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(trimmed) ? trimmed : fallback;
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
}: Props) {
  const { translations: t } = useWidgetTranslation();

  // Log widget config and flow responses for debugging
  console.log('EmbedShell - Widget Config:', widgetConfig);
  console.log('EmbedShell - Flow Responses:', flowResponses);

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
  const primaryColor = normalizeHexColor(widgetConfig?.primary_color, '#111827');
  const secondaryColor = normalizeHexColor(widgetConfig?.secondary_color, '#374151');
  const backgroundColor = normalizeHexColor(widgetConfig?.background_color, '#ffffff');
  const textColor = normalizeHexColor(widgetConfig?.text_color, '#1f2937');
  const borderRadius = widgetConfig?.border_radius || 8;

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

  // Show greeting message with buttons when no user messages
  const hasGreetingMessage = messages.some(m => m.id.startsWith('greeting-'));
  const userMessageCount = messages.filter(m => m.from === 'user').length;
  const showGreeting = userMessageCount === 0 && widgetConfig?.greeting_message && !hasGreetingMessage;
  const greetingText = showGreeting ? getText(widgetConfig.greeting_message.text) : '';
  // Always show interaction buttons if they exist
  const interactionButtons = widgetConfig?.greeting_message?.buttons || [];
  const showButtons = interactionButtons.length > 0 && userMessageCount === 0;

  return (
    <>
      {isEmbedded ? (
        <div className="w-full h-screen bg-transparent">
          {isCollapsed ? (
            <div className="fixed bottom-4 right-4 z-50">
              <button
                type="button"
                onClick={toggleCollapsed}
                style={{
                  backgroundColor: primaryColor,
                  borderRadius: `${borderRadius * 2}px`,
                }}
                className="w-14 h-14 text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 hover:opacity-90"
                title="Open Chat"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col" style={{ backgroundColor }}>
              <div className="text-white p-3 flex items-center justify-between" style={{ backgroundColor: primaryColor }}>
                <div className="flex flex-col">
                  <h3 className="font-semibold">{getText(widgetConfig?.title) || title || t.chat}</h3>
                  <p className="text-sm text-gray-300">{getText(widgetConfig?.subtitle)}</p>
                </div>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  style={{ backgroundColor: secondaryColor }}
                  className="ml-3 px-2 py-1 rounded text-sm flex items-center justify-center hover:opacity-90"
                  aria-label={isCollapsed ? 'Open chat' : 'Close chat'}
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
                    <div className="max-w-[80%] p-2 rounded-lg bg-gray-200" style={{ color: textColor, borderRadius: `${borderRadius}px` }}>
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
                            borderRadius: `${borderRadius}px`,
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

                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div
                      className={`max-w-[80%] p-2`}
                      style={{
                        backgroundColor: message.from === 'user' ? primaryColor : '#e5e7eb',
                        color: message.from === 'user' ? '#ffffff' : textColor,
                        borderRadius: `${borderRadius}px`,
                      }}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}

                {flowResponses.map((flowResponse, index) => (
                  <div key={`flow-${index}`} className="space-y-2">
                    {flowResponse.text && (
                      <div className="flex justify-start">
                        <div className="max-w-[80%] p-2" style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${borderRadius}px` }}>
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
                                borderRadius: `${borderRadius}px`,
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
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="p-2" style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${borderRadius}px` }}>
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSubmit} className="p-3 border-t">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={getText(widgetConfig?.placeholder) || t.typeYourMessage}
                    className="flex-1 p-2 border focus:outline-none focus:ring-2"
                    style={{
                      borderRadius: `${borderRadius}px`,
                      borderColor: primaryColor,
                    }}
                    disabled={isTyping}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || isTyping}
                    style={{
                      backgroundColor: primaryColor,
                      borderRadius: `${borderRadius}px`,
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
          )}
        </div>
      ) : (
        <div className="fixed bottom-4 right-4 bg-transparent">
          {isCollapsed ? (
            <button
              type="button"
              onClick={toggleCollapsed}
              style={{
                backgroundColor: primaryColor,
                borderRadius: `${borderRadius * 2}px`,
              }}
              className="w-14 h-14 text-white shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105 hover:opacity-90"
              title="Open Chat"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
              </svg>
            </button>
          ) : (
            <div className="w-100 h-150 flex flex-col">
              <div className="rounded-lg shadow-lg flex-1 flex flex-col overflow-hidden" style={{ backgroundColor }}>
                <div className="text-white p-3 flex items-center justify-between" style={{ backgroundColor: primaryColor, borderTopLeftRadius: `${borderRadius}px`, borderTopRightRadius: `${borderRadius}px` }}>
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
                      <div className="max-w-[80%] p-2 bg-gray-200" style={{ color: textColor, borderRadius: `${borderRadius}px` }}>
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
                              borderRadius: `${borderRadius}px`,
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

                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className="max-w-[80%] p-2"
                        style={{
                          backgroundColor: message.from === 'user' ? primaryColor : '#e5e7eb',
                          color: message.from === 'user' ? '#ffffff' : textColor,
                          borderRadius: `${borderRadius}px`,
                        }}
                      >
                        {message.text}
                      </div>
                    </div>
                  ))}

                  {flowResponses.map((flowResponse, index) => (
                    <div key={`flow-${index}`} className="space-y-2">
                      {flowResponse.text && (
                        <div className="flex justify-start">
                          <div className="max-w-[80%] p-2" style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${borderRadius}px` }}>
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
                                  borderRadius: `${borderRadius}px`,
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
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="p-2" style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${borderRadius}px` }}>
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                          <div className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmit} className="p-3 border-t">
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder={getText(widgetConfig?.placeholder) || t.typeYourMessage}
                      className="flex-1 p-2 border focus:outline-none focus:ring-2"
                      style={{
                        borderRadius: `${borderRadius}px`,
                        borderColor: primaryColor,
                      }}
                      disabled={isTyping}
                    />
                    <button
                      type="submit"
                      disabled={!input.trim() || isTyping}
                      style={{
                        backgroundColor: primaryColor,
                        borderRadius: `${borderRadius}px`,
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
        </div>
      )}
    </>
  );
}
