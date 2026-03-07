/* eslint-disable @typescript-eslint/no-unused-vars, react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState, useRef } from 'react';
import EmbedShell from '../../../components/EmbedShell';
import { useWidgetAuth } from '../../../hooks/useWidgetAuth';
import { useWidgetTranslation } from '../../../hooks/useWidgetTranslation';
import { getLocaleDirection } from '../../../lib/i18n';
import type {
  Message,
  WidgetConfig,
  FlowResponse,
  FlowButton,
  Flow,
  SourceData,
} from '../../../types/widget';
import { logPerf } from '../../../lib/logger';
import { trackEvent } from '../../../lib/api';
import FeedbackDialog from '../../../components/FeedbackDialog';
import {
  createSessionError,
  createNetworkError,
  createAuthError,
  retryWithBackoff,
  logError,
  parseApiError,
  WidgetErrorCode,
} from '../../../lib/errorHandling';
import { API } from '../../../lib/api';
import { EMBED_EVENTS, targetOrigin } from '../../../lib/embedConstants';
import * as helpers from './helpers';
import { onInitConfig } from './events';

// helpers exposed so tests can call them directly
export function injectCustomAssets(css?: string) {
  try {
    if (css) {
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    }
  } catch (err) {
    logError(err as Error, { action: 'injectCustomAssets', css });
  }
}

export function applyCustomAssetsFromQuery(search?: string) {
  try {
    const src = search ?? window.location.search;
    const params = new URLSearchParams(src);
    const css = params.get('customCss');
    if (css) {
      injectCustomAssets(css ? decodeURIComponent(css) : undefined);
    }
  } catch (err) {
    console.error('[widget] applyCustomAssetsFromQuery error', err);
  }
}



export const getButtonPixelSize = (buttonSize: string) => {
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
  parentOrigin?: string;
  /**
   * test-only: forcibly display the feedback dialog regardless of timer state
   */
  showFeedbackDialogOverride?: boolean;
};

export default function EmbedClient({
  clientId: initialClientId,
  assistantId: initialAssistantId,
  configId: initialConfigId,
  locale: initialLocale,
  startOpen: initialStartOpen,
  pagePath: _initialPagePath,
  parentOrigin: initialParentOrigin,
  showFeedbackDialogOverride,
}: EmbedClientProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [flowResponses, setFlowResponses] = useState<FlowResponse[]>([]);

  // measure mount/render time
  const mountStart = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  useEffect(() => {
    const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - mountStart.current;
  }, []);

  // debug and perform custom css/js injection on mount
  useEffect(() => {
    applyCustomAssetsFromQuery();
  }, []);


  // precompute storage keys for this widget instance
  const sessionStorageKey = helpers.sessionStorageKey(initialClientId, initialAssistantId);
  const unreadStorageKey = helpers.unreadStorageKey(initialClientId, initialAssistantId);
  const lastReadStorageKey = helpers.lastReadStorageKey(initialClientId, initialAssistantId);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(true);

  // emit initial open/close telemetry when widget mounts, but only once per
  // browser session; reloading the page should not produce duplicate open/close
  // events. We use a storage key unique to the client+assistant combo.
  useEffect(() => {
    const initKey = `companin-telemetry-init-${initialClientId}-${initialAssistantId}`;
    // if we've already sent the initial event, do nothing
    let alreadySent = false;
    try {
      alreadySent = !!localStorage.getItem(initKey);
    } catch (err) {
      logError(err as Error, { context: 'initialTelemetry' });
    }
    if (alreadySent) {
      return;
    }

    const initialEvent = initialStartOpen ? 'widget_open' : 'widget_close';
    trackEvent(initialEvent, initialAssistantId, {}, initialClientId).catch(() => {});

    try {
      localStorage.setItem(initKey, '1');
    } catch (error) {
      // record failure but don't crash the widget
      logError(error as Error, { context: 'initialTelemetry' });
    }
  }, [initialAssistantId, initialClientId, initialStartOpen]);
  const { getAuthToken, authToken, authError } = useWidgetAuth();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isEmbedded, setIsEmbedded] = useState(false);
  const [assistantName, setAssistantName] = useState<string>('');
  const [isMobile, setIsMobile] = useState(false);
  const [widgetConfig, setWidgetConfig] = useState<WidgetConfig | null>(null);
  const [shouldRender, setShouldRender] = useState(true);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const { translations: t, locale: hookLocale } = useWidgetTranslation();
  const activeLocale = initialLocale || hookLocale || 'en';
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [lastMessageTimestamp, setLastMessageTimestamp] = useState<number>(0);
  const [messageFeedbackSubmitted, setMessageFeedbackSubmitted] = useState<Set<string>>(new Set());
  const [unsureMessages, setUnsureMessages] = useState<Array<{userMessage: string, assistantMessage: string, timestamp: number}>>([]);
  const [showUnsureModal, setShowUnsureModal] = useState(false);
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [lastReadMessageId, setLastReadMessageId] = useState<string | null>(null);
  const postedShowUnreadBadge = useRef<boolean | undefined>(undefined);
  const [fatalError, setFatalError] = useState<string | null>(null);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.lang = activeLocale;
      document.documentElement.dir = getLocaleDirection(activeLocale);
    }
  }, [activeLocale]);




  useEffect(() => {
    // Listen for initial config posted from the host page (embed script)
    const { remove } = onInitConfig((data) => {
      // Store the posted show_unread_badge flag so it persists across API config loads
      if (typeof data.showUnreadBadge !== 'undefined') {
        postedShowUnreadBadge.current = Boolean(data.showUnreadBadge);

        // Apply it immediately if config already exists
        setWidgetConfig((prev) => {
          if (!prev) return prev;
          return { ...prev, show_unread_badge: postedShowUnreadBadge.current } as WidgetConfig;
        });
      }
    });
    return remove;
  }, []);

  // When auth fails before any config loads, surface it as a fatal error
  // so the widget renders a visible error instead of staying invisible.
  useEffect(() => {
    if (authError && !widgetConfig) {
      setFatalError(authError);
        try {
          if (window.parent !== window) {
            window.parent.postMessage({ type: EMBED_EVENTS.AUTH_FAILURE, data: { message: authError } }, targetOrigin(initialParentOrigin));
          }
        } catch (e) {
          // ignore
        }
    }
  }, [authError, widgetConfig]);

  // Detect mobile device
  useEffect(() => {
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
      const stored = helpers.getStoredSession(sessionStorageKey);
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
      getAuthToken(clientIdParam, initialParentOrigin).then(async (token) => {
        if (token) {
          try {
            // Validate assistant exists
            await fetchAssistantDetails(assistantIdParam, token);

            // Validate config exists if provided
            if (configIdParam) {
              await fetchWidgetConfig(configIdParam, token);
            }

            // Try to restore existing session first
            const storedSession = helpers.getStoredSession(sessionStorageKey);
            if (storedSession) {
              validateAndRestoreSession(storedSession.sessionId, assistantIdParam, token);
            } else {
              createSession(assistantIdParam, token);
            }
          } catch (err: unknown) {
            // If validation fails, set error
            const errorMessage = (err as { userMessage?: string })?.userMessage || String(t.failedToLoadWidget);
            setError(errorMessage);
            logError(err as Error, { clientId: clientIdParam, assistantId: assistantIdParam, configId: configIdParam, action: 'validateWidget' });
          }
        } else {
          // getAuthToken returned null — authError will be set by the hook.
          // The useEffect below watches authError and sets fatalError.
        }
      });
    }

    // Detect iframe embedding and render a stripped layout when embedded
    try {
      setIsEmbedded(window.top !== window);
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

  // Load unread count and last read message from localStorage on mount
  useEffect(() => {
    try {
      const storedUnread = localStorage.getItem(unreadStorageKey);
      const storedLastRead = localStorage.getItem(lastReadStorageKey);

      if (storedUnread) {
        setUnreadCount(parseInt(storedUnread, 10) || 0);
      }
      if (storedLastRead) {
        setLastReadMessageId(storedLastRead);
      }
    } catch (error) {
      logError(error as Error, { context: 'loadUnreadCount' });
    }
  }, []);

  // Track unread messages when new assistant messages arrive and widget is collapsed
  useEffect(() => {
    // Only track unread if the feature is enabled
    const showUnreadBadge = widgetConfig?.show_unread_badge ?? true; // Default to true

    if (!showUnreadBadge) {
      return;
    }

    if (isCollapsed && messages.length > 0) {
      // Get the last assistant message
      const lastMessage = messages[messages.length - 1];

      if (lastMessage?.from === 'assistant' && lastMessage?.id) {
        // Only count as unread if this message is after the last read message
        if (!lastReadMessageId || lastMessage.id !== lastReadMessageId) {
          // Count unread assistant messages after the last read message
          const lastReadIndex = lastReadMessageId
            ? messages.findIndex(m => m.id === lastReadMessageId)
            : -1;

          const unreadMessages = messages.filter((m, idx) =>
            m.from === 'assistant' &&
            idx > lastReadIndex &&
            !m.id.startsWith('greeting-') // Don't count greeting messages
          );

          const newUnreadCount = unreadMessages.length;
          setUnreadCount(newUnreadCount);

          // Persist to localStorage
          try {
            localStorage.setItem(unreadStorageKey, newUnreadCount.toString());
          } catch (error) {
            logError(error as Error, { context: 'saveUnreadCount' });
          }
        }
      }
    }
  }, [messages, isCollapsed, lastReadMessageId, widgetConfig?.show_unread_badge]);
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
            type: EMBED_EVENTS.RESIZE,
            data: {
              width: buttonSize,
              height: buttonSize,
              ...positionData
            }
          },
          targetOrigin(initialParentOrigin)
        );
      } else {
        // Send widget size when expanded
        const width = widgetConfig.widget_width || 400;
        const height = widgetConfig.widget_height || 600;
        window.parent.postMessage(
          {
            type: EMBED_EVENTS.RESIZE,
            data: {
              width,
              height,
              ...positionData
            }
          },
          targetOrigin(initialParentOrigin)
        );
      }
    }
  }, [widgetConfig, isCollapsed]);

  const createSession = async (assistant: string, token: string) => {
    try {
      const visitorId = helpers.getVisitorId(initialClientId);

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
                  locale: activeLocale,
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
          } catch (fetchError: unknown) {
            clearTimeout(timeoutId);

            const fe = fetchError as unknown as { name?: string };

            if (fe.name === 'AbortError') {
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
        helpers.storeSession(sessionStorageKey, sessionData.session_id, sessionData.expires_at);
      }

      // Load messages after session creation
      await loadSessionMessages(sessionData.session_id, token, true);
    } catch (err: unknown) {
      const e = err as unknown as { userMessage?: string; message?: string };
      const errorMessage = e.userMessage || String(t.failedToCreateSession);
      setError(errorMessage);
      logError(e, { assistant, action: 'createSession' });

      // Notify parent window of error
      if (window.parent !== window) {
        window.parent.postMessage(
          { type: EMBED_EVENTS.ERROR, data: { message: errorMessage } },
          targetOrigin(initialParentOrigin)
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
          type ApiMessage = {
            sender: 'user' | 'assistant';
            id: string;
            content: string;
            created_at?: string;
          };

          const loadedMessages: Message[] = data.data.messages
            .filter((msg: unknown): msg is ApiMessage => {
              const apiMsg = msg as ApiMessage;
              if (apiMsg.sender === 'assistant') {
                const userMessages = data.data.messages.filter((m2: unknown) => (m2 as ApiMessage).sender === 'user');
                return userMessages.length > 0;
              }
              return true;
            })
            .map((apiMsg: ApiMessage) => ({
              id: apiMsg.id,
              text: apiMsg.content,
              from: apiMsg.sender,
              timestamp: apiMsg.created_at ? new Date(apiMsg.created_at).getTime() : Date.now()
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
      localStorage.removeItem(sessionStorageKey);
      await createSession(assistantId, token);
    } catch (err) {
      logError(err, { sessionId, assistantId, action: 'validateAndRestoreSession' });
      // On error, create new session
      localStorage.removeItem(sessionStorageKey);
      await createSession(assistantId, token);
    }
  };

  const fetchAssistantDetails = async (assistantId: string, token: string) => {
    const start = Date.now();
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
    } finally {
      const duration = Date.now() - start;
      logPerf('fetchAssistantDetails', duration, { assistantId });
    }
  };

  const fetchWidgetConfig = async (configId: string, token: string) => {
    const start = Date.now();
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

        // Merge posted show_unread_badge if it was set via embed snippet
        const configData = { ...data.data };
        if (typeof postedShowUnreadBadge.current !== 'undefined') {
          configData.show_unread_badge = postedShowUnreadBadge.current;
        }
        setWidgetConfig(configData);
      } else {
        throw createAuthError('Invalid config response format', WidgetErrorCode.INVALID_CONFIG);
      }
    } catch (err) {
      logError(err, { configId, action: 'fetchWidgetConfig' });
      throw err; // Re-throw so it can be caught by the caller
    } finally {
      const duration = Date.now() - start;
      logPerf('fetchWidgetConfig', duration, { configId });
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

  const handleFeedbackSubmit = (rating: string, comment: string) => {
    // telemetry for feedback given includes rating/comment metadata
    trackEvent(
      'feedback_given',
      initialAssistantId,
      { rating, comment },
      initialClientId,
    ).catch(() => {});
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

  const getLocalizedText = (textObj: { [lang: string]: string } | string | undefined): string => {
    if (textObj == null) return '';
    if (typeof textObj === 'string') return textObj;

    // Priority: user's locale -> widget's default language -> English -> first available
    const userLocale = activeLocale || 'en';
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
    const flow = flows.find((candidate: Flow) => candidate.trigger === action);

    if (!flow) {
      return false;
    }

    const responses: (Flow['responses'] extends Array<infer R> ? R : never)[] = flow.responses || [];
    type RawFlowResp = (Flow['responses'] extends Array<infer R> ? R : never);

    responses.forEach((response: RawFlowResp, index: number) => {
      const responseText = getLocalizedText(response.text as unknown as { [k: string]: string } | string | undefined);

      if (responseText || (response.buttons && response.buttons.length > 0)) {
        // Add flow response as a grouped object with text and buttons
        setFlowResponses((prev: FlowResponse[]) => [...prev, {
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
      const errorMsg = String(t.sessionOrAuthError) || 'Session or authentication error';
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

    // Notify parent about the sent message
    try {
      if (window.parent !== window) {
        window.parent.postMessage({ type: EMBED_EVENTS.MESSAGE, data: userMessage }, targetOrigin(initialParentOrigin));
      }
    } catch (e) {
      // ignore
    }

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
                locale: activeLocale,
                page_context: helpers.getPageContext(),
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
                localStorage.removeItem(sessionStorageKey);
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

            // record telemetry for message sent
            trackEvent('message_sent', initialAssistantId, { message }, initialClientId).catch(() => {});

            return data.data;
          } catch (fetchError: unknown) {
            clearTimeout(timeoutId);

            const fe = fetchError as unknown as { name?: string };
            if (fe.name === 'AbortError') {
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
    } catch (err: unknown) {
      const e = err as unknown as { userMessage?: string; message?: string; code?: string | WidgetErrorCode };
      const errorMessage = e.userMessage || e.message || String(t.failedToSendMessage);
      setError(errorMessage);
      logError(e, { message, sessionId, action: 'handleSubmit' });

      // Remove temp message and restore input
      setMessages(prev => prev.filter(m => m.id !== userMessage.id));
      setInput(message);

      // Check if session expired
      if (e.code === WidgetErrorCode.SESSION_EXPIRED) {
        setSessionId(null);
      }
    } finally {
      setIsTyping(false);
    }
  };

  const handleFollowUpButtonClick = (button: FlowButton) => {
    if (!sessionId || !authToken) return;

    const maybeText = getLocalizedText(button.response?.text);
    const maybeButtons = button.response?.buttons || [];
    const labelText = getLocalizedText(button.label) || (typeof button.label === 'string' ? button.label : (button.label?.en || ''));

    // Add response as a grouped flow response
    if (maybeText || maybeButtons.length > 0) {
      setFlowResponses((prev: FlowResponse[]) => [...prev, {
        text: maybeText || '',
        buttons: maybeButtons,
        timestamp: Date.now()
      }]);
    }

    const flowHandled = processWidgetFlow(button.action, true);

    // If the flow was handled client-side, notify parent about the interaction
    if (flowHandled) {
      try {
        if (window.parent !== window) {
          const userMessage = {
            id: `temp-${Date.now()}`,
            text: labelText || maybeText || button.action || '',
            from: 'user',
            timestamp: Date.now(),
          };
          window.parent.postMessage({ type: EMBED_EVENTS.MESSAGE, data: userMessage }, targetOrigin(initialParentOrigin));
        }
      } catch (e) {
        // ignore
      }
    }

    if (!flowHandled) {
      handleSubmit(new Event('submit') as unknown as React.FormEvent, button.action);
    }
  };

  const handleInteractionButtonClick = async (button: FlowButton) => {
    if (!sessionId || !authToken) return;

    const maybeText = getLocalizedText(button.response?.text);
    const maybeButtons = button.response?.buttons || [];
    const labelText = getLocalizedText(button.label) ||
      (typeof button.label === 'string' ? button.label : (button.label?.en || ''));

    // immediately add a user message bubble to the conversation
    const userMsg: Message = {
      id: `temp-${Date.now()}`,
      text: labelText || maybeText || '',
      from: 'user',
      timestamp: Date.now(),
    };
    setMessages(prev => [...prev, userMsg]);
    // always show a flow response when button is clicked
    setIsTyping(true);
    setTimeout(() => {
      setFlowResponses((prev: FlowResponse[]) => [...prev, {
        text: maybeText || labelText || '',
        buttons: maybeButtons,
        timestamp: Date.now()
      }]);
      setIsTyping(false);
    }, 300);

    const flowHandled = processWidgetFlow(button.action);
    // track interaction click
    trackEvent('button_clicked', initialAssistantId, { label: labelText }, initialClientId).catch(() => {});

    if (!maybeText && !flowHandled) {
      handleSubmit(new Event('submit') as unknown as React.FormEvent, button.action);
    }
    else {
      // also notify parent about the user message
      try {
        if (window.parent !== window) {
          const userMessage = {
            id: userMsg.id,
            text: userMsg.text,
            from: 'user',
            timestamp: userMsg.timestamp,
          };
          window.parent.postMessage({ type: EMBED_EVENTS.MESSAGE, data: userMessage }, targetOrigin(initialParentOrigin));
        }
      } catch (e) {
        // ignore
      }
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
        const loadedMessages: Message[] = (data.data.messages as unknown[])
          .filter((msg: unknown) => {
            // Filter out assistant greeting messages
            const m = msg as { sender?: string };
            if (m.sender === 'assistant') {
              const userMessages = (data.data.messages as unknown[]).filter(
                (m2: unknown) => (m2 as { sender?: string }).sender === 'user'
              );
              return userMessages.length > 0;
            }
            return true;
          })
          .map((msg: unknown) => {
            const m = msg as {
              id: string;
              content: string;
              sender: string;
              created_at?: string;
              sources?: unknown[];
            };
            return {
              id: m.id,
              text: m.content,
              from: m.sender as 'user' | 'assistant',
              timestamp: m.created_at ? new Date(m.created_at).getTime() : Date.now(),
              sources: (m.sources as SourceData[]) || [],  // Include sources from API
            };
          });

        setMessages(loadedMessages);

        // Notify parent window about the latest message(s)
        try {
          if (window.parent !== window) {
            const last = loadedMessages[loadedMessages.length - 1];
            if (last) {
              // Post a generic message event for the last message
              window.parent.postMessage({ type: EMBED_EVENTS.MESSAGE, data: last }, targetOrigin(initialParentOrigin));

              // If the last message is from assistant, also post a response event
              if (last.from === 'assistant') {
                window.parent.postMessage({ type: EMBED_EVENTS.RESPONSE, data: last }, targetOrigin(initialParentOrigin));
              }
            }
          }
        } catch (e) {
          // ignore
        }

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
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);

    // send telemetry whenever collapse state toggles
    trackEvent(
      newCollapsed ? 'widget_close' : 'widget_open',
      initialAssistantId,
      { clientId: initialClientId },
      initialClientId
    ).catch(() => {});

    // Reset unread count when opening the widget
    if (!newCollapsed) {
      setUnreadCount(0);

      // Update last read message to the most recent one
      if (messages.length > 0) {
        const lastMessage = messages[messages.length - 1];
        if (lastMessage?.id) {
          setLastReadMessageId(lastMessage.id);
          try {
            localStorage.setItem(lastReadStorageKey, lastMessage.id);
          } catch (error) {
            logError(error as Error, { context: 'saveLastRead' });
          }
        }
      }

      // Clear unread count from localStorage
      try {
        localStorage.setItem(unreadStorageKey, '0');
      } catch (error) {
        logError(error as Error, { context: 'clearUnreadCount' });
      }
    }

    // Notify parent window about collapse state change
    if (window.parent !== window) {
      window.parent.postMessage(
        {
          type: newCollapsed ? EMBED_EVENTS.MINIMIZE : EMBED_EVENTS.RESTORE,
          data: { collapsed: newCollapsed },
        },
        targetOrigin(initialParentOrigin)
      );
    }
  };


  if (fatalError) {
    return (
      <div style={{
        position: 'fixed',
        bottom: 0,
        right: 0,
        left: 0,
        background: '#fef2f2',
        border: '1px solid #fca5a5',
        borderRadius: '12px',
        padding: '16px',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontFamily: 'system-ui, -apple-system, sans-serif',
        zIndex: 999999,
        boxSizing: 'border-box',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
          <div style={{ flexShrink: 0, color: '#dc2626', marginTop: '2px' }}>
            <svg width="18" height="18" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: '0 0 4px 0', fontSize: '13px', fontWeight: 600, color: '#991b1b' }}>
              Widget unavailable
            </p>
            <p style={{ margin: 0, fontSize: '12px', color: '#6b7280', lineHeight: '1.5', wordBreak: 'break-word' }}>
              {fatalError}
            </p>
          </div>
        </div>
      </div>
    );
  }

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
      widgetConfig={widgetConfig as WidgetConfig}
      onInteractionButtonClick={handleInteractionButtonClick}
      onFollowUpButtonClick={handleFollowUpButtonClick}
      flowResponses={flowResponses}
      getLocalizedText={getLocalizedText}
      showFeedbackDialog={showFeedbackDialogOverride ?? showFeedbackDialog}
      messageFeedbackSubmitted={messageFeedbackSubmitted}
      onSubmitMessageFeedback={handleSubmitMessageFeedback}
      unreadCount={unreadCount}
      feedbackDialog={
        ((showFeedbackDialogOverride !== undefined ? showFeedbackDialogOverride : showFeedbackDialog) && (showFeedbackDialogOverride !== undefined ? true : (sessionId && authToken))) ? (
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
