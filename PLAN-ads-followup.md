# Plan: ads, measurement and deploy follow-up

Status: waiting on humans: account work in `PLAN-ads-followup-krokidlaMatiego.md` · Created: 2026-11-09 · Owner steps: `PLAN-ads-followup-krokidlaMatiego.md`

## Goal

Finish what `PLAN-hero-and-speed` (closed, see `PLANS-HISTORY.md`) left on the account side: Google Ads conversions count form and phone leads, live ads carry the current promo, budget split between Google and Meta is decided on cost per lead, and push to `main` deploys again.

## Context

`CLAUDE.md` (GA4 events, availability rules), `marketing/google-ads.md`, `marketing/data/` (CSV exports the owner drops there). Why Ads does not attribute the conversion: consent mode denies `ad_storage` by default and the phone tap goes to GA4 only, so the GA4 key events must be imported into Ads (history entry of the closed plan).

## Steps

- [ ] **1. (Mati) Account work** from the owner file (Ads conversions and networks, live ad copy, GA4 custom dimensions, FTP block, CSV exports).
- [ ] **2. Data review.** When CSVs land in `marketing/data/`: cost per lead per channel, search terms → negative keywords in `marketing/google-ads.md`, Audience Network exclusion confirmed.
  - Verify: numbers in the report match the CSV totals; recommendations listed in `marketing/google-ads.md`.
- [ ] **3. Field comparison** about two weeks after the 2026-11-05 deploy: Clarity dead clicks, FacebookApp/Samsung JS errors, scroll depth; GA4 `generate_lead` per `popup_shown`, `popup_dismiss` by `method`, `menu_click` by `link_target`, `js_error` messages; answered calls, not taps. Drop `popup_view` after that.
  - Verify: before/after table written into this plan's Notes; budget recommendation for the owner.

## Out of scope

Code changes to the page unless the data asks for them (then a new plan).
