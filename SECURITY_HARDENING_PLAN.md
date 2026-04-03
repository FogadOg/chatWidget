# Comprehensive Security Hardening — Implementation Plan

This document lays out a practical, phased plan to implement enterprise-grade security hardening for the widget and its backend services. It is intended to be actionable, assignable, and verifiable.

---

## Overview

Goal: Defense-in-depth protection for the widget code running on customer pages. Key controls:

- Content Security Policy (CSP) with reporting
- Subresource Integrity (SRI) for built assets
- Sandboxed iframe embed + secure postMessage API
- Input validation, sanitization, and safe output encoding
- TLS, HSTS, and transport hardening
- Secrets management & KMS-backed encryption at rest
- JWT RS256 authentication with JWKS and key rotation
- CI/CD checks, monitoring, and incident runbooks
- Compliance evidence and audit readiness

---

## Phase 0 — Discovery & Scoping

- Tasks:
  - Inventory origins, CDNs, build outputs, and hosting architecture.
  - Identify build manifest locations and artifact publishing flow.
- Owners: Security engineer + App owner
- Estimate: 1–2 days
- Deliverable: Inventory document mapping where CSP/SRI/iframe changes apply
- Verification: Review with infra and app teams

---

## Phase 1 — Browser Hardening (CSP + SRI + Sandbox)

- Tasks:
  - Design strict CSP policy (script-src, style-src, connect-src, img-src, font-src, object-src, frame-ancestors).
  - Implement per-request nonce middleware and inject nonce into server-rendered scripts and CSP header.
  - Add `report-uri`/`report-to` endpoint for CSP violations and forward to SIEM.
  - Add SRI hash generation into build pipeline and inject `integrity` and `crossorigin="anonymous"` into HTML.
  - Serve the widget from a dedicated origin and provide embed via a sandboxed iframe (prefer `sandbox="allow-scripts"` without `allow-same-origin`).
  - Implement a minimal postMessage handshake with origin validation and schema validation.
- Owners: Frontend, Backend/SRE, Security
- Estimate: 5–8 days total (split across teams)
- Deliverables: middleware for nonce, `next.config` or server header updates, SRI build script, embed snippet, CSP report endpoint
- Verification: automated tests assert CSP header exists; browser tests confirm SRI attributes and iframe sandbox prevents cookie/localStorage access

---

## Phase 2 — Input / Output Hardening

- Tasks:
  - Standardize client-side sanitization (`DOMPurify`) for any HTML rendering.
  - Remove unsafe `innerHTML` / `dangerouslySetInnerHTML` usages unless sanitized.
  - Enforce server-side validation with schema validators (zod/Joi) for all public endpoints.
  - Ensure parameterized queries or ORM usage for DB operations; validate and canonicalize file upload paths and names.
- Owners: Frontend + Backend
- Estimate: 4–6 days
- Deliverables: PRs replacing unsafe render paths, validation middleware, tests for SQL/file injection vectors
- Verification: unit/integration tests and static analysis reporting no high-risk injection findings

---

## Phase 3 — Transport & Secrets

- Tasks:
  - Enforce TLS 1.3 at CDN/load-balancer and enable HSTS headers (`max-age=31536000; includeSubDomains; preload`).
  - Ensure cookies used by the widget are `Secure; HttpOnly; SameSite` as appropriate.
  - Integrate KMS / HashiCorp Vault for key storage and secret rotation; remove secrets from repo.
  - Implement AES-256 envelope encryption for sensitive fields, protected by KMS-managed keys.
- Owners: Infra/SRE, Backend
- Estimate: 5–9 days
- Deliverables: infra config, KMS integration, re-encryption plan for sensitive data
- Verification: key usage logs, decryption tests, HSTS/TLS validation

---

## Phase 4 — Authentication & Key Rotation

- Tasks:
  - Issue JWTs signed with RS256, publish a JWKS endpoint, include `kid` headers for key selection.
  - Implement automated key rotation processes and short token TTLs; support refresh token revocation.
  - Implement JWKS caching and verification with fallback behavior.
- Owners: Backend + SRE
- Estimate: 4–6 days
- Deliverables: JWKS endpoint, token issuance & verification code, rotation scripts
- Verification: token rotation tests, cross-key verification tests

---

## Phase 5 — CI/CD, Monitoring & Runbooks

- Tasks:
  - Add CI checks for SRI presence, CSP header enforcement, linter security rules, dependency scanning (Snyk/Dependabot), and secret-scanning.
  - Ingest CSP reports and security events into SIEM (Datadog/Splunk/Sentry) and create alerting rules (PagerDuty).
  - Create runbooks for CSP violations, key compromise, data breach, and incident response flows.
- Owners: DevOps, SecOps, Engineering
- Estimate: 4–7 days
- Deliverables: CI jobs, alert rules, runbooks
- Verification: simulated incidents, alert tests, CI gate passing

---

## Phase 6 — Compliance & Audit Readiness

- Tasks:
  - Document controls (access, encryption, logging, change mgmt) required for SOC2/ISO27001.
  - Prepare evidence collection (logs, config, policies) and perform gap analysis.
  - Remediate gaps and prepare for third-party audit.
- Owners: Compliance, Security, Engineering
- Estimate: 2–4+ weeks depending on scope
- Deliverables: control documentation, evidence pack, gap report
- Verification: internal audit and readiness review; third-party audit completion

---

## Acceptance Criteria (high level)

- CSP enforced globally with per-request nonce or equivalent strict policy; `report-uri` enabled and reporting into SIEM.
- All public JS/CSS assets published with SRI and CI gate fails if integrity attributes are missing.
- Widget served from dedicated origin and embedded within a sandboxed iframe that cannot access host cookies or storage.
- All inputs validated and sanitized; no critical injection test failures on unit/integration suites.
- TLS 1.3 enforced, HSTS set, and secrets managed by KMS/Vault with rotation policy (e.g., 90 days).
- JWT tokens signed RS256 with JWKS support and documented rotation process.
- CSP and security events pipeline feeding SIEM with alerting and operational runbooks.

---

## Next immediate steps (recommended)

1. Run Phase 0 inventory and drop results into `security/inventory.md`.
2. Implement Phase 1 nonce middleware and CSP header in `middleware.ts` and `next.config.mjs` (or server).
3. Add a small CSP report receiver endpoint and pipe reports to the chosen SIEM.

---

## Notes and references

- Consider `webpack-subresource-integrity` or a Node script to compute SRI hashes at build time.
- Use `DOMPurify` for client-side sanitization and `zod`/`Joi` for server validation.
- Use `jose` or `jsonwebtoken` for RS256 and JWKS handling; cache JWKS and rotate keys with `kid`.

## Repository-specific changes (detailed)

Below are concrete, actionable changes to implement in each repository. Use these as a checklist for PRs and code review.

### widget-app (frontend)

- CSP and nonces:
  - Add per-request nonce middleware: `widget-app/middleware.ts` or `widget-app/app/middleware.ts` (Next.js middleware). Generate a cryptographically secure nonce per request and attach it to `res.locals`/request context or render props.
  - Inject the nonce into server-rendered HTML script/style tags. For Next.js SSR pages, add `<script nonce={nonce}>` in `widget-app/app/layout.tsx` or `_document.tsx` equivalents.
  - Expose the nonce to client hydration safely (e.g., inline script with only the nonce value and strict CSP) or add it to a `meta` tag read by client code.
  - Add/modify `widget-app/next.config.ts` to include a baseline CSP header (for static responses) and ensure middleware computes the per-request header when applicable.

- CSP reporting:
  - Add a dev/testing receiver in `widget-app/src/pages/api/security/csp-report.ts` or `widget-app/src/app/api/security/csp-report/route.ts` (depending on routing) to accept `application/csp-report` and forward to a central endpoint or log for local testing.

- SRI:
  - Add an SRI generation script in `widget-app/scripts/generate-sri.js` or integrate `webpack-subresource-integrity` if using a custom webpack build.
  - Update HTML templates or Next.js `_document` to include `integrity` and `crossorigin="anonymous"` attributes for built JS/CSS. Ensure `public/` assets are included as well.
  - Add a build step in `widget-app/package.json` scripts that runs the SRI generator and outputs a manifest (e.g., `sri-manifest.json`).

- Sandboxed iframe & postMessage:
  - Add an embed host example `widget-app/src/embed/host.tsx` showing creating the iframe with `sandbox="allow-scripts"` (no `allow-same-origin`) and `referrerPolicy="no-referrer"`.
  - Place the widget runtime at a dedicated origin (e.g., `widget.example.com`) and ensure the build outputs an embed entrypoint `widget-app/src/embed/embedEntry.tsx` or similar.
  - Implement strict handshake in `widget-app/src/embed/handshake.ts` where messages include an ephemeral handshake token and messages are validated against a narrow schema.

- Client sanitization & rendering:
  - Audit the codebase for `dangerouslySetInnerHTML` and `innerHTML` usages. Replace with safe render paths and `DOMPurify` where HTML must be shown.
  - Add a shared sanitizer wrapper `widget-app/src/lib/sanitize.ts` that centralizes DOMPurify configuration and allowed tags.

- Tests & CI:
  - Add unit/integration tests under `__tests__` to assert CSP header presence for SSR pages and that built HTML includes SRI attributes (use `jest` and DOM parsing of build output).
  - Add a CI step in `.github/workflows/ci.yml` to run the SRI generator and fail if `sri-manifest.json` is missing or integrity attributes are not applied.

- Developer docs:
  - Add `widget-app/docs/security.md` describing how to embed the widget, recommended CSP entries for integrators, and how to rotate embed tokens.

### assistantApp (backend)

- CSP reporting + aggregation:
  - Implement a hardened receiver endpoint `assistantApp/assistant_api/security/csp_report.py` or `assistantApp/assistant_api/views/csp_report.py` (Django/Flask/Express equivalent) that validates reports, rate-limits, and forwards structured events to SIEM.
  - Normalize report payloads and attach context (request id, tenant id) before forwarding.

- Authentication / JWKS / token management:
  - Implement an RS256 signing service in `assistantApp/auth/` that issues JWTs with `kid` headers and publishes keys to a JWKS endpoint: e.g. `assistantApp/auth/jwks/`.
  - Add key-rotation automation scripts `assistantApp/scripts/rotate_keys.py` that create new keypairs, publish new JWKS entries, and transition live services to using the new `kid`.
  - Ensure verification implements JWKS caching and fallback to refresh on verification failure.

- Input validation & DB protections:
  - Introduce request validation middleware using `pydantic` / `marshmallow` / `zod`-equivalent, applied to all public endpoints (e.g., `assistantApp/assistant_api/middleware/validation.py`).
  - Ensure all DB access uses parameterized queries or ORM APIs (review `assistantApp/**/models.py` and data access code). Add PRs replacing any raw string interpolation queries.

- Data-at-rest encryption & KMS:
  - Add envelope encryption helpers in `assistantApp/utils/encryption.py` that encrypt sensitive fields with data keys and store the data key encrypted by KMS.
  - Add scripts and migration plans to re-encrypt sensitive columns and store KMS key ARNs or key identifiers in secure config.

- Secrets & key storage:
  - Remove any checked-in secrets; integrate HashiCorp Vault or AWS Secrets Manager. Add runtime code to fetch secrets at startup with caching in `assistantApp/config/secrets.py`.

- Monitoring & alerting:
  - Integrate CSP reports, auth failures, and suspicious DB errors into the logging pipeline (structured JSON) and forward to SIEM. Implement parsers in `assistantApp/monitoring/` and create dashboards/alert rules.

- Compliance & runbooks:
  - Add `assistantApp/docs/security_runbooks.md` with remediation steps for key compromise, CSP violation flood, and data breach.

---

If you want, I can implement Phase 1 (nonce middleware and CSP header) now in `widget-app` and add tests.

