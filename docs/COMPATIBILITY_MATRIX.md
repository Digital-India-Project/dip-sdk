# Digital India Project — Compatibility Matrix (`dip-sdk`)

**Synchronization Date:** 2026-11-27  
**SDK Package:** `@digital-india/sdk@0.2.0` (`development/sdk-foundation`)

| Ecosystem Repo | Observed Version / Branch | Integration Direction | Compatible Scope | Known Mismatch / Gap | Status |
|---|---|---|---|---|---|
| `dip-api` | `dip-api-portal@0.1.0` (`main`) | `dip-sdk` → `dip-api` | All 25 `/api/v1` operations, envelopes, pagination, idempotency, rate-limit headers, webhook HMAC | Live non-sandbox adapters & gov/KYC providers remain `planned_unconnected` | **Synchronized (Sandbox Verified)** |
| `DIPINDIA` | `main` (`worker/routes/*`) | `dip-sdk` → `DIPINDIA` (legacy) / via `dip-api` | `ApiSathiClient.getGatewayStatus()` -> `/api/v1/apisathi/status` | Legacy `DatabaseClient` (`/data/:collection`) and `StorageClient` (`/storage/objects/:key`) do not match DIPINDIA routes | **Synchronized (Deprecated legacy guarded)** |
| `dip-core` | `@dip/core@0.2.0` (`main`) | Schema alignment only | Integer minor currency units (`amount_minor`), error taxonomy | `dip-core` uses `minorUnits`; `dip-api` wire format uses `amount_minor` (SDK matches wire contract) | **Compatible** |
| `dip-security` | `dip-security@0.1.0` (`main`) | Policy alignment | Origin-bound Bearer tokens, header/URL redaction, no `localStorage`, HTTPS enforcement | `dip-security` runtime verifier not bundled into client SDK | **Compatible** |
| `dip-infrastructure` | `dip-infrastructure@1.0.0` (`master`) | Runtime & CI alignment | Node 22, npm packaging, secret-free `.env.example`, PR CI checks | None | **Compatible** |
| `dip-ui` | `@digital-india-project/dip-ui@0.4.0` (`main`) | `dip-ui` → `dip-sdk` (optional) | Browser-safe `@digital-india/sdk` entrypoint has zero `node:*` imports | None | **Compatible** |
| `dip-automation` | `dip-automation@0.1.0` (`master`) | `dip-automation` → `dip-sdk` (planned) | `RefreshableTokenProvider`, correlation IDs, idempotency keys | Machine-to-machine client credentials flow pending in `dip-api` | **Planned** |
| `dip-docs` | `dip-docs@0.1.0` (`main`) | `dip-docs` ↔ `dip-sdk` | `dip-docs/docs/api/openapi.json` (`1.0.0-foundation`) & `sdk-guide.md` match `dip-sdk` 1:1 | None | **Synchronized** |
| `dip-status` | `main` (docs baseline) | `dip-status` → `dip-sdk` (optional) | `client.health.getHealth()` & `getMetrics()` | `dip-status` service code not yet implemented | **Compatible** |
