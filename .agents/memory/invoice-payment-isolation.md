---
name: Invoice payment isolation
description: Rules for adding invoice snapshots and manual payment state without changing registration or seat behavior.
---

Store invoice snapshots and manual payment history separately from a participant's registration record. Payment updates must not change the registration's approval state, capacity, or opportunity visibility.

**Why:** Render migrations can be pending while registrations must stay available, and a payment record is not an admission decision.

**How to apply:** Use additive invoice/payment tables, check that the migration is present before enabling payment controls, and keep registration creation successful when those tables are absent.
