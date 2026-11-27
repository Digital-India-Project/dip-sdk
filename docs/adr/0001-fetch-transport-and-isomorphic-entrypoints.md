# ADR 0001: Fetch Transport and Isomorphic Entrypoints

## Status
Accepted (2026-11-27, `development/sdk-foundation`)

## Context
The v0.1.0 starter depended solely on `axios` and bundled everything through a single entrypoint (`src/index.ts`), with no separation between browser-safe API clients and Node.js-only cryptographic utilities (such as HMAC webhook verification).

## Decision
1. **Standard Fetch API Transport**: `DIPClient` defaults to `FetchTransport` using `globalThis.fetch`, `AbortController`, and `redirect: 'manual'`, while exposing a `TransportAdapter` interface for custom runtimes and isolated testing.
2. **Dual Isomorphic & Server-Only Entrypoints**:
   - `@digital-india/sdk` (`src/index.ts`) MUST remain strictly free of `node:*` built-in imports so browser bundlers can tree-shake safely (`sideEffects: false`).
   - `@digital-india/sdk/webhooks` (`src/server-sdk.ts`) isolates `node:crypto` HMAC signature verification and replay protection strictly to Node.js server environments.
3. **Dual ESM and CommonJS Packaging**: Build both `dist/esm` (`type: module`) and `dist/cjs` (`type: commonjs`) with `.d.ts` declarations and conditional `exports` in `package.json`.

## Consequences
- Compatible with Node.js `>=20.0.0` (tested on Node 22) and modern evergreen browsers.
- Zero risk of `node:crypto` or server webhook helpers leaking into frontend bundles.
