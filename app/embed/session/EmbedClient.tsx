'use client';

/* eslint-disable @typescript-eslint/no-explicit-any */

import { useEffect, useState, useCallback } from 'react';
import EmbedShell from '../../../components/EmbedShell';
import { useWidgetAuth } from '../../../hooks/useWidgetAuth';
import { useWidgetTranslation } from '../../../hooks/useWidgetTranslation';
import FeedbackDialog from '../../../components/FeedbackDialog';
import {
  createSessionError,
  createNetworkError,
  createAuthError,
  retryWithBackoff,
  logError,
  parseApiError,
  WidgetErrorCode,
  isNetworkError,
} from '../../../lib/errorHandling';
import { API } from '../../../lib/api';

type SourceData = {
  type: string;
  title: string;
  snippet?: string;
  url?: string;
  reference_id?: string;
};

type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
  timestamp?: number;
  hasFeedback?: boolean;
  sources?: SourceData[];
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
  // Branding
  logo?: string;
  bot_avatar?: string;
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
  // Positioning
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  edge_offset?: number;
};

const getButtonPixelSize = (buttonSize: string) => {
  const sizeMap = {
    sm: 100,
    md: 128,
    lg: 160
  };
  return sizeMap[buttonSize as keyof typeof sizeMap] || 56;
};

type EmbedClientProps = {
  clientId: string;
  assistantId: string;
  configId: string;
  locale: string;
  startOpen: boolean;
  pagePath?: string;
};

export default function EmbedClient({
  clientId: initialClientId,
  assistantId: initialAssistantId,
  configId: initialConfigId,
  locale: initialLocale,
  startOpen: initialStartOpen,
  pagePath: initialPagePath
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
  const [messageFeedbackSubmitted, setMessageFeedbackSubmitted] = useState<Set<string>>(new Set());
  const [unsureMessages, setUnsureMessages] = useState<Array<{userMessage: string, assistantMessage: string, timestamp: number}>>([]);
  const [showUnsureModal, setShowUnsureModal] = useState(false);

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

  // Helper function to get current page context
  const getPageContext = () => {
    try {
      const isEmbedded = (() => {
        try {
          return window.top !== window.self;
        } catch {
          return true;
        }
      })();

      // If embedded, use document.referrer as the host page URL
      if (isEmbedded && document.referrer) {
        try {
          const referrerUrl = new URL(document.referrer);
          return {
            url: document.referrer,
            pathname: referrerUrl.pathname,
            title: null,    // Still not available from referrer
            referrer: document.referrer
          };
        } catch (e) {
          // If referrer is not a valid URL, fall back
          return {
            url: document.referrer,
            pathname: null,
            title: null,
            referrer: document.referrer
          };
        }
      }

      // Not embedded, or no referrer: use widget's own location
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        title: document.title,
        referrer: document.referrer || null,
      };
    } catch (e) {
      // Fallback if accessing document fails (e.g., in iframe restrictions)
      return {
        url: window.location.href,
        pathname: window.location.pathname,
        title: 'Unknown Page',
        referrer: null,
      };
    }
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
      logError(e as Error, { context: 'getStoredSession', clientId: initialClientId });
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
      logError(e as Error, { context: 'storeSession', sessionId, clientId: initialClientId });
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
      getAuthToken(clientIdParam).then(async (token) => {
        if (token) {
          try {
            // Validate assistant exists
            await fetchAssistantDetails(assistantIdParam, token);

            // Validate config exists if provided
            if (configIdParam) {
              await fetchWidgetConfig(configIdParam, token);
            }

            // Try to restore existing session first
            const storedSession = getStoredSession();
            if (storedSession) {
              validateAndRestoreSession(storedSession.sessionId, assistantIdParam, token);
            } else {
              createSession(assistantIdParam, token);
            }
          } catch (err) {
            // If validation fails, set error
            const errorMessage = (err as any)?.userMessage || t.failedToLoadWidget;
            setError(errorMessage);
            logError(err, { clientId: clientIdParam, assistantId: assistantIdParam, configId: configIdParam, action: 'validateWidget' });
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

  // Send initial widget size and positioning to parent when config is loaded
  useEffect(() => {
    if (widgetConfig && window.parent !== window) {
      const positionData = {
        position: widgetConfig.position || 'bottom-right',
        edge_offset: widgetConfig.edge_offset || 20
      };

      if (isCollapsed) {
        // Send button size when collapsed
        const buttonSize = getButtonPixelSize(widgetConfig.button_size || 'md');
        window.parent.postMessage(
          {
            type: 'WIDGET_RESIZE',
            data: {
              width: buttonSize,
              height: buttonSize,
              ...positionData
            }
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
            data: {
              width,
              height,
              ...positionData
            }
          },
          '*'
        );
      }
    }
  }, [widgetConfig, isCollapsed]);

  const createSession = async (assistant: string, token: string) => {
    try {
      const visitorId = getVisitorId();

      const sessionData = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000);

          try {
            const response = await fetch(API.sessions(), {
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
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            let data;
            try {
              data = await response.json();
            } catch (parseError) {
              throw createSessionError(
                'Invalid response from session server',
                WidgetErrorCode.SESSION_CREATE_FAILED
              );
            }

            if (!response.ok) {
              const errorMessage = parseApiError(data, 'Failed to create session');

              if (response.status >= 500) {
                throw createNetworkError(
                  errorMessage,
                  WidgetErrorCode.NETWORK_SERVER_ERROR
                );
              }

              throw createSessionError(
                errorMessage,
                WidgetErrorCode.SESSION_CREATE_FAILED
              );
            }

            if (data.status !== 'success' || !data.data?.session_id) {
              throw createSessionError(
                'Invalid session response format',
                WidgetErrorCode.SESSION_CREATE_FAILED
              );
            }

            return data.data;
          } catch (fetchError: any) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
              throw createNetworkError(
                'Session creation timed out',
                WidgetErrorCode.NETWORK_TIMEOUT
              );
            }

            throw fetchError;
          }
        },
        {
          maxRetries: 3,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            logError(error, { assistant, attempt, action: 'createSession' });
          },
        }
      );

      setSessionId(sessionData.session_id);
      setError(null);

      // Store session data in localStorage
      if (sessionData.expires_at) {
        storeSession(sessionData.session_id, sessionData.expires_at);
      }

      // Load messages after session creation
      await loadSessionMessages(sessionData.session_id, token, true);
    } catch (err: any) {
      const errorMessage = err.userMessage || t.failedToCreateSession;
      setError(errorMessage);
      logError(err, { assistant, action: 'createSession' });

      // Notify parent window of error
      if (window.parent !== window) {
        window.parent.postMessage(
          { type: 'WIDGET_ERROR', data: { message: errorMessage } },
          '*'
        );
      }
    }
  };

  const validateAndRestoreSession = async (sessionId: string, assistantId: string, token: string) => {
    try {
      const response = await fetch(API.sessionMessages(sessionId), {
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

          // Check if we should show feedback
          if (loadedMessages.length > 0 && !feedbackSubmitted) {
            checkFeedbackStatus(sessionId, token);
          }

          return;
        }
      }

      // Session invalid or not found, create new one
      logError(new Error('Session validation failed'), {
        sessionId,
        assistantId,
        status: response.status
      });
      localStorage.removeItem(getSessionStorageKey());
      await createSession(assistantId, token);
    } catch (err) {
      logError(err, { sessionId, assistantId, action: 'validateAndRestoreSession' });
      // On error, create new session
      localStorage.removeItem(getSessionStorageKey());
      await createSession(assistantId, token);
    }
  };

  const fetchAssistantDetails = async (assistantId: string, token: string) => {
    try {
      const response = await fetch(API.assistant(assistantId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.status === 'success' && data.data?.name) {
          setAssistantName(data.data.name);
        } else {
          throw createAuthError('Invalid assistant response', WidgetErrorCode.AUTH_TOKEN_FAILED);
        }
      } else {
        const errorMessage = `Assistant not found or access denied (${response.status})`;
        throw createAuthError(errorMessage, WidgetErrorCode.AUTH_TOKEN_FAILED);
      }
    } catch (err) {
      logError(err, { assistantId, action: 'fetchAssistantDetails' });
      throw err; // Re-throw so it can be caught by the caller
    }
  };

  const fetchWidgetConfig = async (configId: string, token: string) => {
    try {
      const response = await fetch(API.widgetConfig(configId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorMessage = `Widget config not found or access denied (${response.status})`;
        throw createAuthError(errorMessage, WidgetErrorCode.INVALID_CONFIG);
      }

      const data = await response.json();

      if (data.status === 'success' && data.data) {
        console.log('Widget config loaded:', data.data);
        console.log('Logo URL:', data.data.logo);
        console.log('Bot avatar URL:', data.data.bot_avatar);
        setWidgetConfig(data.data);
      } else {
        throw createAuthError('Invalid config response format', WidgetErrorCode.INVALID_CONFIG);
      }
    } catch (err) {
      logError(err, { configId, action: 'fetchWidgetConfig' });
      throw err; // Re-throw so it can be caught by the caller
    }
  };

  const checkFeedbackStatus = async (sessionId: string, token: string) => {
    try {
      const response = await fetch(API.sessionFeedback(sessionId), {
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

  const handleSubmitMessageFeedback = async (messageId: string, feedbackType: string = 'incorrect') => {
    if (!authToken) return;

    try {
      const response = await fetch(API.messageFeedback(messageId), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          feedback_type: feedbackType,
        }),
      });

      if (response.ok) {
        setMessageFeedbackSubmitted((prev) => new Set(prev).add(messageId));
        // Show success toast if available
      } else {
        const errorText = await response.text();
        console.error('Failed to submit message feedback:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
      }
    } catch (error) {
      console.error('Error submitting message feedback:', error);
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
      const errorMsg = t.sessionOrAuthError || 'Session or authentication error';
      setError(errorMsg);
      logError(new Error('Missing session or auth token'), {
        hasSession: !!sessionId,
        hasAuth: !!authToken
      });
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
      const messageData = await retryWithBackoff(
        async () => {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 30000);

          try {
            const response = await fetch(API.sessionMessages(sessionId), {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`,
              },
              body: JSON.stringify({
                content: message,
                locale: locale,
                page_context: getPageContext(),
              }),
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            let data;
            try {
              data = await response.json();
            } catch (parseError) {
              throw new Error('Invalid response from message server');
            }

            if (!response.ok) {
              const errorMessage = parseApiError(data, 'Failed to send message');

              // Check if session expired
              if (response.status === 401 || response.status === 404 ||
                  errorMessage.toLowerCase().includes('expired') ||
                  errorMessage.toLowerCase().includes('not found')) {
                localStorage.removeItem(getSessionStorageKey());
                throw createSessionError(
                  errorMessage,
                  WidgetErrorCode.SESSION_EXPIRED
                );
              }

              if (response.status >= 500) {
                throw createNetworkError(
                  errorMessage,
                  WidgetErrorCode.NETWORK_SERVER_ERROR
                );
              }

              throw new Error(errorMessage);
            }

            if (data.status !== 'success') {
              throw new Error(parseApiError(data, 'Failed to send message'));
            }

            return data.data;
          } catch (fetchError: any) {
            clearTimeout(timeoutId);

            if (fetchError.name === 'AbortError') {
              throw createNetworkError(
                'Message send timed out',
                WidgetErrorCode.NETWORK_TIMEOUT
              );
            }

            throw fetchError;
          }
        },
        {
          maxRetries: 2,
          initialDelay: 1000,
          onRetry: (attempt, error) => {
            logError(error, { message, attempt, action: 'sendMessage' });
          },
        }
      );

      // Check if assistant was unsure
      if (messageData?.assistant_message?.metadata?.assistant_unsure) {
        const userMsg = messageData.user_message?.content || message;
        const assistantMsg = messageData.assistant_message?.content || '';
        setUnsureMessages(prev => [...prev, {
          userMessage: userMsg,
          assistantMessage: assistantMsg,
          timestamp: Date.now()
        }]);
      }

      // Reload all messages from server
      await loadSessionMessages(sessionId, authToken);
    } catch (err: any) {
      const errorMessage = err.userMessage || err.message || t.failedToSendMessage;
      setError(errorMessage);
      logError(err, { message, sessionId, action: 'handleSubmit' });

      // Remove temp message and restore input
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      setInput(message);

      // Check if session expired
      if (err.code === WidgetErrorCode.SESSION_EXPIRED) {
        setSessionId(null);
      }
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
      const response = await fetch(API.sessionMessages(sessionId), {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to load messages: ${response.status}`);
      }

      const data = await response.json();

      if (data.status === 'success' && Array.isArray(data.data?.messages)) {
        // Convert API messages to widget message format
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
            timestamp: msg.created_at ? new Date(msg.created_at).getTime() : Date.now(),
            sources: msg.sources || [],  // Include sources from API
          }));

        setMessages(loadedMessages);

        // Only set initial load flag to false after first load
        if (isInitial) {
          setIsInitialLoad(false);
        }
      } else {
        throw new Error('Invalid messages response format');
      }
    } catch (err) {
      logError(err, { sessionId, isInitial, action: 'loadSessionMessages' });
      // Non-critical error for non-initial loads
      if (isInitial) {
        setError('Failed to load conversation history');
      }
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
      messageFeedbackSubmitted={messageFeedbackSubmitted}
      onSubmitMessageFeedback={handleSubmitMessageFeedback}
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
      unsureModal={
        showUnsureModal ? (
          <UnsureMessagesModal
            messages={unsureMessages}
            onClose={() => setShowUnsureModal(false)}
            primaryColor={widgetConfig?.primary_color || '#111827'}
            backgroundColor={widgetConfig?.background_color || '#ffffff'}
            textColor={widgetConfig?.text_color || '#1f2937'}
            borderRadius={widgetConfig?.border_radius || 8}
          />
        ) : undefined
      }
      unsureMessages={unsureMessages}
      onShowUnsureModal={() => setShowUnsureModal(true)}
    />
  );
}
type UnsureMessagesModalProps = {
  messages: Array<{userMessage: string, assistantMessage: string, timestamp: number}>;
  onClose: () => void;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
};

function UnsureMessagesModal({ messages, onClose, primaryColor, backgroundColor, textColor, borderRadius }: UnsureMessagesModalProps) {
  return (
    <div
      className="rounded-lg shadow-lg max-h-[80vh] overflow-hidden"
      style={{ backgroundColor, color: textColor, borderRadius: `${borderRadius}px` }}
    >
      <div
        className="p-4 border-b"
        style={{ borderColor: primaryColor }}
      >
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-semibold">Assistant Uncertainty Log</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl leading-none"
          >
            ×
          </button>
        </div>
        <p className="text-sm text-gray-600 mt-1">
          Messages where the assistant indicated uncertainty:
        </p>
      </div>

      <div className="p-4 max-h-96 overflow-y-auto">
        {messages.length === 0 ? (
          <p className="text-gray-500 text-center py-4">No uncertain responses yet.</p>
        ) : (
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className="border rounded p-3" style={{ borderColor: primaryColor + "20" }}>
                <div className="mb-2">
                  <span className="text-xs text-gray-500">User:</span>
                  <p className="text-sm mt-1">{msg.userMessage}</p>
                </div>
                <div>
                  <span className="text-xs text-gray-500">Assistant:</span>
                  <p className="text-sm mt-1 italic">{msg.assistantMessage}</p>
                </div>
                <div className="text-xs text-gray-400 mt-2">
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="p-4 border-t" style={{ borderColor: primaryColor + "20" }}>
        <button
          onClick={onClose}
          className="w-full py-2 px-4 rounded text-white hover:opacity-90"
          style={{ backgroundColor: primaryColor, borderRadius: `${borderRadius}px` }}
        >
          Close
        </button>
      </div>
    </div>
  );
}
