# SageBridge Capability Matrix

Authoritative trace of every user-facing action across
frontend (`SageBridge-v3`, `beta1-rc1`) → API (`SageBridge-API`, `beta1-rc1`) →
connector job/sync (`SageBridge-Connector`, `phase1-production-connector`) →
Sage 50 Canada SDK ("SimplySDK"). Built from direct repository evidence
(grep/read of the actual source, not from what any UI claims about itself).

Legend: **Real Sage verified** means executed against a real, installed
Sage 50 Canada SDK/company by a human or CI runner with that SDK present.
No such run has occurred in the sandbox this work was done in (no `dotnet`
SDK, no Sage 50 install) — see `docs/PRODUCTION_READINESS.md`. A green unit
test or a successful `Post()`/`Save()` call reviewed in source does **not**
satisfy this column; it only satisfies "Code path complete".

| Capability | UI | Frontend call | API route | Connector action | Sage SDK call | Automated tests | Real Sage verified | Release status |
|---|---|---|---|---|---|---|---|---|
| `customer.read` | Customers list, customer detail | `api.getCustomers()` / `api.getCustomer()` | `GET /api/customers` | `/sync/customers` (poll-driven) | `SDKInstanceManager` read via synced D1 rows (populated by connector sync, not a live per-request SDK call) | API integration tests (`test/integration.test.ts`) | No | Supported in Beta 1 |
| `customer.create` | "New customer" form (`app/customers/new`) | `api.createCustomer()` → job poll | `POST /api/customers` (job enqueue), `GET /api/jobs/{id}` | `JobPoller.cs` case `"customer.create"` → `SageService.cs` (~843–858) | `SDKInstanceManager.Instance.OpenCustomerLedger()` → `CustomerLedger.Save()` | API tests; connector `Phase2RepositoryTests.cs` (source/dispatch-consistency checks, not an executed Sage write) | No | Code path complete; not yet Sage-verified |
| `invoice.read` | Invoices list, invoice detail | `api.getInvoices()` / `api.getInvoice()` | `GET /api/invoices` | `/sync/invoices` | Read via synced D1 rows | API integration tests | No | Supported in Beta 1 |
| `invoice.create` | Create wizard (`CreateWizard.tsx`, `initialKind="invoice"`) | `api.createInvoice()` → job poll | `POST /api/invoices`, `GET /api/jobs/{id}` | `JobPoller.cs` case `"invoice.create"` → `SageService.cs` (~663–704) | `SalesJournal.SelectTransType(0)` (commented `// invoice/sale - see UNVERIFIED note above` at `SageService.cs:669`) → `.Post()` | API tests; connector source-consistency tests only | **No — explicitly unverified in source** | Code path complete; **requires real SDK verification before claiming this transaction type is correct** |
| `invoice.lines` | — | — | not implemented | — | — | — | No | Unsupported — `FEATURES['invoice.lines']=false`; invoice detail page explicitly states "Line items are not included in the current invoice API response. No line details are invented." (`app/invoices/[id]/page.tsx`) |
| `invoice.email` | — | — | not implemented | — | — | — | No | Unsupported — `FEATURES['invoice.email']=false`; no email action exposed anywhere in the UI |
| `quote.create` | Create wizard (`CreateWizard.tsx`, `initialKind="quote"`) | `api.createQuote()` → job poll | `POST /api/quotes`, `GET /api/jobs/{id}` | `JobPoller.cs` case `"quote.create"` → `SageService.cs` (~563–617) | `SalesJournal.SelectTransType(2)` → `.Post()` | API tests; connector source-consistency tests only | No | Code path complete; not yet Sage-verified |
| `quote.read` | — | — | not implemented (`FEATURES['quote.read']=false`) | Connector *does* POST `/sync/quotes` (`SyncEngine.cs:122`, `PostOptionalToCloudAsync`) but the API has no route to receive it | — | — | No | Honestly unsupported — invoices/quotes list page explicitly states "The current API has no quote read route or quote sync. No quote history is shown." No `app/quotes/page.tsx` or `app/quotes/[id]` exists, so there is no UI drift here. **Known drift**: connector already sends this data with nowhere for it to land — documented, not implemented this pass (would require new API route + read UI, judged out of scope for this hardening pass) |
| `quote.lines` / `quote.email` | — | — | not implemented | — | — | — | No | Unsupported, same reasoning as `invoice.lines`/`invoice.email` |
| `product.read` | Products/catalogue page, line-item picker in create wizard | `api.getProducts()` | `GET /api/products` | `/sync/products` | Read via synced D1 rows | API integration tests | No | Supported in Beta 1 |
| `inventory.quantity` | — | — | not implemented | Connector does not read or advertise Sage quantity-on-hand anywhere in source (`grep QuantityOnHand\|Inventory` in connector returns no matches) | — | — | No | **REQUIRES_REAL_SDK_VERIFICATION** — no evidence the connector's read-only SDK access can even authoritatively resolve a quantity-on-hand column; left `false`, not attempted this pass per the task's own instruction not to fabricate Sage functionality |
| `bom.read` / `bom.build` / `bom.unbuild` | — | — | not implemented | Zero evidence anywhere in connector source (`grep BillOfMaterial\|BOM` returns no matches) | — | — | No | **REQUIRES_REAL_SDK_VERIFICATION** — no BOM code exists in the connector at all; classified separately per Phase 13, all three left `false` |
| Connector capability advertising | Settings → About (this pass); header "Synced/Offline" chip | `api.getConnectors(companyId)`, `api.getCapabilities()` | `GET /api/companies/{id}/connectors`, `GET /api/capabilities` | `HeartbeatSender.cs` sends `supportedActions`/`supportedSync` (`ConnectorCapabilities.cs`) each heartbeat | n/a (metadata only) | `test/capabilities.test.ts` (API, 10 tests); `Phase2RepositoryTests.cs` cross-file consistency checks (connector, unexecuted — no `dotnet` SDK in this sandbox) | n/a | Supported in Beta 1 |
| Deployment metadata contract | Settings → About | `api.getCapabilities()` | `GET /api/capabilities` | n/a | n/a | `test/capabilities.test.ts` | n/a | Supported in Beta 1 |

## Notes on this table's own limits

- The connector-side rows for `customer.create`/`quote.create`/`invoice.create` were verified by direct source read in this session (line numbers cited above), not by execution — no `.NET SDK` is available in this sandbox to compile or run the C# connector, and no real Sage 50 install/company exists here either. See `docs/PRODUCTION_READINESS.md` for the exact real-E2E test list still required before those rows can move from "code path complete" to "Real Sage verified".
- `quote.read`/`invoice.lines`/`invoice.email`/`quote.email`/`inventory.quantity`/`bom.*` are all consistently `false` across `sagebridge-api/src/handlers/capabilities.ts` (`FEATURES`) and the actual UI (no dead buttons found that claim these). This was cross-checked, not assumed.
