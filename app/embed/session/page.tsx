'use client';

import { useEffect, useState } from 'react';
import EmbedShell from '../../../components/EmbedShell';
import { useWidgetAuth } from '../../../hooks/useWidgetAuth';
import { useWidgetTranslation } from '../../../hooks/useWidgetTranslation';

type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
};

type WidgetConfig = {
  id: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  border_radius: number;
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  start_open: boolean;
  hide_on_mobile: boolean;
  title: { [lang: string]: string };
  subtitle: { [lang: string]: string };
  placeholder: { [lang: string]: string };
  greeting_message: {
    text: { [lang: string]: string };
    buttons?: Array<{
      id: string;
      label: { [lang: string]: string };
      action: string;
      icon?: string;
      response?: {
        text?: { [lang: string]: string };
        buttons?: any[];
      };
    }>;
    flows?: any[];
  };
  default_language: string;
};

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1`

export default function EmbedPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [flowResponses, setFlowResponses] = useState<Array<{ text: string; buttons: any[] }>>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);
  const { getAuthToken, authToken, authError } = useWidgetAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [assistantName, setAssistantName] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [shouldRender, setShouldRender] = useState(true);
  const { translations: t, locale } = useWidgetTranslation();

  useEffect(() => {
    // Detect mobile device
    const checkIsMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 && /Android|iPhone|Mobile|Mobi/i.test(navigator.userAgent);
      console.log('Mobile detection:', {
        width: window.innerWidth,
        userAgent: navigator.userAgent,
        isMobile: isMobileDevice
      });
      setIsMobile(isMobileDevice);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);

    // Extract client ID parameter
    const clientIdParam = urlParams.get('clientId');
    const assistantIdParam = urlParams.get('assistantId');
    const configIdParam = urlParams.get('configId');


    // Get auth token if we have required parameters
    if (clientIdParam && assistantIdParam) {
      getAuthToken(clientIdParam).then((token) => {
        if (token) {
          fetchAssistantDetails(assistantIdParam, token);
          if (configIdParam) {
            fetchWidgetConfig(configIdParam, token);
          }
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
      // setIsCollapsed(!startOpen); // Removed to start closed and check start_open later
    }

    // Detect iframe embedding and render a stripped layout when embedded
    try {
      setIsEmbedded(window.top !== window.self);
    } catch (e) {
      setIsEmbedded(true);
    }
  }, []);

  // Apply widget behavior settings when config is loaded
  useEffect(() => {
    if (!widgetConfig) return;

    const width = window.innerWidth;
    const ua = navigator.userAgent;
    const hasWidth = width <= 768;
    const hasUserAgent = /Android|iPhone|iPad|iPod|Mobile|Mobi/i.test(ua);
    const isMobile = hasWidth || hasUserAgent; // Changed to OR instead of AND

    console.log('Widget config loaded:', {
      hide_on_mobile: widgetConfig.hide_on_mobile,
      start_open: widgetConfig.start_open,
      width: width,
      userAgent: ua,
      hasWidth: hasWidth,
      hasUserAgent: hasUserAgent,
      isMobile: isMobile,
      shouldHide: widgetConfig.hide_on_mobile && isMobile
    });

    // Check if widget should be hidden on mobile
    if (widgetConfig.hide_on_mobile && isMobile) {
      console.log('Setting shouldRender to false - hiding widget on mobile');
      setShouldRender(false);
      return;
    }

    console.log('Setting shouldRender to true - showing widget');
    setShouldRender(true);

    // On mobile, always start collapsed
    // On desktop, follow start_open setting
    if (isMobile) {
      console.log('Mobile detected - collapsing widget');
      setIsCollapsed(true);
    } else {
      console.log('Desktop detected - applying start_open setting:', widgetConfig.start_open);
      setIsCollapsed(!widgetConfig.start_open);
    }
  }, [widgetConfig]);

  const createSession = async (assistant: string, token: string) => {
    try {
      console.log('Creating session with locale:', locale);
      const response = await fetch(`${API_BASE_URL}/sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          assistant_id: assistant,
          visitor_id: `widget-${Date.now()}`, // Unique visitor ID for the widget
          locale: locale,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setSessionId(data.data.session_id);
        setError(null);
        // Load messages after session creation
        await loadSessionMessages(data.data.session_id, token);
      } else {
        setError(data.detail || t.failedToCreateSession);
      }
    } catch (err) {
      setError(t.networkErrorConnect);
      console.error('Session creation error:', err);
    }
  };

  const fetchAssistantDetails = async (assistantId: string, token: string) => {
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
  };

  const fetchWidgetConfig = async (configId: string, token: string) => {
    try {
      console.log('Fetching widget config for configId:', configId);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/organization/testing/widget-config/${configId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('Widget config response:', data);

      if (response.ok) {
        if (data.status === 'success') {
          console.log('Setting widget config:', data.data);
          setWidgetConfig(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching widget config:', err);
    }
  };

  const getLocalizedText = (textObj: { [lang: string]: string } | undefined): string => {
    if (!textObj) return '';
    const lang = widgetConfig?.default_language || locale || 'en';
    return textObj[lang] || textObj[widgetConfig?.default_language || 'en'] || textObj['en'] || '';
  };

  const processWidgetFlow = (action: string | undefined, isFollowUpButton: boolean = false): boolean => {
    if (!action || action === 'text') {
      return false;
    }

    const flows = widgetConfig?.greeting_message?.flows || [];
    console.log('Processing flow for action:', action);
    console.log('Available flows:', flows);
    const flow = flows.find((candidate: any) => candidate.trigger === action);
    console.log('Found flow:', flow);
    if (!flow) {
      return false;
    }

    const responses = flow.responses || [];
    console.log('Flow responses:', responses);
    responses.forEach((response: any, index: number) => {
      const responseText = getLocalizedText(response.text);
      console.log('Response text:', responseText);
      console.log('Response buttons:', response.buttons);

      if (responseText || (response.buttons && response.buttons.length > 0)) {
        // Add flow response as a grouped object with text and buttons
        setFlowResponses((prev: any[]) => [...prev, {
          text: responseText || '',
          buttons: response.buttons || []
        }]);
      }
    });

    return true;
  };

  const handleSubmit = async (e: React.FormEvent, messageText?: string) => {
    e.preventDefault();
    const message = messageText || input;
    if (!message.trim()) return;

    // Check if we have a session and auth token
    if (!sessionId || !authToken) {
      setError(t.sessionOrAuthError);
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      text: message,
      from: 'user'
    };

    // Only add message if it's from input (not from button)
    if (!messageText) {
      setMessages(prev => [...prev, userMessage]);
    }
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
          content: message,
          locale: locale,
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

  const handleFollowUpButtonClick = (button: any) => {
    console.log('handleFollowUpButtonClick called with button:', button);
    console.log('Button action:', button.action);
    if (!sessionId || !authToken) return;

    const maybeText = getLocalizedText(button.response?.text);
    const maybeButtons = button.response?.buttons || [];

    console.log('Follow-up button response text:', maybeText);

    // Add response as a grouped flow response
    if (maybeText || maybeButtons.length > 0) {
      setFlowResponses((prev: any[]) => [...prev, {
        text: maybeText || '',
        buttons: maybeButtons
      }]);
    }

    const flowHandled = processWidgetFlow(button.action, true);
    console.log('Flow handled:', flowHandled, 'for action:', button.action);

    if (!flowHandled) {
      handleSubmit(new Event('submit') as any, button.action);
    }
  };

  const handleInteractionButtonClick = async (button: any) => {
    console.log('handleInteractionButtonClick called with button:', button);
    if (!sessionId || !authToken) return;

    const maybeText = getLocalizedText(button.response?.text);
    const maybeButtons = button.response?.buttons || [];

    console.log('Interaction button response text:', maybeText);

    if (maybeText || maybeButtons.length > 0) {
      setIsTyping(true);
      setTimeout(() => {
        // Add as grouped flow response instead of separate message
        setFlowResponses((prev: any[]) => [...prev, {
          text: maybeText || '',
          buttons: maybeButtons
        }]);
        setIsTyping(false);
      }, 300);
    }

    const flowHandled = processWidgetFlow(button.action);
    console.log('Interaction flow handled:', flowHandled);

    if (!maybeText && !flowHandled) {
      handleSubmit(new Event('submit') as any, button.action);
    }
  };

  const loadSessionMessages = async (sessionId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          // Convert API messages to widget message format
          const loadedMessages: Message[] = data.data.messages
            .filter((msg: any) => {
              // Filter out assistant greeting messages - any assistant message when there are no user messages yet
              if (msg.sender === 'assistant') {
                const userMessages = data.data.messages.filter((m: any) => m.sender === 'user');
                return userMessages.length > 0; // Only show assistant messages if there are user messages
              }
              return true;
            })
            .map((msg: any) => ({
              id: msg.id,
              text: msg.content,
              from: msg.sender as 'user' | 'assistant'
            }));

          setMessages(loadedMessages);
          setFlowResponses([]);
        }
      }
    } catch (err) {
      console.error('Error loading session messages:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => !prev);
  };

  console.log('Render check:', { shouldRender, widgetConfig: widgetConfig?.id });

  if (!shouldRender) {
    console.log('Widget not rendering - shouldRender is false');
    return null; // Don't render the widget at all if shouldRender is false
  }

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
      widgetConfig={widgetConfig}
      onInteractionButtonClick={handleInteractionButtonClick}
      onFollowUpButtonClick={handleFollowUpButtonClick}
      flowResponses={flowResponses}
      getLocalizedText={getLocalizedText}
    />
  );
}
