# Pagination, Retries & Idempotency Guide

## 1. Page-Based Pagination

`dip-api` `/api/v1` list endpoints (`/services`, `/products`, `/applications`) use page-based pagination (`page`, `limit`, `sort_by`, `sort_order`, `search`) returning:

```ts
{
  items: T[],
  pagination: { page: number, limit: number, total: number, has_more: boolean },
  meta: { api_version: 'v1', correlation_id: string, adapter_mode: 'sandbox' | 'live', timestamp_utc: string }
}
```

### Single Page
```ts
const page1 = await client.services.list({ page: 1, limit: 20, category: 'tax_compliance' });
```

### Async Iteration Helpers
```ts
for await (const service of client.services.iterate({ limit: 50 })) {
  console.log(service.id, service.title);
}

for await (const page of client.applications.iteratePages({ status: 'submitted' })) {
  console.log(`Page ${page.pagination.page}: ${page.items.length} items`);
}
```

Cursor-based iteration (`iterateCursorPages`) is also exported for cursor-backed endpoints when introduced.

## 2. Retry Policy

- **Safe reads (`GET`, `HEAD`, `OPTIONS`):** Retried up to `retry.maxRetries` (default `2`) on `429`, `502`, `503`, `504`, `DIPNetworkError`, and `DIPTimeoutError` using bounded exponential backoff with jitter.
- **`Retry-After`:** Numeric seconds and HTTP-date `Retry-After` headers are respected automatically (capped at 60 seconds).
- **Unsafe writes:** `PATCH` requests and calls without an `Idempotency-Key` are never automatically retried.
- **Payment operations:** `client.payments.createOrder()` and `client.payments.requestRefund()` **never** auto-retry by default to prevent duplicate charges or unintended mutations. Retries only run if a caller supplies an explicit deterministic `idempotencyKey` **and** `allowIdempotentRetry: true`.

## 3. Idempotency Keys

Mutating endpoints that require `Idempotency-Key` (`applications.create`, `applications.submit`, `workflow.transition`, `documents.createUploadIntent`, `payments.createOrder`, `payments.requestRefund`, `webhooks.createSubscription`) accept `{ idempotencyKey }` in call options or auto-generate a safe `8–128` character key (`^[a-zA-Z0-9_-]{8,128}$`). Reusing a key with a mismatched payload returns `DIPConflictError` (`409 IDEMPOTENCY_CONFLICT`).
