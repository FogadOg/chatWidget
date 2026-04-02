/**
 * Sandboxed iframe postMessage handshake protocol.
 *
 * When the widget is embedded in a `sandbox="allow-scripts"` iframe (without
 * `allow-same-origin`) it cannot read the parent's cookies or localStorage.
 * Communication with the host page happens exclusively via postMessage with:
 *
 *  1. Origin validation   – messages are rejected unless they come from a
 *                           known allowed origin.
 *  2. Schema validation   – every message is validated against a narrow type
 *                           union before being acted upon.
 *  3. Ephemeral token     – the iframe sends a READY message with a one-time
 *                           handshake token; the host echoes it back in INIT
 *                           to prove it holds the correct sequence.
 *
 * Usage (inside the iframe / widget):
 *   const hs = createHandshake({ allowedOrigins: ['https://example.com'] });
 *   hs.on('INIT', (payload) => { ... });
 *   hs.sendReady();
 *
 * Usage (on the host page):
 *   const hs = createHostHandshake({ widgetOrigin: 'https://widget.example.com' });
 *   hs.on('READY', ({ handshakeToken }) => { hs.sendInit(handshakeToken, config); });
 */

export type WidgetMessageType =
  | 'READY'
  | 'INIT'
  | 'RESIZE'
  | 'NAVIGATE'
  | 'AUTH_TOKEN'
  | 'PING'
  | 'PONG'
  | 'ERROR';

export interface BaseMessage {
  type: WidgetMessageType;
  /** Echoed back by both parties to tie request/response pairs. */
  handshakeToken?: string;
}

export interface ReadyMessage extends BaseMessage {
  type: 'READY';
  handshakeToken: string;
  version: string;
}

export interface InitMessage extends BaseMessage {
  type: 'INIT';
  handshakeToken: string;
  config: Record<string, unknown>;
}

export interface ResizeMessage extends BaseMessage {
  type: 'RESIZE';
  height: number;
}

export interface AuthTokenMessage extends BaseMessage {
  type: 'AUTH_TOKEN';
  token: string;
}

export interface PingMessage extends BaseMessage { type: 'PING' }
export interface PongMessage extends BaseMessage { type: 'PONG' }
export interface ErrorMessage extends BaseMessage { type: 'ERROR'; code: string; detail?: string }

export type WidgetMessage =
  | ReadyMessage
  | InitMessage
  | ResizeMessage
  | AuthTokenMessage
  | PingMessage
  | PongMessage
  | ErrorMessage;

function generateToken(): string {
  const arr = new Uint8Array(24);
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(arr);
  }
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

function isValidMessage(data: unknown): data is WidgetMessage {
  if (typeof data !== 'object' || data === null) return false;
  const d = data as Record<string, unknown>;
  if (typeof d['type'] !== 'string') return false;
  const VALID_TYPES: WidgetMessageType[] = [
    'READY', 'INIT', 'RESIZE', 'NAVIGATE', 'AUTH_TOKEN', 'PING', 'PONG', 'ERROR',
  ];
  return VALID_TYPES.includes(d['type'] as WidgetMessageType);
}

type MessageHandler<T extends WidgetMessage = WidgetMessage> = (msg: T) => void;

/**
 * Widget-side handshake (runs inside the iframe).
 */
export function createHandshake(options: { allowedOrigins: string[] }) {
  const { allowedOrigins } = options;
  const listeners = new Map<WidgetMessageType, MessageHandler[]>();
  const handshakeToken = generateToken();

  function on<K extends WidgetMessage['type']>(
    type: K,
    handler: (msg: Extract<WidgetMessage, { type: K }>) => void
  ) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type)!.push(handler as MessageHandler);
  }

  function handleMessage(event: MessageEvent) {
    if (!allowedOrigins.includes(event.origin)) {
      console.warn('[handshake] Rejected message from origin:', event.origin);
      return;
    }
    if (!isValidMessage(event.data)) {
      console.warn('[handshake] Rejected invalid message schema');
      return;
    }
    const msg = event.data as WidgetMessage;
    const handlers = listeners.get(msg.type) ?? [];
    for (const h of handlers) h(msg);
  }

  function sendReady() {
    const msg: ReadyMessage = {
      type: 'READY',
      handshakeToken,
      version: process.env.NEXT_PUBLIC_WIDGET_VERSION ?? '1',
    };
    window.parent.postMessage(msg, '*');
  }

  function sendResize(height: number) {
    const msg: ResizeMessage = { type: 'RESIZE', height };
    window.parent.postMessage(msg, '*');
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('message', handleMessage);
  }

  return { on, sendReady, sendResize, handshakeToken };
}

/**
 * Host-page handshake (runs on the integrator's page).
 */
export function createHostHandshake(options: {
  iframe: HTMLIFrameElement;
  widgetOrigin: string;
}) {
  const { iframe, widgetOrigin } = options;
  const listeners = new Map<WidgetMessageType, MessageHandler[]>();

  function on<K extends WidgetMessage['type']>(
    type: K,
    handler: (msg: Extract<WidgetMessage, { type: K }>) => void
  ) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type)!.push(handler as MessageHandler);
  }

  function handleMessage(event: MessageEvent) {
    if (event.origin !== widgetOrigin) return;
    if (!isValidMessage(event.data)) return;
    const msg = event.data as WidgetMessage;
    const handlers = listeners.get(msg.type) ?? [];
    for (const h of handlers) h(msg);
  }

  function sendInit(handshakeToken: string, config: Record<string, unknown>) {
    const msg: InitMessage = { type: 'INIT', handshakeToken, config };
    iframe.contentWindow?.postMessage(msg, widgetOrigin);
  }

  window.addEventListener('message', handleMessage);

  return { on, sendInit };
}
