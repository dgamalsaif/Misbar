# Misbar page and customization coverage

This inventory describes the controls and data sources behind the current routes. Public opportunity titles, descriptions, seats, dates, fees, and registration links continue to come from the existing opportunity records; the experience editor does not replace or fabricate them.

## Owner controls

The owner-only **Site experience** area edits the shared `siteContentSettings` record. It provides bilingual brand/app identity, site-logo URL or direct PNG/JPG/WebP upload, and an explicit remove action; theme preset and editable palette; page background, typefaces and heading scale; button/card shapes; spacing and motion; announcement bar; public navigation and footer links; homepage section visibility/order and hero image/copy; page introduction strips; bilingual content blocks; and page-specific title, description, social image, and indexing settings. Uploaded logo files use the existing image-storage service. The new image appears as a draft and the owner saves the settings to apply it; clearing the logo removes its displayed site-logo mark without restoring the default. Resetting settings to defaults requires confirmation.

The existing **Site content** area edits the rest of the same site-settings record, including contact channels, current page text, coordinator-facing text, participant empty states, and existing specialty settings. The coordinator portal's own owner-managed settings remain in its existing settings endpoint. Opportunity management remains in its existing records and workflow.

Save requests are validated on the server and are owner-only. The browser reports server errors instead of treating a rejected or failed write as a successful save. Existing custom content and contact destinations are retained during the exact legacy-name upgrade. Site appearance settings do not grant access to roles, secrets, server code, or private group links.

## Route inventory

| Page or route | What remains live | Which controls affect it |
| --- | --- | --- |
| `/` | Counts and opportunity cards come from currently open records. | Shared identity, theme, announcement, navigation/footer, SEO, page strip, and ordered/visible home sections, hero, pathways, process, knowledge and FAQ teaser, CTA. |
| `/participant-portal` | Open opportunity records, specialties, registration modal and existing participant workflows. | Shared theme/chrome/SEO; bilingual page copy and empty state; opportunity data remains in existing opportunity management. |
| `/research/:id` | Live opportunity details and registration links. | Shared theme/chrome; route SEO templates support `{title}` and `{description}`; the record remains the source of opportunity-specific content. |
| `/survey` and `/register` | Existing registration forms and submission behavior. | Shared theme/chrome and route metadata; form fields and opportunity context remain controlled by the existing form/opportunity settings. |
| `/special-requests` | Existing inquiry flow and contact destinations. | Shared theme/chrome/SEO plus bilingual service copy, links and content sections. |
| `/knowledge-center` and `/knowledge-center/:slug` | Existing knowledge index/article routing. | Shared theme/chrome; bilingual introduction/article content and per-route SEO, with article-specific title/description supported by the existing route template. |
| `/about` | Existing public information page. | Shared theme/chrome/SEO and bilingual content sections, order, and visibility. |
| `/faq` | Existing questions and answers. | Shared theme/chrome/SEO and bilingual FAQ items and contact text. |
| `/coordinator` and `/coordinator-portal` | Existing access-code gate and coordinator authentication. | Shared typography, neutral surfaces and theme; the separate owner-managed coordinator portal settings control its bilingual identity, copy, navigation, contact links, cookie and install prompts. Access codes and roles are not exposed in the appearance editor. |
| `/admin` and `/coordinator/dashboard` | Existing role-specific dashboard, records and permissions. | Shared theme and owner-only editable admin welcome/navigation labels. The appearance editor is available to the owner only; coordinator access does not gain owner settings. |
| `/admin/submissions` and `/coordinator/submissions` | Existing role-filtered submission and registration records. | Shared theme and private-route metadata; records and permission checks remain unchanged. |
| `/owner-admin`, `/sign-in/*`, `/sign-up/*` | Existing owner authentication. | Shared theme, logo/app identity and private metadata; authentication remains with Clerk. |
| Unknown route | Existing 404 behavior. | Shared theme, bilingual 404 copy and private/no-index metadata. |

## Search and installed-app identity

Each route has editable Arabic and English titles/descriptions and social image. Private routes always remain `noindex`; the public base domain and current route paths do not change. Page-specific opportunity/article titles fill their configured metadata templates. Structured data uses the current site identity. The defaults mention relevant research and career topics without promising board points, publication, promotion, or allowance outcomes.

The manifest, favicon/touch icon, browser theme color and install prompt use the editable Misbar identity. Browsers and already-installed home-screen apps may cache app names and icons; an identity change is served immediately from the website, while the installed-app label/icon refresh depends on the browser and operating system.

## Scope and limits

The visual direction uses a warm cream surface, deep green and restrained gold, with original Misbar artwork and content. It is a design reference, not a copy of researchaid2026.com: third-party logos, imagery, testimonials and claims are not reused. Board, fellowship, promotion and excellence-allowance decisions are controlled by the relevant authorities, and no outcome is guaranteed.
