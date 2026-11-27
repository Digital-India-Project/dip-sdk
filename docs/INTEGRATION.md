# DIP SDK — Integration Contract

## 1. Source of truth

The SDK consumes stable, versioned API contracts from dip-api and the existing DIPINDIA platform. It does not define backend routes independently. DIPINDIA remains the product and data authority during gradual ecosystem migration.

## 2. Consumer matrix

| Consumer | SDK relationship |
|---|---|
| External B2B partner apps | Primary intended consumer of approved public APIs |
| DIPINDIA | May use shared clients for server/client calls only where appropriate; avoid self-calls that add needless latency |
| dip-api | Provider of OpenAPI specs and API behaviour |
| dip-core | Source of stable domain schemas where appropriate |
| dip-security | Defines token and authorization expectations |
| dip-ui | No direct dependency expected |
| dip-automation | Prefer internal service contracts; SDK only if API boundary is appropriate |
| dip-docs | Uses examples and API reference metadata |
| dip-status | No direct dependency expected |

## 3. Endpoint onboarding

Every SDK method requires:
- Existing or approved endpoint.
- OpenAPI operation ID.
- Auth scope and permission requirements.
- Request/response schemas.
- Error codes.
- Rate limit and pagination behaviour.
- Idempotency/retry rules.
- Data classification.
- Test fixtures.

Do not invent endpoints or expose internal admin routes for SDK convenience.

## 4. Authentication contract

- Consumer supplies token provider.
- API validates token and permissions.
- SDK does not make authorization decisions.
- No privileged service secret in browser package.
- Token audience and origin must be constrained.
- Service-to-service credentials are managed by the consuming backend.

## 5. Versioning

- SDK SemVer.
- API version declared explicitly.
- Generated types tied to OpenAPI version.
- Breaking API changes require major SDK release or versioned API path.
- Deprecations documented with timelines and examples.
- Consumer contract tests required before release.

## 6. Migration process

1. Confirm endpoint exists and is approved.
2. Add/update OpenAPI spec in dip-api.
3. Generate types and validate schemas.
4. Implement typed SDK method.
5. Add mock and contract tests.
6. Update documentation and examples.
7. Release only after approval.
8. Maintain compatibility with supported API versions.

## 7. Prohibited patterns

- Direct production database or bucket access.
- Hardcoded privileged credentials.
- Undocumented endpoints.
- Client-side trust of role claims.
- Blind retry of non-idempotent mutations.
- Publishing packages without approval.
