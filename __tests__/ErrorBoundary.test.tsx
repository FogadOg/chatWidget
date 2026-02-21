import React from 'react';
/* eslint-disable @typescript-eslint/no-explicit-any */
import { render, screen, fireEvent } from '@testing-library/react';
import ErrorBoundary from '../components/ErrorBoundary';

// Mock the logger
jest.mock('../lib/logger', () => ({
  logError: jest.fn(),
}));

let mockLogError: jest.Mock;

describe('ErrorBoundary', () => {
  const ThrowError = () => {
    if (shouldThrow) {
      throw new Error('Test error');
    }
    return <div>Recovered</div>;
  };

  let shouldThrow = true;

  beforeEach(() => {
    shouldThrow = true;
    return import('../lib/logger').then((mod) => {
      mockLogError = mod.logError as jest.Mock;
      mockLogError.mockClear();
    });
  });

  it('renders children when no error occurs', () => {
    render(
      <ErrorBoundary>
        <div>Test content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Test content')).toBeInTheDocument();
  });

  it('renders fallback UI when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('The widget encountered an error. Please try refreshing the page.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('renders custom fallback when provided', () => {
    const customFallback = <div>Custom error message</div>;

    render(
      <ErrorBoundary fallback={customFallback}>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Custom error message')).toBeInTheDocument();
  });

  it('logs error when an error occurs', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(mockLogError).toHaveBeenCalledWith(
      'Widget Error Boundary caught an error',
      expect.objectContaining({
        error: expect.any(String),
        stack: expect.any(String),
        componentStack: expect.any(String),
      })
    );
  });

  it('resets error state when Try Again button is clicked', () => {
    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Simulate child recovery before retry
    shouldThrow = false;
    fireEvent.click(screen.getByRole('button', { name: 'Try Again' }));

    // After reset and recovery, children should render
    expect(screen.getByText('Recovered')).toBeInTheDocument();
  });

  it('shows error details in development mode', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'development';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.getByText('Error details')).toBeInTheDocument();

    (process.env as any).NODE_ENV = originalEnv;
  });

  it('does not show error details in production mode', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';

    render(
      <ErrorBoundary>
        <ThrowError />
      </ErrorBoundary>
    );

    expect(screen.queryByText('Error details')).not.toBeInTheDocument();

    (process.env as any).NODE_ENV = originalEnv;
  });
});