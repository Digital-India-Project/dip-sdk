# Release Process

**Current package status:** `private: true` (`0.2.0` candidate on `development/sdk-foundation`).  
**Publication policy:** No package publication to npm or any public registry is permitted without explicit maintainer sign-off.

## 1. Pre-Release Checklist

1. Confirm OpenAPI contract alignment (`npm run check:types-drift`).
2. Confirm clean TypeScript compilation and ESLint (`npm run typecheck && npm run lint`).
3. Confirm dual ESM and CommonJS build outputs (`npm run build`).
4. Confirm all unit, integration, contract, and compatibility tests pass (`npm test`).
5. Run `npm audit --audit-level=high` and review all transitive dependencies.
6. Verify zero secrets or production credentials exist in `dist/` or `git diff`.
7. Update `CHANGELOG.md` and bump SemVer according to breaking/feature/fix scope:
   - **MAJOR:** Breaking public API or minimum Node/TypeScript runtime changes.
   - **MINOR:** Backwards-compatible resource clients or SDK capabilities.
   - **PATCH:** Bug fixes, security patches, and documentation updates.

## 2. Supported Runtimes

- **Node.js:** `>=20.0.0` (verified on Node.js 22)
- **Browsers:** Modern evergreen browsers supporting standard `fetch`, `AbortController`, and `crypto.randomUUID` (import `@digital-india/sdk` only; never import `@digital-india/sdk/webhooks` in browser bundles).
- **Module Formats:** Native ESM (`import`) and CommonJS (`require`) with bundled `.d.ts` declarations.
