# DIP SDK — Implementation Status

**Package:** `@digital-india/sdk@0.2.0` (`development/sdk-foundation`)

## 1. Implemented Capabilities
- **Transport & Configuration (`src/core/`)**: Fetch API transport (`FetchTransport`), `TransportAdapter` abstraction, HTTPS enforcement, embedded-credential rejection, `AbortSignal` cancellation, explicit request timeouts, `redirect: 'manual'`, correlation IDs, middleware lifecycle hooks, and redacted structured logging.
- **Auth & Security (`src/core/auth.ts`, `src/core/redaction.ts`, `src/webhooks/verify.ts`)**: `TokenProvider`, `RefreshableTokenProvider`, `createCachingTokenProvider`, origin-bound Bearer injection, automatic redaction of headers/URLs/payloads, and server-only `@digital-india/sdk/webhooks` HMAC-SHA256 verification + `InMemoryEventDeduplicationStore`.
- **Resilience & Pagination (`src/core/retry.ts`, `src/core/pagination.ts`)**: Bounded exponential backoff with jitter, `Retry-After` parsing, strict non-blind-retry rules on payments, page and cursor async iterators.
- **Verified `/api/v1` Resource Clients (`src/resources/`)**: `HealthClient`, `ServicesClient`, `ProductsClient`, `ApplicationsClient`, `WorkflowClient`, `DocumentsClient` (including `uploadToSignedUrl`), `PaymentsClient`, `WebhooksClient`, `IntegrationsClient`, `SandboxAuthClient`.
- **OpenAPI Codegen & Packaging**: Canonical `src/api-spec.json` (`25` operations), deterministic `scripts/generate-types.ts` -> `src/generated/openapi-types.ts`, dual ESM (`dist/esm`) and CommonJS (`dist/cjs`) outputs with `.d.ts` declarations.
- **Preserved Legacy Exports (`src/client.ts`, `src/services/*`)**: `ApiClient`, `DipApiError`, `ApiSathiClient` (plus `getGatewayStatus()`), and `@deprecated` `DatabaseClient` & `StorageClient`.

## 2. Mocked / Sandbox-Only Capabilities
- HTTP gateway integration tests run against an isolated `node:http` mock server (`tests/integration/mock-gateway.test.ts`).
- External verification providers (`gst_sandbox_adapter`, `pan_sandbox_adapter`) and Cashfree order/refund flows are tested against isolated mock/sandbox fixtures (`tests/mock-provider/sandbox-providers.test.ts`) matching `dip-api`'s sandbox contract.

## 3. Blocked / Pending Capabilities
- **Live Government / KYC Providers**: DigiLocker, Entity Locker, live GST, and live PAN remain `planned_unconnected` in `dip-api`.
- **Live Payment Settlement**: Production Cashfree credentials and live payment execution are out of scope and blocked without explicit production approval.
- **Unimplemented Resource Domains**: Organizations, Users (`dip-api`), standalone Forms (`dip-api`), Notifications, Reports, and direct `dip-api` document download URLs remain pending upstream `dip-api` contracts (typed placeholders in `src/contracts/planned.ts`).
