# Plan: first-screen conversion + page speed

Date: 2026-11-02. Status: DRAFT, reviewed by a second agent (amendments below); awaiting owner go-ahead.

## Evidence (Clarity, last 3 days; Lighthouse mobile, live site)

- 630 sessions, 96% mobile. Average scroll 29.8%; Google traffic scrolls 24.8% (Facebook 49%).
- Dead clicks in 9.7% of sessions (mobile, mostly Google / ChromeMobile + SamsungInternet). Rage clicks 0.3%.
- JS errors in 4.1% of sessions: almost all from `FacebookApp` on Android (34 of 42) and SamsungInternet (6). ChromeMobile (395 sessions): 0.
- Source `an` (34 sessions): scroll 3.4%, 7 s active time -> junk placement.
- Lighthouse mobile: Performance **45**, Accessibility 92, Best practices 96, SEO 100.
  LCP 20.3 s (the element is the hero `<h1>`, so it is render delay, not the network), TBT 2.1 s, page weight 4.1 MB.
  Main-thread: 4.8 s in the page's own inline scripts, ~2 s in gtag/GTM, 0.4 s in Clarity.
  Hero loads all 3 slider images eagerly (0.9 + 0.9 + 0.5 MB, only the first is visible).
- Facts to keep consistent: 6 of 8 houses available (cards: 6 avail / 2 sold; JSON-LD `offerCount: 6`),
  `marketing/google-ads.md` still says 7 of 8 and the old "rabat do 32 000 zł" promo.

## Goals

1. First screen on a 390 px phone states what / where / how much / urgency without scrolling: lake-side year-round house, Kashubia (gm. Kołczygłowy), from 387 000 zł brutto, **6 of 8 left**, heat pump with A/C included.
2. Performance >= 80 on mobile Lighthouse; LCP < 2.5 s in the lab, TBT < 300 ms.
3. No dead taps in the hero / offer area; fix the FacebookApp JS errors.
4. Measurement trustworthy enough to decide Google vs Meta budget.

## Work items

### A. Hero copy and layout (index.html, mobile-first at 360/390 px)
- H1 -> concrete: "Dom nad jeziorem na Kaszubach" (+ em: "od 387 000 zł brutto"); keep the dedicated price line as the visual anchor.
- Proof line: "Zostało 6 z 8 domów · działka do 289 m² · odbiór kluczy 2026" (6 is data-driven: computed from `#aptGrid` `data-status`, with the static text as fallback, so it never goes stale).
- Promo = the heat-pump offer (not the discount): one badge "Pompa ciepła 3 kW z klimatyzacją w cenie"; the "do -7%" stays secondary in the offer bar only if it is still valid (owner to confirm, see owner file).
- Location in the first screen: "gm. Kołczygłowy · Bytów 30 min · Słupsk 45 min" directly under the price (today it hides behind the "Sprawdź lokalizację" link and the stats strip below the fold).
- One primary CTA ("Zobacz dostępne domy" -> `#oferta`), one small secondary ("Zadzwoń" tel:). Drop the gallery button from the hero.
- Make sure the next section peeks above the fold (hero min-height tuned so the stats strip / offer start is visible; scroll cue stays).
- Remove the redundant badge row text noise ("Kaszubska Ostoja" vs "Kaszubska Osada" naming check with owner).

### B. Dead taps
- Find what the 156 dead clicks hit. Clarity API gives no element data; use the Clarity dashboard (Heatmaps -> Dead clicks, mobile, Google source) -> owner step (screenshots), meanwhile audit by reading the code: non-interactive elements styled like buttons (`.ko-card` image/price area, `.stat-item`, `.hero-promo`, `.hero-badge`, gallery thumbnails, carousel dots).
- Rule: anything that looks tappable gets a handler/link or loses the hover/pointer styling; hero promo badges link to `#oferta`.

### B0. Cookie banner (consent stays mandatory; only the blocking behaviour changes)
Cause found: `.ko-prefs-shade` (index.html:1593-1602) is a full-screen dimmed layer with `pointer-events:auto` and `backdrop-filter: blur`, shown 600 ms after load until the visitor decides. Every tap on the hero, menu or buttons before that lands on the shade = dead click; the full-screen blur also costs GPU/main-thread on phones. Consent Mode already defaults to denied, so blocking the page is not needed for compliance (no cookie wall).
- Shade: `pointer-events:none`, no blur, lighter dim (or none) on <= 640 px, so the page stays usable under the banner.
- Compact mobile banner: 2-line text, buttons side by side with equal weight ("Akceptuję" / "Tylko niezbędne"), >= 44 px, link to the privacy policy kept.
- Banner must not cover the primary CTA / menu button; float-phone offset logic (`--cookie-h`) stays.
- Measure: share of sessions with consent choice and dead clicks before/after.

### B1. Contact/offer popup timing (owner: dead clicks appear when the banner shows on mobile)
Current (index.html:4027-4040): full-screen modal `#offerPopup` opens after 25 s **and** `scrollY >= 0.6 * innerHeight` (only ~0.6 of one screen, so in practice a pure 25 s timer). It can appear under the user's finger mid-tap or mid-scroll, dims the page and sets `body{overflow:hidden}`; the tap lands on the overlay/close area -> dead click or accidental dismiss. `popupDismissed` is written with an unguarded `sessionStorage` (see C).
- Trigger by **scroll depth**: `scrollY / (docHeight - viewport) >= 0.5` (tune to 0.4-0.6 once the hero fix changes scroll behaviour), keep the 25 s minimum, and require the user to be **idle for ~1.5 s** (no scroll/touchmove) so it never opens mid-gesture.
- Tap guard: ignore taps on the overlay for the first ~400 ms after it appears, so the tail of a previous tap cannot hit it.
- Prefer a non-blocking **bottom sheet** (call + callback) on <= 600 px instead of a full-screen modal; page stays scrollable, no `overflow:hidden` lock; close button >= 44 px.
- Once per session as today, and never while the cookie banner, the menu or a form field is active.
- Fix `closeOfferPopup`: if `transitionend` never fires (reduced motion, hidden tab) the overlay and the scroll lock stay; add a timeout fallback.
- Measure: GA4 events `popup_shown` (with scroll %), `popup_call`, `popup_lead`, `popup_dismiss`; compare dead-click share in Clarity before/after.
- First confirm in Clarity (recordings with dead clicks, mobile) that the popup is the culprit rather than the cookie banner (B0).

### C. FacebookApp / Samsung JS errors
Owner update 2026-11-02: the errors come from the **gallery** (`#galeria`, index.html:3591-3790). No screenshots will be provided, so debug from code + a headless repro (Lighthouse container Chrome, FacebookApp-like UA, tap/swipe through all tabs and the lightbox). All 25 `TABS` image files exist locally (checked). Suspects in that block: `scrollIntoView({behavior,inline,block})` on every slide change (index.html:3638), `gMain`/`lightbox` touch handlers calling `galleryNav`/`lbNav` while `lightbox` is open (swipe + click both fire), `lbImages` built from `img[onclick^="openLightbox"]` with `src` (absolute URL) vs relative `indexOf`, `body.style.overflow` lock left behind, the 360 ms `setTimeout` swap racing with fast taps (stale `activeTab`/`gIdx`). Fix: guard all `getElementById` results, debounce navigation while a transition runs, one source of truth for lightbox images, remove the double handler on swipe + click.
- Get the actual messages: Clarity dashboard -> Errors -> filter Browser = FacebookApp (owner step), plus local repro with a Facebook-like UA in the Lighthouse container's Chrome (console errors) as a sanity check.
- Likely suspects to check first: `IntersectionObserver`/`ResizeObserver` options, optional chaining / newer syntax in the inline scripts, `localStorage`/`sessionStorage` access without try/catch (blocked in some in-app webviews), `fbq`/`gtag` assumed present, `navigator.clipboard`, `scrollTo({behavior})`.
- Fix defensively (feature checks, try/catch around storage), add `window.onerror` -> `gaEvent('js_error', {message, browser})` (throttled, no PII) so future errors are visible in GA4, not only in Clarity.

### D. Performance (target: LCP and TBT)
- Hero slider: load only slide 1 eagerly (`<img fetchpriority=high>` or preload of the `hero_3.webp`), lazy-set slides 2-3 after `load`/idle; re-encode the two 0.9 MB images to ~150-250 KB (mobile 800 px variant via `image-set`/`<picture>`).
- Split the main inline script: critical (nav, hero) first; defer the rest (carousels, count-up, tabs, popup logic) to `requestIdleCallback`/after first paint; profile the 4.8 s to find the hot function (likely carousel rebuild, count-up, or reveal observers) and fix at the source.
- Third parties: Lighthouse sees `gtag/js` fetched 3x (direct `G-9YM5FV534P` loader at index.html:42-51 plus GTM-injected G-/AW- tags). Dedupe only after the GTM export confirms GTM covers them; then drop the direct loader and `config` calls. See amendment 2 for GTM timing.
- Icons: replace the two unpkg Phosphor webfonts (290 KB, extra origin) with an inline SVG sprite of the ~25 icons used, or self-host a subset.
- Add `<meta charset>` as the first element in `<head>` (Lighthouse flags late charset), width/height on `<img>` (CLS), `loading="lazy"` for all below-fold images, cache headers in `.htaccess` (279 KB savings flagged), minify CSS.
- Accessibility quick wins flagged by Lighthouse: colour contrast, touch target size (also reduces mis-taps = dead clicks), heading order, label-content-name mismatch.
- Re-run Lighthouse (container image `femtopixel/google-lighthouse`, `--userns=keep-id:uid=997`) after each group; record results in this file.

### F. Mobile menu and mobile animations (added 2026-11-02, owner: people tap the menu a lot)
Current state (index.html:2327-2343, 2157-2167, 3519-3530): `div.hamburger` with `onclick` (24 px wide bars, ~32 px tap area, no `aria-*`, no keyboard access, no open/close state); menu is `display:none`/`flex` with no animation; it does **not** close after tapping a link (only on outside click); order is Domy, Osada, Atuty, Inwestycja, Lokalizacja, Galeria, phone, Zapytaj, and there is **no link to `#oferta`** (prices and available houses; "Domy" goes to `#o-projekcie`).
- Replace the `div` with a `<button class="hamburger" aria-expanded aria-controls aria-label="Menu">`, >= 44x44 px tap area; bars morph to an X (CSS transform, 200 ms).
- Menu panel: animated open/close (opacity + translateY, `transform`/`opacity` only, no layout animation), full-width, large 48 px rows; closes on link tap, on Esc and on outside tap; no scroll-chaining behind it.
- Content order, most valuable first: **Oferta i ceny** (`#oferta`, highlighted), Lokalizacja, Inwestycja / najem, Standard, Galeria, Kontakt; pinned at the bottom: full-width "Zadzwoń 500 299 775" and "Zapytaj". Line under the list: "6 z 8 domów dostępnych · pompa ciepła w cenie" (same source of truth as the hero).
- Menu open/close events to GA4 (`menu_open`, `menu_click` with target) so we see which items people actually use, and Clarity gets real data to prune the list.
- Animations on mobile in general: audit scroll-reveal (IntersectionObserver), Ken Burns hero slider, parallax, count-up and carousel transitions; keep only `transform`/`opacity`, drop parallax and Ken Burns on <= 600 px if they cost main-thread time (ties into D), respect `prefers-reduced-motion` (only one rule exists today, index.html:1674), nothing that delays content visibility above the fold.
- Verify at 360/390 px and in an iOS/Android in-app-browser UA; Playwright/Lighthouse container run before and after.

### E. Measurement and campaign decision
- GA4 data from owner (2,530 sessions, key-event rate 5.5%): Cross-network 1,377 (54%, i.e. Performance Max), Paid Social 519, Paid Search 189, Display 153, Organic Search 95, Paid Other 84, Direct 75. So **auto-tagging and the GA4 <-> Ads link work**: campaign traffic is attributed to Google channels in GA4 (cause 1 below is ruled out). PMax is more than half of all sessions and is where the weak Google traffic comes from (Display: 63% engagement, 24 s; Paid Other 62%, 20 s); Paid Search itself engages fine (84%, 45 s) but is only 189 sessions. 186 key events in total, but which events they are (real leads vs. taps/popup views) is unknown, so channel quality cannot be judged yet.
- Owner update: the conversion event is visible in GA4, but **not attributed to the campaign in Google Ads**. Likely causes to check, in order: (1) ~~GA4 <-> Ads link / auto-tagging~~ ruled out by the GA4 channel data above; (2) Consent Mode: `ad_storage` defaults to denied (index.html:10-19), and most mobile visitors never answer the banner, so the `gclid` is not stored and the Ads `send_to` conversion cannot be matched to the click; Ads then needs enough volume for conversion modelling, which 400 sessions/3 days will not give; (3) only the form fires the Ads `send_to` conversion (index.html:3913); the phone tap (`ads_conversion_phone_call_lead`, index.html:4116) goes to GA4 only, so it must be imported into Ads as a GA4 key event; (4) Enhanced conversions for leads (hashed phone/e-mail from the form) to recover attribution when cookies are denied. Fix order: (3) import the GA4 lead key events into Ads (uses GA4 attribution, which already works), then (4); (2) is mitigated by making the banner easy to answer (B0).
- Verify in Google Ads that the conversion `AW-18508894435/Khi4COKZwZwdEOOh3flE` counts: form submit, phone tap (`ads_conversion_phone_call_lead`), and that the forms really deliver (`kontakt.php` -> mail/`leady.gs` log; send a test).
- Add a "call from ads" asset / call-only tracking only if the owner wants it (owner step).
- Review `marketing/google-ads.md`: replace 7 -> 6, drop "rabat do 32 000" headlines unless still valid, lead with heat pump + location + price; exclude placement `an` (Audience Network) and review search terms (owner step in Google Ads UI).
- Decision rule (agree with owner): keep Google at a reduced budget for ~2 weeks after A-D ship; compare cost per lead (form + qualified call) Google vs Meta; move budget only on that data. Today's 432 Google sessions with 0 forms are not enough to conclude, but the pre-fix first impression (25% scroll) is a valid reason to fix first.
- Unanswered / missed calls: phone number must be a `tel:` link everywhere (check), and someone must answer during ad hours; consider call forwarding / voicemail + SMS callback (owner).

## Order and risk

1. C (diagnose errors) + B audit, in parallel with A (copy/layout) - small, visible, low risk.
2. D (performance) in small commits, each verified with Lighthouse + visual check at 360/390 px.
3. E (ads/measurement) once A-D are live; owner deploys (FTP workflow in `.github/workflows/deploy-ftp.yml`).
- Risk: performance refactor of the big inline script can break carousels/popup -> test the carousel, lot selector, popup, forms, lightbox manually (Playwright in the container if available) before each push.
- Risk: removing duplicate gtag loaders can break conversions -> change only after confirming GTM tags; verify with Tag Assistant (owner).
- Rollback: every group is its own commit; revert is one `git revert`.

## Out of scope

Redesign of lower sections, new pages, switching ad platforms, hosting changes.

## Review amendments (second-agent review, 2026-11-02)

1. **Order changed:** C first (trivial `sessionStorage` fix), then D1 (hero image weight, charset), then A (hero copy) together with F (menu, same first-screen interaction), then GTM timing and E. Measure the Clarity/GA4 baseline before touching GTM.
2. **GTM timing vs Consent Mode:** `consent default` has `wait_for_update: 500` and consent is restored from localStorage (index.html:10-34). Do not defer GTM to first interaction; use a short idle delay (1-3 s max) and compare session counts before/after. Conversions go through `dataLayer` and queue safely. `fbq` is already consent-gated, no change.
3. **charset:** `<meta charset>` is at line 70, after a ~60-line inline script. Move it (and `dataLayer` + consent default) to the very top of `<head>`.
4. **Hero images are CSS backgrounds** (`.hero-slide`, index.html:2358-2360) plus a preload of `hero_3.webp`. Slide 1 -> `<img srcset fetchpriority=high>`; slides 2-3 get `style.backgroundImage` set from JS after `load`.
5. **Likely FacebookApp crash:** `sessionStorage` without try/catch at lines ~3930 and ~4026 (module-level, aborts the rest of the second script incl. tel handlers and popup). Wrap in a safe-storage helper.
6. **`window.onerror` -> GA4:** install in `<head>`; message truncated to 100 chars, no URL/query/stack, browser family only; call `gtag` directly (not `gaEvent`, defined late); max 3 per page view, dedupe.
7. **"6 of 8":** prefer a static number in the hero (no CLS, no LCP dependency) plus a CI grep check that hero text, title, OG, JSON-LD `offerCount`, popup and `marketing/google-ads.md` agree with the `data-status` count. Replace every "7 z 8" and every "32 000" in `marketing/google-ads.md` (not only the headlines).
8. **B0 (new):** check the cookie banner (appears after 600 ms, `ko-prefs-open` dims the page) on a 390 px screenshot first; taps on the dimmed page may be a major source of dead clicks and low scroll.
9. **Naming:** "Kaszubska Ostoja" (estate) vs "Kaszubska Osada" (project) are both legitimate; keep the badge unless the owner says otherwise.
10. **Forms (E):** test both forms end to end (`kontakt.php`, mail config from `kontakt.config.example.php`, `leady.gs` log).
11. **Deploy:** every push to `main` deploys to production via FTP. Work on a branch, batch pushes, validate `.htaccess` changes locally before pushing.
12. **Lab vs field:** Lighthouse runs without consent state; compare with Clarity/GA4 field data.

## Open question on campaign structure (decision stays with owner, after data)

PMax (Cross-network) is 54% of sessions and spreads over Display/Discover/YouTube, which fits the low scroll and short time on site. Options to evaluate once real lead events per channel are known: keep PMax with a lower budget and strong audience signals, add or boost a plain Search campaign (high-intent queries, ads from `marketing/google-ads.md`), exclude low-value placements. No budget move before the first-screen/popup/measurement fixes are live and 1-2 weeks of data exist.
