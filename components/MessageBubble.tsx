
'use client';

import React, { useState, useCallback, useEffect } from 'react';

// Dynamically import react-markdown and remark-gfm at runtime so Jest
// doesn't try to parse ESM exports from node_modules during tests.
// When not yet loaded we render plain text so server/test environments stay compatible.
type MDComponents = Record<string, React.ComponentType<any>>;
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
  pending?: boolean;
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

  // Replace `phrase[N]` citation markers so the preceding phrase becomes the inline link.
  // Captures up to 4 non-punctuation words before [N] as the link text, then removes [N].
  const processedText = React.useMemo(() => {
    if (!message.text || !message.sources?.length) return message.text;
    return message.text.replace(
      /((?:[^\s,.!?;:()\[\]"\n]+\s+){0,3}[^\s,.!?;:()\[\]"\n]+)\[(\d+)\]/g,
      (match, phrase, num) => {
        const idx = parseInt(num, 10) - 1;
        const source = message.sources?.[idx];
        if (!source) return match;
        if (source.url) return `[${phrase.trim()}](${source.url})`;
        // No URL: keep phrase as plain text, strip the [N] marker
        return phrase.trim();
      }
    );
  }, [message.text, message.sources]);

  const [copied, setCopied] = useState(false);
  const [ReactMarkdown, setReactMarkdown] = useState<React.ComponentType<any> | null>(null);
  const [remarkGfm, setRemarkGfm] = useState<any>(null);

  useEffect(() => {
    let mounted = true;
    // First try a synchronous require path — this helps Jest's module mocking
    // (which wires up CommonJS `require`) so tests don't have to wait for
    // the async import. If require isn't available or the module isn't
    // present, fall back to dynamic import.
    try {
      // @ts-ignore - require is available in Node/Jest environments
      const rmMod = require('react-markdown');
      // @ts-ignore
      const gfmMod = (() => { try { return require('remark-gfm'); } catch { return null; } })();
      const RM = rmMod && (rmMod.default || rmMod);
      const gfm = gfmMod && (gfmMod.default || gfmMod);
      if (mounted && RM) {
        setReactMarkdown(() => RM as any);
        setRemarkGfm(() => gfm);
        return () => { mounted = false; };
      }
    } catch {
      // ignore and fall through to dynamic import
    }

    Promise.all([
      import('react-markdown').then(m => m.default || m).catch(() => null),
      import('remark-gfm').then(m => m.default || m).catch(() => null),
    ]).then(([RM, gfm]) => {
      if (mounted) {
        // React state setters treat functions as updaters, so wrap imported
        // function values to store them as state instead of invoking them.
        setReactMarkdown(() => RM as any);
        setRemarkGfm(() => gfm);
      }
    });
    return () => { mounted = false; };
  }, []);
  const handleCopy = useCallback(() => {
    if (!message.text) return;
    try {
      navigator.clipboard.writeText(message.text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {
        // Fallback for browsers without clipboard API
        const textarea = document.createElement('textarea');
        textarea.value = message.text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.focus();
        textarea.select();
        try { document.execCommand('copy'); } catch {}
        document.body.removeChild(textarea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      });
    } catch {
      // ignore
    }
  }, [message.text]);

  if (message.from === 'assistant') {
    return (
      <div className={`flex w-full justify-start`}>
        <div className="flex flex-col items-start w-full">
          <div className="flex items-start gap-2">
              {showMessageAvatars && widgetConfig?.bot_avatar && (
              <img src={widgetConfig.bot_avatar} alt={(assistantName || widgetConfig?.title?.en || 'assistant') + ' avatar'} className="w-8 h-8 rounded-full object-cover shrink-0" />
            )}
            <div className={`max-w-[80%] p-2 group relative`} style={{ backgroundColor: '#e5e7eb', color: textColor, borderRadius: `${messageBubbleRadius}px`, ...fontStyles }}>
              {/* Copy button — appears on hover */}
              <button
                type="button"
                onClick={handleCopy}
                title={copied ? translate(locale, 'copied') : translate(locale, 'copyMessage')}
                aria-label={copied ? translate(locale, 'copied') : translate(locale, 'copyMessage')}
                className="absolute top-1 right-1 opacity-40 hover:opacity-100 transition-opacity p-1 rounded hover:bg-black/10"
                style={{ color: textColor }}
              >
                {copied ? (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                ) : (
                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
                    <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
                  </svg>
                )}
              </button>
              {/* Markdown-rendered message body */}
              <div className="prose prose-sm max-w-none pr-5" style={{ color: textColor }}>
                {ReactMarkdown ? (
                  <ReactMarkdown
                    remarkPlugins={remarkGfm ? [remarkGfm] : []}
                    components={({
                      // Open links in a new tab safely
                      a: (({ href, children }: { href?: string; children?: React.ReactNode }) => (
                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: textColor, textDecoration: 'underline' }}>{children}</a>
                      )),
                      // Code: inline vs block
                      code: (({ className, children }: { className?: string; children?: React.ReactNode }) => {
                        const isBlock = /language-/.test(className || '');
                        return isBlock ? (
                          <pre style={{ backgroundColor: 'rgba(0,0,0,0.06)', borderRadius: '4px', padding: '8px', overflowX: 'auto', fontSize: '0.82em', margin: '4px 0' }}>
                            <code className={className}>{children}</code>
                          </pre>
                        ) : (
                          <code style={{ backgroundColor: 'rgba(0,0,0,0.08)', borderRadius: '3px', padding: '1px 4px', fontSize: '0.85em' }}>{children}</code>
                        );
                      }),
                      ul: (({ children }: { children?: React.ReactNode }) => <ul style={{ paddingInlineStart: '1.2em', margin: '4px 0' }}>{children}</ul>),
                      ol: (({ children }: { children?: React.ReactNode }) => <ol style={{ paddingInlineStart: '1.2em', margin: '4px 0' }}>{children}</ol>),
                      p: (({ children }: { children?: React.ReactNode }) => <p style={{ margin: '2px 0' }}>{children}</p>),
                    } as MDComponents)}
                  >
                    {processedText}
                  </ReactMarkdown>
                ) : (
                  <div>{message.text}</div>
                )}
              </div>

              {/* Sources */}
              {message.sources && message.sources.length > 0 && (
                <div className="mt-2 flex flex-col gap-1">
                  {message.sources.map((source, idx) => {
                    const label = source.title || source.url || '';
                    return source.url ? (
                      <a key={idx} href={source.url} target="_blank" rel="noopener noreferrer" className="text-xs underline opacity-70 hover:opacity-100" style={{ color: textColor }}>{label}</a>
                    ) : (
                      <span key={idx} className="text-xs opacity-70" style={{ color: textColor }}>{label}</span>
                    );
                  })}
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
  const isPending = Boolean(message.pending);
  const attempts = (message as any).attempts || 0;

  const bubbleStyle: React.CSSProperties = isPending
    ? {
        backgroundColor: 'transparent',
        color: '#374151',
        borderRadius: `${messageBubbleRadius}px`,
        border: '1px dashed rgba(31,41,55,0.08)',
        opacity: 0.9,
        ...fontStyles,
      }
    : {
        backgroundColor: '#111827',
        color: '#ffffff',
        borderRadius: `${messageBubbleRadius}px`,
        ...fontStyles,
      };

  return (
    <div className={`flex w-full justify-end`}>
      <div className="flex flex-col items-end w-full" aria-live={isPending ? 'polite' : undefined}>
        <div className={`max-w-[80%] p-2`} style={bubbleStyle} data-pending={isPending ? 'true' : 'false'}>
          <div style={{ opacity: isPending ? 0.9 : 1 }}>{message.text}</div>
        </div>

        {isPending && (
          <div className="mt-1 flex items-center gap-3">
            {attempts === 0 && (
              <span className="text-xs opacity-70 flex items-center gap-1" style={{ color: '#6b7280' }}>
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 6v6l4 2" /></svg>
                <span className="text-xs">{translate(locale, 'offlineStatus')}</span>
              </span>
            )}

            {attempts > 0 && attempts < 3 && (
              <span className="text-xs opacity-70 flex items-center gap-1" style={{ color: '#6b7280' }}>
                <svg className="animate-spin w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
                <span className="text-xs">{translate(locale, 'deliveringStatus', { vars: { attempt: attempts } })}</span>
              </span>
            )}

            {attempts >= 3 && (
              <div className="flex items-center gap-2">
                <span className="text-xs opacity-70" style={{ color: '#ef4444' }}>{translate(locale, 'failedSend')}</span>
                <button type="button" className="text-xs underline" onClick={() => {
                  try {
                    window.dispatchEvent(new CustomEvent('companin:retry-queued', { detail: { id: message.id } }));
                  } catch {}
                }}>{translate(locale, 'retry')}</button>
              </div>
            )}
          </div>
        )}

        {showTimestamps && message.timestamp && (
          <span className="mt-1 text-xs opacity-50" style={{ color: '#6b7280' }}>{new Date(message.timestamp).toLocaleTimeString()}</span>
        )}
      </div>
    </div>
  );
}
