---
name: Owner and coordinator authentication
description: Keep owner-only site settings separate from coordinator sessions and public participant routes.
---

Owner access is managed independently from coordinator access-code sessions. Site-wide content and appearance writes remain owner-only; coordinator sessions must not gain these controls, and public participant pages remain accessible without staff sign-in.

**Why:** Site settings can change public identity, content, and appearance, while coordinators have a narrower operational role.

**How to apply:** Keep owner checks on site-settings writes, use coordinator sessions only for coordinator routes and records, and do not add authentication bypasses to make local testing easier.
