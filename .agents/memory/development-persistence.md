---
name: Development persistence checks
description: Why customization verification must distinguish persistent PostgreSQL from development mock behavior.
---

Do not treat a successful development write as proof of durable persistence without checking which storage handled it.

**Why:** During the Misbar redesign, the inherited database layer classified every single-label hostname as an unreachable external host. This rejected the valid workspace database and silently used memory. Such a fallback can make settings look saved while losing them on restart. The fork also initially had an empty development schema and no owner authentication secrets, unlike the external live deployment.

**How to apply:** Preserve the existing database provider. Check database schema and persistent settings reads/writes independently; never add an owner-auth bypass to compensate for absent development credentials. Report authenticated browser tests as blocked when credentials are unavailable rather than implying they passed.
