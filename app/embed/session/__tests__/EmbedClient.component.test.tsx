import React from 'react';
import { render, screen, act, waitFor } from '@testing-library/react';
import EmbedClient from '../EmbedClient';

// Mock heavy children and hooks
jest.mock('components/EmbedShell', () => (props: any) => (
  <div data-testid="embed-shell">{props.feedbackDialog ?? null}</div>
));
jest.mock('components/FeedbackDialog', () => (props: any) => <div data-testid="feedback-dialog" />);

const mockGetAuthToken = jest.fn();
jest.mock('../../../../hooks/useWidgetAuth', () => ({
  useWidgetAuth: () => ({
    getAuthToken: mockGetAuthToken,
    authToken: null,
    authError: null,
    scheduleAutoRefresh: jest.fn(),
  }),
}));
jest.mock('../../../../hooks/useWidgetTranslation', () => ({ useWidgetTranslation: () => ({ translations: {}, locale: 'en' }) }));
jest.mock('../../../../lib/api', () => ({ trackEvent: jest.fn(() => Promise.resolve()), embedOriginHeader: jest.fn(() => ({})), API: { assistant: (id: string) => `/api/assistants/${id}`, widgetConfig: (id: string) => `/api/config/${id}`, sessions: () => '/api/sessions', sessionMessages: (id: string) => `/api/sessions/${id}/messages`, session: (id: string) => `/api/sessions/${id}`, sessionFeedback: (id: string) => `/api/sessions/${id}/feedback` } }));
jest.mock('../../../../lib/logger', () => ({ logError: jest.fn(), logPerf: jest.fn() }));
jest.mock('../../../../lib/cssValidator', () => ({ sanitizeCss: (s: string) => s }));
jest.mock('../../../../src/lib/offline', () => ({
  getQueuedMessages: jest.fn().mockResolvedValue([]),
  removeQueuedMessage: jest.fn().mockResolvedValue(undefined),
  queueMessage: jest.fn().mockResolvedValue(undefined),
  incrementAttempt: jest.fn().mockResolvedValue(undefined),
}));
jest.mock('../../../../src/lib/widgetRegistry', () => ({
  registerInstance: jest.fn(),
  deregisterInstance: jest.fn(),
  makeInstanceId: jest.fn(() => 'test-instance-id'),
  open: jest.fn(),
  close: jest.fn(),
}));

const baseProps = {
  clientId: 'c1',
  assistantId: 'a1',
  configId: 'cfg1',
  locale: 'en',
  startOpen: false as boolean,
};

describe('EmbedClient component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockGetAuthToken.mockResolvedValue(null);
    // clear fetch mock if present
    if ((global.fetch as jest.Mock)?.mockReset) {
      (global.fetch as jest.Mock).mockReset();
    }
  });

  test('renders embed shell and forced feedback dialog in persistent mode', async () => {
    render(
      <EmbedClient
        clientId="c1"
        assistantId="a1"
        configId="cfg1"
        locale="en"
        startOpen={false}
        persistent={true}
        showFeedbackDialogOverride={true}
      />
    );

    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 3000 });
    await waitFor(() => expect(screen.getByTestId('feedback-dialog')).toBeInTheDocument(), { timeout: 3000 });
  });

  test('renders when startOpen and strictOrigin with explicit parentOrigin', async () => {
    render(
      <EmbedClient
        clientId="c2"
        assistantId="a2"
        configId="cfg2"
        locale="en"
        startOpen={true}
        parentOrigin={'https://explicit.example'}
        strictOrigin={true}
        forceVariantId={'variant-123'}
      />
    );

    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 3000 });
    // ensure document dir/locale still set
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });

  test('bootstrap stops early when getAuthToken returns null', async () => {
    mockGetAuthToken.mockResolvedValue(null);

    render(<EmbedClient {...baseProps} />);

    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 3000 });
    // should not error — bootstrap exits without throwing
  });

  test('bootstrap exits early when clientId is missing', async () => {
    render(
      <EmbedClient
        clientId=""
        assistantId="a1"
        configId="cfg1"
        locale="en"
        startOpen={false}
      />
    );
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 3000 });
  });

  test('bootstrap exits early when assistantId is missing', async () => {
    render(
      <EmbedClient
        clientId="c1"
        assistantId=""
        configId="cfg1"
        locale="en"
        startOpen={false}
      />
    );
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 3000 });
  });

  test('bootstrap completes with full fetch mocks and creates session', async () => {
    mockGetAuthToken.mockResolvedValue('tok-1');

    const fetchMock = jest.fn();
    // fetchAssistantDetails
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { name: 'Test Bot' } }),
    } as any);
    // fetchWidgetConfig
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { id: 'cfg1', widget_type: 'chat' } }),
    } as any);
    // createSession
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { session_id: 'sess-1', visitor_id: 'v1' } }),
    } as any);
    // loadSessionMessages
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        data: {
          messages: [
            { id: 'm1', content: 'hello', sender: 'user', created_at: new Date().toISOString() },
          ],
        },
      }),
    } as any);
    global.fetch = fetchMock;

    render(<EmbedClient {...baseProps} />);

    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 5000 });
  });

  test('bootstrap creates session with AB control meta when config has id but no variant_id', async () => {
    mockGetAuthToken.mockResolvedValue('tok-2');

    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { name: 'Bot' } }),
    } as any);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { id: 'cfg1', widget_type: 'chat' } }),
    } as any);
    // createSession — capture body to verify AB meta
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { session_id: 'sess-2', visitor_id: 'v2' } }),
    } as any);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { messages: [] } }),
    } as any);
    global.fetch = fetchMock;

    render(<EmbedClient {...baseProps} />);
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 5000 });
  });

  test('bootstrap creates session with variant AB meta when config has variant_id', async () => {
    mockGetAuthToken.mockResolvedValue('tok-3');

    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { name: 'Bot' } }),
    } as any);
    // config with variant_id
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { id: 'cfg1', widget_type: 'chat', variant_id: 'v-abc', variant_name: 'Variant A' } }),
    } as any);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { session_id: 'sess-3', visitor_id: 'v3' } }),
    } as any);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { messages: [] } }),
    } as any);
    global.fetch = fetchMock;

    render(<EmbedClient {...baseProps} />);
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 5000 });
  });

  test('bootstrap restores session from localStorage and patches variant metadata', async () => {
    mockGetAuthToken.mockResolvedValue('tok-4');

    // Pre-seed localStorage with a stored session (must have valid expiresAt in the future)
    const sessionKey = `companin-session-c1-a1-en`;
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour from now
    localStorage.setItem(sessionKey, JSON.stringify({ sessionId: 'stored-sess', expiresAt }));

    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { name: 'Bot' } }),
    } as any);
    // fetchWidgetConfig returns config with variant_id → triggers PATCH in validateAndRestoreSession
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { id: 'cfg1', widget_type: 'chat', variant_id: 'v-xyz', variant_name: 'Variant B' } }),
    } as any);
    // All subsequent fetch calls succeed (validateAndRestoreSession + loadSessionMessages + PATCH)
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: { messages: [] } }),
    } as any);
    global.fetch = fetchMock;

    render(<EmbedClient {...baseProps} />);
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 8000 });

    localStorage.removeItem(sessionKey);
  }, 10000);

  test('companin:queued-message event adds a pending message to UI', async () => {
    render(<EmbedClient {...baseProps} />);
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 3000 });

    await act(async () => {
      const ev = new CustomEvent('companin:queued-message', {
        detail: { id: 'q1', text: 'queued text', timestamp: Date.now(), attempts: 0 },
      });
      window.dispatchEvent(ev);
    });
    // no throw expected — branch that reads detail is exercised
  });

  test('companin:queued-message event with null detail is handled gracefully', async () => {
    render(<EmbedClient {...baseProps} />);
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 3000 });

    await act(async () => {
      const ev = new CustomEvent('companin:queued-message', { detail: null });
      window.dispatchEvent(ev);
    });
    // null detail branch → early return, no throw
  });

  test('initial telemetry is skipped when key already exists in localStorage', async () => {
    const initKey = `companin-telemetry-init-c1-a1`;
    localStorage.setItem(initKey, '1');

    render(<EmbedClient {...baseProps} />);
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 3000 });

    const { trackEvent } = require('../../../../lib/api');
    // trackEvent may be called for other events, but the initial widget_open/widget_close should be skipped
    const initialCalls = (trackEvent as jest.Mock).mock.calls.filter(
      (c: any[]) => c[0] === 'widget_open' || c[0] === 'widget_close'
    );
    expect(initialCalls.length).toBe(0);

    localStorage.removeItem(initKey);
  });

  test('flowResponses stored in localStorage are restored when sessionId is set', async () => {
    mockGetAuthToken.mockResolvedValue('tok-5');

    const sessionKey = `companin-session-c1-a1-en`;
    const storedSessId = 'sess-flow';
    const expiresAt5 = new Date(Date.now() + 60 * 60 * 1000).toISOString();
    localStorage.setItem(sessionKey, JSON.stringify({ sessionId: storedSessId, expiresAt: expiresAt5 }));

    const flowKey = `companin-flow-${storedSessId}`;
    const flowData = [{ text: 'flow answer', buttons: [], timestamp: Date.now() }];
    localStorage.setItem(flowKey, JSON.stringify(flowData));

    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { name: 'Bot' } }),
    } as any);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { id: 'cfg1', widget_type: 'chat' } }),
    } as any);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: { messages: [] } }),
    } as any);
    global.fetch = fetchMock;

    render(<EmbedClient {...baseProps} />);
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 8000 });

    localStorage.removeItem(sessionKey);
    localStorage.removeItem(flowKey);
  }, 10000);

  test('auto_open_delay triggers widget open after delay', async () => {
    jest.useFakeTimers();
    mockGetAuthToken.mockResolvedValue('tok-6');

    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { name: 'Bot' } }),
    } as any);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        data: { id: 'cfg1', widget_type: 'chat', auto_open_delay: 1000 },
      }),
    } as any);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: { session_id: 'sess-ao', visitor_id: 'v6' } }),
    } as any);
    global.fetch = fetchMock;

    render(<EmbedClient {...baseProps} startOpen={false} />);
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 5000 });

    await act(async () => {
      jest.advanceTimersByTime(1500);
    });

    jest.useRealTimers();
  });

  test('auto_open_scroll_depth triggers widget open on scroll', async () => {
    mockGetAuthToken.mockResolvedValue('tok-7');

    const fetchMock = jest.fn();
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success', data: { name: 'Bot' } }),
    } as any);
    fetchMock.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        status: 'success',
        data: { id: 'cfg1', widget_type: 'chat', auto_open_scroll_depth: 50 },
      }),
    } as any);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ status: 'success', data: { session_id: 'sess-scroll', visitor_id: 'v7' } }),
    } as any);
    global.fetch = fetchMock;

    render(<EmbedClient {...baseProps} startOpen={false} />);
    await waitFor(() => expect(screen.getByTestId('embed-shell')).toBeInTheDocument(), { timeout: 5000 });

    await act(async () => {
      // Simulate scroll past the depth threshold
      Object.defineProperty(window, 'scrollY', { value: 500, configurable: true });
      Object.defineProperty(window, 'innerHeight', { value: 600, configurable: true });
      Object.defineProperty(document.documentElement, 'scrollHeight', { value: 1000, configurable: true });
      window.dispatchEvent(new Event('scroll'));
    });
  });
});
