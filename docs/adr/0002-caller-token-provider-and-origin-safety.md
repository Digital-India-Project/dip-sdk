# ADR 0002: Caller-Supplied Token Provider and Origin Safety

## Status
Accepted (2026-11-27, `development/sdk-foundation`)

## Context
External SDKs operate in untrusted client environments or partner backends. Embedding service secrets, persisting tokens to `localStorage`, or forwarding Bearer tokens across HTTP redirects or untrusted hosts creates credential exfiltration risks.

## Decision
1. **No Embedded Identity Engine**: `DIPClient` accepts caller-supplied `TokenProvider` functions or `RefreshableTokenProvider` objects. `createCachingTokenProvider` stores tokens strictly in JavaScript memory.
2. **Origin-Bound Token Injection**: `DIPClient` verifies `new URL(targetUrl).origin === trustedOrigin` before attaching `Authorization: Bearer ...` and configures `redirect: 'manual'` on `FetchTransport` so 3xx redirects never forward credentials.
3. **Automatic Diagnostic Redaction**: `redactHeaders`, `redactUrl`, and `redactSensitiveValue` strip authorization headers, webhook signatures, query parameters (`token`, `sig`, `key`, `expires`), and sensitive payload fields before invoking middleware or logger callbacks.
4. **HTTPS Enforcement**: Production configurations require `https:` and reject embedded URL credentials (`user:pass@host`).

## Consequences
- Consuming applications retain full control over Firebase Auth, OAuth, or BFF session tokens.
- Logs and telemetry hooks cannot leak Bearer tokens or signed upload URLs.
