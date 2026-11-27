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
- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap](docs/ROADMAP.md)
- [Security](docs/SECURITY.md)
- [Integration](docs/INTEGRATION.md)

## Governance

Work on review branches only. No main/master push, merge, deployment, package publication, production API invocation or credential changes without explicit approval.
