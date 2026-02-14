// Widget Type Definitions

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
