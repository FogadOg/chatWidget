import { NextResponse } from 'next/server';

/**
 * CSP Violation Report receiver.
 *
 * Accepts `application/csp-report` or `application/reports+json` (Reporting
 * API v1) POST requests from browsers and forwards structured events to the
 * configured SIEM / logging endpoint.
 *
 * Route: POST /api/security/csp-report
 */

interface CspViolationReport {
  'csp-report': {
    'document-uri'?: string;
    referrer?: string;
    'blocked-uri'?: string;
    'violated-directive'?: string;
    'effective-directive'?: string;
    'original-policy'?: string;
    'source-file'?: string;
    'line-number'?: number;
    'column-number'?: number;
    'status-code'?: number;
  };
}

interface ReportingApiReport {
  type: string;
  url: string;
  user_agent?: string;
  body: Record<string, unknown>;
}

// Simple in-memory rate limiter to prevent report flooding.
const reportCounts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT = 100; // max reports per IP per minute
const WINDOW_MS = 60_000;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = reportCounts.get(ip);
  if (!entry || now > entry.resetAt) {
    reportCounts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  if (entry.count >= RATE_LIMIT) return true;
  entry.count += 1;
  return false;
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const ip =
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
      'unknown';

    if (isRateLimited(ip)) {
      return new NextResponse(null, { status: 429 });
    }

    const contentType = request.headers.get('content-type') ?? '';
    let payload: CspViolationReport | ReportingApiReport[] | null = null;

    try {
      payload = await request.json();
    } catch {
      return new NextResponse(null, { status: 400 });
    }

    const structured = normalizeReport(payload, ip);

    // Forward to external SIEM if configured
    const siemEndpoint = process.env.CSP_REPORT_SIEM_ENDPOINT;
    if (siemEndpoint) {
      try {
        await fetch(siemEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(structured),
        });
      } catch {
        // Non-fatal: still log locally
      }
    }

    // Structured log for collection by log aggregators
    console.log('[CSP_REPORT]', JSON.stringify(structured));

    return new NextResponse(null, { status: 204 });
  } catch (err) {
    console.error('[CSP_REPORT] Unexpected error:', err);
    return new NextResponse(null, { status: 500 });
  }
}

function normalizeReport(
  payload: unknown,
  ip: string
): Record<string, unknown> {
  const base = {
    timestamp: new Date().toISOString(),
    source_ip: ip,
  };

  if (isLegacyReport(payload)) {
    const r = (payload as CspViolationReport)['csp-report'];
    return {
      ...base,
      type: 'csp-violation',
      blocked_uri: r['blocked-uri'],
      violated_directive: r['violated-directive'] ?? r['effective-directive'],
      document_uri: r['document-uri'],
      source_file: r['source-file'],
      line: r['line-number'],
      column: r['column-number'],
      original_policy: r['original-policy'],
    };
  }

  if (Array.isArray(payload)) {
    return {
      ...base,
      type: 'reporting-api',
      reports: payload,
    };
  }

  return { ...base, type: 'unknown', raw: payload };
}

function isLegacyReport(p: unknown): p is CspViolationReport {
  return (
    typeof p === 'object' &&
    p !== null &&
    'csp-report' in (p as Record<string, unknown>)
  );
}
