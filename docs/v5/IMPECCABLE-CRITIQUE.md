⚠️ DEGRADED: single-context (no sub-agent/Task tool exposed in this session; Assessment A finished and was recorded before the detector ran)

# Taily v5: Impeccable critique (both personas, after M7)

- **Command:** `/impeccable critique` · **Mode:** Operate (app UI) · **Kind:** refinement of the incumbent design.
- **Brief (wins over taste):** Cormorant Garamond titles and hero money, Hanken Grotesk UI, warm neutral tokens (`css/tokens.css`), garment illustrations and the stitched dashed divider as the only signatures, icon-only top nav, no bottom tab bar (K-01..K-03, D-186..D-202).
- **Evidence:** `ref/v5/*.png` self-baselines (committed with `f81baad`, the same commit as the current CSS, so they are fresh), fresh `scripts/v5/shoot.mjs` captures, and source reads.
- **Detector:** `impeccable detect --json` on `index.html`, plus URL scans at 390×844 on 14 screens.
- **Not done:** no source file was edited. The `.impeccable/critique/` snapshot was not written because the orchestrator allowed only this one report file, so this run has no trend line.

**Screens walked**
- **Customer (Sarah):** c-welcome → c-job → c-where → c-tailors → c-tailor → c-book → c-pay → c-request → c-booking → c-price-change → c-ready → c-complete → c-review, plus c-messages, c-thread and c-account.
- **Tailor (Amara):** t-phone → to-profile → to-services → to-where → to-returns → to-availability → to-payouts → to-done → t-shop → t-home → t-request → t-job → t-adjust → t-earnings → t-payout, plus t-messages and t-thread.

---

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Timelines, countdowns and the status dot plus word are strong. Two gaps: the reason a primary is disabled sits away from the button (c-ready), and the tailor's reply deadline is printed at 12 px (t-request, t-home). |
| 2 | Match System / Real World | 4 | The copy is the product's best asset: "Hold $16.00 and send request", "You take home $147.50 after the $12.50 Taily fee", "Was $160.00 · up $45.00". Tailor words ("Pinned photos", "Edit the job") are the trade's own words. |
| 3 | User Control and Freedom | 3 | The flow bar has ✕, onboarding has "Finish later", item removal has Undo, and Withdraw and Reschedule are text links. Nothing traps the user. |
| 4 | Consistency and Standards | 3 | The two personas have drifted apart: three progress-indicator layouts, nav order, masked-number formats, "Accepted" vs "Confirmed" for one state, and garment icons with and without a well (Issue 6). |
| 5 | Error Prevention | 3 | Required photos, soft-disabled Send (D-196), the deposit hold, the cancellation cut-off and the masked chat are all good. The toggle's off state reads like on (Issue 2). |
| 6 | Recognition Rather Than Recall | 3 | Context cards in threads and "What customers see" previews are good. The icon-only nav is locked (K-03), but Amara's settings, payouts and Sign out sit behind a storefront glyph. |
| 7 | Flexibility and Efficiency | 2 | Saved address and card defaults and the deep links are good. At the fitting, each garment's documentation takes a long single-path scroll (Issue 5). There are no accelerators, which is fine for this audience. |
| 8 | Aesthetic and Minimalist Design | 3 | Calm and focused overall. Some screens are long: c-tailor is 2,428 px, t-adjust 2,172 px, c-price-change 1,872 px. c-complete offers the same action three ways (Issue 3). |
| 9 | Error Recovery | 3 | Errors appear next to the field, and pay-declined, courier-failed and send-failed states each have a retry path. |
| 10 | Help and Documentation | 3 | Six ⓘ sheets put help where the decision is (D-191). There is no general help or contact entry, which is acceptable for a prototype. |
| **Total** | | **30/40** | **Good**: a solid foundation, with weak spots in consistency and efficiency |

---

## Design Specificity Verdict

**LLM assessment (written before the detector ran).** This design belongs to Taily; another product could not reuse it unchanged.
- The garment illustrations do the identity work everywhere: the c-job grid, the c-welcome and to-done heroes, the thread context card, inbox rows, t-earnings rows, the K-02 photo stubs and the D-202 `garmentStrip`.
- Cormorant appears only on page titles and hero money ($147.50 on t-request, $205.00 on c-price-change, $112.50 on t-earnings).
- The stitched dash closes every total, as a seam would.

Structural sameness is the remaining weakness. Every status screen uses the same skeleton: back, dot plus word, serif title, body line, CAPS section heads, flat rows, sticky bar. That keeps the app predictable, but the two emotional peaks of the journey are built from the same parts as a receipt:
- c-complete, the end of Sarah's story.
- to-done, Amara going live, which does use the illustration and works better.

The biggest missed opportunity for product character is the ending (Issue 3).

**Deterministic scan** (`impeccable detect`, file scan of `index.html` plus URL scans at 390×844 of c-welcome, c-job, c-tailor, c-pay, c-price-change, c-ready, c-complete, t-home, t-request, t-job, t-adjust, to-availability, to-services and t-earnings):

| Rule | Count | Where | Verdict |
|---|---|---|---|
| `cream-palette` (warning) | 14 | every scanned screen (`--neutral-50` / `--neutral-100` page) | **False positive under the brief.** The warm linen is Kevin's locked token set (Figma-generated `tokens.css`). |
| `repeating-stripes-gradient` (advisory) | 8 | every screen with a `moneyRows` total | **False positive.** This is the stitched dashed divider, a K-03 signature, used only where D-197 allows. |
| `undersized-ui-text` (warning) | 2 | c-price-change: "New", "New price" tags at 10 px | **Real (P3).** These tags carry meaning at the approval moment (Issue 7). |
| `kicker-above-heading` (warning) | 2 | t-home "TUESDAY, OCT 13" above "Hi, Amara"; t-adjust "AT THE FITTING" above "Edit the job" | **t-adjust: false positive** (the kicker names the stage, and the same screen in revise mode says "Edit the order you sent"). **t-home: mild.** It is decoration on the one screen Amara opens every morning (minor observation). |

The detector found no layout, contrast or type-scale violations beyond the 10 px tags, which fits the hygiene lint the harness already enforces. It also missed every behavioural issue below (the toggle's state, the disabled primaries, the duplicate review doors), which is expected for a static scan.

**Visual overlays:** none. The run used CLI URL scans, and no detector script was injected into a browser tab, so no overlay is visible anywhere. Port 4173 was already served by another process (my `npm run serve` exited with the port in use), so there was no server of mine to stop. The `shoot.mjs` and probe captures started and killed their own servers.

---

## Overall Impression

Taily reads like one careful hand made it: warm, quiet, honest about money, with illustrations that make every garment legible at a glance. M7 removed the AI tells, and the detector agrees, finding nothing beyond the brief's own choices.

What is left is not taste. It is a handful of states where the interface says the wrong thing:
- A disabled button is the heaviest object on the screen.
- An off switch looks on.
- The last screen of the journey asks for the same review three times.
- The tailor's most time-critical number is set in 12 px grey.

**Single biggest opportunity:** make the end of Sarah's journey (c-complete) a moment, not a receipt.

---

## What's Working

1. **Money is told in plain dollars, from the reader's side.**
   - Customer: "Hold $16.00 and send request" (c-pay CTA), "Balance · Due when ready", "Was $160.00 · up $45.00" (c-price-change).
   - Tailor: "You take home $147.50 · after the $12.50 Taily fee" (t-home, t-request).
   - t-adjust bar lead: "Sarah pays $160.00 · You take home $147.50", the two numbers both people at the fitting table care about.
   - Every breakdown closes on the stitched dash. Both sides read the same ticket.
2. **The garment illustration is a real system, not decoration.**
   - It is the input on c-job (tap a jacket to add a jacket).
   - It is the subject on the thread context card, inbox rows and t-earnings rows.
   - It is the photo placeholder in K-02 docs, the hero on c-welcome and to-done, and the empty-state art.
   - You always know which garment a row is about.
3. **"What happens next" timelines carry the next step and its cost.**
   - c-booking: "Visit and fitting · You approve the final order", then "Ready · Pay the balance, est. $144.00".
   - c-request: "You're booked · The $16.00 deposit is charged when Amara accepts".
   - The to-done preview ("How a customer in Williamsburg sees you") is the onboarding payoff done right.

---

## Priority Issues (ranked by impact)

### 1. [P1] Disabled primaries are heavy grey slabs, and on c-ready the reason sits below the wrong element

- **Screens:**
  - c-ready (its primary state, before a return method is picked).
  - t-adjust--photos-required and t-adjust--photos-missing.
  - c-thread and t-thread composer Send.
- **Evidence:**
  - `css/components.css:60` sets `.cta--disabled { opacity: 0.55; }`, so an ink button at 55% becomes a solid mid-grey slab with white text.
  - At 390×844 that slab is the darkest, largest object in the viewport on c-ready ("Pay $144.00") and t-adjust ("Send to Sarah for approval").
  - On c-ready the explanation "Choose how to get it back first." (`js/screens/c-ready.js:81`) renders under the "Message Amara" link, two elements away from the button it explains.
  - The composer Send (`.composer__send:disabled { opacity: 0.4 }`) is the same grey pill.
- **Why it matters:**
  - A greyed-out filled button still reads as "the thing to press", and it is greyed only because of a choice made 300 px higher on the screen.
  - Jordan taps it, gets a toast, and has to hunt for why.
  - It breaks D-195's spirit too: one primary per screen, and here the primary is a dead one.
- **Fix:**
  1. Restyle the disabled and soft-disabled CTA so it reads as "not yet" rather than as a grey primary: `.cta:disabled, .cta--disabled, .cta[aria-disabled="true"] { opacity: 1; background: var(--neutral-200); color: var(--neutral-600); }`. Apply the same to `.composer__send:disabled`, and keep `cursor: not-allowed` and the D-196 soft-disable behaviour.
  2. On c-ready, move the reason into the action bar's **lead slot above the button**, the slot t-adjust already uses for money: "Choose how to get it back first." When a method is chosen, replace it with that choice ("In-store pickup · Free"), so the bar always says what Pay will do.
  3. On t-adjust, keep the bar note "Add before and pinned photos for 2 items." where it is (D-178). The restyle alone fixes the weight.
- **Suggested command:** `/impeccable polish` (states), then `/impeccable clarify` for the c-ready bar lead.

### 2. [P1] The toggle's off state reads as on

- **Screens:**
  - to-availability: Monday and Sunday are "Closed" but look switched on.
  - to-where: shop and home-visit switches.
  - t-shop: "Taking requests", and t-shop--paused.
  - t-rush.
- **Evidence:**
  - `css/components-v5.css:217`: off track `background: var(--neutral-500)` (#857C6F).
  - `:219`: on track `var(--ink)` (#1C1B18). Both are dark pills with the same white 28 px knob.
  - In `ref/v5/to-availability.png` the Monday toggle (off) and the Tuesday toggle (on) differ only by knob side and a tonal shift that is hard to see at arm's length. "Closed" in the helper line is the only reliable cue.
  - The dark off track was chosen for the D-163 3:1 control-boundary rule, but a filled dark track is not the only way to meet it.
- **Why it matters:**
  - On to-availability, Amara is setting the week customers can book. A mis-read switch means requests on a day she is closed, or none on a day she is open.
  - Sam (low vision) and Casey (glare, one hand) cannot tell state by knob position alone.
- **Fix:**
  - Make the off state an outlined track:
    - `.toggle::before { background: var(--white); box-shadow: inset 0 0 0 1.5px var(--neutral-500); }`
    - `.toggle__knob { width: 20px; height: 20px; top: 12px; left: 8px; background: var(--neutral-500); }`
  - On state:
    - `.toggle[aria-checked="true"]::before { background: var(--ink); box-shadow: none; }`
    - `.toggle[aria-checked="true"] .toggle__knob { width: 28px; height: 28px; top: 8px; background: var(--white); transform: translateX(16px); }`
  - State then reads by fill, knob colour and knob size. The 3:1 boundary is kept by the ring, which follows the inside-stroke rule.
  - Respect reduced motion on the size change (the transition list already exists at `components-v5.css:23`).
- **Suggested command:** `/impeccable polish` (component state), `/impeccable audit` to confirm contrast.

### 3. [P1] c-complete ends the journey on a receipt, with three doors to one review

- **Screens:** c-complete → c-review.
- **Evidence:**
  - Review door 1: the "How did Amara do?" star card. A star tap carries the rating into c-review (`js/screens/c-complete.js:55-61`, D-107).
  - Review door 2: the action bar's filled "Leave a review" CTA (`c-complete.js:44`).
  - Review door 3: c-review asks for "Your rating" again with five stars. That is three surfaces for one action, and the screen's single filled button duplicates the card above it.
  - The rest of the screen is "All done", one line of body copy and a receipt. None of the garments Sarah is getting back appear above the fold. The illustration first shows halfway down the receipt.
- **Why it matters:**
  - Peak-end: c-complete is the last thing Sarah remembers about Taily, and it currently feels like a receipt.
  - The duplicate CTA also dilutes the stars card, which is the better, one-tap door.
- **Fix:**
  1. Drop `ctaLabel`/`ctaAct` from c-complete's `actionBar`. Keep "Message Amara" as the bar's text link, or remove the bar. The star card becomes the screen's one action. D-195 allows zero filled buttons, and the card is an interactive container (D-193).
  2. Under the hero body, add the returned garments with the existing `garmentStrip(a.job.garments)` (D-202) and the line "2 items · back with you". This is the signature closing the story, with no new component.
  3. Keep the receipt below, unchanged.
- **Suggested command:** `/impeccable distill` (remove the duplicate door), then `/impeccable delight` for the ending, kept within the brief.

### 4. [P2] The tailor's reply deadline is understated, while the customer's is the hero

- **Screens:** t-request, t-home (request card), t-messages row. The customer's mirror is c-request.
- **Evidence:**
  - c-request prints "2h left" at 24/600 as the screen's first fact. That is the mirror screen; Sarah can only wait.
  - On t-request, the person who must act sees "2h left" at 12 px `--neutral-600` on the left under the serif money, with "Answer by 12:00 PM" on the right.
  - On t-home the card's "2h left" is a 12 px grey label top-right.
  - The status word "New request" uses the `pending` (ochre) tone. D-95 and D-201 reserve the loud `action` tone for "your move", and D-201 already moved the tailor's Fitting pill to `action`.
- **Why it matters:**
  - An unanswered request expires: Amara loses the job, and Sarah's hold is released.
  - It is the most consequential timer in the tailor app, and it currently reads like a footnote.
- **Fix:**
  - **t-request:** render the countdown as one line directly under the status/name: `t-body w-600` in `--accent-ink`, "2h left · answer by 12:00 PM". Drop the split 12 px row.
  - **Tailor-facing new-request status:** use the `action` tone (accent dot with halo, bold word), the way D-201 treats Fitting. Keep the label "New request".
  - **t-home request card:** set "2h left" to `t-small w-600` in `--accent-ink`.
  - No new tokens or components are needed.
- **Suggested command:** `/impeccable layout` (hierarchy), `/impeccable colorize` (the tone call, D-95 family).

### 5. [P2] t-adjust is a 2,170 px scroll at the fitting table, and its empty photo rows take double the room they need

- **Screens:** t-adjust, t-adjust--photos-required, t-adjust--item-added, t-adjust--revise.
- **Evidence:**
  - With the seed's 2 garments, each card stacks:
    - the head, with "Remove item" in red at the top-right corner;
    - price-input rows, then "+ Add a service";
    - a "Before photos · Required" row and a "Pinned photos · Required" row, each holding one 56 px dashed tile in a full-width row;
    - "+ Add comment · Optional".
  - Then come "+ Add an item", "Note to Sarah", "What changes" and the take-home breakdown. That is 7+ targets per card, and the decision summary sits about 1,300 px below the first card. The D-126 bar lead keeps the totals visible, which helps.
  - Destructive "Remove item" holds the most prominent corner of every card.
- **Why it matters:**
  - Casey (Amara standing at the table, phone in one hand, garment in the other) scrolls past two empty photo rows per garment to reach the next one.
  - A red link in the card's title row is the first thing her eye lands on in each card.
- **Fix:**
  1. When a garment has **no photos yet**, render Before and Pinned as **two half-width columns in one row**: each column has its label, "Required" and one dashed tile, with the same `docsEditor` markup and a modifier class. This saves about 96 px per card.
  2. As soon as either kind has a photo, expand both to full rows, so four thumbnails plus the add tile still fit (D-176).
  3. Move "Remove item" from the card head to the card's last row, as a red text link after "+ Add comment". Undo (D-121) is unchanged.
- **Suggested command:** `/impeccable layout`.

### 6. [P2] Small drift between the two personas, and the same thing drawn two ways

- **Progress indicators:** three layouts.
  - c-job: a track in the body under the nav, with "1 of 5" right-aligned.
  - c-where → c-pay: flow bar with Back · track · "n of 5" · ✕ (D-186).
  - to-*: "Step n of 6 · Availability" above the track, with "Finish later" at the top right.
  - **Fix:** give the customer flow the onboarding label pattern, "Step 2 of 5 · Where and when", in the flow bar's centre slot. The step name is the most useful part, and both wizards would then read the same.
- **Nav order:** Messages is 3rd for Sarah (Home, Bookings, Messages, Account) and 4th for Amara (Home, Shop, Earnings, Messages).
  - **Fix:** put Messages third for Amara too (Home, Shop, Messages, Earnings), so "Messages = third icon" holds for anyone who uses both personas.
- **Masked numbers:** "Visa •••• 4242" (c-account, c-pay) vs "Chase ••6789" (t-earnings, t-payout, t-shop).
  - **Fix:** use one mask, "••••" plus the last 4, everywhere.
- **One state, two words:** the same confirmed appointment is "Accepted" on t-home's Upcoming row and on t-thread (first hour, D-73), and "Confirmed" on t-job (`t-job.js:69` uses the `confirmed` pill with the label "Accepted" only in its just-booked variant). Both are visible in the same session.
  - **Fix:** keep "You accepted" as the t-job *title* for the first hour, and let the pill always say "Confirmed" on both sides.
- **Garment icon well:** D-181 says garment heads are 40 px and "identical to c-job's tile". On c-job's Your items, t-adjust, t-earnings and thread cards the icon sits in a white or linen well. On `changeList` / `workList` heads (c-pay, c-ready, c-booking, c-price-change, t-job, t-request) it is bare.
  - **Fix:** give the `changeList` / `workList` garment head the same 40 px well.
- **Suggested command:** `/impeccable polish`.

### 7. [P3] The 10 px change tags carry meaning at the approval moment

- **Screens:** c-price-change, t-adjust--edited and t-adjust--item-added, c-booking--docs.
- **Evidence:**
  - The detector flagged `undersized-ui-text` on "New" and "New price" (`.change-list__tag.t-micro`, `components-v5.css:639`), 10/600 with 1 px tracking, per D-202.
  - These tags are how Sarah tells what Amara changed before she approves money.
- **Fix:** set the tag to `t-small w-600` (12 px), drop the letter-spacing, and keep the accent-bg pill and the sentence-case words. A 12 px tag still fits beside "Shorten sleeves" with the struck "$45.00" at 390 px. Check the item-added rows in the visual baseline.
- **Suggested command:** `/impeccable typeset`.

---

## Cognitive Load

- **Checklist:** 2 of 8 fail, which is moderate.
  - **Minimal choices** fails on t-adjust: 7+ targets per garment card, times N cards.
  - **Progressive disclosure** fails on t-adjust: the note, "What changes" and the full take-home breakdown are always open below the editing cards.
- **Passes:**
  - The c-job 9-tile grid passes even though it shows more than 4 options, because it is picture recognition with one obvious action (tap the garment).
  - c-tailor has 8 sections, but each is a labelled reference block on a flat page with a sticky "Pick a time", so it reads as a profile, not a decision.
- **No memory bridges:** the flow bar repeats "Est. $160 · 2 items" on every booking step, and thread context cards carry the booking.

## Emotional Journey

- **Peaks:**
  - c-welcome (the jacket on an accent circle and one honest money line).
  - to-done ("You're bookable" with the customer's-eye preview card), the best moment in the app.
  - c-price-change, which leads with Amara's own note before the numbers. That is the right reassurance at the highest-stakes screen.
- **Valleys:**
  - c-ready on arrival: a dead grey Pay button, with its reason under another element (Issue 1).
  - t-adjust's first view: two "Required" rows per garment before any work is done. D-196 already softened this.
- **End:** c-complete, which is transactional (Issue 3). The tailor's end, t-payout "Paid · $147.50", is clean and appropriately calm.

## Persona Red Flags

**Jordan (first-time customer, Sarah's first booking)**
- c-ready: sees "Pay $144.00" greyed out. The reason ("Choose how to get it back first.") is below "Message Amara", so Jordan taps Pay, gets a toast and has to look up.
- c-complete: a star card and a filled "Leave a review" button for the same thing. Then c-review asks for the rating again.
- The nav is icon-only (locked, K-03). `title` tooltips do not exist on touch. The calendar-with-tick for Bookings is the least guessable glyph; the active stitch helps once learned.

**Casey (Amara at the fitting table, one-handed)**
- t-adjust: two empty full-width photo rows per garment before the next card. The scroll to "What changes" is about 1,300 px.
- Red "Remove item" sits in each card's title row. Undo exists, but it is the first word her eye meets in every card.
- t-home and t-request: the request's "2h left" is 12 px grey. A glance between fittings will not register it.

**Sam (screen reader / low vision)**
- to-availability: the toggle's on and off differ by knob position and a subtle tone shift. The "Closed" helper is the only strong cue.
- c-price-change: 10 px "New" and "New price" tags, below the 11 px functional floor.
- Good: status is always a dot *and* a word (never colour alone), unread counts are folded into the nav link's aria-label (D-201), soft-disabled Send keeps `aria-disabled` and focuses the first missing row (D-196), and errors sit next to the field.

## Minor Observations

- **c-tailor:** the "Rush fees" rows are 12 px while the "Prices" rows above them are 16 px, so the same kind of data appears at two sizes. Print rush rows as `t-body` rows like prices, or fold them into the existing pricing ⓘ sheet.
- **c-tailor, to-returns preview:** "In-store pickup — free" uses an em dash, while c-ready right-aligns "Free". Use one pattern: "In-store pickup · Free", or the right-aligned price.
- **t-home:** "TUESDAY, OCT 13" as a kicker over "Hi, Amara" is the detector's one fair kicker hit. Fold the date into the summary line ("Tuesday, Oct 13 · 1 new request · 1 upcoming visit") and drop the kicker.
- **to-profile:** the "What customers see" preview is an empty circle plus "Your name" until she types, which reads broken. Show the hanger or garment glyph in the avatar well until initials exist.
- **c-book:** the compact 3-row wheel (D-202) leaves about 300 px of empty linen above the bar. Reasonable, but "Nothing is charged yet." could sit in the bar lead with "Est. $160 · 2 items" so the body ends on the wheel.
- **Status tones at 8 px:** sage (`progress`) reads close to grey at arm's length. D-201's hollow `calm` dot separates them by shape, which is enough. No change needed.
- **c-messages / t-messages:** the unread count badge plus the nav dot is correct and quiet. Keep it.

## Questions to Consider

- What if the last screen showed what came back (the garments) before it showed what it cost?
- Should a disabled primary exist at all on c-ready, or should the bar lead say "Choose how to get it back" until it can say "Pay $144.00"?
- Is "New request" Amara's move? If so, why is it quieter than Sarah's "Approve order"?
- Does the fitting editor need to show the whole ticket while Amara is photographing, or only the card she is on plus the bar?

---

## Questions for Kevin

Asked here because this run is a sub-agent and cannot prompt you directly. Each question offers concrete options.

1. **Which to tackle first?**
   - (a) State legibility: Issues 1, 2 and 7 (disabled primaries, the toggle, 10 px tags). These are small CSS changes plus re-baselines.
   - (b) Journey moments: Issues 3 and 4 (the c-complete ending, the tailor's deadline).
   - (c) The fitting editor: Issue 5 (t-adjust density).
2. **c-complete's one review door:**
   - (a) Keep the star card and drop the filled "Leave a review" (recommended).
   - (b) Keep the filled CTA and drop the star card.
   - (c) Keep both.
3. **Tailor new-request tone:**
   - (a) `action` (accent, halo, bold), like Fitting (recommended).
   - (b) Keep `pending` ochre and only promote the countdown text.
4. **Scope:**
   - (a) Top 3 only.
   - (b) All 7 issues.
   - (c) Issues 1–4 now, with 5–7 in a later polish pass.

**Suggested next commands** (once the scope is chosen): `/impeccable polish` (Issues 1, 2, 6), `/impeccable distill` and `/impeccable delight` (Issue 3), `/impeccable layout` (Issues 4, 5), `/impeccable typeset` (Issue 7), then a final `/impeccable polish`.

Each fix is a code change, so it runs through `npm run check` and needs `--accept` re-baselines; any new product call is logged as the next D-## in `docs/v5/DECISIONS.md`.
