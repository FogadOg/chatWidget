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

function buildCsp(nonce: string, pathname: string): string {
  // Collect extra API origins to allow in connect-src. Check all relevant
  // env var names so local dev (.env.local) and production deployments both work.
  const apiOriginRaw =
    process.env.NEXT_PUBLIC_API_BASE_URL ||
    process.env.NEXT_PUBLIC_API_ORIGIN ||
    process.env.NEXT_PUBLIC_BACKEND_URL ||
    '';
  // Only add to connect-src when it's a real URL (not empty / already 'self')
  const extraConnectSrc = apiOriginRaw && !apiOriginRaw.includes("'self'")
    ? ` ${apiOriginRaw}`
    : '';

  // Embed iframe pages must allow framing from any origin so the host page
  // (potentially on a different port or domain) can embed the widget.
  const isEmbedRoute = pathname.startsWith('/embed/');
  const frameAncestors = isEmbedRoute ? '*' : "'none'";

  // Turbopack (Next.js dev server) uses eval() for source maps — allow it only
  // in development so we don't weaken production security.
  const unsafeEval = process.env.NODE_ENV === 'development' ? " 'unsafe-eval'" : '';

  const directives: Record<string, string> = {
    'default-src': "'self'",
    'script-src': `'self' 'nonce-${nonce}'${unsafeEval}`,
    'style-src': "'self' 'unsafe-inline'",
    'connect-src': `'self'${extraConnectSrc}`,
    'img-src': "'self' data: https:",
    'font-src': "'self' data:",
    'object-src': "'none'",
    'base-uri': "'self'",
    'form-action': "'self'",
    'frame-ancestors': frameAncestors,
    'report-uri': '/api/security/csp-report',
    'report-to': 'csp-endpoint',
  };

  return Object.entries(directives)
    .map(([k, v]) => `${k} ${v}`)
    .join('; ');
}

export function middleware(request: NextRequest): NextResponse {
  const nonce = nanoid(32);
  const pathname = request.nextUrl.pathname;
  const isEmbedRoute = pathname.startsWith('/embed/');

  const response = NextResponse.next({
    request: {
      headers: new Headers({
        ...Object.fromEntries(request.headers.entries()),
        'x-nonce': nonce,
      }),
    },
  });

  const csp = buildCsp(nonce, pathname);
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
  // Embed routes must not send X-Frame-Options: DENY — the CSP frame-ancestors
  // directive above is the authoritative framing policy for those pages.
  if (!isEmbedRoute) {
    response.headers.set('X-Frame-Options', 'DENY');
  }
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
