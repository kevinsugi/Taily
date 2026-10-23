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

## Before merging into taily-app

- [ ] **Service area (PL-09 – PL-11):** double-check every ZIP code in `docs/v5/handoff/neighborhoods.csv` against a
      current USPS / NYC source (shared ZIPs and their home neighborhood especially), and rename the four tables in
      `docs/v5/handoff/neighborhoods.sql` to match the production schema before running it. Re-run
      `node scripts/v5/export-neighborhoods.mjs` after any fix.
- [ ] **Finished photos (PL-17):** add a line to the customer terms that tailors may show finished-garment photos
      (never names) on their profile.
- [ ] **Reviews (PL-14):** have counsel confirm the Highest / Lowest sort (it reverses COUNSEL #11's neutral list) and
      the admin "Don't post" rules (FTC review-suppression rules); log every "Don't post" with its reason.

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

### PL-03 · 2026-10-21 · Tipping on Job complete (both personas)
- **Verdict:** Kevin: "I like option C for all" → C · Inline, no sheet. Answers that shaped it: the tip lives in the
  Tailored-by label under the stars; amounts scaled to the order in dollars; the customer pays the card fee; charged to the
  card on file as its own charge; 28-day window; final once sent; a thank-you note rides with it; never tied to the rating.
- **Artifact:** https://claude.ai/artifact/W3iVATYwzZf15F7HCBeFS3 (boards C1 · C2 · C3 + the "Both sides" row)
- **Changes:**
  - *c-complete (customer):* under the stars, a rule, then "Tip Amara" + "Optional · until Nov 12" and one joined
    4-segment picker ($10 · $20 · $30 · Other; nothing pre-selected; 48 px). Picking one opens, in place, the
    thank-you note (optional, 140 chars) and two money rows: "Tip, all to Amara $20.00" · "Card fee $0.91". The action bar
    swaps to "Send tip · $20.91" (lead: "Charged to Visa •••• 4242. Tips are final."), with "Leave a review" and "Not now" as
    text links. After sending: a success strip "✓ Sent $20.00, all to Amara · Note sent" + "Charged $20.91 to Visa •••• 4242
    with the $0.91 card fee."; the bar returns to "Leave a review"; the receipt row reads "Paid $160.00 · tip $20.91".
    "Other" opens a dollar field in the same place (whole or cents, min $1, max = POLICY cap).
  - *Order page / receipt (customer):* for 28 days after completion a "Tip Amara · N days left" card with the same picker;
    after tipping, two receipt lines: "Tip for Amara $20.00" and "Card fee $0.91" with the charge date.
  - *Review reminder:* the 7-day reminder (Study-1 A4) may mention "You can still tip Amara until <date>".
  - *t-job completed (tailor):* a "Sarah tipped you · <date>" card above the payout: the tip in `.t-money`, the note, "All
    yours, no Taily fee. Arrives Fri, <date> · to <bank>".
  - *t-earnings:* a "Tip from Sarah Chen" row in the payout it lands in (note as subline) and a "Tips this year" line
    ("Included in your <year> tax form (1099-K)").
  - *Email (tailor):* "Sarah left you a $20.00 tip" with the note and the payout date (TEXTS catalogue: new event).
- **Money (all dollars, rates only in money-config):** new `MONEY.TIP_PRESET_SHARES` (e.g. 0.06 / 0.12 / 0.18 of the order
  total, rounded to the nearest $5, never rendered as a share), `POLICY.TIP_WINDOW_D: 28`, `MONEY.CARD_FEE_RATE` +
  `MONEY.CARD_FEE_FIXED` (prototype used 2.9 % + $0.30). The card fee is grossed up so the tailor receives the whole tip:
  fee = ceil((tip + fixed) / (1 − rate)) − tip → $10 → $0.61, $20 → $0.91, $30 → $1.21. No Taily fee on tips. The tip is a
  separate charge on the saved card (not part of the order's balance); it pays out in the next Friday run.
- **Evolves:** D-20 / K-48 ("tipping = after MVP": now designed); K-17 (c-complete's woven label gains the tip block);
  K-28 (Study-1 A4 bar: "Send tip" leads only while an amount is picked); D-355 (Earnings rows + tax line).
- **Build notes / counsel:**
  - COUNSEL: charging the customer the card fee may count as a credit-card surcharge (state rules, card-network notice
    and cap rules); confirm before launch, or fall back to Taily absorbing it.
  - Tips are reported on the tailor's 1099-K; say so in the payouts help.
  - A failed tip charge: inline error under the picker ("Your card was declined. Try another card."), nothing sent.
  - Refunds only through Help (admin), never self-serve; a refunded tip leaves the tailor's next payout.
  - Accessibility: the picker is a radiogroup; the swapped bar button is announced; reduced motion unaffected.

### PL-04 · 2026-10-21 · Services by garment (to-services + Shop → Services and prices)
- **Verdict:** Kevin: "V2 approved" → V2 · Sections + jump chips. Answers that shaped it: a price per service PER GARMENT;
  a drafted ~60-service catalog; all garments collapsed on arrival; a per-garment on/off switch; search; "Use recommended
  prices" per garment and for all; a missing price flags (and opens) its garment on Next; same design in onboarding and Shop.
- **Artifact:** https://claude.ai/artifact/JZFfVJjAwDjVzDPbgF9kkw (row "V2 · Sections with jump chips": clickable V2 +
  open / search / error states)
- **Changes:**
  - *Layout:* stepper, title, one-line lead; a sticky block with the search field ("Find a service: sleeves, hem, zipper…")
    and a horizontally scrolling row of garment chips ("Suit Jacket · 3", "Formal Dress · off"; the open one ink-filled; a
    garment with a missing price after Next turns error-tinted). Then "9 garments" + "Use recommended prices" (all), and
    one section per garment, separated by hairlines, all collapsed: 40 px garment drawing, name, summary ("3 of 9 offered ·
    $45–$65" · "Off · customers with one won’t see you" · "1 needs a price"), a +/− disc.
  - *Open section:* a white toggle-row "I work on suit jackets" (helper "Customers with suit jackets can book you." / off:
    "Off: customers with one won’t see you."), "Use recommended prices for suit jackets", then the existing `service-row`
    rows in a list card (checkbox, name, "Most NYC tailors charge $35–$55.", price box, "Your payout: $38.25").
  - *Search:* filters to matching services, opens every garment that has one, highlights the match in the label, header
    reads 'Results for “sleeve”'; clearing restores the previous open state.
  - *Next with gaps:* banner "2 services need a price · Add a price or untick them. We opened those garments for you.",
    the garments open, the empty boxes ring in error with "Add a price" under them. Next stays tappable (today's rule).
  - *Shop edit:* same screen, "Save" instead of Next, and the existing "Saved. Customers see the change now." toast.
- **Data / money:** the catalog becomes garment → services, each `{ label, base }`, priced per (garment, service); the
  recommended range stays base ± `MONEY.PRICE_RANGE_SPREAD` rounded to `MONEY.PRICE_ROUND`; payout still = price − Taily
  fee (15 % of services, in dollars). A garment switched off removes the tailor from jobs containing it
  (`coversJob`, D-354 logic now per garment). Catalog itself = production database (K-39); the prototype's 61-service
  draft is a starting list for Kevin to edit.
- **Evolves:** K-39 (catalog source), D-354 (coversJob per garment), K-45 / C3 (range line kept), the Study-1 C3 range rule;
  the flat to-services list (M2 §C2).
- **Build notes:**
  - Migration: each existing flat service price copies to every garment it covered (Hem pants $25 → Suit Pant and
    Pants / Jeans); the tailor reviews on first open (a one-time banner).
  - Customer side: booking already picks garment → services; line items now read the per-garment price.
  - Chips: 44 px targets (the drawn chips are 40 px tall + spacing; make the hit area 44), scroll-snap, reduced motion.
  - Remember open sections per session; search is client-side over the catalog.

### PL-05 · 2026-10-21 · "Other" service + a note per garment (c-job, both personas downstream)
- **Verdict:** Kevin: "V2 approved" → V2 · Quiet links. Answers that shaped it: the customer's own service is priced at
  the fitting (estimate shows "+ 1 item priced at your fitting"); every tailor who works on that garment still shows, and
  may decline; no deposit on the unpriced part; description ≤ 140 characters + optional photos; an optional note per
  garment (≤ 280 characters) that the tailor sees, with the order-wide note kept; "Other" and the note stay separate.
- **Artifact:** https://claude.ai/artifact/5ydT8dtaGLxRdGnchJuRe4 (row "V2 · Quiet links" + the shared row: estimate,
  tailor request, pricing it at the fitting)
- **Changes:**
  - *Services sheet ("Suit Pant — what needs doing?"):* under the checklist, a text link "+ Something not on the list".
    Tapping it adds a white row: ✓, a field "Your own service" (placeholder e.g. "Move the belt loops in"), helper
    "Priced at your fitting · 22 / 140", ✕ to remove, and "+ Add another" below. Optional photos on that row.
  - *Garment card (c-job):* the services line lists the own service as "Your own: … · priced at fitting" (accent ink).
    Under it, "+ Add a note for your tailor"; once written, the note shows as a quoted line with "Edit".
  - *Estimate (c-tailors row + c-tailor "Your estimate"):* the row keeps "$160 Est." plus a fact line "+ 1 item priced at
    your fitting"; the estimate lists the own service with "At fitting" instead of a price and note "Amara prices it at
    your fitting. You approve it first."; total "$160" with "+ 1 item priced at your fitting"; deposit line
    "Deposit when you send the request $16.00 · On the priced work only".
  - *Tailor request (t-request) + job (t-job):* the own service sits in its garment as 'Sarah’s own: “…”' with caption
    "Not on your list. You price it at the fitting." and value "At fitting"; the garment note shows under that garment as
    "Sarah’s note"; payout "Services + the one you price at the fitting", total "Your payout so far".
  - *Fitting (Final order, t-adjust):* the own service is an accent block "Price Sarah’s own service" with the quote, a
    "Your price" box ($) and "Can’t do it" (removes the row); "Send Sarah the final order" stays disabled until it has a
    price (bar note "Price the belt loops first"). Sarah approves it with the final order as today.
- **Data / money:** a job service gains `{ custom: true, text ≤ 140, photos[], price: null }` until the fitting; a garment
  gains `note ≤ 280`. Estimate, deposit (`POLICY` deposit rate on services + visit fee) and the Taily fee cover priced
  services only; once priced, the row is an ordinary service (fee in dollars, payout = price − fee). Money stays dollars only.
- **Evolves:** K-01 (the fitting re-price + approval now also prices the own service; approval stays required), K-02
  (the tailor's garment comment sits beside the customer's garment note, separate), K-19 (tailor card gains one fact line;
  "$160 Est." unchanged); c-job services sheet (M1).
- **Build notes:**
  - Matching: a custom service never filters tailors out (coversJob ignores it); tailors may decline as today.
  - Emails: the tailor's new-request email lists "Your own service: … (price at fitting)" and the garment note; the
    customer's receipt lists the priced row once approved.
  - Counters live next to the field; 44 px targets on the links, ✕ and Edit; errors next to the field (empty own service on Done).
  - The order-wide note on Review and send is unchanged.

### PL-06 · 2026-10-21 · Taily fee back to 10% (system-wide)
- **Verdict:** Kevin: "Revert the fee to be 10%, a system wide change" (asked while exploring the What changes section).
- **Artifact:** none (a rate change); the What changes canvas https://claude.ai/artifact/T1czkd4onD4VRfTXTZsK7Z uses it.
- **Changes:**
  - *Rate:* `MONEY.TAILY_FEE_RATE` 0.15 → **0.10**, still on the services subtotal only (never the home-visit fee, rush or
    courier), taken from the tailor's payout. Example: $125.00 of services → "Taily fee −$12.50", payout $147.50 with the
    $35.00 visit fee (was −$18.75 / $141.25).
  - *Fee explainer (to-fee, the one screen allowed a percent):* "Taily’s 10% covers: Insurance · Operations · Scheduling ·
    Clientele · Hosting, and more."
  - *Everywhere else:* dollar amounts recompute from the rate; no copy names a percent. Recommended-price payout lines
    ("Your payout: $38.25" on a $45 price → "$40.50"), request / job / Final order / earnings / receipts, and the tailor
    emails that quote a payout all follow.
- **Data / money:** one constant in money config; money.js keeps integer cents and rounding; the admin Ledger shows the
  fee at the rate in force when each job was accepted (jobs accepted at 15% keep it).
- **Evolves:** K-53 (Taily fee = 15, was 0.10) — this returns it to 0.10; the K-53 fee-explainer screen stays, with 10%.
- **Build notes:**
  - Store the rate on each job at accept, so a rate change never re-prices live jobs.
  - Prototype: tests and visual baselines that print fee or payout amounts change with it (re-accept those baselines).

### PL-07 · 2026-10-22 · What changes, payout first (t-adjust Final order + Edit order)
- **Verdict:** Kevin: "V1 approved" → V1 · One number. Answers that shaped it: one section component for both screens;
  the tailor's payout is the focus; Sarah's total = one secondary line; the fee lines behind "See breakdown"; the bar shows
  the payout only; fee at 10% (PL-06).
- **Artifact:** https://claude.ai/artifact/T1czkd4onD4VRfTXTZsK7Z (row "V1 · One number": down / up + breakdown / same / missing)
- **Changes:**
  - *Section "What changes":* the change count ("1 item added · 1 service removed"), then caps "Your payout", the figure
    (`t-money`) with a pill beside it: "+$36.00" (success-bg / success-ink) when up, "−$27.00" (1 px neutral-300 ring,
    neutral-700) when down, "No change" when equal; "Was $147.50" under it (`t-small c-600`). Then one line
    "Sarah pays $130.00 · was $160.00" (`t-small c-700`; no "was" when unchanged).
  - *Breakdown:* a text link "See breakdown" / "Hide breakdown" (`aria-expanded`, 44 px) toggles the existing
    `tailorBreakdown` rows (Services, Taily fee "On the $95.00 of services only", Home visit fee, Your payout). Closed by default.
  - *Missing price:* the figure is "—" (aria "not available") with "Add a price for Taper legs to see your new payout."
    in error ink; no Sarah line, no breakdown link.
  - *Deposit line* unchanged ("Sarah’s $16.00 deposit stays the same.").
  - *Action bar lead:* "Your payout $120.50" only (replaces the D-126 two-figure pair); missing price → "Add a price to see
    your payout".
- **Data / money:** no new numbers: `pv.after.payout`, `pv.before.payout`, the delta = after − before (cents, `fmtExact`;
  sign by `fmtNeg` / "+"). Dollars only.
- **Evolves:** D-126 (bar carries both figures, the customer's first) → payout only; the two-column `deltaFigure` pair in
  t-adjust's view and editView; K-01 / K-42 / K-47 screens unchanged otherwise.
- **Build notes:** one `payoutChange({ after, before, customer })` section used by both views; the breakdown open state
  lives in the screen's ui slice (survives the live patch on typing); the pill is announced with its figure
  ("Your payout $120.50, down $27.00").

### PL-08 · 2026-10-22 · Onboarding photos open the phone's camera and library (to-profile)
- **Verdict:** Kevin: "Currently is a placeholder … We need to have it open the phone's actual functions upon deployment.
  No need to create design variations, just fix it."
- **Artifact:** none; code on `explore/post-launch` (js/screens/to-profile.js, css/screens/to-profile.css).
- **Changes:**
  - *Photos of your work:* "+" opens the same sheet; "Take a photo" opens the camera (`<input type="file" accept="image/*"
    capture="environment">`), "Choose from library" opens the photo library with multi-select (`multiple`, capped at the
    6-photo limit). Picked photos fill the tiles and the View sheet; Remove / Undo keep their order. Toast "Photo added" /
    "2 photos added".
  - *Profile photo:* the same sheet; "Take a photo" opens the front camera (`capture="user"`), the library picks one; the
    avatar shows the real photo (also before a name is typed).
  - The test harness (`?test=1`) keeps the simulated add, so every flow and baseline is unchanged.
- **Data / money:** none. In the prototype a photo lives as an object URL for the session (not saved across reloads).
- **Evolves:** M2 to-profile photo sheet (simulated add); PL-02's work-photos step uses the same picker.
- **Build notes (taily-app):**
  - Same inputs; on change, downscale on the device (longest side ~1600 px, JPEG ~0.8, strip EXIF incl. GPS) and upload
    to Supabase Storage (`tailor-work/<tailorId>/<uuid>.jpg`, profile photo `tailor-avatar/…`), keeping a local preview
    while it uploads (spinner on the tile, retry on failure, error next to the tiles).
  - Accept HEIC from iPhones (convert server-side or let iOS hand over JPEG via `accept="image/*"`); reject non-images and
    files over ~15 MB with a message next to the field.
  - The ID photo (to-background, PL-02) should use the same picker with `capture="environment"`.
  - Verified here: Chromium file chooser opens (multi-select on library), two picked photos render in the tiles; flows,
    journeys, model and lint pass. Not verified on a physical iPhone / Android.

### PL-09 · 2026-10-22 · Neighborhoods without a map (to-where)
- **Verdict:** Kevin, after the map canvas: "Change it to be without a map; neighborhood selection only." The four map
  versions are not taken.
- **Artifact:** https://claude.ai/artifact/Dzu56KgwLrHsHjqQPCDQqx (explored, not chosen); code on `explore/post-launch`.
- **Changes:**
  - *Where you work → home visits:* the tile map (`hoodMap`) and its "N neighborhoods highlighted" caption are gone. What
    stays: the label "Neighborhoods you visit", the helper "Where customers can book a home visit", and the borough groups
    with "n selected" / "None" and their 44 px neighborhood chips.
  - *Boroughs:* Manhattan, Brooklyn and Queens only (Kevin: "Yes drop bronx and staten island"). The Bronx (Riverdale,
    Fordham, Parkchester, Mott Haven) and Staten Island (St. George, Stapleton, Great Kills, Tottenville) leave the picker,
    and their ZIPs leave the served area, so a customer there sees today's "Taily isn't in that area yet." 
  - *Error:* unchanged — the groups ring in error with "Pick at least one neighborhood." under them.
  - The customer preview line ("Comes to you in Williamsburg, Greenpoint …") is unchanged.
- **Data / money:** `BOROUGHS` = 3; `NEIGHBORHOODS` = 22; `ZIP_XY` drops 10471 / 10458 / 10462 / 10454 / 10301 / 10304 /
  10308 / 10307. `hoodMap` stays in components.js (gallery + model test) but no screen uses it.
- **Evolves:** Study-1 C5 (the tile map beside the picker); D-254 picker unchanged.
- **Build notes:** taily-app drops the map component from the tailor's Where you work step; nothing else moves.
  taily-app: the served-area table loses the Bronx and Staten Island ZIPs.
  Prototype: fixtures m2 / s1c no longer expect the map; model test expects 3 boroughs; visual baselines re-accepted:
  `to-where*` (14 keys). `sys-components` (the gallery) also changes but was not re-accepted here: it already differs on
  this machine's browser before the change, so re-accept it where the baselines were made.

### PL-10 · 2026-10-22 · Kevin's neighborhood list, with ZIP codes (to-where picker + customer ZIP lookup)
- **Verdict:** Kevin supplied the list and asked that each neighborhood carry ZIP codes, so a customer's address or ZIP
  finds it.
- **Artifact:** https://claude.ai/artifact/WtUKPGv4iPHtAiQALrSCct (working picker, ZIP table, ZIP lookup)
- **Changes (29 neighborhoods, list order = picker order):**
  - *Manhattan (15):* FiDi 10004 10005 10006 10038 10280 · Chinatown 10013 10002 · SoHo 10012 10013 · TriBeCa 10007 10282 ·
    Lower East Side 10002 · East Village 10009 10003 · West Village 10014 10011 · Greenwich Village 10003 10011 10012 ·
    Gramercy 10010 · Murray Hill 10016 · Midtown 10001 10017 10018 10020 10022 · Hell’s Kitchen 10036 10019 ·
    Upper East Side 10065 10021 10075 10028 10128 · Upper West Side 10023 10069 10024 10025 ·
    Harlem 10026 10027 10030 10037 10039 10029 10035.
  - *Brooklyn (11):* Downtown Brooklyn 11201 · DUMBO 11201 · Brooklyn Heights 11201 · Williamsburg 11211 11249 11206 ·
    Greenpoint 11222 · Bushwick 11237 · Bed-Stuy 11216 11221 11233 · Clinton Hill 11205 11238 · Park Slope 11215 11217 ·
    Carroll Gardens 11231 · Prospect Heights 11238.
  - *Queens (3):* Long Island City 11101 11109 · Astoria 11102 11103 11105 11106 · Sunnyside 11104.
  - *Shared ZIPs:* a ZIP that two or three neighborhoods share is covered when the tailor picks any of them; the address
    reads as its home neighborhood: 10002 Lower East Side · 10003 Greenwich Village · 10011 West Village · 10012 / 10013
    SoHo · 11201 Brooklyn Heights · 11238 Prospect Heights.
  - *Gone:* Tribeca → TriBeCa (spelling), East Williamsburg (11206 now Williamsburg), Chelsea, Fort Greene (11205 now
    Clinton Hill), Jackson Heights, Ridgewood, Forest Hills. Their other ZIPs (11372, 11385, 11375) are outside Taily.
  - *Customer side:* any ZIP above is "in Taily's area" (placeForZip names its neighborhood: 10027 → Harlem, New York);
    any other ZIP reads "Taily isn't in that area yet." Seed tailor Amara: Williamsburg, Greenpoint and Bushwick (same ZIPs).
- **Data / money:** `NEIGHBORHOODS` (29), `SHARED_ZIP_HOME`, `ZIP_XY` (mock grid from each ZIP's centre; the seed's six
  measured Brooklyn ZIPs and 10013 keep their points). Names: "Downtown" is "Downtown Brooklyn" so a sentence like
  "Comes to you in Downtown Brooklyn and DUMBO" reads clearly; "Bedstuy" is "Bed-Stuy"; "Hells Kitchen" is "Hell’s Kitchen".
- **Evolves:** PL-09, Study-1 C5, S-42 (D-357 mock geocoding).
- **Build notes:** taily-app stores neighborhood → ZIPs and the shared-ZIP home in the database (admin-editable), and its
  real geocoder should map an address to a neighborhood by polygon where a ZIP is shared. Chelsea (10011 / 10001) is not
  on the list: 10011 is served through West Village / Greenwich Village and 10001 through Midtown.
  Prototype: model test + fixtures updated; visual baselines re-accepted: `to-where*`, `c-tailor`, `c-tailor--*`.

### PL-11 · 2026-10-22 · Chelsea added; the service-area table saved for production
- **Verdict:** Kevin: "Add chelsea to the list, and save the list and zip table somewhere we can push to production when ready."
- **Artifact:** https://claude.ai/artifact/WtUKPGv4iPHtAiQALrSCct (updated)
- **Changes:**
  - *Chelsea* joins Manhattan between Greenwich Village and Gramercy, with 10011 and 10001. Both ZIPs are shared and now
    read as Chelsea (10011 also West Village and Greenwich Village; 10001 also Midtown). 30 neighborhoods, 60 ZIPs, 8 shared.
  - *Handoff:* `docs/v5/handoff/` holds `neighborhoods.json` (full table), `neighborhoods.csv` (neighborhood × ZIP rows) and
    `neighborhoods.sql` (idempotent Postgres seed: `service_boroughs`, `service_neighborhoods`, `service_neighborhood_zips`,
    `service_zips`; upserts only), plus a README with the rules and the steps to move it into taily-app.
    `scripts/v5/export-neighborhoods.mjs` regenerates all three from `js/data.js`, so the prototype stays the one source.
- **Data / money:** `NEIGHBORHOODS` +1, `SHARED_ZIP_HOME` 10001 / 10011 → chelsea.
- **Evolves:** PL-10. **Build notes:** see `docs/v5/handoff/README.md`. Visual baselines re-accepted:
  `to-where--hoods-borough`, `to-where--courier-address`.

### PL-12 · 2026-10-22 · Tailor card: "Est. $160" on one line + usual turnaround (c-tailors, onboarding preview, to-availability)
- **Verdict:** Kevin: "V1 approved" → V1 · Quiet line under the price. Answers that shaped it: list card and the onboarding
  preview (one component); "Est." small before the amount; the tailor sets the turnaround in onboarding; it measures fitting
  → ready for pickup; no warning when it runs past the need-by; the next-opening line is dropped; a sort is added.
- **Artifact:** https://claude.ai/artifact/BG1PJK2w3QmEL1fnG63hhM (V1 + the onboarding and sort boards)
- **Changes:**
  - *Tailor card (`tailorRow`):* the right column is one line "Est. $160" (Est. 12 / 600 neutral-600, amount 24 / 600 ink,
    baseline-aligned, tabular) and under it a quiet line: 14 px clock (neutral-500) + "7–10 days" (12 / 600 neutral-700),
    right-aligned. The "Next opening …" fact is removed; the place line stays. Declined cards show neither.
    Card name for screen readers adds "ready 7 to 10 days after your fitting" and drops the next opening.
  - *Onboarding, Availability (to-availability):* a new first section "Your usual turnaround": "From the fitting until it’s
    ready for pickup, how long does a typical job take you?" — four radio buttons in a 2 × 2 grid (3–5 / 5–7 / 7–10 /
    10–14 days, 52 px, ink when picked; default 7–10), helper "Customers see it on your card. A rush order can still be
    faster, and you set the due date for each job at the fitting.", then a "What customers see" preview card that
    updates live. Shop → Availability (edit) shows the same section.
  - *Sort (c-tailors sort sheet):* adds "Fastest turnaround" ("Ready soonest after your fitting"), ordered by the low end
    of the range, then the high end. "Soonest opening" stays as a sort for now.
- **Data / money:** tailor gains `turnaround: '3-5' | '5-7' | '7-10' | '10-14'` (days, fitting → ready); required in
  onboarding with the 7–10 default; existing tailors get 7–10 until they change it. No money change.
- **Evolves:** K-19 (card: "$160" with "Est." under it, next-opening fact) → Est. inline, turnaround under, no next
  opening; K-18 unchanged (Book now on the profile still uses the next opening).
- **Build notes:** the range is display copy only; due dates are still set per job at the fitting. The tailor profile
  page can show the same line in its stats later (not designed here).

### PL-13 · 2026-10-22 · One Book button on the tailor profile + Book in the message card (c-tailor, c-thread)
- **Verdict:** Kevin: "P1 and M1 approved" (round 2, after "V1 preferred but it's too disconnected from the next
  appointment" and "floating on top of the text field … is too disconnected"). Answers that shaped it: one Book in the bar
  that opens the picker at the next opening; the next opening moves into the button; Ask a question stays; Est. +
  turnaround in the bar; no openings → "Change need-by date"; messages: customer only, inside the No booking yet card,
  always shown, hidden after a request, "Book again" after a finished job, not after a decline.
- **Artifact:** https://claude.ai/artifact/SdV1TMwTKZAb5zHwt2VpAt (rows "Round 2": P1 and M1)
- **Changes:**
  - *Profile (c-tailor):* the K-18 split (Next opening card + Book now) and its note "Book now takes this time. For another
    day, use Pick a time." are removed; the page goes straight from the stats to About. The action bar: a lead line
    "Est. $160" (left, Est. 12 / 600 neutral-600, amount 24 / 600) and clock + "7–10 days" (right, PL-12 style), then one
    two-line black button (min 56 px): "Book" (16 / 600) over "Next opening Thu, Oct 15 · 5:00 PM" (12 / 500, neutral-300),
    then "Ask a question" (chat icon, accent ink). Tapping Book writes the next opening into the booking draft and opens
    the picker on it (today's book-now path), so that time is one more tap; any other time is picked there.
  - *No openings before the need-by:* the lead line becomes "No openings before your need-by, Fri, Oct 23." (warning ink)
    and the button reads "Change need-by date" over "Amara’s next opening is Mon, Oct 26"; it opens the need-by sheet.
  - *Booked before:* the button reads "Book again" over the next opening.
  - *Messages (c-thread, customer, before a request):* the "No booking yet" context card keeps its title and adds
    "Est. $160 · 7–10 days" (Est. amount 600 ink) and a calendar line "Next opening Thu, Oct 15 · 5:00 PM", with a black
    "Book" button (44 px) at the card's right. Before any items are added the price line is left out. After a request
    the card returns to today's request card; after a finished job it reads "Job done · Sep 28 / Suit Jacket · picked up"
    with "Book again"; after a decline (read-only thread) there is no Book.
- **Data / money:** none new (next opening, estimate and turnaround already exist; PL-12 adds the turnaround).
- **Evolves:** K-18 (split Book now + action-bar Pick a time) → one Book whose label carries the next opening;
  D-248 (book-now writes the slot) kept as the Book path; M5 c-thread context card (No booking yet → links to the profile).
- **Build notes:** the Book label is built from the same next-opening value as today's split; when there is no estimate
  (no items yet) the profile lead line shows only the turnaround. Screen readers read the button as
  "Book, next opening Thursday October 15 at 5:00 PM".

### PL-14 · 2026-10-22 · Reviews: checked by Taily, up to 4 photos, compact page with one Filter & sort (c-reviews, c-review, admin)
- **Verdict:** Kevin: "H2 is approved" (round 2, after "I like V2's one filter and sort button, but I like how compact V3
  is"). Answers that shaped it: up to 4 photos, shown after a check; an admin reviews every review before it posts; no
  tailor replies; no reporting (the check covers it); breakdown + filters (With photos, by garment) + sort (Newest /
  Highest / Lowest); each review shows its job and "Booked on Taily". The photo step, the after-sending state and the
  admin queue were shown with every version and drew no changes.
- **Artifact:** https://claude.ai/artifact/X3aZZGN8kbLF7z4ZzQCnch (row "Round 2": H2, H2-on, the shared sheet; row
  "Every version": S-write, S-thanks, S-admin)
- **Changes:**
  - *Reviews page (c-reviews):* under the title, one bar that stays pinned at the top while scrolling: a rating button
    "4.9 ★★★★★ 37 ⌄" (24 / 600 average) that opens the breakdown (5★…1★ bars with counts), and a "Filter & sort"
    button (pill, 44 px) at the right with a count badge when anything is applied. Under the bar one status line:
    "7 reviews · Newest · all booked through Taily" (filters change it: "3 reviews · with photos · Highest rated · …").
    The old note "From customers who booked through Taily. Newest first." goes.
  - *Filter & sort sheet:* Show (All · 7 / With photos · 3), Garment (one chip per garment with a count, only garments
    that have reviews), Sort by (Newest / Highest rated / Lowest rated, radio rows), Reset at the top right, and a black
    "Show 3 reviews" button that closes it. One filter at a time (All, With photos or one garment). Newest is the default.
  - *Each review:* a job line under the name ("Suit Jacket · Take in sides") with a small success-tint "✓ Booked on
    Taily" tag; photos shown as 72 px tiles, up to 4. The "N more customers left a star rating…" line shows only with
    All selected.
  - *Writing (c-review):* up to 4 photos (was 3); the note reads "Up to 4 photos of the finished piece. Taily checks
    every review and photo before it goes on Amara's profile, usually within a day."; the button reads "Send review".
  - *After sending (c-review--submitted):* status "With Taily" (accent dot), "Thanks, Sarah", "Taily checks every review
    before it goes on Amara's profile. That usually takes less than a day.", and the customer's review as a card with a
    "Waiting for Taily's check" chip. It does not say "Posted" any more.
  - *Admin (new Reviews tab, star icon, between Verifications and Ledger):* "Reviews · every review waits here before
    it's posted. Oldest first." A rules box: post every review that follows the rules, good or bad; don't post only for
    contact details, hate / threats / harassment, nothing about the job, or someone's private info in a photo (hide
    that photo); "The star rating never decides." Each card: customer → tailor, job, sent time, stars, text, photos with
    "Hide photo" each, then "Post review" / "Don't post". Don't post asks for one of the four reasons, which the customer
    sees with a way to edit and resend. A phone number or email in the text is flagged ("Phone number found"). Undo
    after either choice.
- **Data / money:** review gets `status` (pending / posted / not-posted), `reason`, `checkedAt`, `hiddenPhotos`; the
  tailor's average and counts only include posted reviews. `REVIEW_LIMITS.PHOTOS_MAX` 3 → 4. No money.
- **Evolves:** S-26 / pre-MVP B2 (c-reviews, neutral newest-first list); c-review (3 private photos, posted at once);
  the admin nav (K-48.1 / K-53 / K-54 B2) gains Reviews.
- **Legal flags (before taily-app):** (1) the Highest / Lowest sort goes against COUNSEL #11 ("a neutral list, no
  hiding or sorting by stars"); Kevin chose it, Newest stays the default, and counsel should confirm. (2) The admin
  check must stick to the content rules above and post negative reviews like any other (FTC rules on suppressing
  reviews); keep a log of every "Don't post" with its reason. (3) Photos become public, so the check covers private
  details in photos.
- **Build notes:** the pinned bar is `position: sticky` under the top nav; the breakdown opens in place under it. The
  sheet reuses the bottom-sheet component; the count badge reads "Filter and sort, 2 applied" to screen readers.
  Customers get a text / email when a review posts or is not posted.

### PL-15 · 2026-10-22 · Tailor card fees: estimate includes home visit + rush, "Incl." lines; rush fees in onboarding (c-tailors, to-availability, to-done)
- **Verdict:** Kevin: "V1E approved" (round 4). Path: round 2 "Swap the time for: 1-Day Rush Fee: +$100 … the
  tailoring estimate should not include the rush fee … show the home visit fee in the tailor card"; round 3 "it's too
  confusing to have the user mentally add the fees themselves. Include the fees in the estimate … use a colon instead
  of a plus sign"; round 4 "includes in the same line as the first service … add a home icon"; then "'Incl.' instead
  of 'includes' and omit the word 'fee' so it's just '1-Day Rush'". Answers: rush tiers same day / 1 / 2 / 3 days
  (4+ free); rush is a required onboarding section with an off toggle; a tailor with rush off still shows; sentence
  case per the design system; $0 home visit reads "Free home visit"; Done screen line "Rush fees: …" OK.
- **Artifact:** https://claude.ai/artifact/BG1PJK2w3QmEL1fnG63hhM (row "Round 3": V1e; row "Every version" of round 2:
  the onboarding rush section, its error and off states, the Done screen)
- **Changes:**
  - *Tailor card (`tailorRow`, right column, PL-12 layout):* "Est. $225" where the estimate = services + home visit fee
    + rush fee. Under it, the time line: not a rush → clock + "7–10 days" (PL-12); a rush (need-by 0–3 days after the
    tailor's next opening) → the fee lines take its place. Fee lines (12 / 600 neutral-700, amount ink, tabular), the
    first one prefixed "Incl." (12 / 500 neutral-600): "Incl. ⚡ 1-day rush: $40" / "⌂ Home visit: $25". Labels:
    "Same-day rush", "1-day rush", "2-day rush", "3-day rush" (day count = fitting → need-by). Home fee $0 → "⌂ Free
    home visit" (success ink), never prefixed "Incl.". Tailor charges $0 for that tier → "⚡ No rush fee". Tailor has
    rush jobs off → "No rush jobs · 5–7 days" (warning ink, clock) and the estimate has no rush fee. Shop visits show no
    home line. Bolt in accent-base, home and clock in neutral-500, 14 px.
  - *Screen readers:* "Amara Reyes, 4.9 stars, 37 reviews, estimate $225 including 1-day rush $40 and home visit $25,
    from Williamsburg".
  - *Onboarding, Availability (to-availability):* a required "Rush fees" section after "Your usual turnaround": "For jobs
    due within 3 days of the fitting. The customer pays it on top, and it's yours in full." A toggle row "I take rush
    jobs" (on by default); on → four $ fields in a 2 × 2 grid: Same day / 1 day after / 2 days after / 3 days after,
    each required ("Enter a fee, or 0 for no fee."), helper "4 days or more after the fitting: no rush fee. Enter 0 to
    take rush jobs for free."; off → "Customers who need it within 3 days of your fitting still see you, marked 'No rush
    jobs'. Turn rush jobs on anytime in your shop." The "What customers see" preview card follows the fields.
  - *Shop → Rush fees (t-rush):* gains the Same day tier; same toggle and fields.
  - *Onboarding Done (to-done):* "Want extra for rush jobs? Add rush fees in your shop." → "Rush fees: same day $60 · 1
    day $40 · 2 days $25 · 3 days $15. Change in your shop." / off: "Rush fees: off. Turn on in your shop."
- **Data / money:** `RUSH_TIERS` 1 / 2 / 3 → 0 / 1 / 2 / 3 (`rushFor` already returns days ≤ tier, so 0 maps to the
  same-day tier); tailor gains `rushOn: boolean` (off → no rush fee and the "No rush jobs" line, tailor still listed).
  The estimate everywhere (card, profile bar PL-13, message card) = services + home visit + rush; price sort uses it.
- **Evolves:** PL-12 (time line), K-19 (estimate "no fee lines"), CP-S02 / t-rush ladder (adds same day), D-64 (empty
  ladder = off → explicit toggle), M2 §C3.
- **Build notes:** the rush tier is read from the tailor's next opening (state.js `estimateNext`), as today. "Incl."
  goes on whichever fee line comes first. Rate-free: every amount is the tailor's own dollar fee.

### PL-16 · 2026-10-22 · Courier tracking: live status row, full-screen tracker, tailor side, Uber quote only (c-ready, c-booking, c-job, t-job, texts)
- **Verdict:** Kevin: "B approved, revise V1" (round 3). Path: V1 ("ETA + timeline") liked; "the 'about' and 'picked
  up' under is messy … instead of 'about', use 'ETA'"; then "make the 'on the way', 'eta', and 'picked up' on the same
  row … the '14m away' should use bold or different color" → B · tinted status tile. Answers: Ready shows the Uber
  quote only, no Taily courier fee; our steps + Uber's tracking page for the map; steps Courier booked → Heading to
  Amara → Picked up → On the way → Almost there → Delivered; call the courier directly (no masking); a compact block
  on the booking page that opens a full-screen tracker; the tailor sees the courier coming and "here"; the drop-off
  photo is shown; texts at picked up / ~5 min / delivered; a live card on Home.
- **Artifact:** https://claude.ai/artifact/KR2RYBurXQogKiiV2LE9RE (V1 board "approved (row B)", the V1 booking block
  and Home card, V1 through the steps, and the shared row: Ready, tailor, delivered, texts)
- **Changes:**
  - *The status row (one component, three cells, 12 px apart, hairline dividers):* cell 1 is a tinted tile
    (accent-bg, radius-md, 10 / 14 px padding) with a caps label (10 / 600, accent ink) over the value (16 / 700 ink):
    "ON THE WAY / 14 min away"; then plain cells "ETA / 5:12 PM", "PICKED UP / 4:45 PM" (label 10 / 600 caps
    neutral-600, value 16 / 600, tabular). By step: heading "TO AMARA / 8 min to pickup · PICKS UP 4:45 PM · ARRIVES
    5:00–5:30"; almost there "ALMOST THERE / 4 min away · ETA 5:06 PM · PICKED UP"; delivered (success-bg tile, success
    ink label) "DELIVERED / 5:10 PM · LEFT IN Your lobby · COURIER Marcus".
  - *Full-screen tracker (new, opened from the booking block, the Home card and the picked-up text):* "Your order from
    Amara · Suit Pant, Suit Jacket"; the status row; one quiet line by step ("Inside your 5:00–5:30 PM window." / "If
    nobody's home, Marcus leaves it in your building's lobby." / "Marcus took a photo when he left it."); the courier
    card (initial avatar or photo, "Marcus · your courier", "Gray Honda Civic" + outlined plate tag "KXT 4821", a 44 px
    ink call button → tel:); "See the live map on Uber ↗" (secondary, opens Uber's tracking URL); the six steps with
    their times (pending Delivered shows "ETA 5:12 PM" in grey); "Problem with the delivery? Get help". Delivered: the
    drop-off photo (full width, tap to enlarge), "Leave a review for Amara" (black), "Didn't get it? Tell us"; no steps.
  - *Booking page (c-booking, courier):* the status strip reads "On the way · ETA 5:12 PM"; the Taily courier section
    becomes a card: the status row, a courier row (avatar, "Marcus, your courier", car + plate, outlined call button),
    "Track delivery" (black). Delivered: "See the delivery photo".
  - *Home (c-job):* a live card on top while the courier is booked → delivered: "Your order from Amara / Suit Pant,
    Suit Jacket / Track ›" over the status row; the whole card opens the tracker.
  - *Tailor (t-job, courier):* the courier section shows the row "ON THE WAY / 6 min away · ETA 4:45 PM · WINDOW
    5:00–5:30" → "HERE / Outside now · ARRIVED 4:44 PM · WINDOW" (success tile), "Have Sarah's order packaged and ready
    by then." / "Hand him Sarah's order, then tap Handed to courier…", the courier row with a Call button, the route.
  - *Ready (c-ready):* the courier option reads "$13.00 · Uber to your door"; the courier block shows "Uber quote
    $13.00" only (the Taily courier fee and Courier total lines go); Price "Taily courier $13.00", Total $173.00,
    Pay $157.00.
  - *Texts:* "Taily: Marcus picked up your order from Amara. ETA 5:12 PM. Track it: taily.app/t/…" · "Taily: Marcus is
    about 5 min away with your order from Amara (gray Honda Civic)." · "Taily: Delivered at 5:10 PM, left in your
    building's lobby. See the photo: taily.app/t/…".
- **Data / money:** `MONEY.COURIER_MARKUP` 0.10 → 0 (Taily keeps nothing on the courier; the customer pays Uber's
  quote); K-53's re-quote absorb rule stays. Trip gains `courier { name, photo, vehicle, plate, phone }`, `eta`,
  `trackingUrl`, `proofPhoto`, and the states heading-to-pickup / picked-up / nearby (from the delivery partner's
  webhooks: pickup, pickup_complete, dropoff, delivered). "Almost there" = the partner's ETA ≤ 5 min.
- **Evolves:** S-35 (booked → out → delivered | returned), K-43 / D-298–D-299 (Uber quote + Taily fee → quote only),
  K-53 courier ledger lines (no fee line), A1 c-complete--courier-lobby (the photo is now shown).
- **Build notes:** the courier's phone is the delivery partner's number (Uber already relays it); call is a plain
  tel: link. The map is never drawn in Taily: the tracking URL opens Uber's page. Texts use the existing texts
  setting (C27).

### PL-17 · 2026-10-23 · Finished photos at Mark ready, a Finished tab for the customer, profile photo crop (t-job, c-booking / c-ready viewer, c-tailor, to-profile)
- **Verdict:** Kevin: H2 approved, after "I like V1 but I like how condensed and minimal V2 is" and "don't like how you
  have to click 'change' to choose the pickup options, and it has a small description under each option. It should
  just be opened by default." Answers: at least 1 photo per garment to mark ready, up to 4; the customer sees them in
  a Finished tab next to Before | Pinned; no before/after comparison; the tailor may add them to Photos of your work
  with no customer approval; problems go through Message; a one-time tip card; the profile-photo crop is part of this.
- **Artifact:** https://claude.ai/artifact/Bz19fpFVbS26E7De7exe1o (row "Round 2": H2 and "every item has a photo";
  row "Every version": tip card, Finished tab, Amara's work, photo crop)
- **Changes:**
  - *Mark ready sheet (t-job, one sheet):* "Mark the order ready?" / "Add at least 1 photo of each finished item, up to
    4." Then one white card per garment: garment icon + name + count ("2 of 4", success ink; "Needs a photo", warning
    ink), a 4-slot grid (photos with a ✕ to remove, an "Add" tile with a camera that opens the camera or library, the
    rest faint empty slots). The Add tile of an item with no photo has a warning dashed border. Under the cards:
    "Add to Photos of your work" / "Shown on your profile. Sarah's name never is." (unticked each job). Then "Return
    options" with the two checkboxes always shown, label only: In-store pickup, Taily courier (only the options the
    tailor offers). "Mark ready" is disabled while an item has no photo or no return option is ticked; the line under
    it says why ("Add a photo of the Suit Jacket to mark it ready." / "Pick at least one way for Sarah to get it
    back."), red after a tap on the disabled button with the item's card outlined; when ready it reads "Sarah sees the
    photos right away, and we hold her $144.00 balance."
  - *Tip card (once per tailor, before the first photo):* "Before your first photo / Photos customers love": On a
    hanger or a dress form · Daylight, no flash · Front, back, then a close-up · Keep people out of the frame (no
    faces, names, tags or addresses). "Got it, take photos"; "You'll see this once. The tips stay under ⓘ next to
    Photos."
  - *Customer photo viewer:* a third tab, Finished (count, a cognac dot while new), opened first once the order is
    ready: "Suit Jacket · Finished / Taken by Amara when she marked it ready · Thu, Oct 22 · 3:10 PM". The item
    rows' photo stacks show the finished photos first. No comparison view.
  - *Tailor profile:* ticked jobs add their photos to "Photos of your work", labelled "Suit Jacket · Oct 22"; the
    tailor can remove any from Shop → Profile.
  - *Profile photo crop (to-profile, Shop → Profile):* after the camera or library, "Move and zoom" (Cancel / Use
    photo) on ink: the photo in the profile cover frame with a rule-of-thirds grid and a circle marking the list
    photo ("Profile cover" / "On the list" tags), zoom − / slider / +, and live previews "On your profile" and "On the
    list".
- **Data:** a job gains `finishedPhotos[garmentId]` (1–4, with `takenAt`) and `addToWork`; the tailor gains
  `photoTipsSeen`, and `photo` gains `crop { x, y, zoom }`. No money.
- **Evolves:** K-02 / D-175…D-183 (Before | Pinned docs → + Finished), Study-1 B1 / K-42 Mark ready sheet, PL-08
  (camera and library), the c-tailor portrait placeholder.
- **Legal flag (before taily-app):** customers' finished garments can appear on the tailor's profile without asking
  them; say so in the customer terms.
