---
name: OpenAPI code generation runtime
description: Runtime requirement for regenerating the typed OpenAPI clients without changing the site's configured Node version.
---

Run the Orval code-generation CLI with Node 22 available first on `PATH`; the configured Node 20 runtime does not provide `Map.groupBy`, which Orval v8 uses. Set `override.zod.version` to `3` while the shared Zod dependency is v3, and run the library check from the workspace root. Keep `.replit` and the app runtime pinned rather than switching the whole project just for codegen.

**Why:** Orval v8 needs Node 22's `Map.groupBy`; without explicitly selecting Zod 3 it may emit Zod 4-only methods that fail the existing library typecheck.

**How to apply:** Use a temporary PATH override for `pnpm --filter @workspace/api-spec run codegen`, preserve the configured Node 20 `.replit` setting, and run `pnpm -w run typecheck:libs` from the workspace root.
