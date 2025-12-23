'use client';

import { useEffect, useState, useCallback } from 'react';
import EmbedShell from '../../../components/EmbedShell';
import { useWidgetAuth } from '../../../hooks/useWidgetAuth';
import { useWidgetTranslation } from '../../../hooks/useWidgetTranslation';

type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
};

type Conversation = {
  id: string;
  assistant_id: string;
  customer_id: string;
  status: string;
  created_at: string;
};

type ApiMessage = {
  id: string;
  sender: string;
  content: string;
  metadata: Record<string, unknown>;
  created_at: string;
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

export default function ConversationEmbedPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { getAuthToken, authToken, authError } = useWidgetAuth();
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [assistantName, setAssistantName] = useState<string>('');
  const { translations: t, locale } = useWidgetTranslation();


  const createConversation = useCallback(async (assistant: string, customerId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          assistant_id: assistant,
          customer_id: customerId,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setConversationId(data.data.id);
        setError(null);
        // Show typing animation while loading greeting message
        setIsTyping(true);
        // Load messages after conversation creation
        await loadConversationMessages(data.data.id, token);
      } else {
        setError(data.detail || t.failedToCreateConversation);
      }
    } catch (err) {
      setError(t.networkErrorConnect);
      console.error('Conversation creation error:', err);
    }
  }, []);

  const fetchAssistantDetails = useCallback(async (assistantId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/assistants/${assistantId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          setAssistantName(data.data.name);
        }
      }
    } catch (err) {
      console.error('Error fetching assistant details:', err);
    }
  }, []);

  const loadConversationMessages = useCallback(async (conversationId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          // Convert API messages to widget message format
          const loadedMessages: Message[] = data.data.messages.map((msg: ApiMessage) => ({
            id: msg.id,
            text: msg.content,
            from: msg.sender as 'user' | 'assistant'
          }));
          setMessages(loadedMessages);
        }
      }
    } catch (err) {
      console.error('Error loading conversation messages:', err);
    } finally {
      setIsTyping(false);
    }
  }, []);

  const initializeConversation = useCallback(async (assistant: string, customerId: string, token: string) => {
    try {
      // First, try to find existing conversations for this customer and assistant
      const conversationsResponse = await fetch(`${API_BASE_URL}/conversations/`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (conversationsResponse.ok) {
        const conversationsData = await conversationsResponse.json();
        if (conversationsData.status === 'success') {
          // Find the most recent active conversation for this customer and assistant
          const existingConversation = conversationsData.data.conversations
            .filter((conv: Conversation) => conv.customer_id === customerId && conv.assistant_id === assistant && conv.status === 'active')
            .sort((a: Conversation, b: Conversation) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0];

          if (existingConversation) {
            // Load existing conversation and messages
            setConversationId(existingConversation.id);
            setIsTyping(true);
            await loadConversationMessages(existingConversation.id, token);
            setError(null);
            return;
          }
        }
      }

      // If no existing conversation found, create a new one
      await createConversation(assistant, customerId, token);
    } catch (err) {
      setError(t.networkErrorInitialize);
      console.error('Conversation initialization error:', err);
    }
  }, [createConversation, loadConversationMessages, fetchAssistantDetails]);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Extract client ID parameter
    const clientIdParam = urlParams.get('clientId');
    const assistantIdParam = urlParams.get('assistantId');
    const customerIdParam = urlParams.get('customerId') || `widget-user-${Date.now()}`;

    // Get auth token if we have required parameters
    if (clientIdParam && assistantIdParam) {
      getAuthToken(clientIdParam).then((token) => {
        if (token) {
          fetchAssistantDetails(assistantIdParam, token);
          initializeConversation(assistantIdParam, customerIdParam, token);
        } else if (authError) {
          setError(authError);
        }
      });
    }

    // Detect iframe embedding and allow initial open/closed control
    try {
      setIsEmbedded(window.top !== window.self);
    } catch (e) {
      setIsEmbedded(true);
    }

    const startOpenParam = urlParams.get('startOpen');
    if (startOpenParam !== null) {
      const startOpen = startOpenParam === '1' || startOpenParam.toLowerCase() === 'true';
      setIsCollapsed(!startOpen);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    // Check if we have a conversation and auth token
    if (!conversationId || !authToken) {
      setError(t.sessionOrAuthError);
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
      const response = await fetch(`${API_BASE_URL}/conversations/${conversationId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: userMessage.text,
          locale: locale,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          text: data.data.content,
          from: 'assistant'
        };
        setMessages(prev => [...prev, assistantMessage]);
      } else {
        setError(data.detail || t.failedToSendMessage);
        // Re-add the user message input since the API call failed
        setInput(userMessage.text);
      }
    } catch (err) {
      setError(t.networkError);
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
      assistantName={assistantName}
    />
  );
}