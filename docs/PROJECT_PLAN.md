# DIP SDK — Project Plan

**Status:** Proposed; existing starter requires audit  
**Observed package version:** 0.1.0  
**API contract authority:** dip-api and verified DIPINDIA endpoints

## 1. Objective

Evolve the existing TypeScript SDK starter into a stable, secure developer interface for approved Digital India Project APIs. It should reduce integration effort for B2B partners and developers while preserving the existing DIPINDIA platform and authorization model.

## 2. Current baseline and unknowns

Verified package metadata:
- `@digital-india/sdk`, version 0.1.0, private.
- TypeScript compiler output configured to `dist`.
- Axios and Zod dependencies.
- Build script: `tsc`.
- Type generation script reads `src/api-spec.json` if present.
- Root export references ApiClient, ApiSathiClient, DatabaseClient and StorageClient.

The initial fetch did not locate some referenced source paths. Full tree, build and export resolution must be audited. DatabaseClient and StorageClient exports require particular scrutiny: an external SDK should not expose privileged direct database/storage access.

## 3. Goals

- Define an API-first SDK contract.
- Generate types from reviewed OpenAPI specifications.
- Provide safe auth token provider interfaces.
- Standardize errors, timeouts, cancellation and retries.
- Support idempotency for safe retryable operations.
- Add pagination, rate-limit and request correlation handling.
- Provide typed service clients and examples.
- Maintain semantic versioning and compatibility tests.

## 4. Non-goals

- No backend/gateway implementation.
- No direct production DB/R2 client or privileged database access.
- No secrets embedded in package code.
- No exposing internal administrative endpoints by default.
- No bypass of server-side authorization.
- No package publication or production API calls without approval.

## 5. Workstreams

### WS1 — Source and API inventory
- Inspect complete source tree, exports, scripts, dependencies and generated files.
- Determine which client modules exist and whether they call public, partner or internal endpoints.
- Identify missing source paths and build failures.
- Inventory API endpoints from dip-api/DIPINDIA only after contracts are verified.
- Remove ambiguity around DatabaseClient/StorageClient responsibilities through an explicit decision.

Deliverables: source audit, API consumer map, export inventory and risk register.

### WS2 — Client foundation
- Define client configuration: base URL, timeout, user agent and optional fetch/transport adapter.
- Define caller-supplied token provider interface.
- Define request/response interceptors with safe defaults.
- Support AbortSignal/cancellation.
- Add request correlation IDs without leaking personal data.
- Avoid hidden global state.

Deliverables: ApiClient contract and transport tests.

### WS3 — Type and schema generation
- Use reviewed OpenAPI 3.1 specs as source.
- Validate spec before generation.
- Generate deterministic types and schemas.
- Avoid hand-editing generated outputs.
- Record source spec version and generation tool version.
- Add drift detection in CI.

Deliverables: API spec workflow, generated type outputs and compatibility report.

### WS4 — Domain service clients
- Add clients only for documented API groups.
- Keep API Sathi provider integration separate from DIP public API unless intentionally exposed by dip-api.
- Never expose direct DB/storage credentials.
- Validate request and response payloads.
- Add typed pagination and error handling.

Deliverables: service clients, schemas, examples and tests.

### WS5 — Reliability behaviour
- Set explicit request timeouts.
- Retry only safe/idempotent operations.
- Respect Retry-After and rate-limit headers.
- Use bounded exponential backoff with jitter.
- Support caller cancellation.
- Prevent duplicate submissions with idempotency keys where API supports them.
- Do not retry payment/order creation blindly.

Deliverables: reliability policy and tests.

### WS6 — Security and privacy
- Token provider must supply short-lived user/service tokens without exposing refresh tokens to logs.
- No hardcoded API keys or privileged secrets.
- Avoid logging request bodies by default.
- Redact sensitive headers and fields.
- Validate HTTPS in production configuration.
- Prevent SSRF by constraining base URL and redirect behaviour where relevant.

Deliverables: security tests and secure usage guide.

### WS7 — Packaging and developer experience
- Define ESM/CJS support deliberately.
- Provide TypeScript declarations.
- Test clean package installation.
- Add quickstart, examples and migration guides.
- Establish semantic versioning and changelog.
- Keep package private until release approval.

Deliverables: package build, docs and release checklist.

## 6. Delivery phases

Phase 0: audit current SDK and missing source paths.  
Phase 1: define OpenAPI and auth contracts with dip-api.  
Phase 2: harden base transport, errors and cancellation.  
Phase 3: generate deterministic types.  
Phase 4: implement approved service clients.  
Phase 5: add reliability, security and contract tests.  
Phase 6: package QA and release readiness.

## 7. Priorities

**P0:** Source audit, API contract source, secure base client, token provider contract, error model, tests, remove/contain unsafe direct database/storage access.

**P1:** Generated types, pagination, idempotency, rate limits, service clients, examples and compatibility checks.

**P2:** Additional language SDKs, advanced observability hooks and code-generation automation.

## 8. Acceptance criteria

- Every public method maps to a documented API operation.
- No direct privileged database/storage access in external SDK.
- Tokens are supplied by caller and never logged.
- Timeouts and cancellation are supported.
- Retries are bounded and safe.
- Payment-sensitive operations are not blindly retried.
- Request/response schemas are validated.
- Generated types are reproducible.
- Package installation and exports work in a clean consumer.
- No package is published without approval.

## 9. Governance

All work uses review branches. No main/master push, merge, deployment, package publication or production API call without explicit approval.
