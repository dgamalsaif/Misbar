---
name: Theme preset normalization
description: Preserve selected visual presets when normalizing shared site experience settings.
---

Theme preset normalization must distinguish old default palettes from valid palettes the owner selected intentionally. A current preset’s exact palette must never be treated as legacy merely because the colors match.

**Why:** The former migration rule matched the current sandstone palette and changed a valid sandstone selection back to Misbar during validation.

**How to apply:** When adding or revising presets or migrations, validate a settings object for every curated preset and assert the selected preset and palette round-trip unchanged.
