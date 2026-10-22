# Home — responsive images, QA, and regeneration

This optimization uses **only original approved Pronto Air site images**. It does not fabricate photos or modify their content/crop.

## Changes included (2026-10-22)
- `home-hero-mobile.webp`: responsive alternatives at 640 px and 820 px.
- `pronto-home-family-team.webp`: alternatives at 840 px and 1100 px.
- `home-maintenance-tuneup.webp`: alternative at 700 px. Its proposed 1000 px alternative was *removed* because it was larger than the original, which remains the high-resolution fallback.
- The original source files remain unchanged. The Home `index.html` references the alternatives with `srcset` and `sizes`. Existing width/height, CSS classes, object-fit and focal position remain unchanged.
- Adjusted contrast (not wording) for the badge "Established & Trusted" and five small service-area labels. These are style-only changes.

## Rebuild
Run `python -m pip install Pillow`, then `python tools/build-home-responsive-images.py`. New output should replace the generated variants, not the originals. Run `python tools/verify-home-assets.py` to check size, fidelity, dimensions and the noindex preview rule.

## Verification
- Static image-geometry and fidelity checks passed: five alternatives are smaller than their source files, with measured per-channel mean absolute errors below 4/255.
- Headless Chromium screenshots comparing approved original Home against modified Home passed at widths 375, 768, 1024 and 1440 px. Above-threshold pixel differences: 0.20%, 0.00%, 0.00%, 0.00%, respectively. This is a *visual-regression* test, not a PageSpeed score.
- The web remains a **non-indexable demo** with `noindex, nofollow`. Do not activate indexation or publish as Pronto Air's official site without approval.

## Remaining opportunities
- Measure mobile PageSpeed again after GitHub Pages deployment (baseline 85 mobile, 99 desktop). Real field data are not yet available.
- Reduce the render-blocking Font Awesome/Google Fonts dependency without losing icons or altering layout (needs separate validated change).
- GitHub Pages caching headers cannot be tuned for long-lived image caching at the file level; configure caching on a hosting/CDN that supports HTTP cache controls at official launch.
