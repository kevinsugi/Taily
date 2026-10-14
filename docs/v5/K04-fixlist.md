# K-04 consolidated fix list

Brief: **K-04** (end of `docs/v5/DECISIONS.md`): apply every item in `IMPECCABLE-CRITIQUE.md` (CR), `IMPECCABLE-AUDIT.md` (AU),
`IMPECCABLE-COPY.md` (CP) and DESIGN.md "Drift found" (DR), plus Kevin's three layout changes (K4). K-01..K-04 win over any report
item. Director calls are logged as **D-203..D-213**. Line numbers are at `790fd80` (code unchanged since `f81baad`).

How to read this:
- **Batch** = the agent that applies the item (§ Batches at the end). Batches run in order, B1 → B5, and each batch runs `npm run check`
  before it hands over.
- **Expects**: the FLOWS / journey strings that must change with the item. Every batch also re-baselines the visual keys it changed,
  with `npm run visual -- --accept <keys>`, and lists them. B1 changes the heading on almost every screen, so B1 runs `--accept all`
  once, after a screenshot pass.
- Money copy: every `{token}` stands for a value `js/money.js` / `appt.money` already computes (`fmt`, `fmtExact`, `fmtNeg`). No
  literal dollar amount, no rate, no `%`.
- Rows marked KEEP are listed so the coverage is complete. They need no change.

---

## 1. Kevin's layout changes (K-04)

| ID | Change | Screens | Expects | Batch |
|---|---|---|---|---|
| K4-1 | **Back inline with the title** (D-203, D-204, D-205). `headingRow(inner, { back, status })`: status line on its own line first, then ONE row = Back + `h1` (chevron hit box pulled −12 px into the gutter, glyph on the 20 px edge; title 4 px after it, wraps beside it; chevron centred on the title's first line), then the notes at the screen padding. Delete `backRow`, `.heading-row--back`, `.heading-stack` (`components-v5.css:615-621`). `statusHero` gets a way to hand its pill to `headingRow` (e.g. `statusHero({…, pillOut: true})` returns the pill in a `<!--status-->` marker that `headingRow` lifts above the row, the same trick as `<!--notes-->`). New token `--body-top: 116px` (nav bottom 100 + 16); `.body { padding-top: var(--body-top) }` in `base.css:195`; `#screen.has-sys-banner .body` (`components-v5.css:778`) becomes `calc(var(--body-top) + var(--sys-banner-h))`. c-tailor profile mode: Back inline with the tailor name (drop `headingRow('')`). Flow bar and onboarding bar keep their Back (D-205). | every screen with a heading: c-addresses, c-cards, c-orders, c-booking, c-price-change, c-ready, c-request, c-complete, c-review, c-code, c-phone, c-name, c-thread, c-tailor (profile), t-code, t-phone, t-rush, t-adjust, t-payout, t-job, t-request, t-suggest, t-thread, to-* in edit mode, to-payouts | none (text unchanged); visual: all keys | B1 |
| K4-2 | **Garment item row: name → underline → icon** (D-206). New shared `garmentHead({ type, kind, tag, photos, trailing })`: name (t-body 600, underline 1 px, offset 4 px), 40 px icon in a white well right after the name, tag, then right-aligned photo stack or trailing control. Use in `changeList` (`components.js:1909-1916`), `workList` (`:1799-1800`), the t-adjust card head and the c-job card head (`c-job.js:39-43`, ✕ stays at the right). Removed item: strike, no underline. | c-job, c-pay, c-ready, c-booking (Your order), c-price-change, t-request, t-job, t-adjust | none textual; visual all listed | B1 |
| K4-3 | **Photos inline: stack + count, replace customer photos after the fitting** (D-207). New `photoStack(...)` in the item row; delete the Before / Pinned tab strip and thumbnails from `garmentDocs` (keep the comment quote), delete `.work-list__photo`. Source = fitting docs when the shown snapshot has them for that garment, else the customer's `g.photos`. Tap → `openDocsViewer` (tabs live in the viewer) or `openPhotoViewer` ("Suit Jacket · Sarah’s photos" / "· Your photos"). `changeList` gets customer counts through `g.photos` (callers map from `a.job.garments`: c-pay, c-booking, c-ready, c-price-change, t-job "The order you sent"). `wireGarmentDocs` / `wirePhotoViewer` route the new `data-act="view-photos"` button. | same as K4-2, plus the viewers | m3.js:75 (`'Before','Pinned'` + sel `[data-docs="g1"]` → `'4 photos'`, sel `[data-garment="g1"] [data-act="view-photos"]`); m4.js:173 (same pattern for g2); m4.js:176-177 `c-price-change--docs-pinned` (click the stack, then the viewer's Pinned tab; sel `[data-s="docs-viewer"] [role="tab"][aria-selected="true"][data-kind="pinned"]`); m4.js:179-181 photo-viewer (click the stack, then the viewer's 2nd thumb); m4.js:279 t-job--fitting-docs (`'Before','Pinned'` → `'photos'`); m4.js:312 and 315-316 t-job--docs / --docs-pinned (same as c-price-change); journeys.mjs:229 + 232 (`'Before','Pinned'` → `'photos'`; the Pinned-tab click goes through the viewer, then close it before `approve`) | B1 |
| K4-4 | **t-adjust exception**: keeps full-width Before / Pinned rows with Required (K-02, D-196); the card head still uses K4-2. Critique Issue 5's half-width layout is NOT applied (D-208). | t-adjust (all) | none | B1 (head), B3 (Remove item, CR-5) |

## 2. Critique (CR)

| ID | Change | Screens | Expects | Batch |
|---|---|---|---|---|
| CR-1a | Disabled / soft-disabled CTA restyle: `.cta:disabled, .cta--disabled, .cta[aria-disabled="true"]` → `opacity: 1; background: var(--neutral-200); color: var(--neutral-600)`; the same for `.composer__send:disabled`; keep `cursor: not-allowed` and D-196 behaviour. Busy CTAs (AU-P1-2d) keep their `.cta--busy` look, not this one. | c-ready, t-adjust--photos-required/-missing, c-thread, t-thread, every disabled primary | none | B1 |
| CR-1b | c-ready: the reason moves into the action-bar **lead** above Pay: "Choose how to get it back first." → once chosen, the choice ("In-store pickup · Free", "Courier · {courier}") replaces it. Remove the note under "Message Amara". | c-ready (all) | m4.js c-ready flows that assert "Choose how to get it back first." keep passing (same text, new slot); add the chosen-lead string to the ◆ c-ready--chosen flow if one exists | B2 |
| CR-1c | t-adjust: keep the bar note "Add before and pinned photos for 2 items." (D-178). The restyle alone fixes the weight. | t-adjust | none | — (covered by CR-1a) |
| CR-2 | Toggle off state outlined: `.toggle::before { background: var(--white); box-shadow: inset 0 0 0 1.5px var(--neutral-500) }`, off knob 20 px `--neutral-500` at top 12 / left 8; on: track `--ink`, knob 28 px white top 8, `translateX(16px)`; transitions on `--dur-press`, reduced-motion respected (`components-v5.css:217-223`). | to-availability, to-where, t-shop, t-shop--paused, t-rush | none | B1 |
| CR-3 | c-complete: drop `ctaLabel` / `ctaAct` from the action bar (keep "Message Amara" as the text link); under the hero add `garmentStrip(types, '2 items · back with you')` (count from the job); the star card is the one action; receipt unchanged. | c-complete | m3.js:34 and m4.js:247 lose `'Leave a review'` (assert `not: 'Leave a review'` on c-complete; c-review's own title stays); add `'back with you'` | B2 |
| CR-4a | Tailor new-request status uses the `action` tone: `PILL_VARIANTS['new-request'].tone = 'action'`, label "New request" (D-211). | component | none | B1 |
| CR-4b | t-request: countdown as one line under the status / name: `t-body w-600 c-accent-ink` "2h left · answer by 12:00 PM"; drop the split 12 px row. Tailor call sites use the `new-request` key. | t-request (all pending states) | expects with `'2h left'` and `'Answer by 12:00 PM'` → `'answer by 12:00 PM'` (m3.js t-request flows; lower-case a) | B3 |
| CR-4c | t-home request card: "2h left" → `t-small w-600 c-accent-ink`. | t-home | none | B3 |
| CR-5 | t-adjust: "Remove item" leaves the card head and becomes the card's last row (red text link after "+ Add comment"); Undo unchanged (D-121). Half-width photo columns NOT applied (K-04, D-208). | t-adjust, --item-added, --revise | none (same words) | B3 |
| CR-6a | Booking flow bar centre: "Step 2 of 5 · Where and when" label above the compact track, from `BOOKING_STEPS` (D-211). c-job keeps its body track but uses the same label pattern "Step 1 of 5 · What needs work". | c-job, c-where, c-tailors, c-tailor (booking), c-book, c-pay | m1.js:62, 88, 127, 160, 183 (×2), 187: `'n of 5'` → `'Step n of 5'` | B1 |
| CR-6b | Amara's nav order: Home, Shop, Messages, Earnings (`components.js:53`). | every tailor screen | none | B1 |
| CR-6c | One mask: "•••• " + last 4 everywhere ("Chase •••• 6789", "Visa •••• 4242"). Find the formatter in `tailor-data.js` / `data.js` / `account.js`. | t-earnings, t-payout, t-shop, to-payouts, c-account, c-pay, c-cards | m4.js:335, 338 `'Chase ••6789'` → `'Chase •••• 6789'`; m2.js:139 + common.js:233 if they print the mask | B4 |
| CR-6d | One state, one word: the pill always says "Confirmed" (`focus.js:63` drops the "Accepted" label; `t-job.js:69` pill label "Confirmed", title stays "You accepted Sarah’s request"; `t-home.js:30` comment). | t-home, t-job--accepted, t-thread | m3.js:243 / 245 `'Accepted'` → `'Confirmed'` (keep `'You accepted'` in the title assert) | B4 |
| CR-6e | Garment icon well on changeList / workList heads (the white 40 px well) — done inside K4-2. | — | — | B1 |
| CR-7 | Change tags 12 px: `.change-list__tag` → `t-small w-600`, no letter-spacing, keep accent-bg pill and sentence case (`components.js:1873` uses `t-micro`; `components-v5.css:639`). | c-price-change, t-adjust--edited/--item-added, c-booking--docs, t-job sent | none textual | B1 |
| CR-m1 | c-tailor "Rush fees" rows print at `t-body` like "Prices" (same row component). | c-tailor | none | B2 |
| CR-m2 | One return-price pattern: "In-store pickup · Free" (no em dash), wherever `returnsRows` / the to-returns preview prints "— free". | c-tailor, to-returns preview, to-done, t-shop | grep expects for `— free` | B4 |
| CR-m3 | t-home: drop the "TUESDAY, OCT 13" kicker; fold into the summary line "Tuesday, Oct 13 · 1 new request, 1 upcoming visit" (one "·", D-210). | t-home (all) | t-home expects that assert the summary line | B3 |
| CR-m4 | to-profile preview: show the garment / hanger glyph in the empty avatar well until initials exist. | to-profile (empty) | none | B3 |
| CR-m5 | c-book: "Nothing is charged yet." moves into the bar lead with "Est. $160 · 2 items" → two lines in the lead (the estimate line, then the note), so the body ends on the wheel. | c-book | c-book expects keep the string | B2 |
| CR-m6 | Status tone sage vs grey: no change (hollow `calm` dot is enough). | — | — | — |
| CR-m7 | Messages unread badge + nav dot: KEEP. | — | — | — |

## 3. Audit (AU)

| ID | Change | Screens | Expects | Batch |
|---|---|---|---|---|
| AU-P1-1 | Test-flows pill clear of CTAs on phones: in `css/flow-menu.css` add `@media (max-width: 430px) { .stage-caption { top: var(--space-4); bottom: auto; right: var(--space-8); flex-direction: column-reverse; } html.has-toast .stage-caption { bottom: auto; } }`. | prototype chrome | none (outside `.screen`) | B1 |
| AU-P1-2a | Router focus restore: in `app.js render()`, before replacing `#screen` on a same-screen render, capture a focus key from `document.activeElement` (`id`, `data-act`, `data-type`, `data-value`, `data-id`, `data-garment`, `data-kind`) into module `pendingFocus`; after `wire()`, if focus is on `<body>` / outside `#screen` and no overlay is open, focus the match with `{ preventScroll: true }`, else the nearest list container, else the `h1` (`tabIndex=-1`). Survives an async second render. | all | none | B1 |
| AU-P1-2b | `c-job.js:153`: delete the stale-`root` refocus (the router covers it). Retire the per-screen refocus in c-ready (`u.refocus`) and the on-only `focusTier` in t-rush (`t-rush.js:81`) where the router now restores focus. Keep to-services / to-profile `ui().focus` if they target a different element on purpose. | c-job, c-addresses, c-ready, t-rush | none | B1 |
| AU-P1-2c | `cta({ busy })` (`components.js:125-128`): emit `aria-disabled="true" aria-busy="true"` and NOT `disabled`; click handlers already guard on busy; keep `.cta--busy`. Check every busy handler returns early on `aria-busy`. | every busy CTA | flows using sel `[disabled]` on a busy CTA → `[aria-busy="true"]` (grep `busy` in fixtures) | B1 |
| AU-P2-1 | Wheel text contrast: `.wheel--sched .wheel__col--scroll .wheel__row { color: var(--neutral-600) }`, `.wheel__row--edge` → `var(--neutral-500-ink)` (`components.css:1038, 1627-1628`). | c-book, c-booking--reschedule, c-where--needby-sheet, t-suggest, t-suggest--rush-window | none | B1 |
| AU-P2-2 | `.banner--success { color: var(--success-ink) }` (`components-v5.css:362`). | t-phone--saved, t-job--approved | none | B1 |
| AU-P2-3 | Truncation: `.thread-context__line { flex-wrap: wrap; row-gap: 2px }`, `.thread-context__title { white-space: normal; overflow: visible; text-overflow: clip }`; `.thread-row__head { flex-wrap: wrap; row-gap: 2px }`, `.thread-row__name { flex: 1 0 auto; max-width: 100% }`; `c-tailors.css` at `max-width: 374px`: filters `minmax(0,1fr) minmax(0,1fr)`, first pill spans both. | c-thread, t-thread, c-messages, t-messages, c-tailors | none | B1 |
| AU-P2-4 | `.screen { min-height: 100vh; min-height: 100dvh }` (`base.css:78-81`); sticky thread head on c-thread / t-thread (`.thread-head` variant `--sticky` in components-v5.css: `position: sticky; top: 0; z-index: 4; background: var(--neutral-50)`); c-welcome hero capped (`min(…, 22dvh)`) so Apple and Google fit in 390×664. | all; c-thread, t-thread; c-welcome | none | B1 (1-2), B2 (c-welcome) |
| AU-P2-5 | Forced colors: append the audit's `@media (forced-colors: active)` block to `components-v5.css` (borders in `CanvasText`, `Highlight` outline for selected, toggle track/knob, field focus, logo). | all | none | B1 |
| AU-P2-6 | Boot split (D-212): no static `flows.js` / `flow-menu.js` import in `app.js:12-13`; import only the requested screen, render, idle-load the rest; `render()` awaits an unloaded module; lazy-load flows + fixtures + flow-menu + gallery on `?flow=` / `?screen=` / `?test=1` / `sys-` / first input; `modulepreload` for app, state, components in `index.html`. Keep `window.Taily.ready` / `.flows` working for the harness. | boot | none (harness must stay green) | B1 |
| AU-P3-1 | t-suggest sending: dim only the wheel (`.t-suggest__sched[inert] .wheel { opacity: .5 }`), the "Sarah sees …" summary stays full ink (`t-suggest.css:6`). | t-suggest--sending | none | B3 |
| AU-P3-2 | Error text → `--error-ink`: `.field__msg--error`, `.countdown--expired`, `.text-area__count--over` (`components-v5.css:202, 162, 440`), `c-review.css:11`, `.filter-pill--error` text (`components.css:1574`); keep `--error` for strokes / icons. | all error states | none | B1 |
| AU-P3-3 | Unitless line-heights for the `.t-*` classes in `base.css` (21/16, 16/12, …) so 1× renders identically; then the other `line-height: Npx` that sit on those classes. | all | none (zero baseline change expected; verify) | B5 |
| AU-P3-4 | Strip `id` attributes from `ICON_CAMERA` (`icons.js:24`); delete `TILE_MINUS` / `TILE_PLUS` ids or the dead constants (`icons.js:28-30`, shadowed at `components.js:227-228`). | c-job, to-profile, t-adjust | none | B1 |
| AU-P3-5 | Shadow tokens `--shadow-float`, `--shadow-overlay` in tokens.css; replace the literals at `components.css:206, 800, 1327, 1530`, `components-v5.css:770`; `border-radius: 6px` (`components.css:1084`) → `--radius-sm` unless Figma says 6. | overlays | none | B1 |
| AU-P3-6 | `.wheel__col { min-width: 44px }`. | c-book, t-suggest at 320 | none | B1 |
| AU-pat-2 | Hygiene lint rule: fail `color: var(--(neutral-500|success|error|warning|accent-base))` on text selectors in v5 CSS (scripts change; orchestrator-approved through K-04). | lint | — | B5 |

## 4. DESIGN.md drift (DR)

| ID | Change | Batch |
|---|---|---|
| DR-1 | Base semantic colours as text → `-ink`: `.field__msg--error`, `.text-area__count--over`, `.countdown--expired`, `.chat-msg__retry`, `.c-review__error`, `.filter-pill__help` / `--error` box text, `.status-hero__title.c-error` / `.c-success` (`components.css:499-500`), `.modal__title--success`; `.banner--success` (= AU-P2-2); `.toast--warning` → `--warning-ink` on `--warning-bg` (D-213). Dedupes AU-P3-2. | B1 |
| DR-2 | One hairline: `--bottom-border` → `--hairline` at `base.css:149`, `components-v5.css:125, 150, 312, 631, 713`, `components.css:1288` (D-213). | B1 |
| DR-3 | Overlay depth / motion tokens: the five shadows (= AU-P3-5), toast 200 ms and push 250 ms → `--dur-modal` + `--ease-out`, toggles / chevrons 180 ms → `--dur-press`, `.modal` radius → `--radius-xl`, delete `--ease-drawer`. | B1 |
| DR-4 | Dead serif: remove `.rating-summary__avg` serif (or the rule, if `ratingSummary` is unused after D-190), `.sheet--picker .sheet__title` / `.t-section` serif 20; retire `--size-8/11/14/18/20/30` if nothing renders them (grep first; the calendar cell uses `--size-8`). | B5 |
| DR-5 | `docs/v5/CONTEXT.md` K-01 section: the "New" tag is the accent tag (D-202), not a `--success` badge; add K-04 (heading anatomy, `garmentHead`, `photoStack`, `--body-top`, lazy boot). Close the DESIGN.md "Drift found" list and document K-04 in DESIGN.md (Components). | B5 |

## 5. Copy (CP)

Glossary (the rule every copy row follows): customer side = request / booking / order / items and services; tailor side = request /
job / the work. "job" never appears on the customer side. Deposit ownership is always named ("Amara keeps the deposit" / "you keep
the deposit"). Rush = "Need-by N days after the visit" for customers; "Ready within N days of the visit" only in the t-rush editor.
Due date = "needed by". Returned payout = "didn’t go through". Return choice = "return options" / "how to get it back".

### Shared (components, data, state, system)

| ID | Where | Current → Proposed | Expects | Batch |
|---|---|---|---|---|
| CP-S01 | `components.js:970` INFO.deposit | "…After that, the deposit is kept." → "…After that, the tailor keeps the deposit." | — | B4 |
| CP-S02 | `components.js:1732` rushLadder (customer preview) | "Ready within 1 day +$40 · Within 2 days…" → rows "Need-by 1 day after the visit +{rush1}", "2 days after +{rush2}", "3 days after +{rush3}", "4+ days after: no rush fee". The t-rush editor keeps "Ready within N days of the visit". | c-tailor / to-done expects with "Ready within" (m2.js:159 is t-rush: unchanged) | B4 |
| CP-S03 | `components.js:1621` takeHtml | "Taily fee $2.50" → "Taily fee −{fee}" (`fmtNeg`) | to-services expects with "Taily fee $" | B4 |
| CP-S04 | viewer by-line (`c-booking.js:447`, `c-price-change.js:115`, `t-adjust.js:663`, `t-job.js:530`, and `openDocsViewer` sub) | "Taken by Amara · Thu, Oct 15, 5:00 PM" → "Taken by Amara on Thu, Oct 15 · 5:00 PM" (K-03 one "·" wins over the report, D-210) | m4.js:138 `'Taken by you'`, m4.js:181 `'Taken by Amara'` still match | B4 |
| CP-S05 | `components.js:1090` tailorRow | "Declined this job" → "Declined this request" | m1.js:151 | B4 |
| CP-S06 | `components.js:936` VERIFIED_LINES[1] | "Cleared before the first booking." → "Passed a background check before their first booking." | — | B4 |
| CP-S07 | changeSummary on c-price-change unchanged | leave the "No changes. Same items…" line out on the customer screen; tailor side keeps it (dedupes CP-C44) | c-price-change--unchanged: add `not: 'Same items, same price'` | B2 |
| CP-S08 | `components.js:145-146` | "New Request", "Awaiting Customer" → "New request", "Awaiting customer" | — | B4 |
| CP-S09 | `components.js:181, 335` | "Select Time", "Visit Details" → "Select time", "Visit details" | — | B4 |
| CP-S10 | `state.js:995` markReady line | customer "Ready. Choose how to get it back." · tailor "You marked it ready. Waiting for {first} to choose how to get it back." | thread expects for "Ready — choose" | B4 |
| CP-S11 | `state.js:753` | "can't" → "can’t" | — | B4 |
| CP-S12 | `state.js:659` | "withdrew her suggested time" → "withdrew the suggested time" | — | B4 |
| CP-S13 | `state.js:94` | hard-coded "Amara’s" → "{tailorFirst}’s" | — | B4 |
| CP-S14 | `state.js:695` | customer "Request expired. Your hold was released." · tailor "Request expired" | — | B4 |
| CP-S15 | `system.js:63` | "That code isn’t right. Check the text and try again." → "That code doesn’t match. Check your texts and try again." (same as c-code / t-code) | sys-session-expired expects | B4 |
| CP-S16 | c-pay error banner + toast | KEEP | — | — |
| CP-S17 | generic toasts `t-request.js:289`, `t-suggest.js:136`, `t-adjust.js:488/495/518/597`, `c-request.js:274/286` | "Something went wrong. Try again." → named: "Couldn’t accept the request. Try again." · "Couldn’t send your suggestion. Try again." · "Couldn’t save the photo. Try again." · "Couldn’t accept the new time. Your hold is unchanged." (one per call site, named after its action) | — (m5.js:293 is the c-pay banner, KEEP) | B4 |
| CP-S18 | to-* edit toasts (`to-where.js:248`, `to-returns.js:186`, `to-availability.js:247`, `to-profile.js:241`, `to-services.js:252`, `to-payouts.js:229`) | "Where you work saved" etc. → "Saved. Customers see the change now." | — | B4 |

### Customer screens

| ID | Screen / where | Current → Proposed | Expects | Batch |
|---|---|---|---|---|
| CP-C01 | c-name lead | KEEP | — | — |
| CP-C02 | c-addresses `:155` toast | "Couldn’t remove it" → "Couldn’t remove the address" | — | B2 |
| CP-C03 | c-cards--in-use | KEEP | — | — |
| CP-C04 | c-welcome `:45` toast | "Not built yet" → "Terms and Privacy aren’t in this prototype yet." | — | B2 |
| CP-C05 | c-job `:51` caption | "Optional" → "Photo (optional)" (D-208) | — | B2 |
| CP-C06 | c-where--rush `:71` | "Rush fees may apply for this date." → "A date this soon can add a rush fee. Each tailor’s price includes it." | m1.js:110 | B4 |
| CP-C07 | c-where--needby-past `:25` | "…Pick a date from tomorrow on." → "…Pick tomorrow or later." | — | B2 |
| CP-C08 | c-tailors--declined `:95-97` | "Amara can’t take this job" / "Your job details are saved. You can still book Amara for a different job." / "Start a different job" → "Amara declined this request" / "Your items and services are saved. You can still book Amara for other work." / "Start a new request" | m1.js:151 (`'can’t take this job'`, `'Your job details are saved'`, `'Start a different job'`) | B4 |
| CP-C09 | c-tailors `:118` count line | "No tailors available for this job" → left out when the empty state shows | — | B2 |
| CP-C10 | c-tailors `:76, :125` none-left / declined empty | "No other tailors for this job yet" / "…We’ll let you know when more tailors join near 11211." → "No other tailors for this request yet" / "Amara didn’t reply in time, and no other tailors cover {zip} yet. A later need-by date or another ZIP may open more." (D-209 #2) | m3.js:232 | B4 |
| CP-C11 | c-tailors--nothing-open `:69` | CTA "Pick a later date" → "Change need-by date" | — | B2 |
| CP-C12 | c-tailor `:48` | "Williamsburg · 12 years" → "Williamsburg · 12 years tailoring" | — | B2 |
| CP-C13 | c-tailor `:114` | "Comes to you in 11211, 11222, …" → "Comes to you in Williamsburg, Greenpoint, East Williamsburg and Bushwick" + ZIPs on a second `t-small c-600` line (names from `ZIP_INFO`) | m1.js:171 (`'Comes to you in'` still matches; add a hood name) | B2 |
| CP-C14 | c-tailor--declined `:159, :175` | same strings as CP-C08 ("Amara declined this request", "Start a new request") | m1.js:177, 179 | B4 |
| CP-C15 | c-tailor rush ladder | = CP-S02 | — | B4 |
| CP-C16 | c-book--no-slots `:49, :53` | title "No times before your need-by date" · "Amara’s first opening is {next}. A visit has to be at least a day before your need-by date, {needBy}. Pick a later date or message Amara." | m1.js:190 (`'No open times before'`) | B2 |
| CP-C17 | c-book subtitle | "At my place · 60-minute visit" → "At my place · 60 min" | m1.js:187 | B2 |
| CP-C18 | c-pay `:43` | "…After that, the {deposit} deposit is kept." → "…After that, Amara keeps the {deposit} deposit." | m1.js:200 | B4 |
| CP-C19 | c-pay--shop `:40` | "…the $12.50 deposit is kept." → "…Amara keeps the {deposit} deposit." | — | B4 |
| CP-C20 | c-pay hold line | KEEP | — | — |
| CP-C21 | c-pay--declined | drop the banner's "Use another card" action; keep the CTA | m4.js:230 still matches (CTA) | B2 |
| CP-C22 | c-request `:81` | "Reply by 12:00 PM" → "Amara has until {expires} to reply" | m1.js:223 | B2 |
| CP-C23 | c-request--soon `:80` | "Amara has 10m left to reply." → "Amara has until {expires} to reply." | — | B2 |
| CP-C24 | c-request timeline `:91` | "Usually within the hour" → "Within 2 hours" (from `POLICY.REQUEST_EXPIRY_H`, D-209 #1) | — | B2 |
| CP-C25 | c-request--declined `:125-126` | title "Amara declined your request" · "Your {deposit} hold is released, so you weren’t charged. Your items and services are saved for the next tailor." | m3.js:153 (`'hold released'` → `'hold is released'`) | B4 |
| CP-C26 | c-request--expired-final / --suggested-passed `:145, :170` | "…Amara is hidden for this job, so you can choose someone else." → "…We won’t show Amara for this request again, so you can choose another tailor." | m3.js:218 | B4 |
| CP-C27 | c-request--expired `:176, :192` | body "Your {deposit} hold was released. You can send the same request again, and Amara gets another 2 hours." · CTA "Try again (1 of 2)" → "Send request again" | m3.js:212, 214 | B2 |
| CP-C28 | c-request--expired-2 | body "…You can send it once more. If Amara doesn’t reply by {expiresNext}, we’ll show you other tailors." · CTA "Send again (last try)" | m3.js:215, 217 (`'Last try'` → `'last try'`) | B2 |
| CP-C29 | c-request--withdraw `:233` | "Your job stays saved…" → "Your items and services stay saved, so you can pick another time or tailor." | — | B4 |
| CP-C30 | sys-push-prompt-customer `c-request.js:341` | "Amara has 2 hours to reply. Turn on notifications to hear back the moment Amara replies." (D-209 #3) | — | B2 |
| CP-C31 | c-bookings `:77` | "2h to reply" / "Reply overdue" → "2h for Amara to reply" / "No reply yet" | m3.js:111, 205, 214 and m5.js:123 if they are c-bookings rows (`'to reply'` still matches; check exact strings) | B2 |
| CP-C32 | c-bookings `:79` expired row | "Try again (1 of 2)" → "Send again" | m3.js:212/214 if asserted on c-bookings | B2 |
| CP-C33 | c-booking `:145` | "…the $16.00 deposit is kept." → "…Amara keeps the {deposit} deposit." | m3.js:47, 64 | B4 |
| CP-C34 | c-booking--cancel-late `:146` | "The visit is less than 24 hours away. If you cancel now, Amara keeps your {deposit} deposit." | m3.js:47 | B4 |
| CP-C35 | c-booking--cancel-late `:328` CTA | "Cancel booking ($16.00 not refunded)" → "Cancel and lose the {kept} deposit" | — | B4 |
| CP-C36 | c-booking--cancel-late sheet row | "Kept" → "Kept by Amara" | m3.js:50, 56, 66 (`'Kept'`), m3.js:272 (`'Kept deposit'` on t-job: check) | B4 |
| CP-C37 | c-booking--cant-make-it `:84` | "…and your job is saved." → "…and your items and services are saved so you can book someone else." | — | B4 |
| CP-C38 | c-booking--no-show `:89` | "…The $16.00 deposit is kept. Nothing else is charged." → "…Amara keeps your {kept} deposit. Nothing else is charged. If you were there, message Amara." | m3.js:64 | B4 |
| CP-C39 | c-booking--returning-pickup `:252` | title "Ready for pickup" → "Pick it up at {shopName}" (pill stays) | m3.js:76, 78 (pill still matches; add the title) | B2 |
| CP-C40 | c-booking--in-progress hero | KEEP | — | — |
| CP-C41 | c-price-change `:75` bar lead | "New balance, charged when ready" → "New balance, due when it’s ready" | m4.js:151 | B2 |
| CP-C42 | c-price-change--unchanged `:75` | "Balance, charged when ready" → "Balance, due when it’s ready" | — | B2 |
| CP-C43 | c-price-change `:48` | "Amara updated your order at the fitting. Approve it and Amara starts the work." → "Amara changed your order at the fitting. Once you approve, the work starts." | — | B2 |
| CP-C44 | c-price-change--unchanged | = CP-S07 | — | B2 |
| CP-C45 | c-price-change--unchanged Services row | add caption "Amara’s final prices" | — | B2 |
| CP-C46 | c-price-change note label | "Amara’s note" → "Amara’s note on the order" (per-item comment unchanged) | — | B2 |
| CP-C47 | c-ready--refund `:153` | "Confirm and get $6.50 back" → "Confirm {returnChoice} and get {refund} back" ("Confirm pickup and get $6.50 back") | m4.js:215 | B2 |
| CP-C48 | c-ready `:190, :202` toast | "That way back is no longer offered." → "Amara no longer offers that option. Pick another way back." | — | B2 |
| CP-C49 | c-ready--courier-failed bar | "Try the courier price again, or pick another way back." → "Get a courier price, or pick another way back." | — | B2 |
| CP-C50 | c-thread--read-only `:90, :92` | "…Send Amara a new request for a different job to chat again." / "Start a different job with Amara" → "…To talk again, send Amara a new request." / "New request to Amara" | grep `Start a different job with` | B4 |
| CP-C51 | c-thread--masked | KEEP | — | — |
| CP-C52 | c-complete star caption | "Tap a star. Shown on Amara’s profile." → "Tap a star to rate. Reviews show on Amara’s profile as {customerShort}." | m4.js:247 (`'Tap a star'` still matches) | B2 |

### Tailor screens

| ID | Screen / where | Current → Proposed | Expects | Batch |
|---|---|---|---|---|
| CP-T01 | t-home--paused `:59` | "Paused  Turn back on" → "You’re paused, so customers can’t send new requests." + link "Take requests again" | m3.js:130 | B3 |
| CP-T02 | t-home--suggested, t-request--suggested (requestCard countdown) | "24h left" → "24h for Sarah to answer" (pill "Waiting on Sarah" stays) | flows with `'24h left'` on the suggested card | B3 |
| CP-T03 | t-home--in-progress `:43` | "Tailoring · due Fri, Oct 23" → "Tailoring · needed by Fri, Oct 23" | m3.js:127 | B3 |
| CP-T04 | t-request `:121, :123, :125` | "…This job has gone to other tailors." → "…Sarah can now book another tailor." (D-209 #4) | m3.js:170, 172 | B3 |
| CP-T05 | t-request--withdraw sheet `:221` | "Sarah is told right away and her {deposit} hold is released. She can’t accept this time anymore, and can book another tailor." | — | B3 |
| CP-T06 | t-request declined / withdrawn `:140, :123` | "Sarah has been told and her hold released." → "Sarah has been told, and her {deposit} hold is released." | m3.js:163, 224 (`'hold released'` → `'hold is released'`) | B4 |
| CP-T07 | t-request countdown | KEEP (CR-4b changes the layout, not the words) | — | — |
| CP-T08 | t-request--decline sheet | KEEP | — | — |
| CP-T09 | t-suggest--rush-window `:31` | "1-day turnaround · no rush fee on this request" → "1 day before Sarah’s need-by date. No rush fee is added to this request." / "The {rush} rush fee stays as booked." | m3.js:192, 194 | B4 |
| CP-T10 | t-job--no-show sheet `:430` | "It’s {now}, {n} minutes past the start. You’re paid {noShowPay} in total for your time. Sarah’s {deposit} deposit isn’t refunded." | — | B4 |
| CP-T11 | t-job--more `:148` | sub-line "If Sarah isn’t there by 5:15 PM" → "Available from {from} if Sarah isn’t there" | — | B3 |
| CP-T12 | t-job--no-show-done `:52` | "Sarah has been told, and her {deposit} deposit isn’t refunded. You’re paid {noShowPay} for your time." | — | B4 |
| CP-T13 | t-job--cant-make-it-done `:46` | "Sarah has been told and refunded her…" → "We told Sarah and refunded her {refund} deposit. Nothing is paid out for this job." | — | B4 |
| CP-T14 | t-job--cant-make-it sheet | "…Her job stays saved so she can rebook." → "…Her order stays saved so she can rebook." | — | B4 |
| CP-T15 | t-job--fitting `:199` CTA | "Review the order" → "Edit the job" (D-209 #5) | m4.js:274, 276, 279 | B3 |
| CP-T16 | t-job--docs-unsent `:251` | "…Send the updated order so Sarah sees them." → "…Open the order and send it again so Sarah sees them." | — | B3 |
| CP-T17 | t-job--approved `:303` | lead → "Mark it ready when the work is done."; banner keeps "Sarah approved your changes. You take home {payout}." | — | B3 |
| CP-T18 | t-job Timing `:117` | "Due Fri, Oct 23 · in 8 days" → "Needed by Fri, Oct 23 · in 8 days" | m4.js:276, 306 | B3 |
| CP-T19 | t-job--rescheduled `:360` | "Sarah moved this visit to Thu, Oct 15 · 5:30 PM (was 5:00 PM)." | m3.js:280 | B3 |
| CP-T20 | t-job--returning-dropoff `:224` | "Agree a time…" → "Agree on a time…" | — | B3 |
| CP-T21 | t-job `:479, :313` | "Ways back for this order" / "Ways back you offered" → "Return options for this order" / "Return options you offered" | m4.js:321 | B3 |
| CP-T22 | t-job--completed* `:231` | "Sarah’s order, Thu, Oct 15." → "Sarah’s order, completed Thu, Oct 15." | — | B3 |
| CP-T23 | `tailor-data.js:151` failed payout line | "Didn’t go through · sends again once your bank details are updated" → "Sends again once you update your bank details." | m4.js:341, m5.js:101 (`'sends again once'` → `'Sends again once you update'`) | B4 |
| CP-T24 | t-job customer card `:125` | drop the "Customer" label | — | B3 |
| CP-T25 | t-adjust `:295` | "Note to Sarah (optional)" → "Note to Sarah about the whole order (optional)" | — | B3 |
| CP-T26 | t-adjust--leave modal | KEEP | — | — |
| CP-T27 | t-adjust bar note | KEEP | — | — |
| CP-T28 | t-adjust--error | figure caption → "—"; bar keeps "Fix 1 price to see the new total" | — | B3 |
| CP-T29 | t-earnings--failed-and-next `:93` | "…once your bank is fixed" → "…once you update your bank details" | — | B4 |
| CP-T30 | to-payouts--returned `:85` | "Your $147.50 payout came back" / "Chase ••6789 sent it back. …" → "Your {amount} payout didn’t go through" / "Chase •••• 6789 returned it. Update the account below and we’ll send it again on {retryDay}." | m2.js:136, 139; m4.js:339 + common.js:233 (`'sent it back'` → `'returned it'`) | B4 |
| CP-T31 | t-earnings--empty | KEEP | — | — |
| CP-T32 | to-payouts example | KEEP | — | — |
| CP-T33 | t-shop--incomplete `:92, :95` | banner text "Finish your availability so customers can book you again." · action "Finish availability" · drop the preview caption | — | B3 |
| CP-T34 | t-shop `:53` | "Shop on 312…" → "Shop at 312…" | — | B3 |
| CP-T35 | t-shop `:98`, to-done `:61` | "Sample job:" / "Example job:" → "Example:" | — | B3 |
| CP-T36 | t-rush--invalid | KEEP | — | — |
| CP-T37 | t-thread--question `:41` | "Her request will show here when she books." → "The request shows here once {first} books." | grep `Her request will show` | B3 |
| CP-T38 | t-thread no job `:62` | "…once she has sent a request." → "…once they send a request." | — | B3 |
| CP-T39 | to-where `:102, :114` | "Customers come to my shop" / "I visit customers at home" → "Customers come to your shop" / "You visit customers at home" | m2.js:78 | B3 |
| CP-T40 | to-returns `:25` | "How do orders get back?" → "How do customers get their orders back?" | m2.js:100 | B3 |
| CP-T41 | to-returns--none `:38` | "Pick at least one way to get orders back." → "Pick at least one return option." | m2.js:104 | B3 |
| CP-T42 | to-availability lead | "Set your usual week. You have 2 hours to reply to each request." → "Set your usual week." | — | B3 |
| CP-T43 | to-services--none note | add the full stop: "Pick at least one service to continue." | m2.js:62 (still matches) | B3 |
| CP-T44 | to-done | KEEP | — | — |

### Ask Kevin (defaulted, D-209)

| ID | Item | Default taken | Row |
|---|---|---|---|
| CP-A1 | "Usually within the hour" | "Within 2 hours" | CP-C24 |
| CP-A2 | "We’ll let you know when more tailors join" | dropped | CP-C10 |
| CP-A3 | push prompt channel order | "even before our text" dropped | CP-C30 |
| CP-A4 | "This job has gone to other tailors" | "Sarah can now book another tailor." | CP-T04 |
| CP-A5 | "Review the order" vs "Edit the job" | CTA "Edit the job" | CP-T15 |
| CP-A6 | t-phone "about 10 minutes" | KEEP | — |

## 6. Conflicts resolved (K wins)

- **CR-5 half-width photo columns** vs K-04's t-adjust exception: not applied (D-208).
- **K-02 Before | Pinned tabs on the read-only card** vs K-04: K-04 is later and replaces them with the inline stack; the tabs move into the viewer (D-207).
- **CP-S04 by-line** and **CR-m3 t-home summary** each proposed a second "·": K-03's one "·" per line wins (D-210).
- **CLAUDE.md `.body` padding-top 128** vs K-04's "the large gap goes": K-04 wins, `--body-top` 116 (D-204).
- **Critique "Questions for Kevin"**: scope (b) all items, c-complete (a), tone (a). K-04 says apply all.

## Batches

Each batch: edit → `npm run check` (sequential steps) → fix → re-baseline the keys it changed (list them) → structured JSON back.
Shared-file rules are relaxed for these batches (each batch is the only writer while it runs), but a batch never touches another
batch's items.

- **B1 · Shared layout + components + system**: K4-1, K4-2, K4-3, K4-4 (head), CR-1a, CR-2, CR-4a, CR-6a, CR-6b, CR-6e, CR-7,
  AU-P1-1, AU-P1-2a/b/c, AU-P2-1, AU-P2-2, AU-P2-3, AU-P2-4 (dvh + sticky head), AU-P2-5, AU-P2-6, AU-P3-2, AU-P3-4, AU-P3-5,
  AU-P3-6, DR-1, DR-2, DR-3. Re-baseline: all.
- **B2 · Customer screens**: CR-1b, CR-3, CR-m1, CR-m5, AU-P2-4 (c-welcome fold), CP-S07, CP-C02, C04, C05, C07, C09, C11, C12, C13,
  C16, C17, C21, C22, C23, C24, C27, C28, C30, C31, C32, C39, C41, C42, C43, C45, C46, C47, C48, C49, C52.
- **B3 · Tailor screens**: CR-4b, CR-4c, CR-5, CR-m3, CR-m4, AU-P3-1, CP-T01, T02, T03, T04, T05, T11, T15, T16, T17, T18, T19, T20,
  T21, T22, T24, T25, T28, T33, T34, T35, T37, T38, T39, T40, T41, T42, T43.
- **B4 · Shared copy** (components, info sheets, toasts, errors, status words, glossary, rush, money ownership): CR-6c, CR-6d, CR-m2,
  CP-S01..S06, S08..S15, S17, S18, CP-C06, C08, C10, C14, C15, C18, C19, C25, C26, C29, C33, C34, C35, C36, C37, C38, C50,
  CP-T06, T09, T10, T12, T13, T14, T23, T29, T30.
- **B5 · Leftovers + docs + final gate**: AU-P3-3, AU-pat-2, DR-4, DR-5, a grep sweep (no "job" on customer screens, no
  "deposit is kept", no "charged when ready", no "turnaround", no "•• " short mask, no `--bottom-border`), screenshot spot check of
  the K-04 layouts (c-booking--docs, t-job--docs, c-price-change--docs, t-adjust, c-job, c-addresses), PROGRESS.md, final
  `npm run check`.
