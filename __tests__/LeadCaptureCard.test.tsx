import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeadCaptureCard } from '../app/embed/LeadCaptureCard';

const translations = {
  leadCaptureTitle: 'Want us to follow up?',
  leadCaptureBody: 'Leave your email and our team will get back to you about this.',
  leadCaptureNameLabel: 'Name (optional)',
  leadCaptureEmailLabel: 'Email',
  leadCaptureSubmit: 'Send to the team',
  leadCaptureSubmitting: 'Sending...',
  leadCaptureSuccess: "Thanks — we'll be in touch.",
  leadCaptureError: 'Something went wrong. Please try again.',
  leadCaptureDismiss: 'No thanks',
};

function renderCard(overrides: Partial<React.ComponentProps<typeof LeadCaptureCard>> = {}) {
  const props = {
    translations,
    onSubmit: jest.fn().mockResolvedValue(undefined),
    onDismiss: jest.fn(),
    ...overrides,
  };
  render(<LeadCaptureCard {...props} />);
  return props;
}

describe('LeadCaptureCard', () => {
  it('renders the offer with email required and name optional', () => {
    renderCard();

    expect(screen.getByText('Want us to follow up?')).toBeInTheDocument();
    expect(screen.getByText('Leave your email and our team will get back to you about this.')).toBeInTheDocument();

    const email = screen.getByLabelText('Email') as HTMLInputElement;
    const name = screen.getByLabelText('Name (optional)') as HTMLInputElement;
    expect(email.required).toBe(true);
    expect(name.required).toBe(false);
  });

  it('submits the email and optional name', async () => {
    const { onSubmit } = renderCard();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'visitor@example.com' } });
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Jane' } });
    fireEvent.click(screen.getByText('Send to the team'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('visitor@example.com', 'Jane'));
  });

  it('trims whitespace off both fields before submitting', async () => {
    const { onSubmit } = renderCard();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  visitor@example.com  ' } });
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: '  Jane  ' } });
    fireEvent.click(screen.getByText('Send to the team'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith('visitor@example.com', 'Jane'));
  });

  it('shows the success state instead of the form once submitted', async () => {
    renderCard();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'visitor@example.com' } });
    fireEvent.click(screen.getByText('Send to the team'));

    await waitFor(() => expect(screen.getByRole('status')).toHaveTextContent("Thanks — we'll be in touch."));
    expect(screen.queryByLabelText('Email')).not.toBeInTheDocument();
  });

  it('keeps the form and the typed email when submitting fails', async () => {
    renderCard({ onSubmit: jest.fn().mockRejectedValue(new Error('network')) });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'visitor@example.com' } });
    fireEvent.click(screen.getByText('Send to the team'));

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong. Please try again.'),
    );
    // The lead is not lost: the field is still there, still filled, retryable.
    expect((screen.getByLabelText('Email') as HTMLInputElement).value).toBe('visitor@example.com');
    expect(screen.getByText('Send to the team')).toBeInTheDocument();
  });

  it('disables inputs and swaps the label while submitting', async () => {
    let resolveSubmit: () => void = () => {};
    const onSubmit = jest.fn(
      () => new Promise<void>((resolve) => { resolveSubmit = resolve; }),
    );
    renderCard({ onSubmit });

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'visitor@example.com' } });
    fireEvent.click(screen.getByText('Send to the team'));

    await waitFor(() => expect(screen.getByText('Sending...')).toBeInTheDocument());
    expect((screen.getByLabelText('Email') as HTMLInputElement).disabled).toBe(true);

    resolveSubmit();
    await waitFor(() => expect(screen.getByRole('status')).toBeInTheDocument());
  });

  it('calls onDismiss when the visitor declines', () => {
    const { onDismiss } = renderCard();

    fireEvent.click(screen.getByText('No thanks'));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
