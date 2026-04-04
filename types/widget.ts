// Widget Type Definitions
// Minimal runtime export used for tests/coverage. Remove only if you want this file
// excluded from coverage again.
export const __TEST_TYPES = true

export type SourceData = {
  type: string;
  title: string;
  snippet?: string;
  url?: string;
  reference_id?: string;
};

export type Message = {
  id: string;
  text: string;
  from: 'user' | 'assistant';
  timestamp?: number;
  hasFeedback?: boolean;
  sources?: SourceData[];
  pending?: boolean;
};

export type FlowButton = {
  id: string;
  label: Record<string, string>;
  action: string;
  icon?: string;
  response?: {
    text?: Record<string, string>;
    buttons?: FlowButton[];
  };
};

export type FlowResponse = {
  text: string;
  buttons: FlowButton[];
  timestamp: number;
};

export type Flow = {
  id: string;
  trigger: string;
  responses: Array<{
    text?: Record<string, string>;
    buttons?: FlowButton[];
  }>;
};

export type WidgetConfig = {
  id: string;
  widget_type?: 'chat' | 'docs';
  primary_color: string;
  secondary_color: string;
  background_color: string;
  text_color: string;
  border_radius: number;
  start_open: boolean;
  hide_on_mobile: boolean;
  title: Record<string, string>;
  subtitle: Record<string, string>;
  placeholder: Record<string, string>;
  greeting_message: {
    text: Record<string, string>;
    buttons?: FlowButton[];
    flows?: Flow[];
  };
  default_language: string;
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
  position: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  edge_offset: number;
  edgeOffset?: number | string;
  // Optional images
  logo?: string;
  bot_avatar?: string;
  // Behavior flags
  show_timestamps?: boolean;
  show_typing_indicator?: boolean;
  show_message_avatars?: boolean;
  show_unread_badge?: boolean;
  // Proactive open triggers
  /** Delay in milliseconds before automatically opening the widget (0 = disabled) */
  auto_open_delay?: number;
  /** Scroll depth percentage (0–100) that triggers auto-open (0 = disabled) */
  auto_open_scroll_depth?: number;
  // Security
  /** When true, postMessage is only sent to the exact parentOrigin — never '*' */
  strict_origin?: boolean;
};

export type ApiResponse<T> = {
  status: 'success' | 'error';
  data?: T;
  message?: string;
  error?: string;
};

export type SessionData = {
  session_id: string;
  expires_at: string;
};

export type TokenData = {
  token: string;
  /** ISO-8601 expiry timestamp returned by the auth endpoint */
  expires_at?: string;
};

export type MessageData = {
  user_message: {
    id: string;
    content: string;
    created_at: string;
  };
  assistant_message: {
    id: string;
    content: string;
    created_at: string;
    sources?: SourceData[];
    metadata?: {
      assistant_unsure?: boolean;
    };
  };
};

export type PageContext = {
  url: string;
  pathname: string | null;
  title: string | null;
  referrer: string | null;
};

export type UnsureMessage = {
  userMessage: string;
  assistantMessage: string;
  timestamp: number;
};
