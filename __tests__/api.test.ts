import { getApiBaseUrl, getApiV1BaseUrl, API, isApiConfigured } from '../lib/api';

const mockEnv = (env: Record<string, string | undefined>) => {
  const originalEnv = process.env;
  process.env = { ...originalEnv, ...env };
  // Force module reload
  jest.resetModules();
  const apiModule = require('../lib/api');
  process.env = originalEnv;
  return apiModule;
};

describe('API utilities', () => {
  describe('getApiBaseUrl', () => {
    it('returns the API base URL from environment variable', () => {
      const { getApiBaseUrl } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(getApiBaseUrl()).toBe('https://api.example.com');
    });

    it('returns empty string when environment variable is not set', () => {
      const { getApiBaseUrl } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: undefined });
      expect(getApiBaseUrl()).toBe('');
    });
  });

  describe('getApiV1BaseUrl', () => {
    it('returns the API v1 base URL', () => {
      const { getApiV1BaseUrl } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(getApiV1BaseUrl()).toBe('https://api.example.com/api/v1');
    });

    it('returns /api/v1 when base URL is empty', () => {
      const { getApiV1BaseUrl } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: undefined });
      expect(getApiV1BaseUrl()).toBe('/api/v1');
    });
  });

  describe('API endpoints', () => {
    it('constructs widgetToken endpoint correctly', () => {
      const { API } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(API.widgetToken()).toBe('https://api.example.com/api/v1/auth/widget-token');
    });

    it('constructs sessions endpoint correctly', () => {
      const { API } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(API.sessions()).toBe('https://api.example.com/api/v1/sessions/');
    });

    it('constructs session endpoint correctly', () => {
      const { API } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(API.session('123')).toBe('https://api.example.com/api/v1/sessions/123');
    });

    it('constructs sessionMessages endpoint correctly', () => {
      const { API } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(API.sessionMessages('123')).toBe('https://api.example.com/api/v1/sessions/123/messages');
    });

    it('constructs sessionFeedback endpoint correctly', () => {
      const { API } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(API.sessionFeedback('123')).toBe('https://api.example.com/api/v1/sessions/123/feedback');
    });

    it('constructs messageFeedback endpoint correctly', () => {
      const { API } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(API.messageFeedback('456')).toBe('https://api.example.com/api/v1/message/456/feedback');
    });

    it('constructs assistant endpoint correctly', () => {
      const { API } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(API.assistant('789')).toBe('https://api.example.com/api/v1/assistants/789');
    });

    it('constructs widgetConfig endpoint correctly', () => {
      const { API } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(API.widgetConfig('config123')).toBe('https://api.example.com/widget-config/config123');
    });
  });

  describe('isApiConfigured', () => {
    it('returns true when BASE_URL is set and does not contain undefined', () => {
      const { isApiConfigured } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://api.example.com' });
      expect(isApiConfigured()).toBe(true);
    });

    it('returns false when BASE_URL is not set', () => {
      const { isApiConfigured } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: undefined });
      expect(isApiConfigured()).toBe(false);
    });

    it('returns false when BASE_URL contains undefined', () => {
      const { isApiConfigured } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: 'https://undefined.example.com' });
      expect(isApiConfigured()).toBe(false);
    });

    it('returns false when BASE_URL is empty string', () => {
      const { isApiConfigured } = mockEnv({ NEXT_PUBLIC_API_BASE_URL: '' });
      expect(isApiConfigured()).toBe(false);
    });
  });
});