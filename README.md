# Pronto Air — ATREZZO website redesign (demo)

**Status: working prospect demo, not the approved or official Pronto Air website.** Noindex/nofollow is intentionally retained across all eight pages. Do not publish on the business domain or represent this as a commissioned project until the owner authorizes it.

## Pages
- `index.html` — Home
- `residential-cooling.html`
- `residential-heating.html`
- `mobile-homes.html`
- `light-commercial.html`
- `contact-us.html`
- `service-agreement-faqs.html`
- `privacy-policy.html` — **draft, not client/legal approved**

## Implemented demo functionality
- Static HTML/CSS/JS with locally stored image assets; the approved site's fonts, icons, and visual structure are retained.
- Home and Contact forms forward requests via FormSubmit AJAX to **`atrezzostudiosv@gmail.com`**, a temporary Atrezzo testing inbox. The owner previously confirmed receipt of those forms in testing. Neither form books appointments.
- **Ari**, the Pronto Air virtual assistant, is integrated into all eight pages. Its backend is Cloudflare Workers AI at `https://pronto-air-assistant.atrezzostudiosv.workers.dev/chat`. It uses the company voice, handles English and Spanish per question, and falls back to guided replies when AI is unavailable.
- Ari includes verified call links and a consented follow-up form that posts **directly** to FormSubmit, not to the model. Browser tests **simulate** this submission. **Real delivery and inbox receipt for Ari's own form are NOT YET VERIFIED.** It does not promise appointment availability or callback times.
- Quick service buttons use the same conversational submit flow as typed visitor questions. The former stale PR #13 was replaced by merged PR #17.

## Quality checks recorded on 22 October 2026
- GitHub Actions passed dedicated quick-action and Workers AI rules tests after PR #17.
- The browser QA suite passed 32 page/viewport cases (8 pages at 375, 768, 1024, and 1440px), 16 automated axe checks for the assistant at 375/1440px, keyboard/close checks, and mocked conversational/contact cases. These tests **are not a comprehensive WCAG 2.2 AA audit**, and mocked form success does not mean an email was received.
- Repository checks confirmed the presence of 18 referenced image assets and 11 local CSS/JS assets. File existence alone does not validate image suitability, licensing, visual rendering in production, or loading from the eventual client domain.
- The public GitHub Pages preview was not independently accessed in the final source check; actual live rendering/performance and 20–30 in-depth conversational trials are still to be completed.

## Outstanding before an official client launch
1. Client authorization and factual review of all copy, services, images and branding; confirm photo rights and that no demo is misrepresented.
2. Privacy/data-handling review: the Privacy Policy is a **draft**, and Cloudflare Workers AI plus FormSubmit must be approved for production.
3. Replace the Atrezzo test inbox with the business-authorized receiving address **only with approval**; change Home, Contact, Ari and associated consent notices. Re-activate and confirm real email receipt.
4. Repeat real-world responsive, link, navigation, browser/accessibility and performance tests, including 20–30 diverse English/Spanish AI conversations and the real Ari follow-up submission.
5. Confirm domain, hosting, migration paths, HTTP redirects, indexing, canonical URLs, schema and approved sitemap; remove noindex **only on authorized production hosting**.
6. Authorize the eventual client domain in Cloudflare `ALLOWED_ORIGINS` and update the browser endpoint as necessary; verify HTTPS and CORS on the migrated deployment. Keep API credentials server-side.

See `assistant-worker/README.md` for deployment, `seo/LAUNCH-CHECKLIST.md` for SEO, and `tools/verify-ari-quick-actions.cjs` for targeted regression QA.
