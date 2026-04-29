# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

Single-file static landing page for **Kaszubska Osada** — a real estate project selling 8 year-round holiday homes in Kashubia, Poland. The entire site is `index.html`. No build system, no package manager, no framework.

To preview: open `index.html` directly in a browser. No server needed (all assets are either inline or loaded from external CDNs).

## Architecture

Everything lives in one file with three logical zones:

1. **`<head>`** — SEO meta tags, Open Graph, JSON-LD structured data, Google Fonts (`Playfair Display`, `Inter`), Phosphor Icons CDN (`@phosphor-icons/web`), and all CSS in a single `<style>` block.

2. **`<body>`** — HTML sections in this order: nav, offer bar (`#offer-bar`), hero, offer/apartments (`#oferta`), aerial image, domy (`#o-projekcie`), osada (`#o-osadzie`), lokalizacja (`#lokalizacja`), inwestycja (`#inwestycja`), gallery (`#galeria`), kontakt (`#kontakt`), footer, lightbox overlay, offer popup overlay.

3. **Two `<script>` blocks** at end of `<body>`:
   - First (larger): nav toggle, scroll behaviour, aerial parallax, hero Ken Burns slider, IntersectionObserver reveal animations, count-up stat animations, tab gallery with lightbox, touch swipe for gallery.
   - Second (IIFE): apartment carousel logic (`#aptTrack`) — 3/2/1 cards per view at 1024/640/mobile breakpoints, dot navigation, swipe support. Followed by offer popup logic.

## Design tokens (CSS variables)

```
--forest / --forest-mid / --forest-light   greens
--gold / --gold-light                      golds
--cream / --cream-dark                     page backgrounds
--text / --text-mid / --text-light         text hierarchy
--radius: 12px
```

## Apartment cards

Each `.apt-card` inside `#aptTrack` corresponds to one unit. Key patterns:

- **Normal unit**: `<div class="apt-card">` with `apt-mirror-badge` (lustrzany) badge optional.
- **Sold unit**: add `apt-sold` class → card grays out, buttons hidden, badge becomes `apt-sold-badge`.
- Specs live in `.apt-specs > .apt-spec` divs — ruler (area), tree (działka), tag (price/status), car (parking).
- PDF data sheets are in `karty/` and follow the pattern `karty/{pair}-{unit}.pdf` (e.g. `karty/1-1.pdf`, `karty/2-2a.pdf`).

The status counter (`.apt-status-bar`) above the carousel must be updated manually when unit statuses change — it is not computed from the cards.

## Gallery tabs

Gallery images are defined in the `TABS` JS object (search for `const TABS`) with keys: `zewnetrze`, `wnetrze`, `dzialka`, `okolica`. Each value is an array of image URLs hosted on `kaszubskaosada.com.pl/wp-content/uploads/`.

## JSON-LD structured data

The `<script type="application/ld+json">` block at the top of `<head>` contains contact info, geo coordinates, and price range. Keep it in sync when updating address, phone, or price information shown in the HTML.

## Responsive breakpoints

- `≥ 1200px` — full desktop layout
- `≤ 900px` — two-column grids collapse, apartment carousel shows 2 cards
- `≤ 600px` — single-column, mobile nav, carousel shows 1 card, popup layout adjusts
