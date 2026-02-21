import { checkAndConsume, resetLimiter, peek } from '../lib/rateLimiter';
import { RATE_LIMIT } from '../lib/constants';

describe('rateLimiter', () => {
  const sessionId = 'test-session';

  beforeEach(() => {
    resetLimiter(sessionId);
  });

  it('allows up to RATE_LIMIT.MAX_MESSAGES then blocks', () => {
    for (let i = 0; i < RATE_LIMIT.MAX_MESSAGES; i++) {
      const res = checkAndConsume(sessionId);
      expect(res.allowed).toBe(true);
    }

    const blocked = checkAndConsume(sessionId);
    expect(blocked.allowed).toBe(false);
    expect(typeof blocked.retryAfterMs).toBe('number');
    expect(blocked.retryAfterMs).toBeGreaterThanOrEqual(0);
  });

  it('peek shows blocked when limit reached without consuming', () => {
    for (let i = 0; i < RATE_LIMIT.MAX_MESSAGES; i++) checkAndConsume(sessionId);
    const p = peek(sessionId);
    expect(p.allowed).toBe(false);
    expect(typeof p.retryAfterMs).toBe('number');
  });
});
