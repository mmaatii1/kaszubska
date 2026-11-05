# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Single-file static landing page for **Kaszubska Osada** — a real estate project selling 8 year-round holiday homes in Kashubia, Poland. The site is `index.html` (+ images in `zdjecia/`, self-hosted fonts in `assets/fonts/`). No build system, no package manager, no framework. Push to `main` = FTP deploy to production (`.github/workflows/deploy-ftp.yml`); work on a branch.

To preview: serve the folder (`python3 -m http.server`), or use `httpd:2.4` with `AllowOverride All` to test `.htaccess` (cache headers, gzip, 403 rules). The only external origins are Google (GTM/gtag/Consent Mode), Clarity (via GTM), Meta Pixel (after consent) and the Maps iframe.

## Architecture

Everything lives in one file with three logical zones:

1. **`<head>`** — order matters: `<meta charset>` + viewport first, then one inline script with `dataLayer`/`gtag`, Consent Mode default (denied) + restore from `localStorage`, `gaEvent()` helper, the `js_error` reporter (masked message + browser family, max 3 per view), GTM, the gtag loader for `G-9YM5FV534P` (a combined Google tag that already carries Ads `AW-18508894435`, so no separate `config AW-…`: it would download the library again; GTM holds only Clarity, Conversion Linker and unused listeners) and the consent-gated Meta Pixel loader. Then SEO/OG/JSON-LD, hero image preloads (`media`-split phone/desktop), low-priority font preloads, and all CSS in one `<style>` (`@font-face` for the self-hosted Inter / Playfair Display variable fonts first).

2. **`<body>`** — nav + menu backdrop, offer bar (`#offer-bar`), hero, mobile stats strip, offer/apartments (`#oferta`), aerial image, standard (`#standard`), pod klucz (`#pod-klucz`), domy (`#o-projekcie`), osada (`#o-osadzie`), atuty, lokalizacja (`#lokalizacja`), inwestycja (`#inwestycja`), gallery (`#wizualizacje`), kontakt (`#kontakt`), FAQ (`#seo-info`), footer, cookie banner, float phone, offer popup, lightbox, two scripts, half-selector modal, icon sprite (`<!-- icons:start -->` … `<!-- icons:end -->`, generated).

3. **Two `<script>` blocks** at end of `<body>`:
   - First: shared helpers declared first (`$id`, `scrollLock` with named owners, `afterTransition(el, fn, ms)` = transitionend with timeout fallback, `scrollElTo`, `onSwipe`, `reducedMotion`), cookie banner, mobile menu, nav hide-on-scroll, desktop-only parallax, float-phone visibility, hero slider, reveal, gallery tabs + lightbox.
   - Second: mobile carousels (`mCarousels`), apartment grid filter/sort + card taps, offer popup (trigger + bottom sheet), forms, lot/half selector modal, phone/PDF/Meta events.

## Conventions (keep when editing)

- **Overlays** (menu, lightbox, lot modal, desktop popup) lock the page with `scrollLock.add('name')` / `.remove('name')`, never `body.style.overflow` directly, and hide with `afterTransition()` so a missing `transitionend` cannot leave the page locked. The popup treats `scrollLock.active()` as "busy".
- **No layout reads at start-up** (`getBoundingClientRect`, `offsetParent`, `scrollWidth` …): they force a synchronous layout of the whole page (the old 4.8 s "inline script" cost). Measure lazily (IntersectionObserver / on interaction). Animate only `transform`/`opacity`; no infinite `box-shadow` animations; everything must respect `prefers-reduced-motion`.
- **Icons**: `<i class="ph-bold ph-NAME" aria-hidden="true"><svg><use href="#b-NAME"></use></svg></i>` (`ph` + `#r-NAME` for regular). After adding a new icon run `uv run --with fonttools --with brotli tools/build_assets.py icons`; the same script rebuilds the font subsets (`fonts`).
- **Colours**: text on `--gold` uses `--on-gold` (white fails contrast); small gold text on light backgrounds uses `--gold-text`.
- **GA4 events** (via `gaEvent`): `menu_open`, `menu_click` (`link_target`, `menu_type`), `popup_view` (legacy, for comparison) + `popup_shown` (`scroll_percent`, `max_scroll_percent`, `popup_layout`), `popup_call`, `popup_lead`, `popup_dismiss` (`method`, `seconds_open`), `generate_lead` (`form_name`), `phone_click` + `ads_conversion_phone_call_lead`, `cookie_consent_accept`, `js_error` (`error_kind`, `error_message`, `browser_family`).

## Hero, menu, popup

- **Hero** (mobile first): H1 with the price, location line, "Zostało N z 8 domów", one promo badge, osada line, CTA "Zobacz dostępne domy" (`#oferta`) + small "Zadzwoń". Phones: `min-height: calc(100svh - 7.5rem)` so the stats strip peeks out and the compact cookie bar covers only that strip; no entrance animation/Ken Burns. Slide 1 is a `<picture>` (`hero_3-m720.webp` portrait crop for phones, `srcset` for desktop); slides 2-3 take `data-bg-m` / `data-bg-d` from JS after `load`.
- **Menu**: `<button id="hamburger">` with `aria-expanded`, panel `#nav-links` (opacity/transform), `#navBackdrop`; closes on link, Esc, outside tap. Same `<ul>` is the desktop nav from 901 px (`.nav-m-only` / `.nav-d-only`).
- **Popup** `#offerPopup`: opens after ≥25 s + ≥50% scroll + 1.5 s idle, once per session, never while busy; ignores taps for 400 ms (`.arming`); ≤600 px it is a non-blocking bottom sheet (no scroll lock, form behind "Zostaw numer"); desktop is a modal.
- **Float phone** is hidden while the hero buttons are on screen.

## Availability and price (single source of truth: the cards)

When a house is sold or a price changes, update the card, then everything the check lists: hero/menu/popup counts (`data-avail-text`), meta/OG/Twitter descriptions, JSON-LD (`offerCount`, `lowPrice`, `highPrice`, `priceRange`), `SOLD` map of the lot selector, `marketing/google-ads.md`. Run `python3 tools/check_consistency.py` before every push (WARNs when promo claims like "do −7%" exceed what the available cards show). CI runs it too (`.github/workflows/check.yml`, and as the first step of `deploy-ftp.yml`), so a mismatch blocks the FTP deploy.

## Testing

- Smoke test (all interactions at 360/390 px, FacebookApp/Samsung UAs, forms answered locally): `tools/smoke.mjs`, run inside the `docker.io/femtopixel/google-lighthouse` image (command in the file header).
- Lighthouse mobile: same image, `--userns=keep-id:uid=997`, against a local Apache (`httpd:2.4`) so cache/gzip headers are real.

## Design tokens (CSS variables)

```
--forest / --forest-mid / --forest-light   greens
--gold / --gold-light                      golds
--cream / --cream-dark                     page backgrounds
--text / --text-mid / --text-light         text hierarchy
--radius: 12px
```

## Apartment cards

Cards are a static grid (`#aptGrid`, 4/3/2 columns at >1100/≤1100/≤900px; at ≤600px it becomes a swipe carousel with dots) of `article.ko-card` elements, one per unit. Key patterns:

- Data attributes drive filtering/sorting JS: `data-num` (display order), `data-status` (`avail` | `sold`), `data-price` (promo price, 0 when sold), `data-plot` (m²). Status counts in the filter pills are computed from these.
- **Promo pricing**: `.ko-price` is the current (promo) price, `<s class="ko-old">` is the catalogue price before the promotion, `.ko-pct` is the discount badge, `.ko-save` the saving, followed by price per m². Keep the promo panel (`.ko-promo`) and "od X zł" headline copy (title, OG/Twitter meta, JSON-LD, hero, lead, atuty, SEO text, popup) in sync.
- **Sold unit**: add `ko-sold` class + `data-status="sold"`, replace the price box with `.ko-sold-note`, drop `.ko-actions`.
- Image: the 3D model `zdjecia/budynek-wiz-new-size-768x509.webp` twice — grey base + coloured copy clipped to one half (`.ko-left` for units 1–4, `.ko-right` for 1a–4a; split position via `--split` on `.ko-card`).
- PDF data sheets are in `karty/` (`karty/{n}-{n}A-New.pdf`, one per building).

The standard section (`#standard`) describes the developer standard (stan deweloperski) and links `OPIS STANDARDU WYKOŃCZENIA.pdf`; `#pod-klucz` presents turnkey finishing as a paid option priced individually.

Any element with `data-carousel` (`#aptGrid`, `.standard-grid`, `.attractions`, `.atuty-grid`, `.domy-gallery`, `.osada-gallery`, `.inv-gallery`, `.seo-grid`, `.pk-photos`) turns into a horizontal scroll-snap carousel at ≤600px, with generated prev/next arrows and dots (`.m-nav`) inserted right after it; on wider screens it keeps its normal layout and the nav is hidden. Call `window.mCarousels.rebuild(el)` after changing which children are visible.

The floating call button (`.float-phone`) sits above the cookie banner: `syncCookieOffset()` sets `--cookie-h` to the banner height while it is visible (applied with `transform`, never `bottom`, to avoid layout shift). Tapping the image or price box of an available card opens its "Karta + rzut" PDF.

## Gallery tabs

Gallery images are defined in the `TABS` JS object (search for `const TABS`) with keys `zewnetrze`, `wnetrze`, `otoczenie`; each entry is `{ src: 'zdjecia/…', label }`. Tabs are `button[data-tab]`. Static galleries elsewhere mark images with `data-lightbox`; the lightbox set is the images of the same block (`openLightboxSet(paths, index)`).

## JSON-LD structured data

The `<script type="application/ld+json">` block at the top of `<head>` contains contact info, geo coordinates, and price range. Keep it in sync when updating address, phone, or price information shown in the HTML.

## Responsive breakpoints

**Mobile-first, always.** Most visitors are on phones. Design and write CSS for ~390px first (base styles), then widen with `min-width` media queries; check every change at 360/390px before desktop.


- `≥ 1200px` — full desktop layout
- `≤ 900px` — two-column grids collapse, apartment carousel shows 2 cards
- `≤ 900px` — hamburger menu (desktop nav from 901px)
- `≤ 600px` — single-column, carousel shows 1 card, hero/peek layout, popup becomes a bottom sheet
