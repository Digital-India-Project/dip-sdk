# DIP SDK — Roadmap

## Milestones

| Milestone | Priority | Outcome |
|---|---|---|
| K0 — Existing SDK audit | P0 | Verify source, exports and build |
| K1 — API contract alignment | P0 | Approved OpenAPI source from dip-api |
| K2 — Secure base client | P0 | Transport, auth provider, errors |
| K3 — Safe client boundaries | P0 | No privileged direct DB/storage access |
| K4 — Generated types | P1 | Reproducible API types |
| K5 — Service clients | P1 | Documented endpoint wrappers |
| K6 — Reliability | P1 | Timeouts, cancellation, safe retries |
| K7 — Developer docs | P1 | Quickstart and examples |
| K8 — Additional SDKs | P2 | Other languages if justified |

## P0
- [ ] Inventory all source files and package exports.
- [ ] Verify build and generated files.
- [ ] Resolve missing source paths referenced by index exports.
- [ ] Review DatabaseClient and StorageClient security boundary.
- [ ] Agree OpenAPI source/version with dip-api.
- [ ] Define token provider contract.
- [ ] Define error model and redaction.
- [ ] Add transport tests and HTTPS safeguards.

## P1
- [ ] Generate TypeScript types from reviewed OpenAPI.
- [ ] Add schema validation.
- [ ] Add typed API service clients.
- [ ] Add timeout and cancellation support.
- [ ] Add bounded retry and idempotency support.
- [ ] Add pagination/rate-limit handling.
- [ ] Add examples and clean-install tests.
- [ ] Define SemVer and changelog process.

## P2
- [ ] Additional language SDKs.
- [ ] Optional tracing hooks.
- [ ] Advanced code generation.
- [ ] Developer portal integration.

## Release gate

No package release until the API contract is stable, tests pass, secrets are absent, package exports work, compatibility is documented and publication is explicitly approved.
