---
name: Automatic social seat updates
description: Misbar's selected behavior for announcing remaining research-opportunity seats.
---

For every successful registration in an open opportunity, publish a new seat-count update to every connected active social account. Include total and remaining seats, including first-author and co-author availability, but never disclose participant identity or contact details. Follow the current public visibility settings for the opportunity title, specialty, and image. Treat uncertain provider results as non-retryable until checked; these are separate posts rather than edits to prior posts.

**Why:** the user chose updates after each successful registration for all open opportunities and emphasized remaining-seat counts.

**How to apply:** enqueue in the Render PostgreSQL transaction with the registration, process only in the Render API, and show per-account results to the owner. Do not connect this flow to Replit storage or enable production posting before the required Render migration and release.
