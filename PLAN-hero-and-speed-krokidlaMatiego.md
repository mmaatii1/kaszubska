# Owner steps for PLAN-hero-and-speed

- [x] Promos valid: heat pump with A/C in the price AND the discount (confirmed 2026-11-02). Hero/offer bar/Google Ads copy keep both.
- [x] Clarity screenshots: not provided (owner said FB errors come from the gallery); debug from code + headless repro.
- [ ] GA4 -> Reports -> Acquisition -> Traffic acquisition: add the conversion event as a column and tell me its Session source/medium split (google / cpc vs organic vs direct). Also: Admin -> Product links -> Google Ads linked? Auto-tagging on in Google Ads?
- [ ] Google Ads: import the GA4 phone-tap key event as a conversion (Goals -> Conversions -> New -> Import -> Google Analytics 4).
- [ ] Google Ads: exclude Audience Network placement / "an" source; send search-terms report (top 30) if you want it reviewed.
- [ ] GTM (GTM-T4VCGMDB): export the container JSON (Admin -> Export) so duplicate gtag loaders can be removed safely.
- [ ] Who answers the phone during ad hours? Decide on voicemail / missed-call SMS.
- [ ] After each change: deploy via the FTP workflow (push to main), check on your phone.
