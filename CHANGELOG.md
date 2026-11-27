# Changelog

All notable changes to `@digital-india/sdk` will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] - 2026-11-27 (Unreleased — Review Branch `development/sdk-foundation`)

### Added
- `DIPClient` Fetch-based isomorphic client with configurable `TransportAdapter`, middleware hooks, redacted diagnostics, correlation IDs, explicit timeouts, and `AbortSignal` support.
- Verified `/api/v1` resource clients aligned with `Digital-India-Project/dip-api`:
  - `HealthClient` (`getHealth`, `getMetrics`, `getOpenApiSpec`)
  - `ServicesClient` & `ProductsClient` (catalogue listing, detail retrieval, and async pagination)
  - `ApplicationsClient` & `WorkflowClient` (`list`, `get`, `create`, `update`, `submit`, `transition`)
  - `DocumentsClient` (`listForApplication`, `createUploadIntent`, and secure `uploadToSignedUrl`)
  - `PaymentsClient` (`createOrder`, `getOrder`, `requestRefund` with strict idempotency & non-blind-retry rules)
  - `WebhooksClient` (`listSubscriptions`, `createSubscription`, `listDeliveries`)
  - `IntegrationsClient` (`listProviders`, `executeSandboxCheck`)
  - `SandboxAuthClient` (`issueToken` restricted to non-production environments)
- Server-only `@digital-india/sdk/webhooks` entrypoint (`verifyWebhookSignature`, `verifyCashfreeWebhookSignature`, `verifyAndParseWebhookEvent`, `InMemoryEventDeduplicationStore`).
- Typed error hierarchy (`DIPAPIError`, `DIPAuthenticationError`, `DIPAuthorizationError`, `DIPValidationError`, `DIPNotFoundError`, `DIPConflictError`, `DIPRateLimitError`, `DIPServerError`, `DIPNetworkError`, `DIPTimeoutError`, `DIPAbortError`, `DIPUnexpectedResponseError`, `DIPConfigurationError`).
- Canonical OpenAPI snapshot (`src/api-spec.json`) and deterministic generator (`scripts/generate-types.ts` -> `src/generated/openapi-types.ts`).
- Dual ESM (`dist/esm`) and CommonJS (`dist/cjs`) build outputs with `.d.ts` declarations and `sideEffects: false`.
- Unit, integration, contract, and compatibility test suites under `tests/`.
- Examples and comprehensive SDK documentation in `docs/`.

### Changed
- Preserved v0.1.0 exports (`ApiClient`, `DipApiError`, `ApiSathiClient`, `DatabaseClient`, `StorageClient`) for backwards compatibility; marked `DatabaseClient` and `StorageClient` as `@deprecated` with explicit security boundary documentation.
- Added `getGatewayStatus()` on `ApiSathiClient` targeting DIPINDIA's verified `/api/v1/apisathi/status` path.
- Normalized package management from Bun (`bun.lock`) to npm.

## [0.1.0] - Baseline
- Initial TypeScript SDK starter (`ApiClient`, `ApiSathiClient`, `DatabaseClient`, `StorageClient`, `scripts/generate-types.ts`).
