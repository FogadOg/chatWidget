import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import MessageBubble from '../components/MessageBubble';

jest.mock('../hooks/useWidgetTranslation', () => ({
  useWidgetTranslation: () => ({ locale: 'en', translations: {} }),
}));

jest.mock('../lib/i18n', () => ({
  t: (_locale: string, key: string) => key,
}));

describe('MessageBubble', () => {
  test('renders assistant message with avatar, source link, feedback buttons, and timestamp', () => {
    const message = {
      id: 'a1',
      text: 'hello',
      from: 'assistant' as const,
      timestamp: Date.now(),
      sources: [{ url: 'https://example.com', title: 'Title', snippet: 'snippet text' }],
    };

    const onFeedback = jest.fn();

    render(
      <MessageBubble
        message={message}
        widgetConfig={{ bot_avatar: 'https://img' } as any}
        assistantName="Bot"
        onSubmitMessageFeedback={onFeedback}
      />,
    );

    expect(screen.getByText('hello')).toBeInTheDocument();
    expect(screen.getByRole('img', { name: 'Bot avatar' })).toBeInTheDocument();
    expect(screen.getByText('Title')).toBeInTheDocument();

    const buttons = screen.getAllByRole('button');
    fireEvent.click(buttons[0]);
    expect(onFeedback).toHaveBeenCalledWith('a1', 'thumbs_up');
    fireEvent.click(buttons[1]);
    expect(onFeedback).toHaveBeenCalledWith('a1', 'thumbs_down');
  });

  test('renders assistant message without sources and without feedback controls when callback is missing', () => {
    const message = {
      id: 'a-no-sources',
      text: 'assistant plain text',
      from: 'assistant' as const,
    };

    render(<MessageBubble message={message} showTimestamps={false} />);

    expect(screen.getByText('assistant plain text')).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  test('renders assistant source fallback without url and shows submitted feedback label', () => {
    const message = {
      id: 'a2',
      text: 'assistant no-link source',
      from: 'assistant' as const,
      sources: [{ title: 'Local Source', snippet: 'x'.repeat(120) }],
    };

    render(
      <MessageBubble
        message={message}
        messageFeedbackSubmitted={new Set(['a2'])}
        showMessageAvatars={false}
        showTimestamps={false}
      />,
    );

    expect(screen.getByText('assistant no-link source')).toBeInTheDocument();
    expect(screen.getByText('Local Source')).toBeInTheDocument();
    expect(screen.getByText(/feedbackSubmitted/i)).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  test('renders assistant sources with mixed url/snippet combinations', () => {
    const message = {
      id: 'a3',
      text: 'mixed sources',
      from: 'assistant' as const,
      sources: [
        { url: 'https://example.com/no-snippet', title: 'No Snippet Source' },
        { title: 'Short Snippet Source', snippet: 'short snippet' },
      ],
    };

    render(<MessageBubble message={message} onSubmitMessageFeedback={jest.fn()} />);

    expect(screen.getByText('No Snippet Source')).toBeInTheDocument();
    expect(screen.getByText('Short Snippet Source')).toBeInTheDocument();
  });

  test('renders pending user message with offline status when attempts is 0', () => {
    const message = {
      id: 'u-offline',
      text: 'queued',
      from: 'user' as const,
      pending: true,
      attempts: 0,
      timestamp: Date.now(),
    };

    render(<MessageBubble message={message as any} />);

    expect(screen.getByText('queued')).toBeInTheDocument();
    expect(screen.getByText(/offlineStatus/i)).toBeInTheDocument();
  });

  test('renders pending user message with delivering status when attempts is between 1 and 2', () => {
    const message = {
      id: 'u-delivering',
      text: 'retrying',
      from: 'user' as const,
      pending: true,
      attempts: 2,
    };

    render(<MessageBubble message={message as any} />);

    expect(screen.getByText('retrying')).toBeInTheDocument();
    expect(screen.getByText(/deliveringStatus/i)).toBeInTheDocument();
  });

  test('renders pending user message failed state and dispatches retry event', () => {
    const message = {
      id: 'u-failed',
      text: 'failed once',
      from: 'user' as const,
      pending: true,
      attempts: 3,
    };

    const dispatchSpy = jest.spyOn(window, 'dispatchEvent');

    render(<MessageBubble message={message as any} />);

    expect(screen.getByText(/failedSend/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /retry/i }));
    expect(dispatchSpy).toHaveBeenCalled();

    dispatchSpy.mockRestore();
  });

  test('handles retry dispatch errors gracefully', () => {
    const message = {
      id: 'u-failed-catch',
      text: 'failed twice',
      from: 'user' as const,
      pending: true,
      attempts: 3,
    };

    const originalDispatch = window.dispatchEvent;
    const throwingDispatch = jest.fn(() => {
      throw new Error('dispatch failed');
    });
    Object.defineProperty(window, 'dispatchEvent', {
      configurable: true,
      value: throwingDispatch,
    });

    render(<MessageBubble message={message as any} />);
    expect(() => fireEvent.click(screen.getByRole('button', { name: /retry/i }))).not.toThrow();

    Object.defineProperty(window, 'dispatchEvent', {
      configurable: true,
      value: originalDispatch,
    });
  });

  test('renders non-pending user message', () => {
    const message = { id: 'u1', text: 'me', from: 'user' as const, timestamp: Date.now() };

    render(<MessageBubble message={message} />);

    expect(screen.getByText('me')).toBeInTheDocument();
    expect(screen.queryByText(/offlineStatus/i)).not.toBeInTheDocument();
  });
});
