# SageBridge Beta 1 — Production Readiness

This document is the release-gate reference for Beta 1 across the three
SageBridge repositories: frontend (`SageBridge-v3` `beta1-rc1`), API
(`SageBridge-API` `beta1-rc1`), connector (`SageBridge-Connector`
`phase1-production-connector`). It reflects source evidence gathered by
direct repository inspection, not aspirational scope. See
`docs/CAPABILITY_MATRIX.md` for the per-capability trace this document
summarizes.

## Supported in Beta 1

Code path complete, end-to-end wired, and covered by automated tests
(not yet Sage-verified unless stated otherwise):

- `customer.read`, `invoice.read`, `product.read` — connector sync →
  API → frontend, all backed by real synced data, no client fabrication.
- `customer.create` — form → job queue → `CustomerLedger.Save()`.
- `invoice.create`, `quote.create` — create wizard → job queue →
  `SalesJournal.Post()` (transaction type `0` for invoice, `2` for quote).
- Deployment capability/version contract: `GET /api/capabilities`,
  `GET /health`, connector heartbeat capability advertising
  (`supportedActions`/`supportedSync`), surfaced in the frontend Settings →
  About section and the header connector-status chip.

## Unsupported in Beta 1 (intentionally, and honestly surfaced)

- `invoice.lines`, `quote.lines` — no line-item data in the current API
  response; the invoice detail page says so explicitly rather than
  inventing figures.
- `invoice.email`, `quote.email` — no real, secure email mechanism exists
  in the current architecture (no server-side mail provider, no safe way
  to send credentials from the browser). No email action is exposed
  anywhere in the UI.
- `quote.read` — no API route or D1 storage for synced quotes. The
  connector already POSTs `/sync/quotes` and `/sync/invoice-summary`
  (`SyncEngine.cs`), but the API has no handler for either path yet. This
  is real, currently-inert drift on the connector's send side; it does
  not reach the user because there is no corresponding UI. Left
  unimplemented this pass — building the API route plus a quotes-history
  UI is new scope, not a hardening fix, and was excluded to avoid
  expanding the feature surface under a stabilization task.
- `inventory.quantity`, `bom.read`, `bom.build`, `bom.unbuild` — no
  connector code exists for any of these (verified by direct grep of the
  connector source; zero matches for quantity-on-hand or BOM SDK calls).

## Requires real Sage verification

The following are "code path complete" only — reviewed against actual
source, never executed against a real Sage 50 SDK/company:

- **`invoice.create` transaction type.** `SageService.cs:669` sets
  `SalesJournal.SelectTransType(0)` for invoices, with an explicit
  in-source comment flagging it as unverified. This must be confirmed
  against a real Sage 50 Canada company before this is trusted in
  production — a wrong transaction type could post the wrong document
  type in a customer's real books.
- **`quote.create` / `customer.create` correctness end-to-end** —
  `SalesJournal.Post()` / `CustomerLedger.Save()` return values and
  resulting Sage-side record state have not been observed against a real
  SDK instance.
- **`inventory.quantity` and all `bom.*`** — no implementation exists to
  verify; explicitly marked `REQUIRES_REAL_SDK_VERIFICATION` rather than
  guessed at.
- Idempotency/duplicate-write safety (see Failure recovery below) — the
  ledger state machine has been reviewed in source but never exercised
  against a live connector process under real restart/timeout conditions.

## Required real-E2E tests (not yet run)

To close the above, before a production release:

1. Post one real invoice and one real quote against a real Sage 50 Canada
   test company; confirm both land as the correct document type (not
   swapped) and the correct customer/lines.
2. Create a real customer via the connector and confirm the resulting
   `CustomerLedger` record matches the submitted fields.
3. Kill the connector process mid-write, immediately after Sage's
   `Post()`/`Save()` returns `true` but before the cloud has acknowledged
   the result; restart the connector; confirm the operation ledger's
   `result_pending` row is redelivered to the cloud and the write is
   **not** re-submitted to Sage.
4. Double-submit the same idempotency key (simulating a duplicate click)
   against a live queue; confirm the `UNIQUE(tenant_id, company_id,
   request_id)` constraint and `payload_hash` fingerprint both reject the
   replay without a second Sage write.
5. Force a job claim to expire (simulate a stalled connector) and confirm
   another connector instance can safely reclaim it without a double
   write.
6. Attempt a cross-company job claim/result submission and confirm it is
   rejected by company/tenant scoping.
7. Time out a request after Sage has already accepted the write
   (`Post()`/`Save()` returned `true`) and confirm the retry path only
   retries *result delivery*, never re-invokes the Sage write.

## Security boundaries

- User auth: Firebase RS256 JWT, `email_verified` required, verified
  server-side in the API (`requireUser`). No legacy API-key browser auth
  path exists post-hardening.
- Connector auth: separate per-connector credential
  (`X-Connector-Id`/`X-Connector-Credential`), hashed (SHA-256) at rest,
  never accepted from a browser-facing route.
- Tenant/company isolation: every company-scoped route requires
  `requireCompanyAccess`/`X-Company-Id` plus organization ownership
  checks; connector job claim/result routes are scoped by
  `connector.organizationId`/`connector.companyId`.
- CORS: `FRONTEND_ORIGINS` allow-list (now set in `wrangler.toml` —
  previously empty, which silently rejected every real browser origin;
  fixed and regression-tested in `test/capabilities.test.ts`).
- All Sage writes go through the official SDK (`CustomerLedger.Save()`,
  `SalesJournal.Post()`); no direct SQL writes into Sage tables exist
  anywhere in the connector. Read-only SQL (`SDKDatabaseUtility`) is used
  only where the existing architecture already relies on it for sync
  reads, never for writes.

## Failure recovery

- **Financial-write safety invariant**: once the connector observes
  `Post()`/`Save()` succeed, it transitions the operation ledger to
  `result_pending` (`OperationLedger.cs`) and from then on only retries
  *delivering the result* to the cloud — it never re-runs the Sage write.
  This is enforced by the ledger's state machine, reviewed in source; not
  yet exercised under a real crash/restart (see Required real-E2E tests).
- **Duplicate-click / retry safety**: cloud-side idempotency is enforced
  by `UNIQUE(tenant_id, company_id, request_id)` plus a `payload_hash`
  fingerprint on `connector_jobs` (migrations `0002`, `0003`, `0005`).
- **Job claim timeout**: claims use an atomic compare-and-swap
  (`meta.changes` count checks in `src/handlers/connector.ts`) so a
  stalled connector's claim can expire and be safely reclaimed without a
  double write — reviewed in source, not yet load-tested.
- **Connector offline**: frontend now reflects real connector liveness
  (header chip shows "Offline" instead of a hardcoded "Synced" when the
  selected company's connector hasn't reported in) rather than presenting
  a false-positive sync state.

## Versioning

- API exposes `release`, `apiVersion`, `schemaVersion`, `buildSha` via
  `GET /api/capabilities` and `GET /health`, each sourced from
  `wrangler.toml`/environment variables, falling back to `"unknown"` —
  never a fabricated value.
- Connector exposes its version via `ConnectorVersion.Current` (heartbeat
  and `/health` locally); previously `ApiServer.cs` hardcoded `"1.0.0"`
  while heartbeat sent the real `"1.1.0"` — fixed to a single source of
  truth this pass.
- Connector capability advertising (`supportedActions`/`supportedSync`)
  travels in the heartbeat payload and is persisted in
  `connectors.health_json`, exposed to the frontend via
  `GET /api/companies/{id}/connectors` so the UI can in principle react
  to what a *specific* connector build actually supports, not just what
  the API's static feature flags allow.

## Deployment gate

**Frontend** (`SageBridge-v3`): `npm test`, `npx tsc --noEmit`,
`npx eslint . --max-warnings=0`, production build, `git diff --check` —
see the final report for this pass's actual run results.

**API** (`SageBridge-API`): typecheck, `npm test` (34/34 passing as of
commit `4cda757`), capability/contract tests
(`test/capabilities.test.ts`).

**Connector** (`SageBridge-Connector`): compiles against .NET Framework
4.8 x86 (target unverified this pass — no `.NET SDK` available in this
sandbox); `SageBridge.Tests` action-capability/cross-file consistency
tests reviewed by careful manual grep-verification of every referenced
symbol, not compiled or executed.

**Across repos**: capability matrix (`docs/CAPABILITY_MATRIX.md`) has no
unexplained gaps as of this pass; every enabled UI action has a complete
path or is honestly disabled/hidden; no client-side accounting value
(tax, total) is presented as Sage-authoritative without Sage as the
source. Remaining gap: `/sync/quotes` and `/sync/invoice-summary` have no
receiving API route (documented above, not user-visible).

**Gate status**: see the final report for the two required, separate
status lines — `CODE-LEVEL RELEASE GATE` and `REAL SAGE E2E RELEASE GATE`.
The latter cannot be `PASS` until the real-E2E tests listed above are
actually executed against a real Sage 50 Canada SDK/company; no such
execution occurred as part of this pass.
