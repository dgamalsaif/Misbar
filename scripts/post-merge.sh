#!/bin/bash
set -euo pipefail
cd "$(dirname "$0")/.."

head="$(git rev-parse HEAD)"
base="$(git rev-parse "${head}^" 2>/dev/null || true)"
needs_install=0

if [[ ! -d node_modules/.pnpm || -z "$base" ]]; then
  needs_install=1
elif ! git diff --quiet "$base" "$head" -- pnpm-lock.yaml pnpm-workspace.yaml; then
  needs_install=1
else
  dependency_fingerprint() {
    node -e '
      const fs = require("node:fs");
      const pkg = JSON.parse(fs.readFileSync(0, "utf8"));
      const fields = ["dependencies", "devDependencies", "optionalDependencies", "peerDependencies", "peerDependenciesMeta", "packageManager", "resolutions", "overrides", "pnpm"];
      const result = {};
      for (const field of fields) if (pkg[field] !== undefined) result[field] = pkg[field];
      process.stdout.write(JSON.stringify(result));
    '
  }

  while IFS= read -r manifest; do
    [[ -n "$manifest" ]] || continue
    if [[ ! -f "$manifest" ]] || ! git cat-file -e "${base}:${manifest}" 2>/dev/null; then
      needs_install=1
      break
    fi
    previous="$(git show "${base}:${manifest}" | dependency_fingerprint)"
    current="$(dependency_fingerprint < "$manifest")"
    if [[ "$previous" != "$current" ]]; then
      needs_install=1
      break
    fi
  done < <(git diff --name-only "$base" "$head" -- package.json '*/package.json' '**/package.json')
fi

if (( needs_install )); then
  if [[ -f pnpm-lock.yaml ]]; then
    CI=true pnpm install --prod=false --frozen-lockfile --prefer-offline
  else
    CI=true pnpm install --prod=false --no-frozen-lockfile --prefer-offline
  fi
else
  echo "No dependency changes detected; skipping pnpm install."
fi
# Database changes require explicit approval; setup must not run migrations.
