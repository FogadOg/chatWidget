import React from 'react';

const mockRedirect = jest.fn();
const mockHeaders = jest.fn();

jest.mock('next/navigation', () => ({
  redirect: (url: string) => mockRedirect(url),
}));

jest.mock('next/headers', () => ({
  headers: () => mockHeaders(),
}));

jest.mock('../lib/i18n', () => ({
  resolveLocaleCandidates: (candidates: string[]) => {
    if (candidates.includes('de')) return 'de';
    if (candidates.includes('fr')) return 'fr';
    return 'en';
  },
}));

import RootPage from '../app/page';

describe('app/page.tsx (root redirect)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('redirects to /en when Accept-Language is missing', async () => {
    mockHeaders.mockReturnValue({ get: () => null });
    await RootPage();
    expect(mockRedirect).toHaveBeenCalledWith('/en');
  });

  it('redirects to preferred locale from Accept-Language header', async () => {
    mockHeaders.mockReturnValue({ get: () => 'de-DE,de;q=0.9,en;q=0.8' });
    await RootPage();
    expect(mockRedirect).toHaveBeenCalledWith('/de');
  });

  it('redirects to /fr when french is preferred', async () => {
    mockHeaders.mockReturnValue({ get: () => 'fr-FR,fr;q=0.9' });
    await RootPage();
    expect(mockRedirect).toHaveBeenCalledWith('/fr');
  });

  it('falls back to /en for unsupported locale', async () => {
    mockHeaders.mockReturnValue({ get: () => 'zh-CN,zh;q=0.9' });
    await RootPage();
    expect(mockRedirect).toHaveBeenCalledWith('/en');
  });

  it('handles empty Accept-Language string', async () => {
    mockHeaders.mockReturnValue({ get: () => '' });
    await RootPage();
    expect(mockRedirect).toHaveBeenCalledWith('/en');
  });
});
