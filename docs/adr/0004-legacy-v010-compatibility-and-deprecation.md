# ADR 0004: Legacy v0.1.0 Compatibility and Deprecation Boundary

## Status
Accepted (2026-11-27, `development/sdk-foundation`)

## Context
The baseline `master` branch (`0.1.0`) exported `ApiClient`, `ApiSathiClient`, `DatabaseClient`, and `StorageClient` from `src/index.ts`. Read-only inspection of `Digital-India-Project/dip-api` and `Digital-India-Project/DIPINDIA` showed that `GET /data/:collection` does not exist in either repository, `GET /storage/objects/:key` does not match `DIPINDIA` (`/api/storage/files/:id/metadata`) or `dip-api` (`/api/v1/applications/:id/documents*`), and `GET /api-sathi/status` differs from `DIPINDIA`'s `/api/v1/apisathi/status`.

## Decision
1. **Preserve Exports Without Breaking Changes**: Keep `ApiClient`, `DipApiError`, `ApiSathiClient`, `DatabaseClient`, and `StorageClient` exported from `src/index.ts` in `0.2.0`.
2. **Deprecate Unverified Resource Clients**: Mark `DatabaseClient` and `StorageClient` `@deprecated` in JSDoc and documentation, explicitly stating that direct database/object-storage access is prohibited and directing new callers to `DIPClient` (`client.documents`, `client.services`, `client.applications`).
3. **Bridge Verified DIPINDIA Route on `ApiSathiClient`**: Preserve `ApiSathiClient.getStatus()` for backwards compatibility and add `ApiSathiClient.getGatewayStatus()` targeting `DIPINDIA`'s verified `GET /api/v1/apisathi/status`.

## Consequences
- Zero breaking import changes for existing `0.1.0` consumers while guiding migration onto verified `dip-api` `/api/v1` contracts.
