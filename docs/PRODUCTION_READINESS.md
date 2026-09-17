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
- `customer.create` — form → job queue → `CustomerLedger.Save()`, gated
  by `lib/capability-gate.ts` (fails closed - see below).
- `invoice.create`, `quote.create` — create wizard → job queue →
  `SalesJournal.Post()` (transaction type `0` for invoice, `2` for quote),
  same fail-closed gating.
- Deployment capability/version contract: `GET /api/capabilities`,
  `GET /health`, connector heartbeat capability advertising
  (`supportedActions`/`supportedSync`), surfaced in the frontend Settings →
  About section and the header connector-status chip.
- `/sync/quotes`, `/sync/invoice-summary` ingestion — the connector always
  sent both; the API now stores them (`quotes`, `invoice_summaries`
  tables) instead of 404ing. No read route or UI consumes this data yet -
  storage only, see Unsupported below.

### Capability gating fails closed, not open

An earlier version of this gating defaulted `invoice.create`/
`quote.create` to `true` whenever `GET /api/capabilities` failed to load,
and consulted only the API's deployment-wide flag - never the *specific*
company's connector. Both were real gaps: a metadata fetch failure could
silently permit a write the deployment didn't actually support, and an
API flag of `true` said nothing about whether that company's paired
connector was online or new enough to actually implement the action.

Fixed in `lib/capability-gate.ts` (`resolveActionAvailability`), used by
both `CreateWizard.tsx` and `app/customers/new/page.tsx`. An action is
`ready` to submit only when **all** of the following hold, and any other
outcome disables the action with an explicit, user-visible reason instead
of letting the request go out and fail downstream:

1. `GET /api/capabilities` resolved successfully (not loading, not errored)
   and its `features[action]` is `true`.
2. `GET /api/companies/{id}/connectors` resolved successfully for the
   selected company.
3. At least one non-revoked connector for that company reports `online`.
4. That online connector's `supportedActions` includes the action.

A failed fetch at step 1 or 2 resolves to `blocked`, never to `ready` -
there is no fallback branch that assumes support. An old connector that
never advertised capabilities reports an empty `supportedActions` array,
which is treated identically to "missing the capability", not "unknown,
so allow it". See `test/capability-gate.test.ts` for the full state
matrix (14 cases) and `docs/CAPABILITY_MATRIX.md` for where each action
uses this.

## Unsupported in Beta 1 (intentionally, and honestly surfaced)

- `invoice.lines`, `quote.lines` — no line-item data in the current API
  response; the invoice detail page says so explicitly rather than
  inventing figures.
- `invoice.email`, `quote.email` — no real, secure email mechanism exists
  in the current architecture (no server-side mail provider, no safe way
  to send credentials from the browser). No email action is exposed
  anywhere in the UI.
- `quote.read` — the API now stores every quote and invoice-summary the
  connector sends (`/sync/quotes`, `/sync/invoice-summary` - previously
  404ing, fixed this pass), but there is still no read route or UI. The
  invoices/quotes list page correctly says "The current API has no quote
  read route or quote sync. No quote history is shown." Building a read
  route plus a quotes-history UI remains new scope, not a hardening fix,
  and is excluded from this pass.
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
- CORS: `FRONTEND_ORIGINS` allow-list (`wrangler.toml`) now includes both
  the stable Vercel alias domain (`sagebridge-v3.vercel.app`) and the
  per-branch alias Vercel assigns to `beta1-rc1` deployments
  (`sagebridge-v3-git-beta1-rc1-hypedmo0ns-projects.vercel.app`), verified
  directly against the Vercel API's deployment metadata rather than
  guessed. Recent `beta1-rc1` deployments in that Vercel project show
  `target:null` (Preview), not `"production"`, so the stable alias domain
  may not always be serving the latest `beta1-rc1` build - without the
  branch-alias origin, a tester following a preview link would be
  rejected by CORS with exactly the symptom this project has seen before.
  Regression-tested in `test/capabilities.test.ts`.

### Beta/Production environment separation - release blocker

`wrangler.toml` previously said `ENVIRONMENT = "production"` while
`RELEASE = "beta1-rc1"` - a direct contradiction, now corrected to
`ENVIRONMENT = "beta"`. But the label was never the real problem: **there
is only one Cloudflare Worker and one D1 database (`sagebridge-db`) for
this entire project.** `[env.production]`/`[env.development]` in
`wrangler.toml` only override the Worker's deploy `name`, not `[vars]` or
the D1 binding - so Beta and Production share the same database today.
This is a genuine release blocker, not a cosmetic labeling issue: a
"Beta" tester and a "Production" user would read and write the exact same
company/financial data if both were ever pointed at this Worker
simultaneously. **Do not treat Beta and Production as isolated until a
second D1 database and a second Worker (or environment-scoped `[vars]`)
are actually provisioned** - a Cloudflare account action, not a code
change, and out of scope for this pass.

**Separately discovered, unresolved**: a second Vercel project,
`sagebridge-v3-beta` (live at `sagebridge-v3-beta.vercel.app`), exists on
the same Vercel account. It is **not linked to the `SageBridge-v3` GitHub
repository** (`link: null` in the Vercel API) and its deployment history
shows commits and an author (`Mireia Guide <mireia@users.noreply.github.com>`,
deployed by an actor named `hermes-agent`) that do not appear anywhere in
this repository's verified git history. Its own commit messages
("fix: point Beta release at Beta API", "fix: restore authenticated Beta
company access") imply a second, unknown API deployment this repository
has no record of. This was **not** added to `FRONTEND_ORIGINS` and no
assumption was made about its legitimacy - it needs a human decision:
confirm whether this is sanctioned Beta infrastructure (and if so, who
controls it and what API it points to) or have it investigated/removed.
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
path, is gated closed against its own connector's real capability, or is
honestly disabled/hidden; no client-side accounting value (tax, total) is
presented as Sage-authoritative without Sage as the source; `/sync/quotes`
and `/sync/invoice-summary` no longer 404 on every sync cycle.

**Gate status**: see the final report for the required status lines -
`Frontend test/build gate`, `API test/build gate`, `Connector test/build
gate`, `Cross-stack contract gate`, `Beta environment isolation gate`, and
`Real Sage E2E gate` - plus the two summary lines, `CODE-LEVEL RELEASE
GATE` and `REAL SAGE E2E RELEASE GATE`. The connector gate cannot be
`PASS` (only source-reviewed) without a `.NET SDK`, which this sandbox
does not have. The Beta environment isolation gate cannot be `PASS` until
a second D1 database/Worker is provisioned (see above). The Real Sage E2E
gate cannot be `PASS` until the real-E2E tests listed above are actually
executed against a real Sage 50 Canada SDK/company.
