import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import FeedbackDialog from '../components/FeedbackDialog';

// Mock fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Mock useWidgetTranslation
jest.mock('../hooks/useWidgetTranslation', () => ({
  useWidgetTranslation: () => ({
    translations: {
      rateConversation: 'How was your experience?',
      feedbackPositive: 'Good',
      feedbackNeutral: 'Okay',
      feedbackNegative: 'Bad',
      feedbackCommentPlaceholder: 'Any additional comments? (optional)',
      submitFeedback: 'Submit Feedback',
      skipFeedback: 'Skip',
      thankYouFeedback: 'Thank you for your feedback!',
      feedbackSubmitted: 'Feedback submitted successfully',
    },
  }),
}));

const defaultProps = {
  sessionId: 'test-session-123',
  authToken: 'test-token',
  primaryColor: '#007bff',
  backgroundColor: '#ffffff',
  textColor: '#000000',
  borderRadius: 8,
  onSubmit: jest.fn(),
  onSkip: jest.fn(),
};

describe('FeedbackDialog', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockFetch.mockReset();
  });

  it('renders feedback dialog with all elements', () => {
    render(<FeedbackDialog {...defaultProps} />);

    expect(screen.getByText('How was your experience?')).toBeInTheDocument();
    expect(screen.getByText('Good')).toBeInTheDocument();
    expect(screen.getByText('Okay')).toBeInTheDocument();
    expect(screen.getByText('Bad')).toBeInTheDocument();
    expect(screen.getByText('Submit Feedback')).toBeInTheDocument();
    expect(screen.getByText('Skip')).toBeInTheDocument();
  });

  it('allows selecting positive rating', () => {
    render(<FeedbackDialog {...defaultProps} />);

    const positiveButton = screen.getByText('Good');
    fireEvent.click(positiveButton);

    expect(positiveButton.closest('button')).toHaveClass('ring-2');
  });

  it('allows selecting neutral rating', () => {
    render(<FeedbackDialog {...defaultProps} />);

    const neutralButton = screen.getByText('Okay');
    fireEvent.click(neutralButton);

    expect(neutralButton.closest('button')).toHaveClass('ring-2');
  });

  it('allows selecting negative rating', () => {
    render(<FeedbackDialog {...defaultProps} />);

    const negativeButton = screen.getByText('Bad');
    fireEvent.click(negativeButton);

    expect(negativeButton.closest('button')).toHaveClass('ring-2');
  });

  it('allows typing in comment field', () => {
    render(<FeedbackDialog {...defaultProps} />);

    // First select a rating to show the comment field
    fireEvent.click(screen.getByText('Good'));

    const commentInput = screen.getByPlaceholderText('Any additional comments? (optional)');
    fireEvent.change(commentInput, { target: { value: 'Great service!' } });

    expect(commentInput).toHaveValue('Great service!');
  });

  it('submits feedback successfully', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<FeedbackDialog {...defaultProps} />);

    // Select rating and add comment
    fireEvent.click(screen.getByText('Good'));
    const commentInput = screen.getByPlaceholderText('Any additional comments? (optional)');
    fireEvent.change(commentInput, { target: { value: 'Excellent!' } });

    // Submit
    fireEvent.click(screen.getByText('Submit Feedback'));

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1/sessions/test-session-123/feedback`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token',
          },
          body: JSON.stringify({
            rating: 'positive',
            comment: 'Excellent!',
          }),
        }
      );
    });

    // Wait for the timeout in the component
    await new Promise(resolve => setTimeout(resolve, 2100));

    expect(defaultProps.onSubmit).toHaveBeenCalled();
  });

  it('shows thank you message after successful submission', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(<FeedbackDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Good'));
    fireEvent.click(screen.getByText('Submit Feedback'));

    await waitFor(() => {
      expect(screen.getByText('Thank you for your feedback!')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    mockFetch.mockRejectedValueOnce(new Error('Network error'));

    render(<FeedbackDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Good'));
    fireEvent.click(screen.getByText('Submit Feedback'));

    // Should not crash and should still show the dialog
    await waitFor(() => {
      expect(screen.getByText('How was your experience?')).toBeInTheDocument();
    });
  });

  it('handles non-ok API response and closes dialog', async () => {
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    mockFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Server error' }),
    });

    render(<FeedbackDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Good'));
    fireEvent.click(screen.getByText('Submit Feedback'));

    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Failed to submit feedback:',
        500,
        { error: 'Server error' }
      );
      expect(defaultProps.onSubmit).toHaveBeenCalled();
    });

    consoleErrorSpy.mockRestore();
  });

  it('calls onSkip when skip button is clicked', () => {
    render(<FeedbackDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Skip'));

    expect(defaultProps.onSkip).toHaveBeenCalled();
  });

  it('disables submit button when no rating is selected', () => {
    render(<FeedbackDialog {...defaultProps} />);

    const submitButton = screen.getByText('Submit Feedback');
    expect(submitButton).toBeDisabled();
  });

  it('enables submit button when rating is selected', () => {
    render(<FeedbackDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Good'));

    const submitButton = screen.getByText('Submit Feedback');
    expect(submitButton).not.toBeDisabled();
  });

  it('shows loading state during submission', async () => {
    mockFetch.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(<FeedbackDialog {...defaultProps} />);

    fireEvent.click(screen.getByText('Good'));
    fireEvent.click(screen.getByText('Submit Feedback'));

    expect(screen.getByText('...')).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText('...')).not.toBeInTheDocument();
    });
  });
});