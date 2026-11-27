# ADR 0003: Idempotency Keys and Payment Retry Boundaries

## Status
Accepted (2026-11-27, `development/sdk-foundation`)

## Context
`dip-api` enforces `Idempotency-Key` (`^[a-zA-Z0-9_-]{8,128}$`) on state-changing mutations (application creation/submission/transition, upload intents, payment order creation, refund requests, and webhook subscriptions) and returns `409 IDEMPOTENCY_CONFLICT` on payload mismatches. Blindly retrying payment or workflow mutations risks duplicate charges or unintended state changes.

## Decision
1. **Bounded Retries for Safe Reads**: `GET`, `HEAD`, and `OPTIONS` requests retry up to `maxRetries` (default `2`) on `429`, `502`, `503`, `504`, `DIPNetworkError`, and `DIPTimeoutError` using exponential backoff with jitter and `Retry-After` support.
2. **Strict Payment Mutation Safeguard**: `PaymentsClient.createOrder()` and `PaymentsClient.requestRefund()` set `allowIdempotentRetry: false` by default. Automatic retries on payment mutations run **only** when the caller explicitly passes both a deterministic `idempotencyKey` and `allowIdempotentRetry: true`.
3. **No Blind Auth Retries**: `401` triggers at most one `refreshToken()` attempt when a `RefreshableTokenProvider` is provided; `403`, `400`, `404`, `409`, and `422` are never retried.

## Consequences
- Prevents duplicate payment orders or refund storms under transient network failures.
- Honors server rate-limiting signals cleanly.
