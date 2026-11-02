# Owner steps for PLAN-hero-and-speed

- [x] Promos valid: heat pump with A/C in the price AND the discount (confirmed 2026-11-02). Hero/offer bar/Google Ads copy keep both.
- [x] Clarity screenshots: not provided (owner said FB errors come from the gallery); debug from code + headless repro.
- [x] GA4 channel split received 2026-11-02 (attribution to Google channels works).
- [x] GA4 events list received 2026-11-02.
- [ ] GA4: `generate_lead` (25) and `phone_click` (49) split by session channel group (Cross-network / Paid Search / Paid Social / Direct), plus `generate_lead` by `form_name` (needs custom dimension; skip if not registered).
- [x] Google Ads conversion list received 2026-11-02.
- [ ] Google Ads: is there still a conversion action with label `Khi4COKZwZwdEOOh3flE` (Goals -> Conversions, filter by all statuses)? Does any campaign have a call asset with a Google forwarding number?
- [ ] Google Ads: campaign list with cost, clicks, conversions for the report period (to compute cost per lead).
- [ ] Decision for later (not now): make phone tap a Primary goal.
- [ ] Google Ads: import the GA4 phone-tap key event as a conversion (Goals -> Conversions -> New -> Import -> Google Analytics 4).
- [ ] Google Ads: exclude Audience Network placement / "an" source; send search-terms report (top 30) if you want it reviewed.
- [ ] GTM (GTM-T4VCGMDB): export the container JSON (Admin -> Export) so duplicate gtag loaders can be removed safely.
- [ ] Who answers the phone during ad hours? Decide on voicemail / missed-call SMS.
- [ ] After each change: deploy via the FTP workflow (push to main), check on your phone.
- [x] Search terms CSV received (GitHub main, 7 days).
- [ ] Google Ads: check Search campaign Settings -> Networks: are "Include Google Search Partners" and "Include Google Display Network" ON? (turn Display Network off for Search).
- [ ] Meta: actual spend for 26.10-1.11 and results per ad set (CSV to `marketing/data/` on GitHub).
- [ ] Google Ads campaign report as CSV (Campaigns -> download), same period, with "Network" segment, to `marketing/data/`.
- [ ] Apply the negative keywords and keyword match-type changes from `marketing/google-ads.md` in the Ads UI after reviewing them (nothing is applied yet).

## After the code changes (branch `perf-conversion-fixes`, 2026-11-02)

- [ ] Install the CI files from `tools/ci/` (see `tools/ci/README.md`; my token cannot write `.github/workflows/`): new `check.yml`, replaced `deploy-ftp.yml` (consistency check before the upload, `tools/**` not uploaded).
- [ ] Review the branch and merge it to `main` (merge = FTP deploy).
- [ ] After the deploy, on your phone: first screen (price, 6 z 8, CTA), menu (open, tap "Oferta i ceny", Esc/outside), gallery + lightbox, both forms with one real test lead (check the e-mail / `leady.gs` log), popup (wait 25 s, scroll past half the page, stop scrolling).
- [ ] **Promo claims**: no available card has −7% (max −5%) and the largest saving is 22 000 zł, but the page says "do −7%" (offer bar, hero, popup, offer text "od 3% do 7%") and "Rabat do 32 000 zł". Either confirm a house/condition that really gives −7% / 32 000 zł, or tell me to change the copy to "do −5%" / "do 22 000 zł" (also in `marketing/google-ads.md`).
- [ ] GA4 Admin -> Custom definitions -> event-scoped dimensions: `error_message`, `browser_family`, `error_kind` (js_error), `popup_layout`, `method`, `scroll_percent` (popup), `link_target`, `menu_type` (menu). Without them the values are collected but not visible in reports.
- [ ] After ~2 weeks live: compare in Clarity dead-click share, JS errors from FacebookApp/Samsung, scroll depth; in GA4 `generate_lead` per `popup_view`/`popup_shown`, `popup_dismiss` by `method`, `menu_click` by `link_target`, `js_error` messages. Expect fewer `phone_click` from the floating button (it is hidden while the hero with its own "Zadzwoń" is visible): compare calls actually answered, not taps.
- [ ] GTM export (item above) is now also the main remaining speed lever: removing the duplicated direct gtag loader is worth roughly Performance +2-4 / TBT -100 to -200 ms in the lab.
