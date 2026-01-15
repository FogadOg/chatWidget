'use client';

import { useEffect, useState } from 'react';
import EmbedShell from '../../../components/EmbedShell';
import { useWidgetAuth } from '../../../hooks/useWidgetAuth';
import { useWidgetTranslation } from '../../../hooks/useWidgetTranslation';
import FeedbackDialog from '../../../components/FeedbackDialog';

type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
  timestamp?: number;
};

type WidgetConfig = {
  id: string;
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  border_radius: number;
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
  // New appearance fields
  font_family: string;
  font_size: number;
  font_weight: string;
  shadow_intensity: string;
  shadow_color: string;
  widget_width: number;
  widget_height: number;
  button_size: string;
  message_bubble_radius: number;
  button_border_radius: number;
  opacity: number;
};

const getButtonPixelSize = (buttonSize: string) => {
  const sizeMap = {
    sm: 100,
    md: 128,
    lg: 160
  };
  return sizeMap[buttonSize as keyof typeof sizeMap] || 56;
};

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1`

type EmbedClientProps = {
  clientId: string;
  assistantId: string;
  configId: string;
  locale: string;
  startOpen: boolean;
};

export default function EmbedClient({
  clientId: initialClientId,
  assistantId: initialAssistantId,
  configId: initialConfigId,
  locale: initialLocale,
  startOpen: initialStartOpen
}: EmbedClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [flowResponses, setFlowResponses] = useState<Array<{ text: string; buttons: any[]; timestamp: number }>>([]);
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
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { translations: t, locale } = useWidgetTranslation();
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);

  // Helper function to get localStorage key for this widget instance
  const getSessionStorageKey = () => {
    return `companin-session-${initialClientId}-${initialAssistantId}`;
  };

  // Helper function to get or create visitor ID
  const getVisitorId = () => {
    const visitorKey = `companin-visitor-${initialClientId}`;
    let visitorId = localStorage.getItem(visitorKey);
    if (!visitorId) {
      visitorId = `widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      localStorage.setItem(visitorKey, visitorId);
    }
    return visitorId;
  };

  // Helper function to get stored session data
  const getStoredSession = () => {
    try {
      const storageKey = getSessionStorageKey();
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const data = JSON.parse(stored);
        // Check if session is expired (with 5 minute buffer before actual expiry)
        if (data.expiresAt && new Date(data.expiresAt).getTime() - 5 * 60 * 1000 > Date.now()) {
          return data;
        } else {
          // Clear expired session
          localStorage.removeItem(storageKey);
        }
      }
    } catch (e) {
      console.error('Error reading stored session:', e);
    }
    return null;
  };

  // Helper function to store session data
  const storeSession = (sessionId: string, expiresAt: string) => {
    try {
      const storageKey = getSessionStorageKey();
      localStorage.setItem(storageKey, JSON.stringify({
        sessionId,
        expiresAt,
        createdAt: new Date().toISOString()
      }));
    } catch (e) {
      console.error('Error storing session:', e);
    }
  };

  useEffect(() => {
    // Detect mobile device
    const checkIsMobile = () => {
      const isMobileDevice = window.innerWidth <= 768 && /Android|iPhone|Mobile|Mobi/i.test(navigator.userAgent);
      setIsMobile(isMobileDevice);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Periodic check for expired sessions
  useEffect(() => {
    const checkSessionExpiry = () => {
      const stored = getStoredSession();
      if (!stored && sessionId) {
        // Session expired in localStorage, clear the state
        setSessionId(null);
        setMessages([]);
        setFlowResponses([]);
      }
    };

    // Check every 60 seconds
    const interval = setInterval(checkSessionExpiry, 60000);
    return () => clearInterval(interval);
  }, [sessionId]);

  useEffect(() => {
    // Use props instead of URL params
    const clientIdParam = initialClientId;
    const assistantIdParam = initialAssistantId;
    const configIdParam = initialConfigId;

    // Get auth token if we have required parameters
    if (clientIdParam && assistantIdParam) {
      getAuthToken(clientIdParam).then((token) => {
        if (token) {
          fetchAssistantDetails(assistantIdParam, token);
          if (configIdParam) {
            fetchWidgetConfig(configIdParam, token);
          }
          // Try to restore existing session first
          const storedSession = getStoredSession();
          if (storedSession) {
            validateAndRestoreSession(storedSession.sessionId, assistantIdParam, token);
          } else {
            createSession(assistantIdParam, token);
          }
        } else if (authError) {
          setError(authError);
        }
      });
    }

    // Detect iframe embedding and render a stripped layout when embedded
    try {
      setIsEmbedded(window.top !== window.self);
    } catch (e) {
      setIsEmbedded(true);
    }
  }, [initialClientId, initialAssistantId, initialConfigId]);

  // Apply widget behavior settings when config is loaded
  useEffect(() => {
    if (!widgetConfig) return;

    const ua = navigator.userAgent;
    // Only check user agent for mobile device detection (not screen width)
    const isMobileDevice = /Android|iPhone|iPad|iPod|Mobile|Mobi/i.test(ua);

    // Always show the widget (don't hide it completely)
    setShouldRender(true);

    // Determine collapsed state based on device and settings
    if (isMobileDevice && widgetConfig.hide_on_mobile) {
      // On mobile devices with hide_on_mobile=true: always start collapsed
      setIsCollapsed(true);
    } else {
      // Use the prop value if available, otherwise use config
      setIsCollapsed(!initialStartOpen && !widgetConfig.start_open);
    }
  }, [widgetConfig, initialStartOpen]);

  // Send initial widget size to parent when config is loaded
  useEffect(() => {
    if (widgetConfig && window.parent !== window) {
      if (isCollapsed) {
        // Send button size when collapsed
        const buttonSize = getButtonPixelSize(widgetConfig.button_size || 'md');
        window.parent.postMessage(
          {
            type: 'WIDGET_RESIZE',
            data: { width: buttonSize, height: buttonSize }
          },
          '*'
        );
      } else {
        // Send widget size when expanded
        const width = widgetConfig.widget_width || 400;
        const height = widgetConfig.widget_height || 600;
        window.parent.postMessage(
          {
            type: 'WIDGET_RESIZE',
            data: { width, height }
          },
          '*'
        );
      }
    }
  }, [widgetConfig, isCollapsed]);

  const createSession = async (assistant: string, token: string) => {
    try {
      const visitorId = getVisitorId();
      const response = await fetch(`${API_BASE_URL}/sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({
          assistant_id: assistant,
          visitor_id: visitorId,
          locale: locale,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        setSessionId(data.data.session_id);
        setError(null);
        // Store session data in localStorage
        if (data.data.expires_at) {
          storeSession(data.data.session_id, data.data.expires_at);
        }
        // Load messages after session creation
        await loadSessionMessages(data.data.session_id, token, true);
      } else {
        setError(data.detail || t.failedToCreateSession);
      }
    } catch (err) {
      setError(t.networkErrorConnect);
      console.error('Session creation error:', err);
    }
  };

  const validateAndRestoreSession = async (sessionId: string, assistantId: string, token: string) => {
    try {
      // Try to load messages from the session to validate it
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success') {
          // Session is valid, use it
          setSessionId(sessionId);
          setError(null);
          // Load messages
          const loadedMessages: Message[] = data.data.messages
            .filter((msg: any) => {
              // Filter out assistant greeting messages
              if (msg.sender === 'assistant') {
                const userMessages = data.data.messages.filter((m: any) => m.sender === 'user');
                return userMessages.length > 0;
              }
              return true;
            })
            .map((msg: any) => ({
              id: msg.id,
              text: msg.content,
              from: msg.sender as 'user' | 'assistant',
              timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
            }));
          setMessages(loadedMessages);
          setIsInitialLoad(false);

          // Check if we should show feedback (if messages exist and no feedback submitted yet)
          if (loadedMessages.length > 0 && !feedbackSubmitted) {
            checkFeedbackStatus(sessionId, token);
          }
        } else {
          // Session invalid, create new one
          localStorage.removeItem(getSessionStorageKey());
          createSession(assistantId, token);
        }
      } else {
        // Session not found or expired, create new one
        localStorage.removeItem(getSessionStorageKey());
        createSession(assistantId, token);
      }
    } catch (err) {
      console.error('Session validation error:', err);
      // On error, create new session
      localStorage.removeItem(getSessionStorageKey());
      createSession(assistantId, token);
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
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/widget-config/${configId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        if (data.status === 'success') {
          setWidgetConfig(data.data);
        }
      }
    } catch (err) {
      console.error('Error fetching widget config:', err);
    }
  };

  const checkFeedbackStatus = async (sessionId: string, token: string) => {
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/feedback`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data.has_feedback) {
          setFeedbackSubmitted(true);
        }
      }
    } catch (error) {
      console.error('Error checking feedback status:', error);
    }
  };

  // Detect conversation end (inactivity) and show feedback dialog
  useEffect(() => {
    if (!sessionId || !authToken || feedbackSubmitted || showFeedbackDialog) return;
    if (messages.length === 0) return;

    // Update last message timestamp
    const latestMessage = messages[messages.length - 1];
    if (latestMessage && latestMessage.timestamp) {
      setLastMessageTimestamp(latestMessage.timestamp);
    }

    // Set a timer to show feedback dialog after 30 seconds of inactivity
    const inactivityTimer = setTimeout(() => {
      if (!feedbackSubmitted && messages.length > 0) {
        setShowFeedbackDialog(true);
      }
    }, 30000); // 30 seconds

    return () => clearTimeout(inactivityTimer);
  }, [messages, sessionId, authToken, feedbackSubmitted, showFeedbackDialog]);

  const handleFeedbackSubmit = () => {
    setFeedbackSubmitted(true);
    setShowFeedbackDialog(false);
    // Store feedback submitted flag in localStorage
    if (sessionId) {
      localStorage.setItem(`feedback_submitted_${sessionId}`, 'true');
    }
  };

  const handleFeedbackSkip = () => {
    setShowFeedbackDialog(false);
    setFeedbackSubmitted(true); // Don't show again this session
    if (sessionId) {
      localStorage.setItem(`feedback_submitted_${sessionId}`, 'skipped');
    }
  };

  const getLocalizedText = (textObj: { [lang: string]: string } | undefined): string => {
    if (!textObj) return '';

    // Priority: user's locale -> widget's default language -> English -> first available
    const userLocale = locale || 'en';
    const defaultLang = widgetConfig?.default_language || 'en';

    // Try user's locale first
    if (textObj[userLocale]) return textObj[userLocale];

    // Fall back to widget's default language
    if (textObj[defaultLang]) return textObj[defaultLang];

    // Fall back to English
    if (textObj['en']) return textObj['en'];

    // Return first available translation
    const values = Object.values(textObj);
    return values.length > 0 ? values[0] : '';
  };

  const processWidgetFlow = (action: string | undefined, isFollowUpButton: boolean = false): boolean => {
    if (!action || action === 'text') {
      return false;
    }

    const flows = widgetConfig?.greeting_message?.flows || [];
    const flow = flows.find((candidate: any) => candidate.trigger === action);

    if (!flow) {
      return false;
    }

    const responses = flow.responses || [];

    responses.forEach((response: any, index: number) => {
      const responseText = getLocalizedText(response.text);

      if (responseText || (response.buttons && response.buttons.length > 0)) {
        // Add flow response as a grouped object with text and buttons
        setFlowResponses((prev: any[]) => [...prev, {
          text: responseText || '',
          buttons: response.buttons || [],
          timestamp: Date.now()
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

    // Immediately add the user message to the UI
    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      text: message,
      from: 'user',
      timestamp: Date.now()
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
          content: message,
          locale: locale,
        }),
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Reload all messages from the server to keep them in sync (this will replace the temp message)
        await loadSessionMessages(sessionId, authToken);
      } else {
        // If session expired, clear it and show error
        if (data.detail?.toLowerCase().includes('expired') || data.detail?.toLowerCase().includes('session')) {
          localStorage.removeItem(getSessionStorageKey());
          setError(t.sessionOrAuthError);
        } else {
          setError(data.detail || t.failedToSendMessage);
        }
        // Remove the temporary message and re-add the input since the API call failed
        setMessages(prev => prev.filter(m => m.id !== userMessage.id));
        setInput(message);
      }
    } catch (err) {
      setError(t.networkError);
      console.error('Message send error:', err);
      // Remove the temporary message and re-add the input since the API call failed
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      setInput(message);
    } finally {
      setIsTyping(false);
    }
  };

  const handleFollowUpButtonClick = (button: any) => {
    if (!sessionId || !authToken) return;

    const maybeText = getLocalizedText(button.response?.text);
    const maybeButtons = button.response?.buttons || [];

    // Add response as a grouped flow response
    if (maybeText || maybeButtons.length > 0) {
      setFlowResponses((prev: any[]) => [...prev, {
        text: maybeText || '',
        buttons: maybeButtons,
        timestamp: Date.now()
      }]);
    }

    const flowHandled = processWidgetFlow(button.action, true);

    if (!flowHandled) {
      handleSubmit(new Event('submit') as any, button.action);
    }
  };

  const handleInteractionButtonClick = async (button: any) => {
    if (!sessionId || !authToken) return;

    const maybeText = getLocalizedText(button.response?.text);
    const maybeButtons = button.response?.buttons || [];


    if (maybeText || maybeButtons.length > 0) {
      setIsTyping(true);
      setTimeout(() => {
        // Add as grouped flow response instead of separate message
        setFlowResponses((prev: any[]) => [...prev, {
          text: maybeText || '',
          buttons: maybeButtons,
          timestamp: Date.now()
        }]);
        setIsTyping(false);
      }, 300);
    }

    const flowHandled = processWidgetFlow(button.action);

    if (!maybeText && !flowHandled) {
      handleSubmit(new Event('submit') as any, button.action);
    }
  };

  const loadSessionMessages = async (sessionId: string, token: string, isInitial: boolean = false) => {
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
              from: msg.sender as 'user' | 'assistant',
              timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now()
            }));

          setMessages(loadedMessages);

          // Only set initial load flag to false after first load
          if (isInitial) {
            setIsInitialLoad(false);
          }
        }
      }
    } catch (err) {
      console.error('Error loading session messages:', err);
    } finally {
      setIsTyping(false);
    }
  };

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const newCollapsed = !prev;

      // Notify parent window about collapse state change
      if (window.parent !== window) {
        window.parent.postMessage(
          {
            type: newCollapsed ? 'WIDGET_MINIMIZE' : 'WIDGET_RESTORE',
            data: { collapsed: newCollapsed }
          },
          '*'
        );
      }

      return newCollapsed;
    });
  };


  if (!widgetConfig) {
    return null; // Wait for widget config to load before rendering anything
  }

  if (!shouldRender) {
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
      showFeedbackDialog={showFeedbackDialog}
      feedbackDialog={
        showFeedbackDialog && sessionId && authToken ? (
          <FeedbackDialog
            sessionId={sessionId}
            authToken={authToken}
            primaryColor={widgetConfig?.primary_color || '#111827'}
            backgroundColor={widgetConfig?.background_color || '#ffffff'}
            textColor={widgetConfig?.text_color || '#1f2937'}
            borderRadius={widgetConfig?.border_radius || 8}
            onSubmit={handleFeedbackSubmit}
            onSkip={handleFeedbackSkip}
          />
        ) : undefined
      }
    />
  );
}
