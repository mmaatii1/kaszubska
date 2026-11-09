# Plans history

Finished kaszubska plans, newest on top. A plan and its owner file are deleted once done; the outcome stays here (rules: `HomeServer/sandbox/WORKFLOW.md`).

## 2026-11-09 — First-screen conversion + page speed (`PLAN-hero-and-speed`)
- Goal: a phone's first screen says what / where / how much / how many left; mobile Lighthouse Performance ≥ 80; no dead taps; FacebookApp JS errors fixed; measurement good enough to split budget between Google and Meta.
- Outcome: merged to `main` 2026-11-05 and uploaded by hand (live page identical to `main` on 2026-11-09). Lab results: Performance 46 → 81, LCP 21.9 s → 2.5 s, TBT 1,210 → 640 ms, CLS 0.073 → 0, weight 4.3 → 1.6 MB, Accessibility 92 → 100. New hero and menu, popup as a bottom sheet on phones, gallery/lightbox hardening with `js_error` reporting, self-hosted fonts + icon sprite, `tools/check_consistency.py` in CI. Conventions are in `CLAUDE.md`.
- Decisions worth remembering: the duplicated `gtag('config','AW-…')` was removed (the combined Google tag already carries Ads); second Ads account unlinked; promo claims "do −5%" / "do 22 000 zł"; a GTM delay was not done (no lab gain, unverifiable without field data); TBT < 300 ms not met, the rest is GTM/gtag/Clarity.
- Left over: Ads/GA4/Meta account work, FTP deploy block and the 2-week field comparison moved to `PLAN-ads-followup.md`.
