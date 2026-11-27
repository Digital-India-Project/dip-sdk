# DIP SDK — Synchronization & Integration Contracts

This document tracks the concrete contracts synchronized between `Digital-India-Project/dip-sdk` (`@digital-india/sdk@0.2.0`) and the rest of the Digital India Project ecosystem.

## 1. Authoritative Inbound Contracts Consumed by `dip-sdk`

| Source Repository | Contract | Verified Alignment |
|---|---|---|
| `dip-api` | `GET/POST/PATCH /api/v1/*` + OpenAPI `1.0.0-foundation` | Exact 22-path / 25-operation parity in `src/api-spec.json` and `src/generated/openapi-types.ts` |
| `dip-api` | `ApiSuccessEnvelope<T>` & `ApiErrorEnvelope` | Validated at runtime by Zod in `src/contracts/common.ts` and `src/core/dipClient.ts` |
| `dip-api` | `X-Webhook-Signature` (`t=,v1=,kid=`) & Cashfree base64 HMAC | Implemented in `src/webhooks/verify.ts` (`@digital-india/sdk/webhooks`) |
| `dip-api` | `Idempotency-Key` (`^[a-zA-Z0-9_-]{8,128}$`) & `X-Correlation-ID` | Validated/generated in `src/core/dipClient.ts` |
| `DIPINDIA` | `GET /api/v1/apisathi/status` | Supported via `ApiSathiClient.getGatewayStatus()` |
| `dip-core` | Integer minor currency units (`amount_minor`) & structured error codes | `MoneySchema` enforces integer `amount_minor` (`INR/USD/EUR`) |
| `dip-security` | Caller-supplied short-lived Bearer JWT, no `localStorage`, redaction | Enforced via `TokenProvider`, origin guard, `redirect: 'manual'`, `src/core/redaction.ts` |

## 2. Outbound Contracts Exported by `dip-sdk`

- **`@digital-india/sdk` (Browser & Node.js isomorphic)**:
  - `DIPClient` and typed resource clients (`HealthClient`, `ServicesClient`, `ProductsClient`, `ApplicationsClient`, `WorkflowClient`, `DocumentsClient`, `PaymentsClient`, `WebhooksClient`, `IntegrationsClient`, `SandboxAuthClient`)
  - `DIPAPIError` hierarchy, `FetchTransport` / `TransportAdapter`, `createCachingTokenProvider`, pagination generators, redaction helpers
  - Preserved v0.1.0 exports (`ApiClient`, `DipApiError`, `ApiSathiClient`, `DatabaseClient`, `StorageClient`)
- **`@digital-india/sdk/webhooks` (Node.js server-only)**:
  - `verifyWebhookSignature`, `verifyCashfreeWebhookSignature`, `verifyAndParseWebhookEvent`, `InMemoryEventDeduplicationStore`

## 3. Data & Secret Ownership Boundaries

- `dip-sdk` owns **no** databases, **no** object-storage buckets, and **no** identity providers.
- Only two environment variables appear in `.env.example` / runtime server config: `DIP_API_BASE_URL` and `PORT` (for the local dev server). Zero secret values are stored or bundled.
