# UX-LOOP — director review → triage → revise, until both flows sign off

Started Sep 9 2026 by Kevin's request: "Create a loop that uses agents to test both the
Taily - User Flow and Taily - Tailor Flow after each round of revisions, suggest changes,
think about the changes, and then action on that. Keep looping until the flow is completely
done. The reviewer agent should act as a UX Design director."

This file is the loop's contract and its running log. Each round appends a section below.

## What is under review

| Flow | Where it lives | How it is tested |
|---|---|---|
| User flow | `js/screens/0*.js`, `1*.js` (27 screens, committed); Figma page "User - Main Flow 2" `277:2636` | Live prototype at `http://127.0.0.1:4173` driven by Playwright (390×844), plus Figma frame screenshots when intent needs checking |
| Tailor flow | `js/screens/t*.js`, `js/tailor-*.js`, `css/tailor.css` (Phase T fast build, in progress in the "Taily - Tailor Flow Proto" session); Figma page "Tailor - Main Flow 2" `445:1491` | Same prototype via `?screen=t01-home` deep links, plus the Figma frames and the flow chart `263:6457` on page "Flow 2" |

Both flows render ONE appointment (`state.upcoming[0]`): Kevin/Sarah's Jul 12 visit with Marco.
Cross-persona consistency (dates, money, names, statuses) is part of every review.

## Roles per round

1. **Reviewer — UX Design Director** (one agent per flow, run in parallel, read-only).
   Walks the whole journey as the intended user, scores each stage, and returns findings
   with stable IDs `R{round}-U-##` / `R{round}-T-##`, priority P0–P3, evidence, a specific
   recommended change, and where the change lives (Figma / code / both). Ends with a verdict:
   **SIGN-OFF** (no open P0–P2) or **NOT YET**. Round N+1 also re-verifies everything round N
   marked DONE.
2. **Triage — orchestrator ("think about the changes").** Every finding gets exactly one
   decision, logged with a reason:
   - **ACCEPT** — P0/P1 always; P2 when contained (≤ M effort) and needing no new product
     decision; P3 when trivial and batched.
   - **DEFER** — needs a call only Kevin can make (anything listed in CLAUDE.md as "awaiting
     Kevin's call" or in the decisions register below), needs a backend/real data, or is a new
     feature (goes to the Opportunity list).
   - **REJECT** — contradicts a recorded Kevin decision, or is taste rather than evidence.
3. **Implementer** (one agent per flow, or per independent cluster). Applies ACCEPTED items only.
   Figma is the source of truth: visual/copy changes go to Figma first (via `use_figma`, loading
   the `figma-use` skill), then code, then `npm run refs` → `npm run diff -- <id> --accept` for the
   intended screens → `npm run check` green. Behaviour-only changes need no Figma edit. If Figma
   cannot be edited, the item is logged **BLOCKED (Figma)** with the exact proposed edit and the
   code is left alone — never diverge silently.
4. **Verify + commit.** `npm run check` must be green. Commit only the files the round touched
   (explicit paths, never `git add -A`), message `ux-loop: round N — …`. No push.

## Guard rails

- **Quiet-tree gate.** Another session may be editing this repo (the tailor fast build). The loop
  does not write to any tracked or untracked source file until no file under `js/`, `css/`,
  `scripts/`, `index.html` has changed for 3 minutes and the "Taily - Tailor Flow Proto"
  session reports not running. Reviews (read-only) may run at any time.
- The harness enforces Figma pixel/text parity; reviewers do not report pixel deviations, and
  CLAUDE.md's "Known Figma inconsistencies" are already raised — do not re-report them.
- Demo affordances (map tap = tailor accepts, 04D order tap = tailor finishes, etc.) are intentional.
- Nothing in `tokens.css` changes inside this loop.

## Kevin's standing decisions (do not re-litigate)

- UX-005 (visible keyboard focus rings) — **rejected**: mobile web, the system keyboard handles it.
- UX-008 (07A/07B "Select Delivery/Pickup" wording) and UX-012 (PV3 stage caption) — **deferred**.
- UX-009 selector option rows stay ~36px (taller rows change the menu's Figma look).
- Deposit row reads `-$20` unspaced; Jul 12 fiction; "Sarah" is the customer name on the tailor
  side, "Kevin" on the user side (design fiction, deliberate); Leo Von is filler.
- 03's map is a placeholder until a live map lands; 05A/05B interactivity diverges from the
  frames on purpose; 02's deposit renders the honest $24.
- Items marked "awaiting Kevin's call" in CLAUDE.md (20px serif headers, 02B scrim 0.6, grabber
  width, photo-tile gradient literal, squished pills) stay as built.

## End state (Kevin, Sep 9 2026 — supersedes the original stop criteria)

The loop finishes when **the full flow and all interactions are complete and synchronized for
both the user and tailor flow**, defined as:

1. **Complete — scope.** Every existing Figma frame is built: the 27 user screens/overlays and
   the 11 tailor frames (TM1 `449:771` included), PLUS the flow chart's branches that have no
   frame yet, built code-first: suggest another time (chart "suggest another time → 02A"),
   customer no-show / tailor-side cancel, and request expiry (`expireAppointment()` exists).
   Placeholder frames for those are logged for a Figma sync. Out of scope: onboarding
   00a–00d, the Calendar day list, Shop setup.
2. **Complete — interactions.** Every control on an in-scope screen does something real and
   state-backed. Controls that lead to out-of-scope areas (Profile, Shop, Calendar, View All,
   Add to Calendar) may keep an honest toast.
3. **Synchronized.** One appointment, two personas, every transition visible on both sides.
   Verified by an automated cross-persona click-through (`scripts/clickthrough-sync.mjs`, to be
   written in round 2) covering: book → tailor accepts / declines → pre-visit → visit edit →
   send → customer approves / requests changes → tailoring → ready → handoff (pickup and
   delivery) → complete → review, plus customer cancel (before and after acceptance), suggest
   another time, no-show and expiry. It runs inside `npm run check`.
4. **Quality gate.** Both UX Design Director reviewers return SIGN-OFF in the same round (no open
   P0–P2; P3 may be deferred to Kevin), after verifying the previous round's fixes, and
   `npm run check` is green.

Safety stop: after round 12, or two consecutive rounds with nothing ACCEPTED, the loop stops
and reports instead.

## Figma cadence (Kevin, Sep 9 2026 — to save credits)

- Figma is written **every 3rd round (3, 6, 9 …) and once more as a final sync** before the loop
  ends. Round 1 ran Figma-first (already in flight when the rule changed).
- Between syncs, frame-visible changes land in code only. Each is logged in the round's
  **Figma sync pending** ledger (screen id, node, old → new), the screen's diff baseline is
  accepted with `pending-figma` in the round log, and text parity gets an ALLOW entry that
  references the ledger. Nothing diverges silently — the ledger is the record.
- A sync round pushes every ledger entry into Figma (loading `figma-use` once), re-exports
  refs, re-accepts baselines back down, and clears the ledger and the temporary ALLOWs.
- Reviewers judge the live prototype; they consult Figma only when intent is unclear.

---

# Round log

## Round 1 — started Sep 9 2026, 21:24

Baseline: `feat/v4-scaffold` @ b4f7a2e, `npm run check` green (27 user screens). The tailor fast
build (t01–t08, refs, tailor click-through, persona toggle) arrived uncommitted from the
"Taily - Tailor Flow Proto" session during this round.

### User flow — director verdict: NOT YET
Full report: scratchpad `round1/user/user-flow-review.md` (+ drivers, logs, ~60 screenshots).
Director's summary: the state machine is real and the structure is sound, but a first-time
customer cannot finish the journey by tapping (nothing leads to the day-before confirmation),
and the prototype tells two stories at once — the live order the user built and the Jul 12/$360
fixture — which contradict each other at the trust moments (deposit, balance, dates, visit type).

| ID | P | Finding (short) | Decision | Reason / scope |
|---|---|---|---|---|
| R1-U-01 | P0 | No route to 03/Reminder after the tailor accepts | **ACCEPT** | Code-only demo affordance: tapping the tailor summary card on 03/Confirmed = "the day before arrives" → 03/Reminder; document in CLAUDE.md's demo list |
| R1-U-02 | P1 | Money contradicts itself along the default path (fixtures vs live order) | **ACCEPT** | (1) 02 seeded cards → Hem $120 + Sleeve $80 (drop `$55` placeholder) so the default order = the $200/$20 fiction, Figma 02 frame edited to match; (2) 03/Confirmed, 03/Reminder, 03/Summary, 03/Cancelled, 05a, 05b render from the live appointment like 03/Tailoring and 06 do; (3) Approve on 04 writes the approved $360 order into the appointment; (4) money formatted to whole dollars or two decimals. Harness deep links keep the frame fixtures. Same pattern Kevin approved in UX-002/003 |
| R1-U-03 | P1 | Deposit story told three ways, worst at cancel | **ACCEPT (scoped)** | Treat the deposit as a *hold* (compatible with 02.3's "charged when your tailor confirms"): keep 03/Requested's "deposit held"; 03.1 cancel mode says the hold is released; 03/Cancelled for a never-confirmed request shows pill **Cancelled**, no Paid/Balance rows, "Nothing was charged — the hold on your card is released"; for a confirmed cancellation the refund line names the real pay method from state. Figma text on 03/Cancelled follows |
| R1-U-04 | P1 | 03/Tailoring hero + CTA bar ignore status; approve has no button; centre tap opens 03.3 | **ACCEPT (code-only)** | Status-driven hero title + primary CTA for the LIVE states (awaiting-approval → "Approve your final order." + `Review Final Order`; ready → `Schedule Pickup / Delivery`; scheduled → window + `Change`; delivered → `View Receipt`), plus a `View final order ›` row in awaiting-approval only. The harness's 'confirmed' load still renders the frame's Tailoring fixture unchanged — same precedent as UX-007. Kevin may want frame variants later |
| R1-U-05 | P1 | Visit type never chosen; "Store Visit" paired with the home address everywhere | **ACCEPT** | Commit the fiction to a Home Visit at 88 Leonard St, 4B (the tailor page already says so): seed + `APPT_DEFAULT.where`, card titles "… - Home Visit:", 01/09 frame text edited in Figma. Includes R1-U-22 |
| R1-U-06 | P1 | Card metas reuse the appointment date for every status; Ready card ignores the scheduled window | **ACCEPT** | Code-only: tailoring → need-by, ready → `readyAt` stamped by `markReady()`, scheduled → window + `Change Pickup / Delivery`, delivered → handoff date. Frame fixtures untouched |
| R1-U-07 | P1 | 03/Summary charges $20 delivery on a free-pickup order 06 just settled | **ACCEPT** | Share 06's fulfilment-aware fee rows with 03/Summary |
| R1-U-08 | P1 | Dates drift: rows say **Fri**, Jul 12 (it is a Sunday); 10's header and 06.1's sub carry stale fixtures | **ACCEPT** | One grammar sourced from state (`Sun, Jul 12 · 7:00 PM`, `Need by: Fri, Jul 17`); Figma rows on 03/Confirmed, 03/Reminder, 03/Summary, 03/Cancelled + popup backdrops, M1 header, 06.1 sub corrected to match. Factual correction of the weekday, not a fiction change |
| R1-U-09 | P2 | Reschedule popup promises items copied over, then only cancels | **ACCEPT (code-only)** | Honour the promise: confirming from a confirmed appointment copies its garments into the home selection so Start Booking is one tap away. No new CTA on 03/Cancelled (frame unchanged); a "Rebook" CTA is logged as an opportunity for Kevin |
| R1-U-10 | P2 | Requested state names Marco before any tailor accepted | **DEFER** | Product/fiction call (does the customer see the tailor before matching?) — Kevin's |
| R1-U-11 | P2 | Pickers accept need-by before the appointment and 12:30 AM custom pickups | **ACCEPT** | Code-only validation: need-by wheel starts at the requested date, invalid pill painted `c-error` with helper, Request Tailor inert until valid; custom pickup bounded to ready→need-by, 9 AM–6 PM, sheet titled "Custom pickup time" |
| R1-U-12 | P2 | Start Booking with nothing selected books two placeholder jackets | **ACCEPT (variant)** | No disabled CTA variant exists in Figma, so: stay on 01 with a toast "Pick a garment to start"; placeholders only for harness deep links |
| R1-U-13 | P2 | Delivered order stays in Current Bookings; Book Again wipes it | **ACCEPT** | 09 partitions by status; Book Again clears garments/selection only |
| R1-U-14 | P2 | Review affordances disagree (09 toasts, 06 accepts repeat reviews) | **ACCEPT (variant)** | 09's Leave Review opens the sheet; review stored on the appointment; a second tap toasts "You already reviewed Marco" (no disabled CTA variant) |
| R1-U-15 | P2 | Escape does not close 06.1 | **ACCEPT** | Add `.review-sheet` to the a11y panel selector |
| R1-U-16 | P2 | Browser/OS back exits the prototype | **ACCEPT** | `history.pushState` per render + `popstate` → close overlay or `back()`; must keep `?screen=` deep links working for the harness |
| R1-U-17 | P2 | Confirmed window has no date | **DEFER** | Kevin's pending call from UX-010 (05A/05B CTA copy "4-6PM") |
| R1-U-18 | P3 | Deposit sign missing on 03/Reminder and 03/Cancelled | **ACCEPT** | Kevin's standing rule (`-$20`); Figma + code |
| R1-U-19 | P3 | "1 Items Total" on 09 | **ACCEPT** | Shared singular helper |
| R1-U-20 | P3 | Cancelled/declined cards route to 03/Tailoring | **ACCEPT** | Route → 03/Cancelled |
| R1-U-21 | P3 | 02.4 ✕ abandons the payment flow | **ACCEPT** | ✕ reopens 02.3 |
| R1-U-22 | P3 | 09's first card omits the visit type | **ACCEPT** | Folded into R1-U-05 |
| R1-U-23 | P3 | "Pinned" label clipped to "Pir" | **DEFER** | Kevin-directed clip; reviewer confidence Low |

Opportunities logged (not actioned): real visit-type choice on 02; "what's next" line on
03/Confirmed; elapsed-time on the Requested card; calendar/tip on 05.1/06; status-aware chat
replies; a real reschedule path; a Rebook CTA on 03/Cancelled; moving the persona toggle out of
the phone frame.

### Tailor flow — director verdict: NOT YET
Full report: scratchpad `round1/tailor/tailor-flow-review.md` (+ `shots/`, logs, flow-chart capture).
Director's summary: the tailor screens read well and the happy path T01 → T08 runs without a dead
click, but the tailor side does not tell the same story as the customer's app — a non-seed booking
is accepted at the Sarah fixture's money and date, a customer cancellation leaves a phantom
"Sarah · Ready for Pickup" job and never reaches T03B, Marco's messages land as Kevin's own bubbles,
and the at-visit editor (the tailor's core task) is a static picture of the finished order.
Flow-chart check: the build matches the chart except that the chart lacks the customer-approval
gate (the code's chain is the approved one — the chart is stale) and nothing routes to T03B.

| ID | P | Finding (short) | Decision | Reason / scope |
|---|---|---|---|---|
| R1-T-01 | P1 | Customer cancellation never reaches the tailor; T01 shows a phantom job from the next seed | **ACCEPT** | Code-only: `cancelAppointment()` stashes `state.lastCancelled`; tailor helpers resolve Sarah's job by identity (`mine` tag) not index; T01 renders a Cancelled card → T03B; request card must not return |
| R1-T-02 | P1 | T01 payout / T02 / T03 / T04 render the Sarah fixture regardless of what was booked | **ACCEPT** | Code-only: cards, subtotal, fee, payout, CTA amount and customer rows from the live appointment; the seed keeps the Sarah fiction |
| R1-T-03 | P1 | At-visit editor is static; totals are literals; what is sent never reaches Sarah's order | **ACCEPT** | Code-only (L): T04 starts from the booked order, selectors/add-service/✕/photo tiles/comments work on a draft, fee rows recompute, T05 Send writes the draft back to the appointment before `completeAppointment()`; summaries show captured photos/comments. The build's own note deferred this to "the next round" — this is that round |
| R1-T-04 | P1 | Messages sent as Marco appear as Kevin's own bubbles (and vice-versa) | **ACCEPT** | Code-only: absolute author (`tailor`/`customer`) on every message; side derived per persona; token for the greeting name |
| R1-T-05 | P2 | A confirmed job opens the at-visit editor days early; no pre-visit view or start gate | **ACCEPT (code-only)** | Route confirmed → T03 as the pre-visit view ("Upcoming visit" hero, `Start Appointment` → T04, Message Sarah, back chevron); "Booking Confirmed!" only right after Accept. Frame stays the Accept fixture; a Figma variant is suggested to Kevin |
| R1-T-06 | P2 | Send / Mark Ready give no "what happens next"; T06 offers Mark Ready in ready/delivered | **ACCEPT (scoped)** | Code-only: toast on Send; per-status line under T06's header and per-status primary CTA (ready → `View Handoff Details`, delivered → `View Payout`) for live states; T05's frame sub copy unchanged |
| R1-T-07 | P2 | Back after Send walks the tailor back into the editor and lets him send again | **ACCEPT** | Replace history on Send; T06 chevron → T01; repeat Send toasts "Already sent to Sarah" |
| R1-T-08 | P2 | Decline pre-selects a reason; "Other" has no field; secondary CTA mislabelled | **ACCEPT (scoped)** | No default reason on live loads (harness deep link keeps the frame's selected fixture); Decline with no reason toasts "Choose a reason first"; secondary CTA routes `back()`. The "Other" textarea is a Figma decision — logged for Kevin |
| R1-T-09 | P2 | Read-only order summaries carry a remove ✕, empty add-tiles and a literal "Comment" | **ACCEPT (scoped)** | Figma+code: hide the ✕ on the Appt_View instances on T05/T06/T07/T08 (component stays intact) and drop it in code; captured photos/comments render via R1-T-03, otherwise the drawn add-tile stays |
| R1-T-10 | P2 | Sarah's avatar reads "MT" on T03 and T04 | **ACCEPT** | Figma text → "SC" on both frames; code passes the customer initials |
| R1-T-11 | P2 | T07 ignores the handoff the customer chose | **ACCEPT** | Code-only: when `a.fulfilment` exists, body/When/Where/CTA follow it; otherwise the frame's pickup fixture |
| R1-T-12 | P3 | T02 omits visit type, travel and subtotal | **DEFER** | Kevin's frame design; reviewer confidence Medium |
| R1-T-13 | P3 | T08 "Deposited" tense; disclosure chevron reversed | **ACCEPT** | Figma+code: "Arrives in your account · Mon, Jul 20"; chevron down when closed |
| R1-T-14 | P3 | Request timer never ticks; job-card right slot mixes items and progress | **ACCEPT (timer only)** | Code-only ticking timer from a deadline (first render still reads 1H 24M); the right-slot content is frame design — deferred |
| R1-T-15 | P3 | T03 hero is customer-speak | **DEFER** | Kevin's copy; the pre-visit state (R1-T-05) carries its own live copy |
| R1-T-16 | P3 | Tailor chat subline is a literal | **ACCEPT** | `${a.when} · ${a.visit}`; seed keeps its fiction; ready/delivered variant |
| R1-T-17 | P3 | Persona toggle sits below the fold | **ACCEPT** | Pin `.stage-caption` to the viewport bottom-right, outside `.screen`; confirm the diff harness clips to `.screen` |

Opportunities logged: tailor-side no-show / cancel; request expiry state (`expireAppointment()`
exists); suggest-another-time; directions/buzzer note pre-visit; measurement photos at
tailoring; a real Calendar day list; earnings history. The flow chart `263:6457` should gain
the approval gate.

### Round 1 — implementation plan
Tree quiet and the tailor session idle at 21:47 → gate open. Order: (0) the tailor session committed its own build as `0de3207` at ~21:33 (no snapshot
commit by the loop was needed; `npm run check` was green on it, 5/5 in 74 s);
(1) two implementers in parallel with strict file ownership — **user cluster** owns
`js/state.js`, `js/data.js`, `js/app.js`, `js/components.js`, `css/*`, `js/screens/0*.js`;
**tailor cluster** owns `js/screens/t*.js`, `js/tailor-*.js`, `js/screens/10-messages.js`,
`scripts/clickthrough-tailor.mjs`, and may add ONE additive export to `state.js`
(`lastCancelled`) — coordinated below; both do their Figma edits and verify with scratch
Playwright probes only; (2) one harness pass: `npm run refs` for edited frames → `refs:check`
→ `diff --accept` per intended screen → `npm run check` → commit.

### Round 1 — results (Sep 9 2026, 22:35)
Implementers ran under the original Figma-first rule (the cadence change arrived mid-round).
- **User flow:** 20 of 20 ACCEPTED items DONE (R1-U-01…09, 11…16, 18…22; U-05 includes U-22).
  Figma edited: 02 + 02.1–02.4 backdrops (cards $120 Hem / $80 Sleeve), 01/01a/09 card titles
  (Home Visit), 03/Confirmed·Reminder·Summary·Cancelled rows (Sun, Jul 12 · 7:00 PM), Reminder
  and Cancelled deposit `-$20`, 03.1/03.2/04.1 backdrops, 06.1 sub (Jul 17). Refs re-exported for
  16 frames. Text-parity ALLOW list shrank (STALE_DEPOSIT and two 03/Requested strings gone).
- **Tailor flow:** 15 of 15 ACCEPTED items DONE (R1-T-01…11, 13, 14 timer, 16, 17). Figma
  edited: T03/T04 avatar "SC", Appt_View ✕ hidden on T05/T06 (6 instances), T07/T08 chevrons,
  T08 payout copy, M1 header. Tailor click-through extended to 78 assertions (cancel → T03B,
  pre-visit → Start Appointment, live editing changing totals, Send writing the order, chat
  sides, delivery choice on T07).
- **Harness:** `npm run check` ALL PASS (diff 37/37, text parity, click-through 46, tailor
  click-through 78, style hygiene) — 85 s. Baselines re-accepted for 18 screens (drift ≤ 0.06
  from re-exported refs; t05/t06/t08/10-messages/03-status-tailoring ratcheted down).
- **CLAUDE.md** gained a "UX-LOOP" section (mirror model, fiction, live-only states, router).
- **Figma sync pending ledger:** empty (round 1 was Figma-first).
- **Deferred to Kevin (carried):** R1-U-10 tailor named before matching; R1-U-17 window date in
  05A/05B CTAs; R1-U-23 clipped "Pinned" label; R1-T-12 T02 visit/subtotal rows; R1-T-15 T03
  hero copy; T03A "Other" textarea; T01 job-card right slot; 03/Requested's frame line still
  says "deposit refunded" under the hold model.
- **Noticed, not changed:** `.selector--added .selector__trigger` should be `white-space: nowrap`
  (worked around in tailor.css); lifecycle transitions act on `apptEntry()` rather than the
  `mine` job (wrong entry if the user browses a past booking before switching persona); a fresh
  booking's `depositOn` is stamped from the real date while its appointment date is fiction-year.
