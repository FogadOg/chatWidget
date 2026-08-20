import { useState } from 'react';
import { getReadableTextColor } from '../../lib/colors';

export interface LeadCaptureTranslations {
  leadCaptureTitle: string;
  leadCaptureBody: string;
  leadCaptureNameLabel: string;
  leadCaptureEmailLabel: string;
  leadCaptureSubmit: string;
  leadCaptureSubmitting: string;
  leadCaptureSuccess: string;
  leadCaptureError: string;
  leadCaptureDismiss: string;
}

interface LeadCaptureCardProps {
  translations: LeadCaptureTranslations;
  onSubmit: (email: string, name: string) => Promise<void>;
  onDismiss: () => void;
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
}

/**
 * Inline offer shown after the agent fails to answer.
 *
 * Deliberately not a modal: the visitor has just been told "I don't know", and
 * blocking the conversation with an overlay at that moment reads as a demand
 * rather than an offer. It sits in the message flow, asks for one field, and
 * can be ignored.
 *
 * Email is the only required input — the question itself is already known
 * server-side and is submitted as the ticket message.
 */
export function LeadCaptureCard({
  translations: tr,
  onSubmit,
  onDismiss,
  primaryColor = '#111827',
  backgroundColor = '#ffffff',
  textColor = '#1f2937',
  borderRadius = 12,
}: LeadCaptureCardProps) {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(email.trim(), name.trim());
      setSubmitted(true);
    } catch {
      // Keep the card open with the typed value intact so a network blip
      // doesn't cost the lead.
      setError(tr.leadCaptureError);
    } finally {
      setSubmitting(false);
    }
  }

  const fieldStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    border: `1px solid ${textColor}33`,
    backgroundColor: 'transparent',
    color: textColor,
    borderRadius: 6,
    fontSize: 14,
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'block',
    fontSize: 13,
    marginBottom: 4,
    color: textColor,
    opacity: 0.75,
  };

  return (
    <div
      data-testid="lead-capture-card"
      style={{
        backgroundColor,
        color: textColor,
        borderRadius,
        border: `1px solid ${textColor}22`,
        padding: 16,
        margin: '4px 0',
        maxWidth: 320,
      }}
    >
      {submitted ? (
        <p
          role="status"
          style={{ margin: 0, fontSize: 14, color: textColor }}
        >
          {tr.leadCaptureSuccess}
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: textColor }}>
            {tr.leadCaptureTitle}
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: textColor, opacity: 0.75 }}>
            {tr.leadCaptureBody}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div>
              <label htmlFor="companin-capture-email" style={labelStyle}>
                {tr.leadCaptureEmailLabel}
              </label>
              <input
                id="companin-capture-email"
                type="email"
                required
                autoComplete="email"
                value={email}
                disabled={submitting}
                onChange={(e) => setEmail(e.target.value)}
                style={fieldStyle}
              />
            </div>

            <div>
              <label htmlFor="companin-capture-name" style={labelStyle}>
                {tr.leadCaptureNameLabel}
              </label>
              <input
                id="companin-capture-name"
                type="text"
                autoComplete="name"
                value={name}
                disabled={submitting}
                onChange={(e) => setName(e.target.value)}
                style={fieldStyle}
              />
            </div>

            {error && (
              <p role="alert" style={{ color: 'var(--destructive, #dc2626)', fontSize: 13, margin: 0 }}>
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '9px 0',
                backgroundColor: primaryColor,
                color: getReadableTextColor(primaryColor),
                border: 'none',
                borderRadius,
                fontSize: 14,
                fontWeight: 500,
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1,
              }}
            >
              {submitting ? tr.leadCaptureSubmitting : tr.leadCaptureSubmit}
            </button>

            <button
              type="button"
              onClick={onDismiss}
              disabled={submitting}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                fontSize: 13,
                color: textColor,
                opacity: 0.6,
                cursor: submitting ? 'not-allowed' : 'pointer',
                textDecoration: 'underline',
              }}
            >
              {tr.leadCaptureDismiss}
            </button>
          </form>
        </>
      )}
    </div>
  );
}

export default LeadCaptureCard;
