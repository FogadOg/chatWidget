// Widget Constants

// Timeout values (in milliseconds)
export const TIMEOUTS = {
  AUTH_REQUEST: 10000,           // 10 seconds
  SESSION_CREATE: 15000,         // 15 seconds
  MESSAGE_SEND: 30000,           // 30 seconds
  WIDGET_LOAD: 15000,            // 15 seconds
  FEEDBACK_INACTIVITY: 30000,    // 30 seconds
  SESSION_EXPIRY_CHECK: 60000,   // 60 seconds
} as const;

// Retry configuration
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  INITIAL_DELAY: 1000,           // 1 second
  MAX_DELAY: 10000,              // 10 seconds
  BACKOFF_MULTIPLIER: 2,
} as const;

// Session configuration
export const SESSION_CONFIG = {
  EXPIRY_BUFFER: 5 * 60 * 1000,  // 5 minutes buffer before expiry
} as const;

// Widget sizing
export const BUTTON_SIZES = {
  sm: 100,
  md: 128,
  lg: 160,
} as const;

// Shadow intensity map
export const SHADOW_INTENSITY = {
  none: 'none',
  sm: '0 1px 2px 0',
  md: '0 4px 6px -1px',
  lg: '0 10px 15px -3px',
  xl: '0 20px 25px -5px',
} as const;

// Default colors
export const DEFAULT_COLORS = {
  PRIMARY: '#111827',
  SECONDARY: '#374151',
  BACKGROUND: '#ffffff',
  TEXT: '#1f2937',
  SHADOW: '#000000',
} as const;

// Default values
export const DEFAULTS = {
  BORDER_RADIUS: 8,
  FONT_FAMILY: 'Inter',
  FONT_SIZE: 14,
  FONT_WEIGHT: 'normal',
  SHADOW_INTENSITY: 'md',
  WIDGET_WIDTH: 400,
  WIDGET_HEIGHT: 600,
  BUTTON_SIZE: 'md',
  OPACITY: 1.0,
  LOCALE: 'en',
} as const;

// Supported locales
export const SUPPORTED_LOCALES = [
  'en', 'de', 'es', 'fr', 'pt', 'sv', 'nl', 'nb', 'it'
] as const;

// Input validation
export const INPUT_LIMITS = {
  MAX_MESSAGE_LENGTH: 4000,
  MIN_MESSAGE_LENGTH: 1,
} as const;

// API endpoints
export const API_ENDPOINTS = {
  AUTH_TOKEN: '/auth/widget-token',
  SESSIONS: '/sessions',
  ASSISTANTS: '/assistants',
  WIDGET_CONFIG: '/widget-config',
  MESSAGES: (sessionId: string) => `/sessions/${sessionId}/messages`,
  FEEDBACK: (sessionId: string) => `/sessions/${sessionId}/feedback`,
  MESSAGE_FEEDBACK: (messageId: string) => `/message/${messageId}/feedback`,
} as const;
