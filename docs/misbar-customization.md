# Misbar / مسبار — Owner customization guide

All controls live in **/admin → المحتوى والمظهر** (owner only). Everything is saved inside `site-content-settings` (`experience` holds the new settings). The shared contract is in `lib/site-experience.ts`. The frontend normalizes reads with `normalizeSiteContentSettings` (which calls `migrateLegacySiteIdentity` and `sanitizeExperienceSettings`). The backend validates writes with `validateExperienceSettings`.

## Save, preview, reset
- **Save** (button at the top of the panel): before sending, the experience is checked with `checkExperienceSettings`. If something is invalid, the exact field path is shown and nothing is sent. Server errors are shown along with the HTTP status. When a save succeeds, the cache is replaced with the server response, so the change survives a reload. Saving needs a persistent DB.
- **Live preview**: shows the current unsaved state in this browser tab only, held in React memory. It is never sent to the server or stored, and other sessions keep seeing the saved version. A floating bar on public pages lets you return to editing or end the preview. Leaving the panel ends the preview.
- **Restore defaults**: asks for an inline confirmation first. It only resets the local form; nothing changes until you save.

## Global controls
| Area | Controls |
|---|---|
| Theme | Preset or custom colours (primary, gold, ink, background, surface), heading and body font, base font size, heading scale, corner radius, button shape, card style, background pattern, spacing density, motion on/off. Applied as CSS variables on `<html>`, so they reach public pages, portals, admin and dialogs. Legacy hard-coded colours are remapped through CSS. |
| Top nav | Which routes appear, their order, AR/EN labels and highlight. Toggles for contact button, currency, language, install button and tagline. Route slugs are fixed. |
| Footer | Tagline, links column (routes, order, labels, title), contact column toggle, copyright, disclaimer. Contact destinations come from the existing brand settings and are never rewritten. |
| Announcement | On/off, AR/EN text, link label and route, tone, and the routes where it shows. |
| Route eyebrow | A breadcrumb label per route, which can be shown or hidden. |
| SEO | Title, description, og:image and noindex for every route. Article and research detail pages use `{title}` / `{description}` templates. Private routes are always noindex. One writer (`SeoManager`) avoids the old PageSeo/SiteIdentitySync title race. |

## Per route
| Route | Real controls |
|---|---|
| `/` Home | Section order and visibility (hero, programs, pathways, process, knowledge, FAQ teaser, CTA) and all of their texts, CTA routes, hero image URL and alt. Programs come live from `/api/programs` and have loading, error-with-retry and empty states. Legacy `pages.home` title, description and content still render in the hero. |
| `/participant-portal` | `pages.participant` title/description/content, an extra intro, empty-state text, plus the existing card fields, order and display mode. |
| `/coordinator`, `/coordinator-portal`, `/coordinator/dashboard`, `/coordinator/submissions` | Coordinator portal texts come from the existing **بوابة المنسق** panel. Here you get theme, eyebrow and SEO. |
| `/special-requests` | `pages.specialRequests` heading, description and content; service cards (add, edit, reorder, delete); request button label; contact box text. |
| `/knowledge-center` | `pages.knowledge` heading and description, plus an intro. |
| `/knowledge-center/:slug` | An override by slug can edit the title, category, excerpt, read time, date, featured, hidden and the body (plain text with `##` headings and `-` bullets). A new slug creates a new article. |
| `/about` | `pages.about` heading, description and content; intro; sections; values; offers list (all editable). The invented stats and the Vision-2030 claim block were removed. |
| `/faq` | `pages.faq` heading, description and content; Q&A items (add, edit, reorder, delete); contact box. |
| `/research/:id` | `pages.researchDetail` texts and an SEO template. Opportunity data comes from the programs admin. |
| `/survey`, `/register` | Form heading, subheading, submit label, success title and body, plus the existing field, degree, experience and agreement settings. |
| `/admin`, `/admin/submissions` | Admin tab labels (AR) and a welcome banner. Theme applies. |
| `/owner-admin`, `/sign-in`, `/sign-up` | Theme, eyebrow and SEO (noindex). Clerk UI is styled with the Misbar palette; auth logic is unchanged. |
| 404 | Title, body, button label. |

## Honest limitations
- An installed PWA keeps the OS icon and name it was installed with. Changing the app icon or name does not refresh home-screen icons until the user reinstalls.
- Heading scale affects the redesigned display headings (`.m-h1`/`.m-h2`). Older page bodies that still use fixed Tailwind sizes (parts of the participant portal, research detail, survey, admin) are colour-themed but do not scale.
- The English admin tab labels are stored but not displayed, because the admin UI is Arabic-only.
- The coordinator portal is not edited from this panel; it uses its own panel.
- Built-in knowledge articles stay in code. Owner overrides replace fields per slug; deleting an override restores the built-in text.
- Owner save and persistence could not be browser-tested in this fork because Clerk secrets are missing. No auth bypass was added.
- The JS bundle is about 1.99 MB (a pre-existing single-chunk build).
