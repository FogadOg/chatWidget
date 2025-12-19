'use client';

import { useEffect, useState } from 'react';
import EmbedShell from '../../../components/EmbedShell';
import { useWidgetAuth } from '../../../hooks/useWidgetAuth';

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
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { getAuthToken, authToken, authError } = useWidgetAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Extract client ID parameter
    const clientIdParam = urlParams.get('clientId');
    const assistantIdParam = urlParams.get('assistantId');


    // Get auth token if we have required parameters
    if (clientIdParam && assistantIdParam) {
      getAuthToken(clientIdParam).then((token) => {
        if (token) {
          createSession(assistantIdParam, token);
        } else if (authError) {
          setError(authError);
        }
      });
    }

    // Allow controlling initial open/closed state via URL param `startOpen`
    // Values accepted: "true" | "1" => open, "false" | "0" => closed
    const startOpenParam = urlParams.get('startOpen');
    if (startOpenParam !== null) {
      const startOpen = startOpenParam === '1' || startOpenParam.toLowerCase() === 'true';
      // `isCollapsed` should be the inverse of `startOpen`
      setIsCollapsed(!startOpen);
    }

    // Detect iframe embedding and render a stripped layout when embedded
    try {
      setIsEmbedded(window.top !== window.self);
    } catch (e) {
      setIsEmbedded(true);
    }
  }, []);

  const createSession = async (assistant: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
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

    // Check if we have a session and auth token
    if (!sessionId || !authToken) {
      setError('Session or authentication token not available. Please check your widget configuration.');
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
          'Authorization': `Bearer ${authToken}`,
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
    setIsCollapsed((prev) => !prev);
  };

  return (
    <EmbedShell
      isEmbedded={isEmbedded}
      isCollapsed={isCollapsed}
      toggleCollapsed={toggleCollapsed}
      messages={messages}
      isTyping={isTyping}
      input={input}
      setInput={setInput}
      handleSubmit={handleSubmit}
      error={error}
      title="Chat"
    />
  );
}
