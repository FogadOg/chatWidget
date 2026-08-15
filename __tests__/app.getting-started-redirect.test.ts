/**
 * The non-localized /docs/getting-started route is kept only as a redirect to
 * the default locale so existing links keep working — the guide itself lives at
 * /[locale]/docs/getting-started (single source of truth).
 */

import { redirect } from 'next/navigation';
import GettingStartedRedirect from '../app/docs/getting-started/page';

jest.mock('next/navigation', () => ({
  redirect: jest.fn(),
}));

describe('/docs/getting-started', () => {
  it('redirects to the default-locale guide', () => {
    GettingStartedRedirect();
    expect(redirect).toHaveBeenCalledWith('/en/docs/getting-started');
  });
});
