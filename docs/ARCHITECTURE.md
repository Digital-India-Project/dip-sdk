# DIP SDK — Architecture

## 1. Role

DIP SDK is a developer-facing client library for approved Digital India Project APIs. It consumes dip-api contracts and existing DIPINDIA endpoints through stable, authenticated HTTP interfaces. It does not host services or connect directly to production databases.

## 2. Target architecture

```text
Developer application / partner backend
                 |
                 v
             DIP SDK
                 |
       +---------+----------+
       |         |          |
       v         v          v
   Auth hook  Transport   Schemas/types
       |         |          |
       +---------+----------+
                 |
         HTTPS API requests
                 |
                 v
              dip-api
                 |
                 v
       DIPINDIA / approved providers
```

## 3. Package modules

- `client`: client configuration and transport.
- `auth`: caller-supplied token provider interfaces.
- `errors`: typed API, validation, network and rate-limit errors.
- `schemas`: runtime request/response validation.
- `services`: clients grouped by documented API domain.
- `types`: generated OpenAPI types.
- `pagination`: cursor/page helpers.
- `retry`: bounded retry policy for safe operations.

Final module layout must be reconciled with the existing source before code changes.

## 4. Transport contract

The base client should support:
- Configurable base URL.
- Explicit request timeout.
- AbortSignal cancellation.
- Safe token provider callback.
- Request correlation ID.
- JSON serialization and parsing.
- Typed errors.
- Redacted diagnostics.
- Optional custom transport for tests.

Production base URLs must use HTTPS. Do not allow arbitrary caller-controlled URLs to create SSRF or credential-forwarding risks.

## 5. Authentication

The SDK should not own login screens or store user passwords. A consuming application supplies a token provider that returns a short-lived access token. The SDK attaches it only to approved API hosts and must not log it.

Refresh-token management remains the responsibility of the consuming application or approved identity SDK. Never embed service-account or administrator credentials in browser SDK builds.

## 6. API contract generation

OpenAPI specs from dip-api are the source of truth. Generation should be deterministic:
- Validate spec.
- Generate TypeScript types.
- Optionally generate Zod schemas where appropriate.
- Record spec version/hash.
- Run formatting and compile checks.
- Fail CI on unexpected generated drift.

Do not invent endpoints from desired SDK methods.

## 7. Reliability

- Timeout every request.
- Support cancellation.
- Retry only safe/idempotent operations.
- Respect Retry-After.
- Use bounded exponential backoff with jitter.
- Require idempotency keys for retryable create/payment operations where supported by server.
- Avoid retrying non-idempotent actions by default.
- Do not retry authorization failures blindly.

## 8. Error model

Normalize:
- API validation errors.
- Authentication/authorization errors.
- Not found/conflict errors.
- Rate limits.
- Network/timeout/cancellation.
- Server failures.

Preserve HTTP status, stable API error code and request ID, but redact response fields that may contain personal data or secrets.

## 9. Database and storage clients

The current package entrypoint lists DatabaseClient and StorageClient. Their actual source and intended use must be audited. External SDKs must not ship privileged direct database credentials or bypass dip-api authorization. If these names represent API-backed resource clients, document that boundary; if they directly connect to databases/buckets, redesign or remove them only through a reviewed breaking-change process.

## 10. Testing

- Unit tests with mocked transport.
- OpenAPI contract tests.
- Auth token injection/redaction tests.
- Timeout/cancellation tests.
- Retry/idempotency tests.
- Pagination and rate-limit tests.
- Clean install and package export tests.
- Consumer compatibility fixtures.
