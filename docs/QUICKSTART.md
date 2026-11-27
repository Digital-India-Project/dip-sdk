# Quickstart Guide

## 1. Installation

> Note: `@digital-india/sdk` is currently private and under review on `development/sdk-foundation`. Do not publish to npm without explicit approval.

```bash
npm install
npm run build
```

## 2. Node.js Quickstart

```ts
import { DIPClient, createCachingTokenProvider } from '@digital-india/sdk';

const client = new DIPClient({
  baseUrl: 'https://api.example.com',
  environment: 'production',
  timeoutMs: 15_000,
  tokenProvider: createCachingTokenProvider({
    fetchToken: async () => ({
      accessToken: await fetchShortLivedTokenFromYourAuthServer(),
      expiresInSeconds: 900,
    }),
  }),
});

// Public service catalogue
const catalogue = await client.services.list({ page: 1, limit: 20 });
console.log(catalogue.items);

// Authenticated application creation (auto-attaches Idempotency-Key)
const draft = await client.applications.create({
  service_id: 'svc_msme_assist',
  business_name: 'Bharat Traders LLP',
});
console.log(draft.id, draft.status);
```

## 3. Sandbox Quickstart (Non-Production Only)

For local/sandbox `dip-api` testing where `adapterMode === 'sandbox'`:
```ts
import { DIPClient } from '@digital-india/sdk';

const sandbox = new DIPClient({
  baseUrl: 'http://127.0.0.1:4000',
  environment: 'sandbox',
  allowInsecureHttpInDev: true,
});

const { access_token } = await sandbox.sandbox.issueToken({
  subject: 'usr_sandbox_01',
  tenant_id: 'tenant_sandbox_01',
});
```

## 4. Browser Quickstart

Import only from `@digital-india/sdk` (never `@digital-india/sdk/webhooks`). Supply an in-memory `tokenProvider`. See `examples/browser-safe-client.ts`.

## 5. Configuration Reference

| Option | Type | Default | Description |
|---|---|---|---|
| `baseUrl` / `baseURL` | `string` | Required | Gateway root URL (HTTPS required in production) |
| `environment` | `'production' \| 'sandbox' \| 'development'` | `'production'` | Environment guard (blocks `sandbox.issueToken` in production) |
| `apiVersion` | `'v1'` | `'v1'` | API version prefix (`/api/v1`) |
| `timeoutMs` / `timeout` | `number` | `15000` | Request timeout in ms (max `120000`) |
| `tokenProvider` / `getToken` | `TokenProvider` | `undefined` | Caller-supplied Bearer token provider |
| `validateResponses` | `boolean` | `true` | Zod runtime validation of response envelopes |
| `retry` | `Partial<RetryConfig>` | `maxRetries: 2` | Bounded exponential backoff with jitter |
| `transport` | `TransportAdapter` | `FetchTransport` | Custom transport adapter for tests/runtimes |
| `middleware` | `DIPMiddleware[]` | `[]` | Lifecycle hooks receiving redacted contexts |
| `logger` | `DIPLogger` | `undefined` | Structured logger receiving redacted metadata |
| `allowInsecureHttpInDev` | `boolean` | `false` | Allows `http://` only in non-production |
