'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeftIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from '@/components/ui/scroll-area'
import { useWidgetAuth } from '../../../hooks/useWidgetAuth'
import { useWidgetTranslation } from '../../../hooks/useWidgetTranslation'
import {
  MessageBranch,
  MessageBranchContent,
  MessageBranchNext,
  MessageBranchPage,
  MessageBranchPrevious,
  MessageBranchSelector,
} from "@/components/ai-elements/message"
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation"
import { Message, MessageContent } from "@/components/ai-elements/message"
import {
  PromptInput,
  PromptInputActionAddAttachments,
  PromptInputActionMenu,
  PromptInputActionMenuContent,
  PromptInputActionMenuTrigger,
  PromptInputAttachment,
  PromptInputAttachments,
  PromptInputBody,
  PromptInputButton,
  PromptInputFooter,
  PromptInputHeader,
  type PromptInputMessage,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
} from "@/components/ai-elements/prompt-input"
import {
  ModelSelector,
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector"
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning"
import { MessageResponse } from "@/components/ai-elements/message"
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources"
import { Suggestion, Suggestions } from "@/components/ai-elements/suggestion"
import { CheckIcon, GlobeIcon, MicIcon } from "lucide-react"
import { nanoid } from "nanoid"
import { toast } from "sonner"

type Props = {
  clientId: string;
  assistantId: string;
  configId: string;
  locale: string;
  startOpen: boolean;
  suggestions?: string[];
};

type MessageType = {
  key: string;
  from: "user" | "assistant";
  sources?: { href: string; title: string }[];
  versions: {
    id: string;
    content: string;
  }[];
  reasoning?: {
    content: string;
    duration: number;
  };
};

const initialMessages: MessageType[] = [
  {
    key: nanoid(),
    from: "assistant",
    versions: [
      {
        id: nanoid(),
        content: "Hello! I'm your documentation assistant. How can I help you today?",
      },
    ],
  },
];


const defaultSuggestions = [
  "How do I get started?",
  "What are the main features?",
  "Show me code examples",
  "Explain the API",
  "What are best practices?",
  "How do I troubleshoot issues?",
];

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1`;

export default function DocsClient({ clientId, assistantId, configId, locale: initialLocale, startOpen, suggestions }: Props) {
  const currentSuggestions = suggestions || defaultSuggestions;
  const [open, setOpen] = useState(startOpen);
  const [text, setText] = useState<string>("");
  const [status, setStatus] = useState<
    "submitted" | "streaming" | "ready" | "error"
  >("ready");
  const [messages, setMessages] = useState<MessageType[]>([]);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(
    null
  );
  const conversationEndRef = useRef<HTMLDivElement>(null);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const { getAuthToken, authToken, authError } = useWidgetAuth();
  const { translations: t, locale } = useWidgetTranslation();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [widgetConfig, setWidgetConfig] = useState<any>(null);

  const scrollToBottom = () => {
    if (conversationEndRef.current) {
      conversationEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
    // Also try scrolling the ScrollArea viewport
    if (scrollAreaRef.current) {
      const viewport = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (viewport) {
        viewport.scrollTop = viewport.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (open && messages.length > 0) {
      // Scroll to bottom when dialog opens and has messages with a longer delay
      setTimeout(() => scrollToBottom(), 300);
    }
  }, [open]);

  // Helper function to get localStorage key for this widget instance
  const getSessionStorageKey = () => {
    return `companin-docs-session-${clientId}-${assistantId}`;
  };

  // Helper function to get or create visitor ID
  const getVisitorId = () => {
    const visitorKey = `companin-visitor-${clientId}`;
    let visitorId = localStorage.getItem(visitorKey);
    if (!visitorId) {
      visitorId = `docs-widget-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
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


  // Create session
  const createSession = useCallback(async (token: string) => {
    try {
      const visitorId = getVisitorId();

      const requestBody = {
        assistant_id: assistantId,
        visitor_id: visitorId,
        locale: locale,
      };

      const response = await fetch(`${API_BASE_URL}/sessions/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
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
        const errorMsg = data.detail || 'Failed to create session';
        console.error('Session creation failed:', errorMsg);
        setError(errorMsg);
      }
    } catch (err) {
      const errorMsg = 'Network error: Unable to connect';
      console.error('Session creation error:', err);
      setError(errorMsg);
    }
  }, [assistantId, locale]);

  // Validate and restore existing session
  const validateAndRestoreSession = useCallback(async (sessionId: string, token: string) => {
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
          setSessionId(sessionId);
          setError(null);
          // Load messages
          const loadedMessages: MessageType[] = data.data.messages
            .filter((msg: any) => {
              if (msg.sender === 'assistant') {
                const userMessages = data.data.messages.filter((m: any) => m.sender === 'user');
                return userMessages.length > 0;
              }
              return true;
            })
            .map((msg: any) => ({
              key: msg.id,
              from: msg.sender as 'user' | 'assistant',
              versions: [{
                id: msg.id,
                content: msg.content
              }]
            }));
          setMessages(loadedMessages);
          setIsInitialLoad(false);
        } else {
          localStorage.removeItem(getSessionStorageKey());
          createSession(token);
        }
      } else {
        localStorage.removeItem(getSessionStorageKey());
        createSession(token);
      }
    } catch (err) {
      console.error('Session validation error:', err);
      localStorage.removeItem(getSessionStorageKey());
      createSession(token);
    }
  }, [createSession]);

  // Load session messages
  const loadSessionMessages = useCallback(async (sessionId: string, token: string, isNewSession = false) => {
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
          const loadedMessages: MessageType[] = data.data.messages
            .filter((msg: any) => {
              if (msg.sender === 'assistant') {
                const userMessages = data.data.messages.filter((m: any) => m.sender === 'user');
                return userMessages.length > 0;
              }
              return true;
            })
            .map((msg: any) => ({
              key: msg.id,
              from: msg.sender as 'user' | 'assistant',
              versions: [{
                id: msg.id,
                content: msg.content
              }]
            }));
          setMessages(loadedMessages);
          setIsInitialLoad(false);
        }
      }
    } catch (err) {
      console.error('Error loading messages:', err);
    }
  }, []);

  // Fetch widget config
  const fetchWidgetConfig = useCallback(async (configId: string, token: string) => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/widget-config/${configId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (response.ok) {
        setWidgetConfig(data);
      } else {
        console.error('Failed to fetch widget config:', data);
      }
    } catch (err) {
      console.error('Error fetching widget config:', err);
    }
  }, []);

  // Helper function to get localized text
  const getLocalizedText = (textObj: { [lang: string]: string } | undefined): string => {
    if (!textObj) return '';

    // Priority: user's locale -> English -> first available
    if (textObj[locale]) return textObj[locale];
    if (textObj['en']) return textObj['en'];

    const values = Object.values(textObj);
    return values.length > 0 ? values[0] : '';
  };

  // Send message to API
  const sendMessageToAPI = useCallback(async (content: string) => {
    if (!sessionId || !authToken) {
      console.error('No sessionId or authToken available');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          content: content,
          locale: locale,
        }),
      });


      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Reload all messages from the server to get the assistant's response
        await loadSessionMessages(sessionId, authToken);
      } else {
        console.error('Failed to send message:', data);
        setError(data.detail || 'Failed to send message');
        setStatus("error");
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Network error: Unable to send message');
      setStatus("error");
    }
  }, [sessionId, authToken, locale, loadSessionMessages]);

  const streamResponse = useCallback(
    async (messageId: string, content: string) => {
      setStatus("streaming");
      setStreamingMessageId(messageId);

      const words = content.split(" ");
      let currentContent = "";

      for (let i = 0; i < words.length; i++) {
        currentContent += (i > 0 ? " " : "") + words[i];

        setMessages((prev) =>
          prev.map((msg) => {
            if (msg.versions.some((v) => v.id === messageId)) {
              return {
                ...msg,
                versions: msg.versions.map((v) =>
                  v.id === messageId ? { ...v, content: currentContent } : v
                ),
              };
            }
            return msg;
          })
        );

        await new Promise((resolve) =>
          setTimeout(resolve, Math.random() * 100 + 50)
        );
      }

      setStatus("ready");
      setStreamingMessageId(null);
    },
    []
  );

  const addUserMessage = useCallback(
    async (content: string) => {

      if (!sessionId || !authToken) {
        console.error('Cannot send message: missing sessionId or authToken', { sessionId, authToken: !!authToken });
        setError('Session not initialized. Please refresh the page.');
        return;
      }

      const userMessage: MessageType = {
        key: `user-${Date.now()}`,
        from: "user",
        versions: [
          {
            id: `user-${Date.now()}`,
            content,
          },
        ],
      };

      setMessages((prev) => [...prev, userMessage]);
      setStatus("submitted");

      await sendMessageToAPI(content);
      setStatus("ready");
    },
    [sendMessageToAPI, sessionId, authToken]
  );

  const handleSubmit = (message: PromptInputMessage) => {
    const hasText = Boolean(message.text);
    const hasAttachments = Boolean(message.files?.length);

    if (!(hasText || hasAttachments)) {
      return;
    }

    setStatus("submitted");

    if (message.files?.length) {
      toast.success("Files attached", {
        description: `${message.files.length} file(s) attached to message`,
      });
    }

    addUserMessage(message.text || "Sent with attachments");
    setText("");
  };

  const handleSuggestionClick = (suggestion: string) => {
    // Don't set status here - let addUserMessage handle it
    addUserMessage(suggestion);
  };

  // Initialize session on mount
  useEffect(() => {
    if (clientId && assistantId) {
      getAuthToken(clientId).then((token) => {
        if (token) {
          // Fetch widget config
          fetchWidgetConfig(configId, token);

          const storedSession = getStoredSession();
          if (storedSession) {
            validateAndRestoreSession(storedSession.sessionId, token);
          } else {
            createSession(token);
          }
        } else if (authError) {
          console.error('Auth error:', authError);
          setError(authError);
        } else {
          console.error('No token and no authError - check getAuthToken implementation');
        }
      }).catch(err => {
        console.error('Error getting auth token:', err);
        setError('Failed to authenticate');
      });
    } else {
      console.warn('Missing clientId or assistantId');
    }
  }, [clientId, assistantId, configId, authError, createSession, validateAndRestoreSession, fetchWidgetConfig]);

  // Periodic check for expired sessions
  useEffect(() => {
    const checkSessionExpiry = () => {
      const stored = getStoredSession();
      if (!stored && sessionId) {
        setSessionId(null);
        setMessages([]);
      }
    };

    const interval = setInterval(checkSessionExpiry, 60000);
    return () => clearInterval(interval);
  }, [sessionId]);

  // Listen for messages from parent to open/close dialog
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      const { type } = event.data || {};

      if (type === 'OPEN_DOCS_DIALOG') {
        handleOpenChange(true);
      } else if (type === 'CLOSE_DOCS_DIALOG') {
        handleOpenChange(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);

    // Send resize message to parent
    if (typeof window !== 'undefined' && window.parent) {
      if (newOpen) {
        // Full screen when dialog opens
        window.parent.postMessage({
          type: 'WIDGET_RESIZE',
          data: { width: '100vw', height: '100vh' }
        }, '*');
      } else {
        // Back to original size and position when dialog closes
        window.parent.postMessage({
          type: 'WIDGET_RESIZE',
          data: { width: 0, height: 0, hide: true }
        }, '*');
      }
    }
  };

  return (
    <div className="w-full h-full">
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className='mb-8 flex h-[calc(100vh-20vh)] min-w-[calc(100vw-20vw)] flex-col justify-between gap-0 p-0'>
          <ScrollArea ref={scrollAreaRef} className='flex flex-col justify-between overflow-hidden'>
            <DialogHeader className='contents space-y-0 text-left'>
              <DialogTitle className='px-6 pt-6'>{getLocalizedText(widgetConfig?.data?.title) || 'Documentation Assistant'}</DialogTitle>
              <DialogDescription className='px-6 text-sm text-muted-foreground'>
                {getLocalizedText(widgetConfig?.data?.subtitle) || 'How can we help you today?'}
              </DialogDescription>
              <DialogDescription asChild>
                <div className='p-6'>
                  <div className="flex flex-col min-h-0">
                    <div className="flex-1 mb-4">
                      <Conversation>
                        <ConversationContent>
                          {messages.map(({ versions, ...message }) => (
                            <MessageBranch defaultBranch={0} key={message.key}>
                              <MessageBranchContent>
                                {versions.map((version) => (
                                  <Message
                                    from={message.from}
                                    key={`${message.key}-${version.id}`}
                                  >
                                    <div>
                                      {message.sources?.length && (
                                        <Sources>
                                          <SourcesTrigger count={message.sources.length} />
                                          <SourcesContent>
                                            {message.sources.map((source) => (
                                              <Source
                                                href={source.href}
                                                key={source.href}
                                                title={source.title}
                                              />
                                            ))}
                                          </SourcesContent>
                                        </Sources>
                                      )}
                                      {message.reasoning && (
                                        <Reasoning duration={message.reasoning.duration}>
                                          <ReasoningTrigger />
                                          <ReasoningContent>
                                            {message.reasoning.content}
                                          </ReasoningContent>
                                        </Reasoning>
                                      )}
                                      <MessageContent>
                                        <MessageResponse>{version.content}</MessageResponse>
                                      </MessageContent>
                                    </div>
                                  </Message>
                                ))}
                              </MessageBranchContent>
                              {versions.length > 1 && (
                                <MessageBranchSelector from={message.from}>
                                  <MessageBranchPrevious />
                                  <MessageBranchPage />
                                  <MessageBranchNext />
                                </MessageBranchSelector>
                              )}
                            </MessageBranch>
                          ))}
                        </ConversationContent>
                        <ConversationScrollButton />
                      </Conversation>
                      <div ref={conversationEndRef} />
                    </div>
                  </div>
                </div>
              </DialogDescription>
            </DialogHeader>
          </ScrollArea>
          <DialogFooter className='px-6 pb-6 sm:justify-end w-full'>
            <div className="flex flex-col gap-4 w-full">
              <Suggestions>
                {currentSuggestions.map((suggestion: string) => (
                  <Suggestion
                    key={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    suggestion={suggestion}
                  />
                ))}
              </Suggestions>
              <PromptInput globalDrop multiple onSubmit={handleSubmit}>
                <PromptInputHeader>
                  <PromptInputAttachments>
                    {(attachment) => <PromptInputAttachment data={attachment} />}
                  </PromptInputAttachments>
                </PromptInputHeader>
                <PromptInputBody>
                  <PromptInputTextarea
                    onChange={(event) => setText(event.target.value)}
                    value={text}
                    placeholder={getLocalizedText(widgetConfig?.data?.placeholder) || t.typeYourMessage}
                  />
                </PromptInputBody>
                <PromptInputFooter>
                  <PromptInputTools>
                    {/* <PromptInputActionMenu>
                      <PromptInputActionMenuTrigger />
                      <PromptInputActionMenuContent>
                        <PromptInputActionAddAttachments />
                      </PromptInputActionMenuContent>
                    </PromptInputActionMenu> */}
                  </PromptInputTools>
                  <PromptInputSubmit
                    disabled={!(text.trim() || status) || status === "streaming"}
                    status={status}
                  />
                </PromptInputFooter>
              </PromptInput>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}