'use client';

import React, { useState } from 'react';
import { useWidgetTranslation } from '../hooks/useWidgetTranslation';
import { ThumbsUp, ThumbsDown, Minus, X } from 'lucide-react';

type FeedbackRating = 'positive' | 'neutral' | 'negative';

interface FeedbackDialogProps {
  sessionId: string;
  authToken: string;
  primaryColor: string;
  backgroundColor: string;
  textColor: string;
  borderRadius: number;
  onSubmit: () => void;
  onSkip: () => void;
}

const API_BASE_URL = `${process.env.NEXT_PUBLIC_API_BASE_URL}/api/v1`;

export default function FeedbackDialog({
  sessionId,
  authToken,
  primaryColor,
  backgroundColor,
  textColor,
  borderRadius,
  onSubmit,
  onSkip,
}: FeedbackDialogProps) {
  const { translations: t } = useWidgetTranslation();
  const [selectedRating, setSelectedRating] = useState<FeedbackRating | null>(null);
  const [comment, setComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async () => {
    if (!selectedRating) return;

    setIsSubmitting(true);
    try {
      const response = await fetch(`${API_BASE_URL}/sessions/${sessionId}/feedback`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          rating: selectedRating,
          comment: comment.trim(),
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        setSubmitted(true);
        setTimeout(() => {
          onSubmit();
        }, 2000);
      } else {
        console.error('Failed to submit feedback:', response.status, data);
        onSubmit(); // Close anyway
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      onSubmit(); // Close anyway
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div
        className="p-6 text-center animate-fade-in"
        style={{
          backgroundColor: backgroundColor,
          borderRadius: `${borderRadius}px`,
          color: textColor,
        }}
      >
        <div
          className="w-16 h-16 mx-auto mb-4 rounded-full flex items-center justify-center"
          style={{ backgroundColor: `${primaryColor}20` }}
        >
          <ThumbsUp className="w-8 h-8" style={{ color: primaryColor }} />
        </div>
        <h3 className="text-lg font-semibold mb-2">{t.thankYouFeedback}</h3>
        <p className="text-sm opacity-70">{t.feedbackSubmitted}</p>
      </div>
    );
  }

  return (
    <div
      className="p-6 relative"
      style={{
        backgroundColor: backgroundColor,
        borderRadius: `${borderRadius}px`,
        color: textColor,
      }}
    >
      {/* Close button */}
      <button
        onClick={onSkip}
        className="absolute top-4 right-4 p-1 rounded-full hover:opacity-70 transition-opacity"
        style={{ color: textColor }}
        aria-label="Close feedback"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Title */}
      <h3 className="text-lg font-semibold mb-6 pr-8">{t.rateConversation}</h3>

      {/* Rating buttons */}
      <div className="flex justify-center gap-4 mb-6">
        <button
          onClick={() => setSelectedRating('positive')}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
            selectedRating === 'positive' ? 'ring-2' : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: selectedRating === 'positive' ? `${primaryColor}20` : `${primaryColor}10`,
            borderColor: primaryColor,
            color: textColor,
          }}
        >
          <ThumbsUp
            className="w-8 h-8"
            style={{ color: selectedRating === 'positive' ? primaryColor : textColor }}
          />
          <span className="text-sm font-medium">{t.feedbackPositive}</span>
        </button>

        <button
          onClick={() => setSelectedRating('neutral')}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
            selectedRating === 'neutral' ? 'ring-2' : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: selectedRating === 'neutral' ? `${primaryColor}20` : `${primaryColor}10`,
            borderColor: primaryColor,
            color: textColor,
          }}
        >
          <Minus
            className="w-8 h-8"
            style={{ color: selectedRating === 'neutral' ? primaryColor : textColor }}
          />
          <span className="text-sm font-medium">{t.feedbackNeutral}</span>
        </button>

        <button
          onClick={() => setSelectedRating('negative')}
          className={`flex flex-col items-center gap-2 p-4 rounded-lg transition-all ${
            selectedRating === 'negative' ? 'ring-2' : 'hover:opacity-80'
          }`}
          style={{
            backgroundColor: selectedRating === 'negative' ? `${primaryColor}20` : `${primaryColor}10`,
            borderColor: primaryColor,
            color: textColor,
          }}
        >
          <ThumbsDown
            className="w-8 h-8"
            style={{ color: selectedRating === 'negative' ? primaryColor : textColor }}
          />
          <span className="text-sm font-medium">{t.feedbackNegative}</span>
        </button>
      </div>

      {/* Comment textarea */}
      {selectedRating && (
        <div className="mb-6 animate-fade-in">
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={t.feedbackCommentPlaceholder}
            className="w-full p-3 rounded-lg border resize-none focus:outline-none focus:ring-2"
            style={{
              backgroundColor: `${primaryColor}05`,
              borderColor: `${primaryColor}30`,
              color: textColor,
            }}
            rows={3}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="flex gap-3">
        <button
          onClick={onSkip}
          className="flex-1 py-2 px-4 rounded-lg font-medium transition-opacity hover:opacity-80"
          style={{
            backgroundColor: `${primaryColor}10`,
            color: textColor,
          }}
        >
          {t.skipFeedback}
        </button>
        <button
          onClick={handleSubmit}
          disabled={!selectedRating || isSubmitting}
          className="flex-1 py-2 px-4 rounded-lg font-medium transition-opacity hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            backgroundColor: primaryColor,
            color: '#ffffff',
          }}
        >
          {isSubmitting ? '...' : t.submitFeedback}
        </button>
      </div>
    </div>
  );
}
