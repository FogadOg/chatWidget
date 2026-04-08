import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import EmbedClient from '../EmbedClient';

// Mock heavy children and hooks
jest.mock('components/EmbedShell', () => (props: any) => (
  <div data-testid="embed-shell">{props.feedbackDialog ?? null}</div>
));
jest.mock('components/FeedbackDialog', () => (props: any) => <div data-testid="feedback-dialog" />);
jest.mock('../../../../hooks/useWidgetAuth', () => ({ useWidgetAuth: () => ({ getAuthToken: jest.fn(), authToken: null, authError: null, scheduleAutoRefresh: jest.fn() }) }));
jest.mock('../../../../hooks/useWidgetTranslation', () => ({ useWidgetTranslation: () => ({ translations: {}, locale: 'en' }) }));
jest.mock('../../../../lib/api', () => ({ trackEvent: jest.fn(() => Promise.resolve()), embedOriginHeader: 'x-embed-origin' }));
jest.mock('../../../../lib/logger', () => ({ logError: jest.fn(), logPerf: jest.fn() }));
jest.mock('../../../../lib/cssValidator', () => ({ sanitizeCss: (s: string) => s }));

describe('EmbedClient component', () => {
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
});
