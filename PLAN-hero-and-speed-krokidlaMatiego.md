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
