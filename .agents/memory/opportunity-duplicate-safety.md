---
name: Duplicate opportunity safety
description: The product rule for preventing duplicate research opportunities without damaging registrations.
---

Prevent duplicates using normalized Arabic and English title-plus-specialty matches. Existing duplicates require owner review; archive them reversibly instead of deleting opportunity or registration records, and never change reserved seats during duplicate cleanup.

**Why:** the user asked for a duplicate-review system while explicitly requiring existing opportunities and participant data to be preserved.

**How to apply:** enforce the same duplicate rule for manual entry, imports, and opportunity edits. Keep archive/restore owner-only, require a confirmed canonical match, and serialize archive changes with registrations.
