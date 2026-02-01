import {
  WidgetError,
  WidgetErrorType,
  WidgetErrorCode,
  createAuthError,
  createNetworkError,
  createSessionError,
  createValidationError,
  parseApiError,
  isNetworkError,
  isRetryableError,
  retryWithBackoff,
  logError,
} from '../lib/errorHandling';

// Mock console.error and console.warn
const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {});
const consoleWarn = jest.spyOn(console, 'warn').mockImplementation(() => {});

afterEach(() => {
  consoleError.mockClear();
  consoleWarn.mockClear();
});

describe('WidgetError', () => {
  it('creates an error with correct properties', () => {
    const error = new WidgetError(
      'Test message',
      WidgetErrorCode.UNKNOWN,
      WidgetErrorType.UNKNOWN_ERROR,
      false,
      'Test user message'
    );

    expect(error.message).toBe('Test message');
    expect(error.code).toBe(WidgetErrorCode.UNKNOWN);
    expect(error.name).toBe('WidgetError');
  });
});

describe('Error creation functions', () => {
  it('createAuthError creates auth error', () => {
    const error = createAuthError('Auth failed', WidgetErrorCode.INVALID_CLIENT);

    expect(error).toBeInstanceOf(WidgetError);
    expect(error.message).toBe('Auth failed');
    expect(error.code).toBe(WidgetErrorCode.INVALID_CLIENT);
    expect(error.type).toBe(WidgetErrorType.AUTH_ERROR);
  });

  it('createNetworkError creates network error', () => {
    const error = createNetworkError('Network failed', WidgetErrorCode.NETWORK_TIMEOUT);

    expect(error).toBeInstanceOf(WidgetError);
    expect(error.message).toBe('Network failed');
    expect(error.code).toBe(WidgetErrorCode.NETWORK_TIMEOUT);
    expect(error.type).toBe(WidgetErrorType.NETWORK_ERROR);
  });

  it('createSessionError creates session error', () => {
    const error = createSessionError('Session failed', WidgetErrorCode.SESSION_EXPIRED);

    expect(error).toBeInstanceOf(WidgetError);
    expect(error.message).toBe('Session failed');
    expect(error.code).toBe(WidgetErrorCode.SESSION_EXPIRED);
    expect(error.type).toBe(WidgetErrorType.SESSION_ERROR);
  });

  it('createValidationError creates validation error', () => {
    const error = createValidationError('Validation failed', WidgetErrorCode.MISSING_REQUIRED_PARAMS);

    expect(error).toBeInstanceOf(WidgetError);
    expect(error.message).toBe('Validation failed');
    expect(error.code).toBe(WidgetErrorCode.MISSING_REQUIRED_PARAMS);
    expect(error.type).toBe(WidgetErrorType.VALIDATION_ERROR);
  });
});

describe('parseApiError', () => {
  it('parses error with message field', () => {
    const apiResponse = { message: 'API error message' };
    const result = parseApiError(apiResponse, 'Default message');

    expect(result).toBe('API error message');
  });

  it('parses error with error field', () => {
    const apiResponse = { error: 'API error' };
    const result = parseApiError(apiResponse, 'Default message');

    expect(result).toBe('API error');
  });

  it('parses error with detail field', () => {
    const apiResponse = { detail: 'API detail' };
    const result = parseApiError(apiResponse, 'Default message');

    expect(result).toBe('API detail');
  });

  it('returns default message for unknown format', () => {
    const apiResponse = { unknown: 'field' };
    const result = parseApiError(apiResponse, 'Default message');

    expect(result).toBe('Default message');
  });

  it('handles string response', () => {
    const apiResponse = 'String error message';
    const result = parseApiError(apiResponse, 'Default message');

    expect(result).toBe('String error message');
  });

  it('handles non-string detail field', () => {
    const apiResponse = { detail: { nested: 'error' } };
    const result = parseApiError(apiResponse, 'Default message');

    expect(result).toBe('Default message');
  });

  it('handles non-string error field', () => {
    const apiResponse = { error: 123 };
    const result = parseApiError(apiResponse, 'Default message');

    expect(result).toBe('Default message');
  });

  it('returns default message when parsing throws', () => {
    // Create an object that might cause issues
    const apiResponse = {
      get message() {
        throw new Error('Getter error');
      }
    };
    const result = parseApiError(apiResponse, 'Default message');

    expect(result).toBe('Default message');
  });
});

describe('isNetworkError', () => {
  it('returns true for network errors', () => {
    const networkError = createNetworkError('Network error', WidgetErrorCode.NETWORK_TIMEOUT);
    expect(isNetworkError(networkError)).toBe(true);
  });

  it('returns false for non-network errors', () => {
    const authError = createAuthError('Auth error', WidgetErrorCode.INVALID_CLIENT);
    expect(isNetworkError(authError)).toBe(false);
  });

  it('returns false for regular errors', () => {
    const error = new Error('Regular error');
    expect(isNetworkError(error)).toBe(false);
  });
});

describe('isRetryableError', () => {
  it('returns true for retryable WidgetError', () => {
    const retryableError = createAuthError('Retryable error', WidgetErrorCode.INVALID_CLIENT);
    expect(isRetryableError(retryableError)).toBe(true);
  });

  it('returns false for non-retryable WidgetError', () => {
    const nonRetryableError = createValidationError('Non-retryable error', WidgetErrorCode.INVALID_CONFIG);
    expect(isRetryableError(nonRetryableError)).toBe(false);
  });

  it('returns true for network errors', () => {
    const networkError = new Error('Network error occurred');
    expect(isRetryableError(networkError)).toBe(true);
  });

  it('returns true for HTTP 5xx status codes', () => {
    const serverError = { status: 500, message: 'Internal Server Error' };
    expect(isRetryableError(serverError)).toBe(true);

    const gatewayError = { status: 502, message: 'Bad Gateway' };
    expect(isRetryableError(gatewayError)).toBe(true);

    const serviceUnavailable = { status: 503, message: 'Service Unavailable' };
    expect(isRetryableError(serviceUnavailable)).toBe(true);
  });

  it('returns false for HTTP 4xx status codes', () => {
    const badRequest = { status: 400, message: 'Bad Request' };
    expect(isRetryableError(badRequest)).toBe(false);

    const unauthorized = { status: 401, message: 'Unauthorized' };
    expect(isRetryableError(unauthorized)).toBe(false);

    const notFound = { status: 404, message: 'Not Found' };
    expect(isRetryableError(notFound)).toBe(false);
  });

  it('returns false for other errors', () => {
    const regularError = new Error('Some error');
    expect(isRetryableError(regularError)).toBe(false);

    const unknownError = { message: 'Unknown' };
    expect(isRetryableError(unknownError)).toBe(false);
  });
});

describe('retryWithBackoff', () => {
  it('succeeds on first attempt', async () => {
    const operation = jest.fn().mockResolvedValue('success');

    const result = await retryWithBackoff(operation);

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('retries on failure and succeeds', async () => {
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce('success');

    const result = await retryWithBackoff(operation, {
      maxRetries: 2,
      initialDelay: 1, // Very short delay for test
    });

    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(2);
  }, 10000);

  it('fails after max retries', async () => {
    const operation = jest.fn().mockRejectedValue(new Error('Fail'));

    await expect(retryWithBackoff(operation, {
      maxRetries: 2,
      initialDelay: 1,
    })).rejects.toThrow('Fail');

    expect(operation).toHaveBeenCalledTimes(3); // initial + 2 retries
  }, 10000);

  it('calls onRetry callback', async () => {
    const onRetry = jest.fn();
    const operation = jest.fn()
      .mockRejectedValueOnce(new Error('Fail'))
      .mockResolvedValueOnce('success');

    await retryWithBackoff(operation, {
      maxRetries: 2,
      initialDelay: 1,
      onRetry,
    });

    expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
  }, 10000);

  it('does not retry non-retryable WidgetError', async () => {
    const nonRetryableError = createValidationError('Non-retryable error', WidgetErrorCode.INVALID_CONFIG);
    const operation = jest.fn().mockRejectedValue(nonRetryableError);

    await expect(retryWithBackoff(operation, {
      maxRetries: 2,
      initialDelay: 1,
    })).rejects.toThrow(nonRetryableError);

    expect(operation).toHaveBeenCalledTimes(1); // only initial attempt, no retries
  });
});

describe('logError', () => {
  it('logs error to console in development', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'development';

    const error = new Error('Test error');
    logError(error, { context: 'test' });

    expect(consoleError).toHaveBeenCalledWith('Widget Error:', expect.objectContaining({
      message: 'Test error',
      context: { context: 'test' },
      timestamp: expect.any(String),
    }));

    (process.env as any).NODE_ENV = originalEnv;
  });

  it('does not log error in production', () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as any).NODE_ENV = 'production';

    const error = new Error('Test error');
    logError(error, { context: 'test' });

    expect(consoleError).not.toHaveBeenCalled();

    (process.env as any).NODE_ENV = originalEnv;
  });
});