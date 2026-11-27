# Digital India Project SDK

**Package:** `@digital-india/sdk`  
**Observed version:** 0.1.0  
**Status:** Existing early TypeScript SDK starter; planning and contract review required  
**Primary API source:** DIPINDIA, through an approved and versioned API contract

## Mission

Provide safe, typed developer clients for approved Digital India Project APIs. The SDK must consume stable API contracts from dip-api and the existing DIPINDIA platform. It must not define a competing backend, expose internal admin APIs, or bypass DIPINDIA authorization.

## Current inspected baseline

The `master` branch contains:
- A TypeScript package manifest for `@digital-india/sdk`, version 0.1.0, marked private.
- Axios and Zod dependencies.
- A TypeScript build script and a type-generation script.
- `src/index.ts` exports `ApiClient`, `ApiSathiClient`, `DatabaseClient` and `StorageClient`.
- A type-generation script that looks for `src/api-spec.json`.

Some referenced source paths were not found during the initial inspection. A complete file inventory and build verification are required before implementation changes. Do not assume the exported clients are complete or safe solely because they are listed in the entrypoint.

## Responsibilities

- Typed HTTP client for approved public/partner APIs.
- Authentication token injection through safe caller-supplied providers.
- Request/response schemas and typed errors.
- Timeouts, cancellation, bounded retries and idempotency support.
- Pagination and rate-limit handling.
- Version compatibility and generated types from approved OpenAPI specs.
- Examples, changelog and developer onboarding.

## Out of scope

- Hosting the API or gateway.
- Direct access to DIPINDIA production databases or R2 buckets.
- Privileged admin or internal-only endpoints in public SDKs.
- Embedding API keys, Firebase service credentials or Cashfree secrets.
- Performing government/third-party API calls without approved server-side integration.
- Publishing packages without approval.

## DIPINDIA-first rule

The existing DIPINDIA platform remains the product and data authority. SDK methods must reflect stable, documented API contracts. New SDK capabilities are not permission to create new backend routes or change existing customer workflows.

## Documents

- [Project plan](docs/PROJECT_PLAN.md)
- [Audit report](docs/AUDIT_REPORT.md)
- [Architecture](docs/ARCHITECTURE.md)
- [API coverage matrix](docs/API_COVERAGE.md)
- [Integration contracts](docs/INTEGRATION_CONTRACTS.md)
- [Compatibility matrix](docs/COMPATIBILITY_MATRIX.md)
- [Implementation status](docs/IMPLEMENTATION_STATUS.md)
- [Test report](docs/TEST_REPORT.md)
- [Synchronization manifest](integration/manifest.json)
- [Architecture Decision Records](docs/adr/0001-fetch-transport-and-isomorphic-entrypoints.md)
- [Quickstart](docs/QUICKSTART.md)
- [Authentication](docs/AUTHENTICATION.md)
- [Error handling](docs/ERROR_HANDLING.md)
- [Pagination & retries](docs/PAGINATION.md)
- [Webhooks](docs/WEBHOOKS.md)
- [Compatibility notes](docs/COMPATIBILITY.md)
- [Roadmap](docs/ROADMAP.md)
- [Security](docs/SECURITY.md)
- [Integration](docs/INTEGRATION.md)
- [Contributing](docs/CONTRIBUTING.md)
- [Release process](docs/RELEASE_PROCESS.md)

## Governance

Work on review branches only. No main/master push, merge, deployment, package publication, production API invocation or credential changes without explicit approval.

---

## SDK Foundation (`development/sdk-foundation` — v0.2.0 Candidate)

### Entrypoints

- `@digital-india/sdk` — Isomorphic (browser & Node.js) client exporting `DIPClient`, resource clients, typed errors, pagination helpers, redaction utilities, and preserved legacy v0.1.0 exports (`ApiClient`, `ApiSathiClient`, `DatabaseClient`, `StorageClient`).
- `@digital-india/sdk/webhooks` — Server-only (`node:crypto`) webhook signature verification and replay-protection utilities. Never import in browser bundles.

### Verified Resource Clients (`dip-api` `/api/v1`)

| Property | Class | Scope |
|---|---|---|
| `client.health` | `HealthClient` | `/health`, `/metrics`, `/openapi.json` |
| `client.services` | `ServicesClient` | `/services`, `/services/:serviceId` + async pagination |
| `client.products` | `ProductsClient` | `/products`, `/products/:productId` + async pagination |
| `client.applications` | `ApplicationsClient` | `/applications`, `/applications/:id`, `/submit` |
| `client.workflow` | `WorkflowClient` | `/applications/:id/transition` |
| `client.documents` | `DocumentsClient` | `/applications/:id/documents`, `/upload-intent`, signed-URL upload helper |
| `client.payments` | `PaymentsClient` | `/payments/orders`, `/orders/:id`, `/refunds` (strict idempotency, no blind retries) |
| `client.webhooks` | `WebhooksClient` | `/webhooks/subscriptions`, `/deliveries` |
| `client.integrations` | `IntegrationsClient` | `/integrations/providers`, `/sandbox-check` |
| `client.sandbox` | `SandboxAuthClient` | `/sandbox/token` (non-production sandbox only) |

### Legacy v0.1.0 Exports (Preserved)

- `ApiClient` & `DipApiError` — Preserved Axios wrapper.
- `ApiSathiClient` — Preserved `getStatus()` plus `getGatewayStatus()` targeting DIPINDIA's `/api/v1/apisathi/status`.
- `DatabaseClient` (`@deprecated`) — Preserved export only; neither `dip-api` nor `DIPINDIA` exposes `/data/:collection`.
- `StorageClient` (`@deprecated`) — Preserved export only; use `client.documents` for `dip-api` document flows.

### Verification Commands

```bash
npm run generate          # Regenerate src/generated/openapi-types.ts from src/api-spec.json
npm run typecheck         # Strict TypeScript check
npm run lint              # Typecheck + ESLint
npm run build             # Build ESM (dist/esm) + CJS (dist/cjs) + .d.ts declarations
npm test                  # Run unit, integration, contract, and compatibility tests
```

