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
