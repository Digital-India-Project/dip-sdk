# DIP SDK — Baseline Repository Audit Report

**Branch audited:** `master` (baseline commit `fb01050`)  
**Target review branch:** `development/sdk-foundation`  
**Package:** `@digital-india/sdk` (`0.1.0` -> `0.2.0` on review branch, `private: true`)

## 1. Original Repository State

### Files present at baseline
- `package.json`, `tsconfig.json`, `.env.example`, `bun.lock`
- `README.md` and `docs/{ARCHITECTURE,INTEGRATION,PROJECT_PLAN,ROADMAP,SECURITY}.md`
- `scripts/generate-types.ts`
- `src/index.ts`, `src/client.ts`, `src/server.ts`
- `src/services/{apiSathi,database,storage}.ts`

### What already worked
- Strict TypeScript compilation (`tsc`, `tsc --noEmit`) with ES2022/CommonJS target.
- Basic `ApiClient` wrapper over Axios with `baseUrl`, `HTTPS` enforcement (with `allowInsecureHttpInDev`), `maxRedirects: 0`, `getToken` hook, and `DipApiError`.
- Dev HTTP server (`src/server.ts`) listening on `0.0.0.0:3000` with `/health`.

### Identified Gaps, Mismatches & Risks
1. **Unverified legacy service paths vs `dip-api` and `DIPINDIA`:**
   - `ApiSathiClient.getStatus()` called `GET /api-sathi/status`, whereas `DIPINDIA` mounts `apiSathiRouter` at `/api/v1/apisathi` (`GET /api/v1/apisathi/status`) and `dip-api` exposes `/api/v1/integrations/providers`.
   - `DatabaseClient.listRecords()` called `GET /data/:collection`, which **does not exist** in either `dip-api` or `DIPINDIA`. Exposing generic collection access in a public SDK violates `docs/SECURITY.md`.
   - `StorageClient.getMetadata()` called `GET /storage/objects/:key`, whereas `DIPINDIA` exposes `/api/storage/files/:id/metadata` and `dip-api` exposes `/api/v1/applications/:applicationId/documents` + `upload-intent`.
2. **Missing OpenAPI contract snapshot:** `scripts/generate-types.ts` looked for `src/api-spec.json`, which was absent.
3. **Missing core SDK capabilities:** No Fetch transport, no bounded retries or `Retry-After` handling, no typed error hierarchy, no header/query redaction, no pagination helpers, no middleware hooks, and no server-only webhook verification utilities.
4. **Missing QA, packaging, and automation:** No test runner (`vitest`), no ESLint config, no ESM exports map, no examples, no CI workflow, no `LICENSE`, and no `CHANGELOG.md`.
5. **Lockfile mismatch:** `bun.lock` was present alongside `npm` scripts; normalized to npm for Node 22 compatibility.

## 2. Preserved Functionality
- All v0.1.0 public exports (`ApiClient`, `DipApiError`, `ApiSathiClient`, `DatabaseClient`, `StorageClient`) remain exported from `src/index.ts` without breaking existing signatures.
- `DatabaseClient` and `StorageClient` are marked `@deprecated` with explicit security boundary notices guiding callers to verified `DIPClient` resource clients.
- `src/server.ts` remains runnable via `npm run dev` on port `3000` (`0.0.0.0`).
