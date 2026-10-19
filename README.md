# Pronto Air — Website (working files)

Eight standalone HTML pages. These are a **working redesign**, not a verified official site. Do not publish as the business’s official site without approval.

## Pages
- `index.html`
- `residential-cooling.html`
- `residential-heating.html`
- `mobile-homes.html`
- `light-commercial.html`
- `contact-us.html`
- `service-agreement-faqs.html`
- `privacy-policy.html`

## Assets
The `images/` directory is ready for the business’s own photographs. Current photos and logo are referenced by remote URLs in the HTML; these have not yet been replaced with local assets. The site uses CDN dependencies (Tailwind CSS, Inter fonts, Font Awesome).

## Blocking items before public launch
- Contact form on Contact Us is **preview-only**: submissions are not delivered. The page displays this limitation. Check the Home form separately.
- Privacy Policy is a **draft** requiring business/legal review; it contains statements about personal-data handling that have not been verified. It is marked `noindex,nofollow` in the source, but that does not prevent direct public access.
- Obtain the owner’s permission to publish; review all commercial claims and confirm data, SEO, links, image permissions, and responsive rendering.
- Check the Home page's page-landmark structure (`<main>`).

## Editing
Keep the eight filenames unchanged because pages link to them via relative paths. Use relative image paths such as `images/ac-repair.jpg` after uploading approved business photos.