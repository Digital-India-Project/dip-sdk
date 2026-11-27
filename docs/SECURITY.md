# DIP SDK — Security Policy

## 1. Core rule

The SDK is untrusted client-side integration code. Server-side APIs remain responsible for authentication, authorization, validation and business invariants.

## 2. Credentials and tokens

- Never embed API secrets, service-account credentials, private keys or admin tokens.
- Accept short-lived access tokens from a caller-supplied provider.
- Never log Authorization headers or refresh tokens.
- Do not persist tokens to localStorage by default.
- Attach tokens only to configured trusted API origins.
- Do not forward credentials across redirects or arbitrary hosts.

## 3. Transport safety

- Require HTTPS for production endpoints.
- Set request timeouts.
- Support cancellation.
- Validate base URLs and constrain redirects.
- Avoid SSRF via user-controlled URL parameters.
- Redact sensitive query parameters and headers.
- Do not log full request/response bodies by default.

## 4. Retry safety

- Retry only safe/idempotent operations.
- Respect Retry-After and bounded retry limits.
- Use idempotency keys for supported mutations.
- Never blindly retry payment, refund or application submission operations.
- Avoid retrying 401/403 responses without an explicit token refresh strategy.

## 5. Data validation

- Validate response shape before returning typed values where appropriate.
- Treat server data as untrusted.
- Avoid unsafe deserialization.
- Do not expose provider raw payloads unnecessarily.
- Minimize PII in exceptions and diagnostics.

## 6. Database/storage boundary

Do not ship direct privileged database or object-storage credentials. DatabaseClient/StorageClient must use authorized API endpoints or be restricted to explicitly approved public capabilities. They must not bypass DIPINDIA access rules.

## 7. Supply chain

- Review dependencies and lockfiles.
- Pin compatible versions.
- Run static checks and tests.
- Verify generated code source.
- Use least-privilege release workflows.
- Keep publication gated.
- Do not commit generated secrets or environment values.

## 8. Security checklist

- [ ] Tokens caller-supplied and redacted.
- [ ] Trusted origin restrictions.
- [ ] HTTPS production enforcement.
- [ ] Timeout and cancellation.
- [ ] Safe retry/idempotency behaviour.
- [ ] No privileged DB/storage credentials.
- [ ] Sensitive data minimized.
- [ ] Dependencies and package contents reviewed.
