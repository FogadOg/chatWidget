'use client';

import React from 'react';
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
}: Props) {
  const { translations: t } = useWidgetTranslation();
  return (
    <>
      {isEmbedded ? (
        <div className="w-full h-screen bg-transparent">
          {isCollapsed ? (
            <div className="fixed bottom-4 right-4 z-50">
              <button
                type="button"
                onClick={toggleCollapsed}
                className="w-14 h-14 bg-gray-900 hover:bg-gray-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
                title="Open Chat"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="h-full flex flex-col bg-white">
              <div className="bg-gray-900 text-white p-3 flex items-center justify-between">
                <h3 className="font-semibold">{assistantName || title || t.chat}</h3>
                <button
                  type="button"
                  onClick={toggleCollapsed}
                  className="ml-3 px-2 py-1 rounded bg-gray-800 hover:bg-gray-700 text-sm flex items-center justify-center"
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

              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                {messages.map((message) => (
                  <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] p-2 rounded-lg ${message.from === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}`}>
                      {message.text}
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-gray-200 text-gray-800 p-2 rounded-lg">
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
                    placeholder={t.typeYourMessage}
                    className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
                    disabled={isTyping}
                  />
                  <button type="submit" disabled={!input.trim() || isTyping} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">{t.send}</button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="fixed bottom-4 right-4 bg-transparent">
          {isCollapsed ? (
            <button type="button" onClick={toggleCollapsed} className="w-14 h-14 bg-gray-900 hover:bg-gray-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105" title="Open Chat">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
              </svg>
            </button>
          ) : (
            <div className="w-100 h-150 flex flex-col">
              <div className="bg-white rounded-lg shadow-lg flex-1 flex flex-col overflow-hidden">
                <div className="bg-gray-900 text-white p-3 rounded-t-lg flex items-center justify-between">
                  <h3 className="font-semibold">{assistantName || title || t.chat}</h3>
                  <button type="button" onClick={toggleCollapsed} className="w-6 h-6 hover:bg-gray-700 rounded flex items-center justify-center transition-colors" title="Minimize Chat">
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

                <div className="flex-1 overflow-y-auto p-3 space-y-3">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] p-2 rounded-lg ${message.from === 'user' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-800'}`}>
                        {message.text}
                      </div>
                    </div>
                  ))}

                  {isTyping && (
                    <div className="flex justify-start">
                      <div className="bg-gray-200 text-gray-800 p-2 rounded-lg">
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
                    <input type="text" value={input} onChange={(e) => setInput(e.target.value)} placeholder={t.typeYourMessage} className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900" disabled={isTyping} />
                    <button type="submit" disabled={!input.trim() || isTyping} className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed">{t.send}</button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}
    </>
  );
}
