# Taily — items for counsel (flagged for Kevin's next review)

Source: pre-MVP design review (docs/v5/PRE-MVP-REVIEW.md, launch compliance checklist + findings marked "counsel"), K-48.
Not legal advice. The prototype ships **placeholder** copy for each item below, marked `COUNSEL` in code comments, so a
lawyer-approved text can drop in without design changes. Template sources are starting points only — verify each is current
and have counsel review before launch.

| # | Item | Where it lives in the app | What counsel must confirm | Template / starting points |
|---|------|---------------------------|---------------------------|----------------------------|
| 1 | Customer Terms of Service + Privacy Policy acceptance | c-welcome, c-phone (next to Send code), Account → Legal | Marketplace terms (Taily is the platform, not the tailor), limitation of liability, arbitration, governing law (NY) | Termly, iubenda, TermsFeed (generators); Rocket Lawyer / LegalZoom (attorney-reviewed templates) |
| 2 | Tailor Terms + **Tailor Agreement** (independent contractor) | t-phone, above "Finish and go live" (to-payouts), Shop → Legal | Contractor status vs employee; fees; cancellation / no-show rules; **NYC Freelance Isn't Free Act** (written contract from $800 in 120 days — is Taily the hiring party?) | NYC DCWP **model freelance contract** (nyc.gov, Freelance Isn't Free); Bonsai / Rocket Lawyer contractor agreements |
| 3 | SMS consent (every notification is a text, K-43) | c-phone, t-phone helper; Texts settings (c-texts / t-texts); STOP / HELP replies | TCPA express consent wording, message types + frequency, "Msg & data rates may apply", STOP/HELP handling, quiet-hours law exposure (K-48.4 chose no quiet hours) | **CTIA Messaging Principles and Best Practices**; Twilio messaging compliance docs + A2P 10DLC campaign registration |
| 4 | Deposit hold, cancellation fee, no-show fee, **auto-cancel forfeiture** (K-43) | c-pay, deposit info sheet, c-request, c-booking cancel sheets | Disclosure before charging; NY consumer rules on deposits / cancellation fees; whether forfeiting a deposit for not confirming is enforceable | Stripe docs on authorizations + capture disclosures; peer policies (Rover, TaskRabbit, Thumbtack cancellation pages) for wording |
| 5 | Balance authorization hold ("Pay $144.00 · Charged at pickup", K-27/K-44) and 7-day unclaimed charge | c-ready Pay sheet, c-booking | Authorization-hold disclosure; charging an unclaimed order after 7 days; storage / abandonment terms (30-day close, D-03) | Stripe authorization docs; dry-cleaner / laundry-service unclaimed-goods policies (NY lien law questions → counsel) |
| 6 | Refund policy + refund timing | every refund state (c-booking cancelled, tailor no-show, disputes) | Refund timelines; who decides disputes (Taily support, K-48.1) | Termly / TermsFeed refund-policy generators |
| 7 | **Background checks** for "Verified" | to-verify step (DG-4), K-15 popover | **FCRA** disclosure + authorization; **NYC Fair Chance Act** (covers independent contractors since 2021) — process + notices | Your background-check provider's FCRA forms (e.g. Checkr, Certn); NYC Commission on Human Rights Fair Chance Act guides + notice templates |
| 8 | Payout identity (KYC), TIN, 1099-K / 1099-NEC | to-payouts (Stripe Connect Express hosted, D-06), Earnings → Tax documents | Who issues 1099s; thresholds; W-9 collection via the processor | Stripe Connect docs (Express onboarding, 1099 support); IRS 1099-K / 1099-NEC instructions |
| 9 | Account deletion + data requests | Account → Delete account (DG-3) | Retention periods (payments, tax, disputes); NY SHIELD Act security duties; CCPA only if thresholds are met | Privacy Policy generators above; IAPP resources |
| 10 | Fitting photo notice (Pinned / Before photos, K-02) | t-adjust, c-booking, Privacy Policy | Notice + consent for photos of a person wearing garments; storage + access | Privacy Policy generators; counsel |
| 11 | Reviews provenance + moderation | c-tailor reviews, t-job rated | **FTC rule on consumer reviews and testimonials (2024)**; neutral moderation policy | FTC business guidance on reviews; Termly content-policy templates |
| 12 | Garment loss + damage promise (D-21) incl. the courier **lobby drop** (K-43) | c-pay, courier card, Help | Liability cap per order, claim window (48 h), the tailor's insurance vs Taily's; courier partner's terms (Uber Direct) | Uber Direct merchant terms; dry-cleaner / alteration-shop liability policies; insurer templates |
| 13 | Accessibility statement + contact | Account → Legal | WCAG 2.1 AA claim; ADA exposure | **W3C WAI "Generate an Accessibility Statement"** tool |
| 14 | Price transparency (all-in estimates incl. home + rush fees) | c-tailors, c-tailor, c-pay | NYC all-in / junk-fee rules as they apply to service marketplaces | NYC DCWP + FTC junk-fee guidance |
| 15 | Sales tax on alterations | money config | NY treats alterations as non-taxable (TSB-M-02(4)S) — confirm, and revisit for other states | NY Dept. of Taxation TSB-M-02(4)S |
| 16 | Support + dispute decisions by the CEO (K-48.1) | Help chat, admin view | Documented dispute policy, records, chargeback handling | Stripe disputes docs; marketplace dispute policies (Etsy, TaskRabbit) for structure |

Placeholder copy in the app: legal pages render a short summary + "Full text coming soon (counsel review)". Search the code for
`COUNSEL` to find every spot.
