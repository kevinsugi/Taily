# Taily — post-launch design backlog

Explorations approved by Kevin after the design freeze (`mvp-spec-1.0`). Nothing here ships before launch: each entry is
built into taily-app afterwards through its change log. This branch (`explore/post-launch`) never merges into `V5` or `main`.
Shipped calls stay in `DECISIONS.md`; an entry here may evolve a K-## but never edits it.

## Entry format

    ### PL-## · YYYY-MM-DD · <topic>
    - **Verdict:** <approved variation, Kevin's words>
    - **Artifact:** <link>
    - **Changes:** screens · components · copy · money · texts / emails
    - **Evolves:** K-## / D-## (or "new")
    - **Build notes:** <for taily-app, later>

## In exploration

_Nothing open._

## Approved

### PL-01 · 2026-10-20 · Welcome screen (c-welcome)
- **Verdict:** Kevin: "I like B3 but replace the tag with a dress", then "Yes" → approved as B3 · Jacket + dress, no band.
- **Artifact:** https://claude.ai/artifact/18DKyxp87RhGAydGGXth3z (board "B3 · Jacket + dress, no band"; rounds 1–2 kept on
  the canvas for reference)
- **Changes:**
  - *Screens:* c-welcome only. One centre axis for everything (logo, drawing, title, subheading, benefit block, button,
    footer); the empty gap between the copy and the button closes; the bottom lines become one footer (the Log in line,
    then one 12 px block: tailor line + legal line).
  - *Graphic:* the Suit Jacket circle is replaced by the K-18 hang rail on the page ground (no linen band, no tag): the
    cognac stitch edge to edge, a Suit Jacket and a Formal Dress on threads, with the same motion (the stitch sews in
    700 ms, the garments drop in 1000 ms, staggered 450 / 580 ms; still under reduced motion).
  - *Copy:* title "Doesn’t fit? *Taily it*" on one line (serif 36; "Taily it" Cormorant italic 700); subheading
    "Book expert tailors near you" (sans 16 / 600, neutral-700); three benefits as an icon list, left-aligned inside a
    centred block: "Vetted master tailors you can trust" (shield-check), "Fittings at home or at the shop" (house),
    "See prices before you book" (price tag); 20 px icons in accent-ink. Drops "A tailor near you, booked in five
    steps." and "Real prices up front. Your deposit is held, not charged, until the tailor accepts."
  - *Components:* `hangStage` gains a no-tag option (`tag: null` → no tag slot; the garments centre on their own); three
    new 20 px stroke icons. No new type sizes or tokens.
  - *Money:* none shown (the deposit line goes).
  - *Texts / emails:* none.
- **Evolves:** D-198 (garment illustration + one money line, K-03 #4); reuses K-18 / D-249 (the hanging stage); keeps the
  live "Continue with email" entry (K-55).
- **Build notes:**
  - "Master tailors" must be true of every vetted tailor; otherwise ship "Vetted expert tailors you can trust".
  - The one-line title is `nowrap` at 390; let it wrap below 360 px and at 200 % text so nothing clips.
  - Load Cormorant Garamond italic 700 (only the title uses it); serif stays titles-only.
  - The rail's accessible name: "A suit jacket and a formal dress hung on a stitched rail".
  - Short viewports (390 × 664): tighten the rail's top margin first; the button stays above the fold (AU-P2-4).

### PL-02 · 2026-10-20 · Tailor onboarding: Build your card (step 1) + Photo ID in the background check (step 6)
- **Verdict:** Kevin: "W1 preferred · remove the skip so there is only 1 CTA · add a step for photos of their work", then
  "V1 for Step 6 · the CTA should fill the row". Answers that shaped it: full redesign of both pages; the ID sits after the
  consent; Taily's own upload; no photo matching (manual review); live tailors see it in the Verified checks list.
- **Artifact:** https://claude.ai/artifact/MRLMV1ro5CxHM8vN4Fjo4n (W1 row "Step 1 · Build your card" + "W1 · Clickable";
  step 6 = the V1 boards; "Live tailors · Your checks")
- **Changes:**
  - *to-profile (step 1) → "Build your card".* The form is replaced by the live preview itself. A "Search card / Full
    profile" switch; every editable part of the real `tailorRow` (photo, name, years, card line) and of the c-tailor
    profile (photo, name, business name, years, About, work photos) is a tap target. Tapping one dims the screen
    (ink scrim), rings that part in cognac, and opens a sheet with that one field (Done / Save); the card updates as she
    types. Sample parts she can't edit here ($160 Est., Comes to you, Next opening, distance, rating "New") stay grey with
    "Grey parts are samples. They fill in from your prices and hours."
  - *Guided first pass:* a tour card under the highlighted part, "n of 6", one title, one line, ONE full-width button
    ("Add photo" / "Fill it in" / "Add photos"); no Skip. Order: 1 photo · 2 name (+ optional business name in the same
    sheet) · 3 years · 4 card line · 5 About (switches to Full profile) · 6 "Show your work" (optional, up to 6 photos;
    "Before-and-after shots in daylight sell the fitting. Up to 6. Ask before showing a customer’s face."). The tour
    advances on save and skips parts already done; tapping the dimmed area or Finish later leaves it.
  - *Backup list:* "x of 5 done" under the preview; each row (Photo, Name, Years tailoring, Card line, About, Work photos ·
    Optional) opens the same sheet. Next is always tappable; with parts missing it says "Still needed: …" and rings them
    (today's behaviour). Required = photo, name, years, card line, About (unchanged); work photos stay optional.
  - *to-payouts (step 6), V1 "Sections":* lead "Two things before customers can book you: a background check, then how
    Taily pays you." Background check: "A background check company confirms who you are and looks at criminal records.
    Customers only book tailors who pass. It usually takes 1 to 2 days." · Read the disclosure · I agree checkbox ·
    hairline · **Photo ID**: "A driver’s license, state ID or passport. Someone at Taily checks it by hand. Customers never
    see it." + an upload row "Add your photo ID" (camera, chevron → the existing Take a photo / Choose from library
    sheet). The row is locked (neutral-100 fill, padlock, "Agree to the background check first.") until the box is ticked.
    Continue without it → the row rings in error and "Add your photo ID to continue." sits under it. Then a "Payouts"
    section: "Taily pays you every Friday for jobs completed by then.", the fee sentence in dollars (unchanged), the Secure
    setup card (unchanged), the action bar (unchanged).
  - *Verified checks:* `VERIFY_ITEMS` label "ID and profile photo" → **"Photo ID"**; needs-info line "We couldn’t read your
    ID. Add a clearer photo"; background row "Starts once your ID is checked". The ID is reviewed by a person; nothing
    matches it to the profile photo.
  - *Components:* a tap-to-edit mode for `tailorRow` and the c-tailor header (parts as buttons, focus ring, scrim);
    a tour card (one `.cta`); a locked / error upload row. *Money:* unchanged, dollars only. *Texts / emails:* none new;
    any copy that says the ID is "matched to your photo" goes.
- **Evolves:** D-350 (ID beside the profile photo on to-profile, matched to it) → ID on step 6 after the consent, manual
  review; D-351 (step 6 layout: background-check section + Payouts section); D-427 (check order kept, label renamed);
  K-19 / D-250 (card line now edited on the card itself); the to-profile form + sticky "What customers see" preview.
- **Build notes:**
  - The tour card needs focus moved to it, Escape to close, and the highlighted part announced; every part is a real
    `<button>` with a 44 px target. Reduced motion: no ring pulse.
  - Hidden parts at 200 % text: the sheet scrolls, the card may wrap; keep the scrim covering the action bar.
  - Store a `tourDone` flag so returning tailors (Finish later → resume) land without the tour.
  - Upload row locks on `consent === false`; `id-required` error only after Continue. Admin verifications: the ID check is
    a person's pass / needs-info (`T.reviewChecks`), no face match.
  - Shop → Profile edit uses the same tap-to-edit preview without the tour.
