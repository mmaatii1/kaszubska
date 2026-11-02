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
- **Osada message at the top (owner request 2026-11-02):** the investment is the newest, last stage of the larger Kaszubska Osada, so the infrastructure already exists (artificial lake 1.3 ha, bathing beach on lake Graniczne, restaurant, playground, bike rental, volleyball court, fishing pond, water-sports rental, educational trail) and the rest of the estate is already sold out. Put it in the hero as one line under the H1 / price (e.g. "Ostatni etap Kaszubskiej Osady – gotowa infrastruktura: jezioro, restauracja, plac zabaw") and as a short bullet strip, and link it to `#o-osadzie`; the content already exists in `#o-osadzie` and the `oferta-lead` ("Reszta osiedla jest już w całości sprzedana"), it just needs to be visible on the first screen. Keep "Kaszubska Osada" (brand) vs "Kaszubska Ostoja" (estate) distinct in one view.
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

## GA4 events + Google Ads conversion list (owner data, 2026-11-02)

GA4 (2,033 users, 2,515 sessions in the report period): `cookie_consent_accept` 1,835 events / 1,818 users (89% of users), `popup_view` 1,678 / 1,300 users (**64% of all users saw the popup**), `scroll` (90% depth) 609 / 515 users (25%), `file_download` 144 / 97 users (5%), `form_start` 72, `phone_click` = `ads_conversion_phone_call_lead` 49 / 44 users, `generate_lead` 25 / 16 users (0.8% of users).

Google Ads conversion actions:
1. "Przesłanie formularza kontaktowego" = GA4 import of `generate_lead`, **Primary**, 0 conversions, status "Oczekiwanie na konwersje" / needs attention.
2. "Połączenie telefoniczne – kontakt do potencjalnego klienta" = call-from-ads asset, **Primary**, 0 conversions, pending.
3. "Kaszubska Osada (web) ads_conversion_phone_call_lead" = GA4 import of the phone tap, **Secondary**, 12 conversions, value 47.28, active.

Conclusions:
- Consent is **not** the blocker (89% accept), so cause (2) in item E is largely ruled out; Enhanced conversions are optional, not urgent.
- The only conversion Ads receives is the phone tap (12 of 49), and it is **Secondary**, so it is not used for bidding. The Primary goals have 0 conversions. **PMax therefore optimises without any conversion signal**, which fits the junk Display/Paid Other traffic and the low scroll. Highest-leverage fix, no code needed: make the phone tap a Primary goal (or give PMax a real signal another way), and decide one phone source of truth (call asset vs tap) to avoid double counting.
- 0 form conversions in Ads vs 25 `generate_lead` in GA4: need the per-channel split of `generate_lead` (Google vs Meta vs direct) before concluding Google gives no forms. Also check `form_name` (contact_form vs callback_popup).
- The site also fires a direct Ads conversion (`AW-18508894435/Khi4COKZwZwdEOOh3flE`, index.html:3913). It is not visible in the list above, and a `send_to` event does not show in GA4. Confirm in Ads whether an action with that label still exists; if not, remove the dead call; if it does, make sure it does not double count with the imported `generate_lead`.
- `popup_view` on 64% of users with ~16 callback/contact leads means the popup mostly interrupts. Moving it to scroll depth + idle (B1) will cut impressions sharply; compare `generate_lead` per `popup_view` before/after to make sure leads do not drop.
- `file_download` (5% of users, presentation/PDF) is a real interest signal: candidate secondary conversion / retargeting audience.

## `generate_lead` by channel (owner data, 2026-11-02)

Key-event column filtered to `generate_lead`: 9 total (4.8% of all key events; 25 raw events exist, so the key-event flag covers only part of the period). Paid Social 5 (of 519 sessions), Direct 3, Organic Search 1, **all paid Google channels 0** (Cross-network 1,377 + Paid Search 189 + Display 153 + Paid Other 84 = 1,803 sessions). Reading: no form leads from paid Google in this window; Meta is the only paid source with forms. Caveats: tiny numbers (9), the flag's start date is unknown, phone taps are not included (Ads shows 12 phone taps from campaigns). Still to get: `phone_click` by channel and campaign cost, then cost per contact for Google vs Meta.

## `phone_click` by channel (owner data, 2026-11-02) - corrects the previous reading

Total 49: paid Google 39 (Cross-network 21, Paid Other 11, Display 5, Paid Search 2) = 80%, Paid Social 7, Organic 1, Direct 1, Unassigned 1.
Contacts per session (form + phone tap): paid Google 39 / 1,803 = 2.2% (all taps, 0 forms); Meta 12 / 519 = 2.3% (5 forms + 7 taps). **Per session the two are on par; they differ in type**: Google brings phone taps, Meta brings forms. So "Google gives nothing" is wrong; "Google gives taps, not forms" is right. Decision needs cost per contact (spend still missing) and tap quality (a tap is not a connected call; owner says many calls do not connect). Ads reports only 12 of these 39 taps as conversions (attribution/lookback differences between GA4 and Ads, to be checked). Do not move the budget wholesale to Meta on this data; revisit with spend and answered-call counts.

## Current budgets (owner, 2026-11-02; assumed daily, to confirm)

Meta 55 zł, PMax 28 zł, Search 68 zł. Observation: Search has the largest budget but the fewest sessions (Paid Search 189 vs Cross-network 1,377), so it likely has a high CPC or is limited by narrow targeting/low impression share; PMax is cheap per session but low quality. Need: daily vs. period, report period dates, actual spend per campaign, Search CPC / impression share / top search terms.

## Google Ads, last 7 days (owner data, 2026-11-02)

| Campaign | Cost | Clicks | CPC | CTR |
|---|---|---|---|---|
| Search-10.14.2026 | 361.04 zł | 218 | ~1.66 zł | 1.86% |
| Perf max 10.14.2026 | 213.68 zł | 1,243 | ~0.17 zł | 8.40% |

Week over week: Search -95.21 zł (-20.9%), PMax +53.88 zł (+33.7%). Search spends ~52 zł/day against a 68 zł budget (under-delivering), PMax ~30.5 zł/day against 28.

Rough cost per contact (GA4 period is slightly longer than 7 days, so order of magnitude only):
- Search: 2 phone taps, 0 forms -> ~180 zł per contact.
- PMax (Cross-network + Display + Paid Other): 37 phone taps, 0 forms -> ~6 zł per tap, but tap quality is doubtful (Paid Other: 20 s on site, 11.9% key-event rate; accidental taps on the floating phone button likely).
- Meta: 12 contacts (5 forms + 7 taps); spend not provided, ~385 zł if the 55 zł/day budget was fully used -> ~30 zł per contact (to confirm).

Search keywords (match type: broad / "dopasowanie przybliżone"): top cost "domki na kaszubach nad jeziorem" 36.64 zł / 24 clicks, "domy na kaszubach" 31.49 / 22, "domy na sprzedaż przy jeziorze" 24.83 / 12, "dom całoroczny na kaszubach" 10.99 / 5, **"apartamenty na kaszubach" 10.88 zł for 1 click**, "domy na sprzedaż pomorze" 10.66 / 7. Many head terms have no "sprzedaż" (domki / apartamenty), so they attract holiday renters and tourists, not buyers. Only 15 of the keywords have any cost; the panel shows 150 zł of the 361 zł, so the rest is on other pages.

Plan items (owner-side Ads changes, not code; nothing executed):
1. Pull the **search terms report** (not keywords) for the last 30 days: what people really typed, how many are rental / tourist queries.
2. Search: move to phrase / exact match on purchase-intent terms ("na sprzedaż", "sprzedaż", "kupię", "dom całoroczny"), add negatives (wynajem, noclegi, do wynajęcia, domki letniskowe, agroturystyka, tanio, olx), drop "apartamenty" unless purchase intent shown; ad copy from `marketing/google-ads.md` with 6 of 8, heat pump, location, price.
3. PMax: audience signals (property buyers, in-market for real estate), exclude brand-less junk placements, and a real conversion signal (see conversions section); evaluate again after 2 weeks.
4. Landing page is the same for both: first-screen fixes (A) apply to Google traffic first, because Google users scroll 25% vs Meta 49%.
5. Quality: log how many ad-tap calls were answered (owner), to tell good taps from accidental ones.

## Existing negative keywords (owner, 2026-11-02)

Present: `wynajem`, `olx`, `otodom`, `basenem` (all broad); exact `[aura kaszub]`, `[aura kaszub łączyno]`, `[domki pod kapeluszem]`, `[pod kapeluszem]`, `[osada skoczkowo]`, `[osada wiśniewo rekowo]` (competitor projects); phrase `"kaszubskie chabry"`.
Gaps: broad negatives do **not** cover other word forms, so `wynajem` does not block "do wynajęcia", "wynajmu", "wynająć". Add as phrase-match negatives: `wynajęcia`, `wynajmu`, `wynająć`, `noclegi`, `nocleg`, `domki letniskowe`, `agroturystyka`, `pokoje`, `booking`, `airbnb`, `wczasy`, `weekend`, `kemping`, `ośrodek`, `tanio`; check intent for `działka`, `projekt domu`, `budowa`, `używany`. Take the final list from the search terms report (still missing), not from guesses. Negatives are per Search campaign; for PMax use account-level negative keyword lists if available in the account (to verify in the Ads UI).

## Search terms report, 26.10-1.11.2026 (CSV from GitHub `main`: `Raport wyszukiwanych haseł.csv`)

374 rows. Search 361 zł / 218 clicks / 4 conversions; PMax 214 zł / 1,243 clicks / 8 conversions (mostly phone taps). Visible search terms cover only ~63 zł of Search spend (+95 zł "other terms", ~203 zł not broken down) and only ~6 zł of PMax spend: PMax is almost entirely Display/YouTube/Discover inventory. Findings, new negative keywords, keyword changes and the "negative `wynajem` kills ad group 2" conflict are written into `marketing/google-ads.md` (section "Aktualizacja po analizie haseł"). Also updated there: 6 of 8 houses, price extensions (425 tys. zł is sold), new headlines/descriptions/sitelink/callouts with the heat pump and the "last stage of a larger osada with ready infrastructure" message (all within Google Ads character limits, checked by script).
Open: check whether Search has the Display Network / search partners enabled (CTR 1.86%, large unexplained spend); the CSV lives in the public repo root, move it to `marketing/data/` or keep out of git. Search-term text is not personal data, but the repo is public.

## Implementation log (branch `perf-conversion-fixes`)

Lighthouse mobile (lab, `femtopixel/google-lighthouse` 13.5, local copy served on 127.0.0.1, third parties live). Live-site baseline from the evidence section: Performance 45, LCP 20.3 s, TBT 2.1 s, 4.1 MB.

| Step | Perf | A11y | BP | SEO | FCP | LCP | TBT | CLS | Weight |
|---|---|---|---|---|---|---|---|---|---|
| Local baseline (before C) | 46 | 92 | 96 | 100 | 2.5 s | 21.9 s | 1,210 ms | 0.073 | 4,309 KiB |
| C: gallery/lightbox hardening, `js_error` | 50 | 92 | 96 | 100 | 2.5 s | 22.4 s | 890 ms | 0.038 | 3,925 KiB |
| D1: hero `<img>` + mobile crops, lazy slides, charset first, cache/gzip (Apache 2.4 container from here on) | 53 | 92 | 100 | 100 | 1.7 s | 8.7 s | 1,010 ms | 0.037 | 2,090 KiB |
| B0: compact mobile cookie banner | 54 | 92 | 100 | 100 | 1.8 s | 8.7 s | 880 ms | 0.037 | 2,090 KiB |

Lab note: observed (unthrottled) LCP is 0.8 s; the 20+ s simulated LCP comes from everything requested before the LCP paint (3 hero images 2.3 MB, 3x gtag 600 KB, GTM, Phosphor fonts 300 KB) being replayed on simulated slow 4G. The page's own "4.8 s" is almost all style/layout/paint (infinite `box-shadow` pulse animations, Ken Burns, blurs), only ~90 ms is script.

### C. Gallery / lightbox / JS errors - done
- Headless repro (Chromium with FacebookApp, SamsungInternet and Chrome Android UAs, 360/390 px, touch) did **not** reproduce an exception in the old code; the Clarity errors may come from Facebook's own injected scripts. So the fixes are defensive and the new `js_error` event will show the real messages.
- Gallery: all lookups guarded; state (tab, index) changes at once, the image swap is coalesced with a token, so fast taps / tab switches cannot apply a stale index; thumbnails/dots built once per tab (no 2560 px thumbnail reloads); thumbnail strip scrolled with `scrollTo` on the strip (no `scrollIntoView`, which can scroll the page in old webviews); tabs/arrows/dots are buttons with listeners instead of inline handlers; keyboard opens the lightbox.
- Lightbox: one source of truth (`openLightboxSet(paths, index)`; static galleries use `data-lightbox` and their own block as the set); swipe vs. click separated (`onSwipe()` + 400 ms guard only for the background-close tap); interrupted fades cannot leave the image hidden; close is a real `<button>` 48 px.
- Overlays (lightbox, lot modal, popup): shared `scrollLock` with owners (one overlay closing never unlocks another) and `afterTransition()` with a timeout fallback, so the page can never stay locked if `transitionend` does not fire.
- Deep links: `scrollTo(0,0)` on load now only runs without a `#hash` (ad sitelinks `/#oferta`, `/#standard` … used to land at the top).
- `js_error` (GA4): installed in `<head>`, bubbling `error` + `unhandledrejection`, message cut to 100 chars with URLs, e-mails and long numbers masked, browser family only, each message once, max 3 per page view. Owner: register `error_message` / `browser_family` as custom dimensions in GA4 to see them in reports.

### D1. Head order, hero images, cache - done
- `<meta charset>` + viewport are now the first bytes of `<head>`, followed directly by `dataLayer`, `gtag`, consent default and the `js_error` handler.
- Hero slide 1 is a `<picture>`: phones get a 720x1280 portrait crop `hero_3-m720.webp` (62 KB, was the 487 KB 2560 px file), desktop picks from the existing 1024-2560 px variants via `srcset`; `fetchpriority=high` + matching `<link rel=preload media=…>`.
- Slides 2-3 have no image in the HTML any more: after `load` + idle JS sets `data-bg-m` (phones: `osada_hero_1-m720.webp` 172 KB, `home-4-4-m720.webp` 202 KB, instead of 912/918 KB) or `data-bg-d` (desktop 1600 px, 276/303 KB); a slide joins the rotation only once decoded, rotation pauses in a hidden tab. The 2560 px originals stay untouched for the gallery/lightbox (on demand only).
- Logo: 3991x891 PNG (134 KB) -> 358x80 WebP (8 KB) in nav and footer; all images below the fold are `loading=lazy` with `width`/`height` (incl. the lot modal image that used to load eagerly while hidden).
- `.htaccess`: `Cache-Control` 30 days for images/fonts, 7 days CSS/JS, 1 day PDF, `no-cache` for HTML (no file versioning, so no `immutable`); gzip for text. Verified on `httpd:2.4` with `AllowOverride All`: headers present, gzip on `/`, `.md`/config still 403, www -> apex 301 keeps `gclid`.
- CLS fix found on the way: `.float-phone` animated `bottom` when the cookie banner appeared (a layout shift every frame); it now moves with `transform`. Remaining CLS is the Google-Fonts swap in the bottom-anchored hero text (handled in D2).

### B0. Cookie banner - done
- Phones (<= 640 px): no shade at all (desktop keeps the light, click-through shade from 16d5d7b), a bottom bar with 2 lines of text ("Cookies do statystyk i dopasowania reklam. Szczegóły w Polityce prywatności."), two filled, equal-size buttons side by side ("Akceptuję" gold, "Tylko niezbędne" forest), min 44 px, no pulse animation. ~110 px tall at 360 px; the new hero (A) is sized so the banner covers only the peeking next section, not the CTA (checked by the smoke test).
- Consent logic unchanged (Consent Mode default denied, choice in `localStorage`).
