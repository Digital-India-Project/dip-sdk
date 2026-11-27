# DIP SDK — API Coverage Matrix

**Primary contract authority:** `Digital-India-Project/dip-api` (`/api/v1`)  
**Secondary platform authority:** `Digital-India-Project/DIPINDIA` (Cloudflare Worker routes)

## 1. Verified `dip-api` (`/api/v1`) Operations

| Domain | HTTP Method & Path | Classification | SDK Client Method | Auth / Scope | Idempotency / Retry |
|---|---|---|---|---|---|
| Health | `GET /api/v1/health` | Verified and implemented (sandbox adapter) | `client.health.getHealth()` | Public | Safe GET retry |
| Health | `GET /api/v1/metrics` | Verified and implemented | `client.health.getMetrics()` | Public | Safe GET retry |
| OpenAPI | `GET /api/v1/openapi.json` | Verified and implemented | `client.health.getOpenApiSpec()` | Public | Safe GET retry |
| Services | `GET /api/v1/services` | Verified and implemented (sandbox adapter) | `client.services.list()` / `iterate()` | Public | Safe GET retry |
| Services | `GET /api/v1/services/:serviceId` | Verified and implemented (sandbox adapter) | `client.services.get()` | Public | Safe GET retry |
| Products | `GET /api/v1/products` | Verified and implemented (sandbox adapter) | `client.products.list()` / `iterate()` | Public | Safe GET retry |
| Products | `GET /api/v1/products/:productId` | Verified and implemented (sandbox adapter) | `client.products.get()` | Public | Safe GET retry |
| Applications | `GET /api/v1/applications` | Verified and implemented (sandbox adapter) | `client.applications.list()` / `iterate()` | `applications:read` | Safe GET retry |
| Applications | `POST /api/v1/applications` | Verified and implemented (sandbox adapter) | `client.applications.create()` | `applications:write` | `Idempotency-Key` required |
| Applications | `GET /api/v1/applications/:applicationId` | Verified and implemented (sandbox adapter) | `client.applications.get()` | `applications:read` + ownership | Safe GET retry |
| Applications | `PATCH /api/v1/applications/:applicationId` | Verified and implemented (sandbox adapter) | `client.applications.update()` | `applications:write` + ownership | No auto-retry |
| Applications | `POST /api/v1/applications/:applicationId/submit` | Verified and implemented (sandbox adapter) | `client.applications.submit()` | `applications:write` + ownership | `Idempotency-Key` required |
| Workflow | `POST /api/v1/applications/:applicationId/transition` | Verified and implemented (sandbox adapter) | `client.workflow.transition()` | `workflow:review` | `Idempotency-Key` required; no auto-retry by default |
| Documents | `GET /api/v1/applications/:applicationId/documents` | Verified and implemented (sandbox adapter) | `client.documents.listForApplication()` | `documents:read` + ownership | Safe GET retry |
| Documents | `POST /api/v1/applications/:applicationId/documents/upload-intent` | Verified and implemented (sandbox adapter) | `client.documents.createUploadIntent()` | `documents:write` + ownership | `Idempotency-Key` required |
| Payments | `POST /api/v1/payments/orders` | Verified and implemented (sandbox adapter) | `client.payments.createOrder()` | `payments:write` + ownership | `Idempotency-Key` required; **never blindly retried** |
| Payments | `GET /api/v1/payments/orders/:orderId` | Verified and implemented (sandbox adapter) | `client.payments.getOrder()` | `payments:read` + ownership | Safe GET retry |
| Payments | `POST /api/v1/payments/orders/:orderId/refunds` | Verified and implemented (sandbox adapter) | `client.payments.requestRefund()` | `payments:refund` + tenant | `Idempotency-Key` required; **never blindly retried** |
| Payments Webhook | `POST /api/v1/payments/webhooks/cashfree` | Server-to-server inbound webhook | `@digital-india/sdk/webhooks` (`verifyCashfreeWebhookSignature`) | HMAC-SHA256 + timestamp | Server-only verification |
| Webhooks | `GET /api/v1/webhooks/subscriptions` | Verified and implemented | `client.webhooks.listSubscriptions()` | `webhooks:read` | Safe GET retry |
| Webhooks | `POST /api/v1/webhooks/subscriptions` | Verified and implemented | `client.webhooks.createSubscription()` | `webhooks:write` | `Idempotency-Key` required |
| Webhooks | `GET /api/v1/webhooks/deliveries` | Verified and implemented | `client.webhooks.listDeliveries()` | `webhooks:read` | Safe GET retry |
| Integrations | `GET /api/v1/integrations/providers` | Verified and implemented (sandbox/planned metadata) | `client.integrations.listProviders()` | `integrations:read` | Safe GET retry |
| Integrations | `POST /api/v1/integrations/providers/:providerId/sandbox-check` | Verified and implemented (sandbox only) | `client.integrations.executeSandboxCheck()` | `integrations:write` | No auto-retry |
| Sandbox Auth | `POST /api/v1/sandbox/token` | Verified (non-production sandbox only) | `client.sandbox.issueToken()` | Disabled in production | Client rejects in `production` |

## 2. Legacy & Cross-Platform (`DIPINDIA` Worker) Operations

| Operation | Source | Classification | Notes |
|---|---|---|---|
| `GET /api/v1/apisathi/status` | `DIPINDIA` worker (`apiSathiRoutes.ts`) | Verified in `DIPINDIA`, absent in `dip-api` | Supported via `ApiSathiClient.getGatewayStatus()` |
| `GET /api-sathi/status` | Legacy `dip-sdk` v0.1.0 | Contract mismatch (`DIPINDIA` uses `/api/v1/apisathi/status`) | Preserved on `ApiSathiClient.getStatus()` for backwards compatibility |
| `GET /data/:collection` | Legacy `dip-sdk` v0.1.0 | **Unimplemented & prohibited** | `DatabaseClient` marked `@deprecated` |
| `GET /storage/objects/:key` | Legacy `dip-sdk` v0.1.0 | **Contract mismatch** (`DIPINDIA` uses `/api/storage/files/:id/metadata`) | `StorageClient` marked `@deprecated`; prefer `client.documents` |
| `GET /api/v1/auth/me` | `DIPINDIA` worker | Implemented in `DIPINDIA`, missing in `dip-api` | Planned type in `src/contracts/planned.ts` |
| `POST /api/v1/forms/validate` | `DIPINDIA` worker | Implemented in `DIPINDIA`, missing in `dip-api` | Planned type in `src/contracts/planned.ts` |

## 3. Planned / Blocked Domains (Not Callable in SDK)

| Domain | Classification | Blocking Dependency |
|---|---|---|
| Organizations | Planned | No `/api/v1/organizations` contract in `dip-api` yet |
| Users | Planned | No `/api/v1/users` contract in `dip-api` yet (`auth/me` is DIPINDIA-only) |
| Live Verification (DigiLocker / Entity Locker / GST / PAN) | Blocked by missing dependency | Marked `planned_unconnected` in `dip-api` until commercial & security approvals |
| Notifications | Planned | No `/api/v1/notifications` endpoint in `dip-api` yet |
| Reports & Exports | Planned | No `/api/v1/reports` endpoint in `dip-api` yet |
| Direct Document Download (`dip-api`) | Blocked by missing dependency | `dip-api` exposes upload-intent & listing; download URLs remain in `DIPINDIA` `/api/storage/files/:id/*` |
