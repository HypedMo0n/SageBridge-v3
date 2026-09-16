# SageBridge Connector - Installer UX Contract

**Audience:** the sagebridge-connector project. **Status:** target UX for a future installer. Nothing in this document is built by this change - this is a specification, written from the frontend/Help Center work, for the connector team to build against.

## Why this exists

Today, installing and pairing the connector requires no console commands but also no guided installer - a customer runs whatever build exists on `sagebridge-connector` and pairs it using a code from SageBridge. The Help Center documents that honestly (see `/help/install-connector` and `/help/connect-sage-50`). This document specifies the installer experience the Help Center's install instructions assume will eventually exist, so the two projects converge instead of drifting.

**Boundary:** this frontend task does not build or modify the installer, the connector's pairing protocol, or its credential storage. Where this document proposes UI, it explicitly reuses the existing pairing code exchange (`POST /api/companies/{companyId}/pairing-codes` → connector submits the code) rather than proposing a new security protocol.

## Target flow

```
Download → Install → Authorize → Sync → Done
```

No console window should be required for the normal customer experience.

### 1. Welcome

- Headline: "Welcome to SageBridge"
- One or two sentences: SageBridge securely connects Sage 50 to the customer's SageBridge account. The customer's Sage 50 data stays on this computer; only the customer's SageBridge account can request syncing and posting.
- Single "Continue" action. No configuration shown yet.

### 2. System Check

Check what is technically possible before proceeding, and show each as pass/fail/unknown - never silently skip a failed check:

| Check | Notes |
|---|---|
| Supported Windows version | Exact supported versions are not yet documented anywhere in this project - confirm with the connector team before shipping this check. |
| Sage 50 availability | Detect an installed, licensed Sage 50 on this machine. |
| Sage Connection Manager / SDK dependencies | Whatever the connector's Sage integration currently requires at runtime. |
| Internet connectivity | A basic reachability check, independent of the SageBridge API itself. |
| SageBridge API connectivity | A request to the API's existing unauthenticated `GET /health` endpoint is sufficient - it already reports `status`, `release`, and `apiContractVersion` with no secrets, and needs no new endpoint. |

A failed check should explain the failure in plain language and link to the relevant Help Center article (`/help/system-requirements`, `/help/sage-50-not-detected`) rather than a raw error code.

### 3. Account Connection

Prefer a browser-based hand-off over typing a code, if the installer can open the user's default browser to a SageBridge page that itself performs the pairing:

- The installer opens the browser to a SageBridge pairing page.
- The user signs in to SageBridge there (or is already signed in) and confirms pairing this computer.
- SageBridge issues a pairing code behind the scenes and hands it back to the installer (for example, via a short-lived local callback), instead of the user manually typing an 8-character code.

**This does not change the pairing protocol** - it is the same `pairing-codes` exchange, initiated from the browser side instead of by hand. If a browser hand-off turns out to need a new callback mechanism the API does not yet expose, that is a genuine backend requirement to raise with the API team before building it - do not invent one silently.

If a browser hand-off isn't feasible for the first version, the installer falls back to today's flow: display a field for the customer to paste the pairing code generated from SageBridge (`/pair`).

### 4. Sage Connection

Show real, current progress - never a fake progress bar. Suggested states, each tied to something the API or connector can actually confirm:

1. SageBridge account connected (pairing exchange succeeded)
2. Sage company detected (the connector found and opened the target Sage 50 company)
3. Connector registered (the API's connector record exists for this pairing)
4. Synchronizing data (provisioning is under way - see `ProvisioningState` in `SageBridge-v3/lib/types.ts` for the state machine already used by the phone/web app for this same concept)

Reuse the existing `ProvisioningState`/`PROVISIONING_STATES` state machine (`sagebridge-api/src/handlers/phase1.ts`) for this step rather than inventing a parallel one - the phone/web onboarding screen already polls and renders it (`SageBridge-v3/components/ConnectorSetup.tsx`).

### 5. Completion

- Headline: "You're connected."
- Button: "Open SageBridge" - opens the SageBridge web app (or a deep link, if a native shell is ever built) directly to the dashboard.
- No further action required from the customer.

## Explicitly out of scope for the installer team to infer from this document

- This document does not define a new authentication or pairing protocol - the existing pairing-code exchange is the mechanism, however it's triggered.
- This document does not commit to specific supported Windows/Sage 50 versions - those need confirming (see `/help/system-requirements`'s own "needs confirmation" note) before they appear in an installer or in customer-facing copy.
- Hosting and distributing the installer itself (a signed installer artifact, a download URL, an update mechanism) is not specified here - see `SageBridge-v3/lib/connector-release.ts` for the frontend's current "no authoritative download URL exists yet" state, which this installer's eventual release should resolve.
