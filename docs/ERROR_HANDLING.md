# Error Handling Guide

## 1. Error Hierarchy

All errors thrown by `DIPClient` inherit from `DIPSDKError`:

- `DIPConfigurationError`: Invalid SDK config or HTTPS policy violation.
- `DIPAPIError`: Structured HTTP or transport error with `status`, `code`, `correlationId`, `details`, and `isRetryable`.
  - `DIPAuthenticationError` (`401` / `UNAUTHENTICATED`)
  - `DIPAuthorizationError` (`403` / `FORBIDDEN`)
  - `DIPValidationError` (`400` / `422` / `VALIDATION_ERROR`)
  - `DIPNotFoundError` (`404` / `NOT_FOUND`)
  - `DIPConflictError` (`409` / `IDEMPOTENCY_CONFLICT`)
  - `DIPRateLimitError` (`429` / `RATE_LIMITED`, includes `retryAfterSeconds`)
  - `DIPServerError` (`5xx` / `INTERNAL_ERROR` / `PROVIDER_UNAVAILABLE`)
  - `DIPNetworkError` (connectivity / DNS failure)
  - `DIPTimeoutError` (exceeded `timeoutMs`)
  - `DIPAbortError` (cancelled via `AbortSignal`)
  - `DIPUnexpectedResponseError` (non-JSON payload, unexpected redirect, or schema mismatch)

## 2. Handling Errors Safely

```ts
import {
  DIPAPIError,
  DIPAuthenticationError,
  DIPRateLimitError,
  DIPValidationError,
} from '@digital-india/sdk';

try {
  await client.applications.get('app_123');
} catch (error) {
  if (error instanceof DIPAuthenticationError) {
    // Prompt re-authentication or refresh session
  } else if (error instanceof DIPValidationError) {
    console.error('Validation issues:', error.details);
  } else if (error instanceof DIPRateLimitError) {
    console.warn('Retry after seconds:', error.retryAfterSeconds);
  } else if (error instanceof DIPAPIError) {
    console.error(`[${error.code}] ${error.message} (correlation: ${error.correlationId})`);
  }
  throw error;
}
```

## 3. Privacy & Diagnostics

`DIPAPIError` preserves `correlationId`, `code`, `status`, and non-sensitive field validation `details` while avoiding raw response dumps, Authorization headers, or PII in exception messages.
