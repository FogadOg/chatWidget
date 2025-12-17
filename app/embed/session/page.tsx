'use client';

import { useEffect, useState } from 'react';

type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function EmbedPage() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! How can I help you today?', from: 'assistant' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [apiKey, setApiKey] = useState('');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Extract API parameters
    const apiKeyParam = urlParams.get('apiKey');
    const assistantIdParam = urlParams.get('assistantId');

    if (apiKeyParam) {
      setApiKey(apiKeyParam);
    }

    // Create session if we have both API key and assistant ID
    if (apiKeyParam && assistantIdParam) {
      createSession(apiKeyParam, assistantIdParam);
    }
  }, []);

  const createSession = async (key: string, assistant: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': key,
        },
        body: JSON.stringify({
          assistant_id: assistant,
          visitor_id: `widget-${Date.now()}`, // Unique visitor ID for the widget
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setSessionId(data.data.session_id);
        setError(null);
      } else {
        setError(data.detail || 'Failed to create session');
      }
    } catch (err) {
      setError('Network error: Could not connect to API');
      console.error('Session creation error:', err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Check if we have a session
    if (!sessionId || !apiKey) {
      setError('API key and assistant ID are required. Please check your widget configuration.');
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      from: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
        },
        body: JSON.stringify({
          content: userMessage.text,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.data.assistant_message.content,
          from: 'assistant'
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(data.detail || 'Failed to send message');
        // Re-add the user message input since the API call failed
        setInput(userMessage.text);
      }
    } catch (err) {
      setError('Network error: Could not send message');
      console.error('Message send error:', err);
      // Re-add the user message input since the API call failed
      setInput(userMessage.text);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleCollapsed = () => {
    setIsCollapsed(!isCollapsed);
  };

  return (
    <div className="fixed bottom-4 right-4 bg-transparent">
      {isCollapsed ? (
        // Collapsed state - just the toggle button
        <button
          onClick={toggleCollapsed}
          className="w-14 h-14 bg-gray-900 hover:bg-gray-700 text-white rounded-full shadow-lg flex items-center justify-center transition-all duration-200 hover:scale-105"
          title="Open Chat"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="m3 21 1.9-5.7a8.5 8.5 0 1 1 3.8 3.8z" />
          </svg>
        </button>
      ) : (
        // Expanded state - full chat widget
        <div className="w-100 h-150 flex flex-col">
          <div className="bg-white rounded-lg shadow-lg flex-1 flex flex-col overflow-hidden">
            {/* Header with collapse button */}
            <div className="bg-gray-900 text-white p-3 rounded-t-lg flex items-center justify-between">
              <h3 className="font-semibold">Chat Widget</h3>
              <button
                onClick={toggleCollapsed}
                className="w-6 h-6 hover:bg-gray-700 rounded flex items-center justify-center transition-colors"
                title="Minimize Chat"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="6,9 12,15 18,9" />
                </svg>
              </button>
            </div>

            {/* Error message */}
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-3 mx-3 mt-3 rounded">
                <p className="text-sm">{error}</p>
              </div>
            )}

            <div className="flex-1 overflow-y-auto p-3 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.from === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] p-2 rounded-lg ${
                  message.from === 'user'
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-200 text-gray-800'
                }`}
              >
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

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-3 border-t">
          <div className="flex space-x-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
              disabled={isTyping}
            />
            <button
              type="submit"
              disabled={!input.trim() || isTyping}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    </div>
  )}
  </div>
  );
}
