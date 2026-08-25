import { useId, useMemo, useState } from 'react';
import { getReadableTextColor } from '../../lib/colors';
import type { LeadCaptureField } from '../../types/widget';

export interface LeadCaptureTranslations {
  leadCaptureTitle: string;
  leadCaptureBody: string;
  leadCaptureIntentTitle: string;
  leadCaptureIntentBody: string;
  leadCaptureNameLabel: string;
  leadCaptureEmailLabel: string;
  leadCaptureSubmit: string;
  leadCaptureSubmitting: string;
  leadCaptureSuccess: string;
  leadCaptureError: string;
  leadCaptureDismiss: string;
  leadCaptureOptional: string;
}

/** Answers keyed by field key, e.g. `{ email: 'a@b.c', company: 'Acme' }`. */
export type LeadCaptureValues = Record<string, string>;

interface LeadCaptureCardProps {
  translations: LeadCaptureTranslations;
  onSubmit: (values: LeadCaptureValues) => Promise<void>;
  onDismiss: () => void;
  /**
   * The fields to ask for, from the agent's configuration. Falls back to the
   * original email + optional name when the server sent nothing usable, so a
   * widget talking to an older backend still renders a working card.
   */
  fields?: LeadCaptureField[];
  /**
   * `intent` when the agent volunteered the card because the visitor asked for
   * something a human should pick up; `unanswered` after a question it couldn't
   * answer. Only changes the wording — the two read very differently to someone
   * who just got a good answer versus no answer at all.
   */
  reason?: 'unanswered' | 'intent';
  primaryColor?: string;
  backgroundColor?: string;
  textColor?: string;
  borderRadius?: number;
}

const DEFAULT_FIELDS: LeadCaptureField[] = [
  { key: 'email', label: '', type: 'email', required: true },
  { key: 'name', label: '', type: 'text', required: false },
];

/**
 * Inline offer shown when the agent has a reason to ask for contact details.
 *
 * Deliberately not a modal: it sits in the message flow, asks for as little as
 * the operator configured, and can be ignored. Blocking the conversation with
 * an overlay reads as a demand rather than an offer — the more so right after
 * the agent has said "I don't know".
 *
 * What it asks for comes from the agent (`lead_capture_fields`). The two
 * reserved keys carry no label of their own so they can stay localized here;
 * anything else the operator added is labelled in whatever language they typed.
 */
export function LeadCaptureCard({
  translations: tr,
  onSubmit,
  onDismiss,
  fields,
  reason = 'unanswered',
  primaryColor = '#111827',
  backgroundColor = '#ffffff',
  textColor = '#1f2937',
  borderRadius = 12,
}: LeadCaptureCardProps) {
  const [values, setValues] = useState<LeadCaptureValues>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Namespaced so two cards in one transcript can't collide on input ids —
  // labels stop pointing at the right box the moment they do.
  const idPrefix = useId();

  const resolvedFields = useMemo(() => {
    const usable = (fields ?? []).filter((field) => field && field.key);
    return usable.length > 0 ? usable : DEFAULT_FIELDS;
  }, [fields]);

  const labelFor = (field: LeadCaptureField): string => {
    if (field.label) return field.label;
    if (field.key === 'email') return tr.leadCaptureEmailLabel;
    if (field.key === 'name') return tr.leadCaptureNameLabel;
    return field.key;
  };

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const trimmed: LeadCaptureValues = {};
      for (const field of resolvedFields) {
        const value = (values[field.key] ?? '').trim();
        if (value) trimmed[field.key] = value;
      }
      await onSubmit(trimmed);
      setSubmitted(true);
    } catch {
      // Keep the card open with the typed values intact so a network blip
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
      data-capture-reason={reason}
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
            {reason === 'intent' ? tr.leadCaptureIntentTitle : tr.leadCaptureTitle}
          </p>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: textColor, opacity: 0.75 }}>
            {reason === 'intent' ? tr.leadCaptureIntentBody : tr.leadCaptureBody}
          </p>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {resolvedFields.map((field) => {
              const inputId = `${idPrefix}-${field.key}`;
              const shared = {
                id: inputId,
                required: field.required,
                value: values[field.key] ?? '',
                disabled: submitting,
                style: fieldStyle,
                onChange: (
                  e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
                ) => setValues((prev) => ({ ...prev, [field.key]: e.target.value })),
              };
              return (
                <div key={field.key}>
                  <label htmlFor={inputId} style={labelStyle}>
                    {labelFor(field)}
                    {!field.required && ` ${tr.leadCaptureOptional}`}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea {...shared} rows={3} style={{ ...fieldStyle, resize: 'vertical' }} />
                  ) : (
                    <input
                      {...shared}
                      type={field.type}
                      autoComplete={
                        field.key === 'email' ? 'email'
                          : field.key === 'name' ? 'name'
                            : field.type === 'tel' ? 'tel' : 'off'
                      }
                    />
                  )}
                </div>
              );
            })}

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
