# Owner steps for PLAN-hero-and-speed

- [x] Promos valid: heat pump with A/C in the price AND the discount (confirmed 2026-11-02). Hero/offer bar/Google Ads copy keep both.
- [x] Clarity screenshots: not provided (owner said FB errors come from the gallery); debug from code + headless repro.
- [x] GA4 channel split received 2026-11-02 (attribution to Google channels works).
- [ ] GA4 -> Reports -> Engagement -> Events (or Admin -> Key events): list of key event names with counts, and key events per channel (Cross-network, Paid Search, Paid Social). Which of them are real leads (form, call)?
- [ ] Google Ads -> Goals -> Conversions: list of conversion actions, status, "Primary" or "Secondary", and conversions per campaign (PMax vs Search).
- [ ] Google Ads: import the GA4 phone-tap key event as a conversion (Goals -> Conversions -> New -> Import -> Google Analytics 4).
- [ ] Google Ads: exclude Audience Network placement / "an" source; send search-terms report (top 30) if you want it reviewed.
- [ ] GTM (GTM-T4VCGMDB): export the container JSON (Admin -> Export) so duplicate gtag loaders can be removed safely.
- [ ] Who answers the phone during ad hours? Decide on voicemail / missed-call SMS.
- [ ] After each change: deploy via the FTP workflow (push to main), check on your phone.
