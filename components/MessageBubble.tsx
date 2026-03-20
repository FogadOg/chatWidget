 
'use client';

import React from 'react';
import { t as translate } from '../lib/i18n';
import { useWidgetTranslation } from '../hooks/useWidgetTranslation';
import type { WidgetConfig } from '../types/widget';

type Source = { url?: string; title?: string; snippet?: string };
type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
  timestamp?: number;
  sources?: Source[];
};

type Props = {
  message: Message;
  widgetConfig?: WidgetConfig;
  assistantName?: string;
  showMessageAvatars?: boolean;
  textColor?: string;
  fontStyles?: Record<string, unknown>;
  messageBubbleRadius?: number;
  onSubmitMessageFeedback?: (messageId: string, feedbackType?: string) => void;
  messageFeedbackSubmitted?: Set<string>;
  showTimestamps?: boolean;
};

export default function MessageBubble({ message, widgetConfig, assistantName, showMessageAvatars = true, textColor = '#111', fontStyles = {}, messageBubbleRadius = 8, onSubmitMessageFeedback, messageFeedbackSubmitted = new Set(), showTimestamps = true }: Props) {
  const { locale } = useWidgetTranslation();
  const hasFeedback = messageFeedbackSubmitted.has(message.id);
  const hasSources = message.from === 'assistant' && Array.isArray(message.sources) && message.sources.length > 0;
  const sourceCount = message.sources?.length || 0;

  if (message.from === 'assistant') {
    return (
      <div className={`flex w-full justify-start`}>
        <div className="flex flex-col items-start w-full">
          <div className="flex items-start gap-2">
              {showMessageAvatars && widgetConfig?.bot_avatar && (
              <img src={widgetConfig.bot_avatar} alt={(assistantName || widgetConfig?.title?.en || 'assistant') + ' avatar'} className="w-8 h-8 rounded-full object-cover shrink-0" />
            )}
            <div className={`max-w-[80%] p-2`} style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${messageBubbleRadius}px`, ...fontStyles }}>
              <div>{message.text}</div>
              {hasSources && (
                <div className="mt-2 pt-2 border-t border-gray-300">
                  <div className="text-xs font-semibold mb-1 opacity-70">
                    <span aria-hidden="true">📚</span> {translate(locale, 'sourcesCount', { count: sourceCount, vars: { count: sourceCount } })}:
                  </div>
                  <ul className="space-y-1" role="list">
                    {message.sources!.map((source, idx) => (
                      <li key={idx} className="text-xs">
                        {source.url ? (
                          <a href={source.url} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-start gap-1" style={{ color: textColor }}>
                            <span className="opacity-70">•</span>
                            <span className="flex-1">
                              <span className="font-medium">{source.title}</span>
                              {source.snippet && (<span className="opacity-70"> — {source.snippet.substring(0, 80)}{source.snippet.length > 80 ? '...' : ''}</span>)}
                            </span>
                          </a>
                        ) : (
                          <div className="flex items-start gap-1">
                            <span className="opacity-70">•</span>
                            <span className="flex-1">
                              <span className="font-medium">{source.title}</span>
                              {source.snippet && (<span className="opacity-70"> — {source.snippet.substring(0, 80)}{source.snippet.length > 80 ? '...' : ''}</span>)}
                            </span>
                          </div>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
          {!hasFeedback && onSubmitMessageFeedback && (
            <div className="mt-1 flex gap-2" style={{ marginInlineStart: (showMessageAvatars && widgetConfig?.bot_avatar) ? '40px' : '0' }}>
              <button type="button" onClick={() => onSubmitMessageFeedback(message.id, 'thumbs_up')} className="text-xs opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1" style={{ color: textColor }} title="Thumbs up" aria-label={translate(locale, 'feedbackPositive')}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" /></svg>
              </button>
              <button type="button" onClick={() => onSubmitMessageFeedback(message.id, 'thumbs_down')} className="text-xs opacity-50 hover:opacity-100 transition-opacity flex items-center gap-1" style={{ color: textColor }} title="Thumbs down" aria-label={translate(locale, 'feedbackNegative')}>
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14H5.236a2 2 0 01-1.789-2.894l3.5-7A2 2 0 018.737 3h4.017c.163 0 .326.02.485.06L17 4m-7 10v5a2 2 0 002 2h.095c.5 0 .905-.405.905-.905 0-.714.211-1.412.608-2.006L17 13V4m-7 10h2m6-10h-2" /></svg>
              </button>
            </div>
          )}
          {hasFeedback && (
            <span className="mt-1 text-xs opacity-50" style={{ color: textColor, marginInlineStart: (showMessageAvatars && widgetConfig?.bot_avatar) ? '40px' : '0' }}>{translate(locale, 'feedbackSubmitted')}</span>
          )}
          {showTimestamps && message.timestamp && (
            <span className="mt-1 text-xs opacity-50" style={{ color: textColor, marginInlineStart: (showMessageAvatars && widgetConfig?.bot_avatar) ? '40px' : '0' }}>{new Date(message.timestamp).toLocaleTimeString()}</span>
          )}
        </div>
      </div>
    );
  }

  // user message
  return (
    <div className={`flex w-full justify-end`}>
      <div className="flex flex-col items-end w-full">
        <div className={`max-w-[80%] p-2`} style={{ backgroundColor: '#111827', color: '#ffffff', borderRadius: `${messageBubbleRadius}px`, ...fontStyles }}>
          <div>{message.text}</div>
        </div>
        {showTimestamps && message.timestamp && (
          <span className="mt-1 text-xs opacity-50" style={{ color: textColor }}>{new Date(message.timestamp).toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}
