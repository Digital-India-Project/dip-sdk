# Contributing to DIP SDK

## 1. Governance & Branching

- Always work on dedicated review branches (e.g. `development/<feature>`).
- Never push directly to `main` or `master`.
- Never merge, deploy, or publish packages without explicit maintainer approval.
- Never commit secrets, `.env` files, production customer data, or live credentials.

## 2. Endpoint Onboarding Rule

Every new SDK method must map to a verified, documented endpoint in `Digital-India-Project/dip-api`:
1. Update `src/api-spec.json` from the approved `dip-api` OpenAPI document.
2. Run `npm run generate` to regenerate `src/generated/openapi-types.ts`.
3. Add Zod request/response schemas in `src/contracts/`.
4. Implement the resource method in `src/resources/`.
5. Add unit, integration, and contract tests under `tests/`.
6. Update `docs/API_COVERAGE.md` and `CHANGELOG.md`.

## 3. Local Verification Commands

```bash
npm run check:types-drift
npm run typecheck
npm run lint
npm run build
npm test
```
