'use client';

import { useEffect, useState } from 'react';

type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
};

const mockResponses = [
  "That's a great question! Let me help you understand this concept better.",
  "I'd be happy to explain this topic in detail. Let me break it down for you.",
  "This is an interesting topic that comes up frequently. Here's what I recommend...",
  "Great choice of topic! This is something that many developers encounter.",
  "That's definitely worth exploring. Here's the best approach...",
];

export default function EmbedPage() {
  const [args, setArgs] = useState('Loading...');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello! How can I help you today?', from: 'assistant' }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const params = Array.from(urlParams.entries()).map(([key, value]) => `${key}: ${value}`).join(', ');
    setArgs(params || 'None');
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: input,
      from: 'user'
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const response = mockResponses[Math.floor(Math.random() * mockResponses.length)];
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        text: response,
        from: 'assistant'
      };
      setMessages(prev => [...prev, assistantMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 2000);
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
