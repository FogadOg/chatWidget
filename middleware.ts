import { NextRequest, NextResponse } from 'next/server';
import { nanoid } from 'nanoid';

/**
 * Per-request nonce middleware.
 *
 * Generates a cryptographically-unique nonce for every request and injects it
 * into both the `Content-Security-Policy` response header and the
 * `x-nonce` request header so that downstream RSC / server components can
 * read it via `headers()`.
 *
 * The CSP covers:
 *  - script-src   – only 'self' + the per-request nonce (no unsafe-inline)
 *  - style-src    – 'self' + 'unsafe-inline' (required for Tailwind runtime)
 *  - connect-src  – 'self' + the configured API origin
 *  - img-src      – 'self' data: https:
 *  - font-src     – 'self' data:
 *  - object-src   – 'none'  (no plugins)
 *  - base-uri     – 'self'
 *  - form-action  – 'self'
 *  - frame-ancestors – 'none' by default (overridden for /embed/* routes)
 *
 * Violation reports are sent to /api/security/csp-report.
 */

function buildCsp(nonce: string): string {
  const apiOrigin =
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    "'self'";

  const directives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': `'self' 'nonce-${nonce}'`,
    'style-src': "'self' 'unsafe-inline'",
    'connect-src': `'self' ${apiOrigin}`,
    'img-src': "'self' data: https:",
    'font-src': "'self' data:",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': "'none'",
    'report-uri': '/api/security/csp-report',
    'report-to': 'csp-endpoint',
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v}`)
    .join('; ');
}

export function middleware(request: NextRequest): NextResponse {
  const nonce = nanoid(32);

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        'x-nonce': nonce,
      }),
    },
  });

  const csp = buildCsp(nonce);
  response.headers.set('Content-Security-Policy', csp);

  // Report-To header (Reporting API v1)
  response.headers.set(
    'Report-To',
    JSON.stringify({
      group: 'csp-endpoint',
      max_age: 86400,
      endpoints: [{ url: '/api/security/csp-report' }],
    })
  );

  // Additional hardening headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=(), payment=()'
  );

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for static files and Next.js internals.
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
};
