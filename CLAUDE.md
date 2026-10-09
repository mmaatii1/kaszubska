# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Single-file static landing page for **Kaszubska Osada** — a real estate project selling 8 year-round holiday homes in Kashubia, Poland. The entire site is `index.html`. No build system, no package manager, no framework.

To preview: open `index.html` directly in a browser. No server needed (all assets are either inline or loaded from external CDNs).

## Architecture

Everything lives in one file with three logical zones:

1. **`<head>`** — SEO meta tags, Open Graph, JSON-LD structured data, Google Fonts (`Playfair Display`, `Inter`), Phosphor Icons CDN (`@phosphor-icons/web`), and all CSS in a single `<style>` block.

2. **`<body>`** — HTML sections in this order: nav, offer bar (`#offer-bar`), hero, offer/apartments (`#oferta`), aerial image, standard (`#standard`), pod klucz (`#pod-klucz`), domy (`#o-projekcie`), osada (`#o-osadzie`), lokalizacja (`#lokalizacja`), inwestycja (`#inwestycja`), gallery (`#galeria`), kontakt (`#kontakt`), footer, lightbox overlay, offer popup overlay.

3. **Two `<script>` blocks** at end of `<body>`:
   - First (larger): nav toggle, scroll behaviour, aerial parallax, hero Ken Burns slider, IntersectionObserver reveal animations, count-up stat animations, tab gallery with lightbox, touch swipe for gallery.
   - Second: apartment grid filter/sort (`#aptGrid`), offer popup logic, lot/half selector modal, Meta Pixel events.

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

Any element with `data-carousel` (`#aptGrid`, `.standard-grid`, `.attractions`) turns into a horizontal scroll-snap carousel with generated dots (`.m-dots`) at ≤600px; on wider screens it keeps its normal layout. Call `window.mCarousels.rebuild(el)` after changing which children are visible.

## Gallery tabs

Gallery images are defined in the `TABS` JS object (search for `const TABS`) with keys: `zewnetrze`, `wnetrze`, `dzialka`, `okolica`. Each value is an array of image URLs hosted on `kaszubskaosada.com.pl/wp-content/uploads/`.

## JSON-LD structured data

The `<script type="application/ld+json">` block at the top of `<head>` contains contact info, geo coordinates, and price range. Keep it in sync when updating address, phone, or price information shown in the HTML.

## Responsive breakpoints

- `≥ 1200px` — full desktop layout
- `≤ 900px` — two-column grids collapse, apartment carousel shows 2 cards
- `≤ 600px` — single-column, mobile nav, carousel shows 1 card, popup layout adjusts
