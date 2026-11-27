# Authentication & Token Handling Guide

## 1. Core Principle

DIP-SDK **never collects passwords, never stores refresh tokens, and never implements an independent identity provider**. Consuming applications supply short-lived Bearer access tokens via a `TokenProvider`.

## 2. Token Provider Interfaces

### Async Function Provider
```ts
import { DIPClient } from '@digital-india/sdk';

const client = new DIPClient({
  baseUrl: 'https://api.example.com',
  tokenProvider: async () => getCurrentAccessToken(),
});
```

### In-Memory Caching & Refresh Provider
Use `createCachingTokenProvider` for server-side integrations or in-memory browser sessions:
```ts
import { DIPClient, createCachingTokenProvider } from '@digital-india/sdk';

const tokenProvider = createCachingTokenProvider({
  refreshMarginSeconds: 30,
  fetchToken: async () => {
    const res = await fetch('/auth/session-token');
    return res.json(); // { accessToken, expiresInSeconds }
  },
});

const client = new DIPClient({
  baseUrl: 'https://api.example.com',
  tokenProvider,
});
```
When the API returns `401 Unauthorized` and a `RefreshableTokenProvider` (`refreshToken()` method) is configured, `DIPClient` invokes `refreshToken()` at most **once** per request.

## 3. Browser vs Server Token Handling

- **Browser applications:**
  - Keep access tokens strictly in JS memory (React state/context or `createCachingTokenProvider`).
  - **Do NOT store tokens in `localStorage` or `sessionStorage`**, where XSS scripts can exfiltrate them.
  - Never embed long-lived API keys, client secrets, or service-account credentials in browser bundles.
  - Prefer a Backend-for-Frontend (BFF) proxy for partner/machine credentials.
- **Node.js / Server applications:**
  - Keep machine credentials and webhook secrets in server environment variables.
  - Use `Authorization: Bearer` tokens scoped to the minimum required permissions (`applications:read`, `applications:write`, etc.).

## 4. Origin & Redirect Protections

- `DIPClient` verifies the target URL origin matches the configured `baseUrl` origin before attaching `Authorization` headers.
- HTTP redirects are set to `redirect: 'manual'` so Bearer tokens are never automatically forwarded cross-origin.
- `Authorization` headers and sensitive query parameters (`token`, `sig`, `expires`, `key`) are automatically redacted in middleware contexts and diagnostic logs.
