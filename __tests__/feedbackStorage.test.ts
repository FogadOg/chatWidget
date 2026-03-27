import { STORAGE_KEYS } from '../lib/embedConstants';

describe('STORAGE_KEYS.feedbackKey', () => {
  it('includes the companin- prefix', () => {
    const key = STORAGE_KEYS.feedbackKey('sess-123');
    expect(key).toBe('companin-feedback-sess-123');
  });
});
