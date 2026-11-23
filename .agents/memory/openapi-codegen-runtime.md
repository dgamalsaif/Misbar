---
name: OpenAPI code generation runtime
description: Runtime requirement for regenerating the typed OpenAPI clients without changing the site's configured Node version.
---

Run the Orval code-generation CLI with Node 22 available first on `PATH`; the configured Node 20 runtime does not provide `Map.groupBy`, which Orval v8 uses. Keep `.replit` and the app runtime pinned as they are rather than switching the whole project just for codegen.

**Why:** The OpenAPI generation command fails under Node 20 with `Map.groupBy is not a function`, while running the Orval CLI under Node 22 succeeds.

**How to apply:** Use a temporary PATH override for the codegen command, then run the normal library and application checks under the project’s configured runtime.
