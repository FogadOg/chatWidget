import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { LeadCaptureCard } from '../app/embed/LeadCaptureCard';
import type { LeadCaptureField } from '../types/widget';

const translations = {
  leadCaptureTitle: 'Want us to follow up?',
  leadCaptureBody: 'Leave your email and our team will get back to you about this.',
  leadCaptureIntentTitle: 'Shall we get in touch?',
  leadCaptureIntentBody: 'Leave your details and our team will follow up with you.',
  leadCaptureNameLabel: 'Name',
  leadCaptureEmailLabel: 'Email',
  leadCaptureSubmit: 'Send to the team',
  leadCaptureSubmitting: 'Sending...',
  leadCaptureSuccess: "Thanks — we'll be in touch.",
  leadCaptureError: 'Something went wrong. Please try again.',
  leadCaptureDismiss: 'No thanks',
  leadCaptureOptional: '(optional)',
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
  it('falls back to email + optional name when the server sent no field config', () => {
    renderCard();

    expect(screen.getByText('Want us to follow up?')).toBeInTheDocument();
    expect(screen.getByText('Leave your email and our team will get back to you about this.')).toBeInTheDocument();

    const email = screen.getByLabelText('Email') as HTMLInputElement;
    const name = screen.getByLabelText('Name (optional)') as HTMLInputElement;
    expect(email.required).toBe(true);
    expect(name.required).toBe(false);
  });

  it('submits the answers keyed by field', async () => {
    const { onSubmit } = renderCard();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'visitor@example.com' } });
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: 'Jane' } });
    fireEvent.click(screen.getByText('Send to the team'));

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({ email: 'visitor@example.com', name: 'Jane' }),
    );
  });

  it('trims whitespace and drops fields left blank', async () => {
    const { onSubmit } = renderCard();

    fireEvent.change(screen.getByLabelText('Email'), { target: { value: '  visitor@example.com  ' } });
    fireEvent.change(screen.getByLabelText('Name (optional)'), { target: { value: '   ' } });
    fireEvent.click(screen.getByText('Send to the team'));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ email: 'visitor@example.com' }));
  });

  describe('configured fields', () => {
    const fields: LeadCaptureField[] = [
      { key: 'email', label: '', type: 'email', required: true },
      { key: 'company', label: 'Company', type: 'text', required: true },
      { key: 'phone', label: 'Phone', type: 'tel', required: false },
      { key: 'details', label: 'What do you need?', type: 'textarea', required: false },
    ];

    it('renders exactly what the agent asked for, with its own labels', () => {
      renderCard({ fields });

      // Reserved keys keep the widget's localized label; operator-authored ones
      // are shown verbatim in whatever language they were typed.
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect((screen.getByLabelText('Company') as HTMLInputElement).required).toBe(true);
      expect(screen.getByLabelText('Phone (optional)')).toHaveAttribute('type', 'tel');
      expect(screen.getByLabelText('What do you need? (optional)').tagName).toBe('TEXTAREA');
      // Not configured, so not asked for.
      expect(screen.queryByLabelText('Name (optional)')).not.toBeInTheDocument();
    });

    it('submits every configured answer under its key', async () => {
      const { onSubmit } = renderCard({ fields });

      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'buyer@example.com' } });
      fireEvent.change(screen.getByLabelText('Company'), { target: { value: 'Acme' } });
      fireEvent.change(screen.getByLabelText('What do you need? (optional)'), {
        target: { value: 'A quote for 40 seats' },
      });
      fireEvent.click(screen.getByText('Send to the team'));

      await waitFor(() =>
        expect(onSubmit).toHaveBeenCalledWith({
          email: 'buyer@example.com',
          company: 'Acme',
          details: 'A quote for 40 seats',
        }),
      );
    });
  });

  it('uses the intent wording when the agent volunteered the card', () => {
    renderCard({ reason: 'intent' });

    expect(screen.getByText('Shall we get in touch?')).toBeInTheDocument();
    expect(screen.queryByText('Want us to follow up?')).not.toBeInTheDocument();
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
