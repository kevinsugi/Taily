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

## Round 2 — started Sep 9 2026, 22:40 (code-only round; Figma sync is round 3)

Baseline: `3191d79`. A third agent built `scripts/clickthrough-sync.mjs` (372 cross-persona
assertions, wired into `npm run check`): 369 PASS, **3 genuine FAILs** (logged as R2-S-01…03).

### User flow — director verdict: NOT YET
Report: scratchpad `round2/user/user-flow-review.md`. Round 1 verification: 18 PASS, 2 PARTIAL
(R1-U-08 — literal "July 12" note + July handoff dates → R2-U-02; R1-U-16 — first back after a
modal confirm is swallowed → R2-U-01). Director's summary: fixes hold and the money trail is
consistent on seed, fresh and three-garment orders; blocked by a new P0 (scroll lock after
03.2 / 05.1 / 03.1 confirms) and by the unbuilt end-state branches.

### Tailor flow — director verdict: NOT YET
Report: scratchpad `round2/tailor/tailor-flow-review.md`. Round 1 verification: 14 PASS, 1
PARTIAL (R1-T-01 — withdrawing a fresh request resurrects the seed → R2-T-01). Director's
summary: the mirror works on seed and fresh bookings, the editor is real, chat is right both
ways; blocked by the two-`mine` defect, transitions acting on the customer's `currentAppt`,
and the three missing branches. Flow chart `263:6457` still lacks the approval gate and a
suggest-time edge (End state is authoritative).

| ID | P | Finding (short) | Decision | Reason / scope |
|---|---|---|---|---|
| R2-U-01 | P0 | 03.2 / 05.1 / 03.1 confirms navigate without closing the overlay: page stays `overflow:hidden`, next back swallowed | **ACCEPT** | `close()` before `go()`; `render()` closes any active overlay synchronously; never capture a `hidden` previous overflow; click-through asserts scrolling after each |
| R2-U-06 / R2-T-01 / R2-S-03 | P1 | Two `mine` appointments: fresh booking hides the confirmed job, cancellation invisible to the tailor, seed resurrected as a phantom request | **ACCEPT** | Tailor side becomes a LIST (`jobs(s)`), per-appointment tailor state (`a.tailor = {requestHandled, expiresAt, draft, …}`), T02+ take the tapped appointment (`tailorUi.current`); terminal appointments move to `state.past` so both 09 and T01 show them; seed keeps `mine` |
| R2-T-02 | P1 | Transitions act on the customer's `currentAppt`; Send toasts success while doing nothing | **ACCEPT** | `step(from, to, extra, a = apptEntry())`; every transition takes an explicit appointment and returns success; tailor screens pass their job; T05 checks the result before toasting |
| R2-U-04 / R2-T-03 | P1 | Request expiry unbuilt; `expired` crashes 01/09 | **ACCEPT** | `expireAppointment(a)` wired to the T01 tick + demo taps (T01 timer strip; 03/Requested "2 hours" line = time passes); `expired` pill/card/03-Cancelled variant "Request expired" + `Send Request Again`; T01 "Expired · request lapsed" row. Figma sync pending: T01 expired card, 03/Cancelled expired copy |
| R2-U-03 / R2-T-04 | P1 | Suggest another time unbuilt on both sides | **ACCEPT** | `proposeTime(a, when)` (status stays searching, `a.proposed`), `acceptProposedTime(when, a)`, `declineProposedTime(a)`. Marco: T03A "Schedule conflict" row opens the 02.1 wheel (next 7 days); T01 request card "Time proposed · … — waiting for Sarah" + Withdraw. Sarah: 03/Requested `new-times` hero "Marco proposed a new time" + `Accept New Time` / `Keep Looking` (+ cancel line), card meta + `Review Time`; demo tap on the 03/Requested pill = Marco proposes tomorrow 11 AM. Figma sync pending: T03A variant, 03/Requested-proposed, T01 proposed card |
| R2-U-05 / R2-T-05 | P1 | No-show / tailor-side cancel unbuilt | **ACCEPT** | `tailorCancels(a, reason)` (`cant-make-it` / `no-show`, `cancelledBy:'tailor'`); T03 pre-visit tertiary CTA opens a modal with two radio rows, then T03B per reason; user 03/Cancelled "Marco had to cancel" / "We missed you at …" + `Find Another Tailor`; cards "Cancelled by Marco" / "Missed appointment". **Fee rule defaulted to no charge (hold released) — Kevin's call.** Figma sync pending: T03 CTA + modal, T03B / 03-Cancelled variants |
| R2-U-02 | P1 | Handoff windows hard-wired to Jul 16/17; "July 12" literal note | **ACCEPT** | `handoffWindows(a)` from `readyAt` to `needBy` (seed still Thu Jul 16 / Fri Jul 17, frames unchanged); dated window labels on 05.1 / card / hero; note "All details confirmed on ${fmtDay(a.when)}" |
| R2-U-07 | P2 | Declined request shown as "Appointment Cancelled", no next step; terminal orders vanish from 09 | **ACCEPT** | Terminal entries move to `state.past` (from the mirror fix); 03/Cancelled title/body per reason (declined / expired / customer / tailor / no-show) + `Send to Another Tailor` (re-request with copied garments). Figma sync pending: 03/Cancelled variants |
| R2-U-08 / R2-S-01 / R2-S-02 | P2 | Cards keep the booking-time item count after the final order | **ACCEPT** | `refreshItemSummary(a)` called by `writeFinalOrder` / `draftFinalOrder`; seed keeps frame copy until revised |
| R2-U-09 | P2 | 02's photo "+" tile is inert | **ACCEPT** | Tap adds a placeholder photo (WithPhoto look), ✕ removes |
| R2-U-10 | P2 | Seed past bookings open a contradictory summary | **ACCEPT** | Coherent seed-past facts; `receiptDates()` falls back to the appointment's own day; one name for review sheet/toasts |
| R2-U-11 | P3 | Live tailoring state still leads with Add to Calendar | **ACCEPT** | Live primary `Message Marco`. Figma sync pending: 03/Tailoring CTA bar |
| R2-U-12 | P3 | Toast survives the persona flip | **ACCEPT** | `render()` clears `.toast` on persona change |
| R2-T-06 / R2-S-04 | P2 | T03B literal copy; withdrawn request shown as a closed job | **ACCEPT** | Live copy from state; withdrawn: "Request withdrawn." + T01 pill "Withdrawn", no payout |
| R2-T-07 | P2 | T07 / T06 assert a Jul 17 pickup before the customer chose | **ACCEPT** | Live "waiting for Sarah to schedule" state, `Message Sarah` primary, Mark Picked Up = recorded demo ("Demo: Sarah chose pickup now"). Figma sync pending: T07 waiting variant |
| R2-T-08 | P2 | Removal marks slip by index; removals invisible to the customer | **ACCEPT** | Stable garment `id`s; `orderMarks` by id; `a.removed` rendered on T05 and 04 ("Removed at the visit — …") |
| R2-T-09 | P2 | Request Changes leaves no trace for the tailor | **ACCEPT** | 04.1 Sounds Good runs `requestChanges(a)` and opens chat with a canned bubble; T06 line + `Message Sarah` primary; T01 "Sarah has questions"; approval clears |
| R2-T-10 | P3 | Status label drift (chat pill, delivery jobs) | **ACCEPT** | Tailor chat pill from `jobView`; "Ready for Delivery"; chat ready subline from `fulfilment.date` |
| R2-T-11 | P3 | Browser back after Accept re-offers Accept | **ACCEPT** | Accept renders T03 with `replace`; T02 for a confirmed job shows inert `Accepted` |
| R2-T-12 | P3 | Tailor page M1 frame is the customer view; TM1 node gone; no harness cover for the tailor chat | **DEFER to round 3** | Figma sync round: edit `570:8782` to the tailor view, export `ref/t10-messages.png`, register a `t10-messages` route. End state's TM1 reference now means `570:8782` |

Opportunities logged: payment-failure / modify-request chart branches (scope decision for
Kevin); three handoff days; customer-side acceptance countdown; decline reason shown to the
customer; measurement photos at tailoring; Calendar day list; toggle landing on the mirrored
screen; "Done today" row on T01.

### Round 2 — substrate contract (shared files: one owner, the others code against it)
`js/state.js`, `js/data.js`, `js/components.js`, `css/components.css`, `js/app.js` are owned by
the **substrate implementer** this round. Additive only (state.js stays the v3-ported machine):
- `step(from, to, extra, a = apptEntry())` returns a boolean. `tailorAccepts(a)`,
  `completeAppointment(a)`, `approveOrder(a)` (clears `changesRequestedAt`, stamps `approvedAt`),
  `markReady(a)`, `deliver(a)`, `chooseFulfilment(method, window, date, a)`, `declineAppointment(a)`,
  `cancelAppointment(a | index)` all accept an explicit appointment and return success.
- Terminal transitions (`cancelAppointment`, `declineAppointment`, `expireAppointment(a)`,
  `tailorCancels(a, reason)` with reason `cant-make-it` or `no-show`) set the terminal status,
  `cancelledBy` (`customer` / `tailor` / `none`), `reason`, `cancelledAt`, `wasRequested`, MOVE the
  entry from `state.upcoming` to the front of `state.past`, and set `state.lastCancelled` to it.
  No charge on any of them (hold released); the fee policy is Kevin's call.
- `proposeTime(a, when)`: `a.proposed = { when, by: 'tailor', at }`, status unchanged (searching).
  `acceptProposedTime(when, a)`: `a.when = when`, `a.proposed = null`, status confirmed.
  `declineProposedTime(a)`: `a.proposed = null`, `a.proposalDeclined = when`.
- `requestChanges(a)` stamps `a.changesRequestedAt`.
- Garments get stable `id`s (`addGarment`, seeds, `SEED_FINAL_ORDER`); `refreshItemSummary(a)`
  recomputes `a.count / a.itemLines / a.items` from `a.garments` (called by whoever writes them).
- `data.js`: `handoffWindows(a)` (two days from `readyAt`, capped at `needBy`; fixture fallback so
  the seed still yields Thu Jul 16 / Fri Jul 17); coherent `SEED_PAST` facts (R2-U-10).
- `components.js`: `PILL_VARIANTS.expired` (declined styling, label "Expired"); `cardStatus` treats
  expired / cancelled / declined as terminal; `statusHero` `new-times` variant usable; overlay
  lifecycle fix (R2-U-01) with `closeOverlay()` called from `render()`; toast cleared on persona change.
- Screen owners: user cluster = `js/screens/0*.js`, `scripts/clickthrough.mjs`,
  `scripts/text-parity.mjs`; tailor cluster = `js/screens/t*.js`, `js/tailor-*.js`, `css/tailor.css`,
  `js/screens/10-messages.js`, `scripts/clickthrough-tailor.mjs`. `scripts/clickthrough-sync.mjs` is
  extended afterwards by a fourth agent.

### Figma sync pending ledger (opened round 2, applied in round 3)
| Screen | Frame | Change |
|---|---|---|
| t01-home | 455:3560 | Expired row ("Expired · request lapsed"); "Time proposed · … — waiting for Sarah" request-card state; "Withdrawn" job card |
| t02 / t03a | 455:2170 / 449:733 | "Suggest another time" entry (T03A Schedule-conflict row opens the time wheel) |
| t03-request-accepted | 449:714 | Pre-visit view + tertiary CTA "Can't make it / Customer no-show" and its modal |
| t03b-job-cancelled | 449:752 | Variants: tailor-cancelled, no-show, request withdrawn |
| t07-job-ready | 449:847 | "Waiting for Sarah to schedule" variant |
| 03-status-requested | 281:1237 | Proposed-time hero + Accept New Time / Keep Looking |
| 03-status-cancelled | 558:3817 | Variants: declined, expired, tailor-cancelled, no-show + `Send to Another Tailor` / `Find Another Tailor` |
| 03-status-tailoring | 308:3578 | Live CTA bar (Message Marco primary while tailoring) |
| 10-messages (tailor) | 570:8782 | Tailor view of M1 (SC / Sarah Chen / flipped rows / "Message Sarah…") + `t10-messages` route and ref |

### Figma sync pending — rows added by the round 2 implementers
| Screen | Frame | Change |
|---|---|---|
| 03-status-requested | 281:1237 | Proposed state: hero "Marco proposed a new time" + body; `Accept New Time` / `Keep Looking` replace `View All Appointments`; optional live line "Tailors have up to 2 hours to accept your request." |
| 03-status-cancelled | 558:3817 | Variant copy: expired ("Request expired" + `Send Request Again` / `Back to Home`), declined ("Marco couldn't take this request" + `Send to Another Tailor`), tailor-cancelled ("Marco had to cancel" + `Find Another Tailor`), no-show ("We missed you at <when>" + `Find Another Tailor`); refund card and fee rows dropped on those |
| 03-status-tailoring | 308:3578 | Note "…confirmed on July 12." → "…confirmed on Sun, Jul 12."; live CTA bar (Message Marco primary while tailoring) |
| 01-home / 09-bookings | 277:2653 / 277:2804 | Requested card "New time proposed: …" + `Review Time`; terminal card metas "Request expired · no tailor accepted" / "Cancelled by Marco" / "Missed appointment"; Expired pill |
| 05.1-window-confirmed (+ Ready card meta, 03/Tailoring scheduled hero) | 576:9219 | Window labels dated ("Fri, Jul 17 · 4–6 PM") |
| t02-appointment-request | 455:2170 | Live variants "$… \| Accepted" (inert CTA, no Decline) and "$… \| Request Expired" (note + Back to Home); proposal note |
| t03-request-accepted | 449:714 | Tertiary `Can't make it`; modal `t03.1-cant-make-it` ("Can't make this visit?", two radio rows, Confirm / Go Back) |
| t03a-decline-request | 449:733 | Primary reads `Suggest Another Time` when Schedule conflict is chosen; the 02.1 wheel retitled "Suggest another time" |
| t05-confirm-final-pricing / 04-review-approve-modified | 449:809 / 551:6263 | "Removed at the visit — …" rows (c-500, struck price) |
| t06-appointment-status | 473:6324 | Talk-it-over line + `Message Sarah` primary; "Sarah has questions"; ready line "waiting for Sarah to schedule the handoff" |
| t01-home | 455:3560 | Withdrawn / Expired rows without a payout column; "Cancelled · by you" / "No-show"; "Sarah kept her original time"; closed rows sit below the Leo Von filler |

Demo affordances added in round 2 (live only): 03/Requested hero-pill tap = Marco proposes the
day after at 11:00 AM; 03/Requested "Tailors have up to 2 hours…" line tap = time passes (expiry);
T01 request-card timer-strip tap = time passes; T07 waiting state's secondary `Mark Picked Up` =
"Demo: Sarah chose pickup now". Fee policy on tailor cancel / no-show defaulted to **no charge** —
Kevin's call.

### Round 2 — results (Sep 9 2026, 23:55)
Code-only round; four agents (substrate, user screens, tailor screens, integration).
- **Accepted items:** 26 of 27 DONE (every ACCEPT row above); R2-T-12 deferred to the round 3
  Figma sync as planned. Substrate contract delivered as specified (explicit-target transitions,
  terminal → `state.past`, proposed time, expiry, tailor cancel / no-show, request changes,
  garment ids + `refreshItemSummary`, `handoffWindows`, coherent seed-past facts, `expired` pill,
  overlay lifecycle fix, toast cleared on persona flip).
- **Branches built code-first:** suggest another time, request expiry, tailor cancel / no-show,
  request-changes trace, removal marks — on both personas, with demo affordances (listed above).
- **Harness:** `npm run check` ALL PASS — diff 37/37 at baseline (no `--accept` needed: every
  change is live-only, fixtures unchanged), text parity (no new ALLOWs), click-through ~85,
  tailor click-through 153, **sync click-through 768 assertions** (repaired for the derived
  handoff windows and extended to the new branches), style hygiene — 299 s.
- **CLAUDE.md** gained the "UX-LOOP round 2" notes (mirror model v2, transitions, branches, dates,
  overlay lifecycle, demo affordances).
- **Figma sync pending ledger:** 9 rows from triage + 11 rows from the implementers — applied in
  round 3.
- **Deferred to Kevin (new):** fee policy on tailor cancel / no-show (built as no charge); T03A
  "Other" textarea; a real reschedule path; the "2 hours to accept" line on the 03/Requested frame.
- **Noticed, not changed:** `state.ui.window` is shared across appointments; browser back from
  03/Cancelled after a 03.1 confirm lands on the cancelled entry's 03/Confirmed; no-show title
  wraps at serif-28; delivered jobs stay under Active Jobs on T01.

## Round 3 — started Sep 10 2026, 00:05 (Figma sync round + reviews)

Baseline: `249afc0`. A Figma-sync agent is applying the 20-row ledger (text edits + sibling
frames for the new states, fixture routes, refs, baselines) while both directors review the
live prototype.

### User flow — director verdict: NOT YET
Report: scratchpad `round3/user/user-flow-review.md` (192 shots). Round 2 verification: **14/14 PASS**
(R2-U-01…12 + customer halves of R2-T-08/09). Director's summary: the End state's three branches
are real on both sides and tell the same story; what remains are two P1s the new branches and the
mirror model exposed (03/Requested renders the booking form, not the appointment, and the Home
selection survives Request Tailor; proposed times are not bounded by the need-by date) and four
P2s. All code-only, S effort; one more round should reach SIGN-OFF.

### Tailor flow — director verdict: NOT YET
Report: scratchpad `round3/tailor/tailor-flow-review.md` (97 shots). Round 2 verification: **15/15 PASS**
(R2-T-01…11, R2-S-01…04). Director's summary: the whole day runs T01 → T08 with no dead click;
blocked by the same need-by hole (P1) and four contained P2s; fix them and the tailor side is
ready to sign off.

| ID | P | Finding (short) | Decision | Reason / scope |
|---|---|---|---|---|
| R3-U-01 | P1 | 03/Requested renders the booking form (`state.garments/appt`), not the appointment; Home selection survives Request Tailor (duplicate request one tap away) | **ACCEPT** | 03/Requested meta rows read the appointment (fixture via `isFixture()`); `requestTailor()` clears `state.garments` + `ui.homeSelection` once the appointment owns them |
| R3-U-02 / R3-T-01 | P1 | A proposed time is not bounded by need-by on either side; accepting it puts `readyAt` before the visit | **ACCEPT** | `proposalDays(a) = dayRows(a.when, a.needBy)` (7-day fallback only when need-by missing); `proposeTime` returns false when the day is after need-by (T03A toasts "That's after Sarah's need-by date"); customer demo caps at need-by; new-times hero names the need-by; sync assertion added |
| R3-U-03 | P2 | 01 always renders `upcoming[0]`: delivered order under "Upcoming", terminal outcomes silent on Home | **ACCEPT** | Home card = soonest live entry; today's `lastCancelled` (mine) renders its terminal card above it once; fallback to the most recent delivered entry when nothing is live. Frame fixture unchanged |
| R3-U-04 | P2 | 01 card's Leave Review is dead | **ACCEPT** | Pass 09's handler with the `a.review` guard |
| R3-U-05 | P2 | Back after cancelling shows the cancelled entry as "Appointment Confirmed" with a live Reschedule / Cancel | **ACCEPT** | 03/Confirmed, Reminder, Tailoring adopt 03/Requested's terminal guard; terminal navigations use `replace` so the dead status screen leaves the stack |
| R3-U-06 / R3-T-05 | P2 | Tailor-cancel / no-show say "nothing was charged — hold released" on a paid deposit; the Can't-make-it modal states no consequence; no-show offered days before the visit | **ACCEPT** | Confirmed bookings: "Your $12 deposit is refunded to <method>" on 03/Cancelled and "her deposit is refunded" on T03B (hold wording only for never-confirmed requests); modal gains a consequence line per selected radio and a reason-specific confirm label; no-show row gated on the visit time (seed's Jul 12 counts as today). Ledger rows updated |
| R3-U-07 | P3 | Card nits: matching note under a proposal; bare Declined meta; live date grammar | **ACCEPT** | Skip the note when proposed; "Declined by Marco"; live cards use `fmtWhen`, seed keeps the frame string |
| R3-U-08 | P3 | No-show title "We missed you at <timestamp>" wraps mid-token | **ACCEPT** | Title "We missed you", timestamp moves to the body; ledger row updated |
| R3-U-09 | P3 | "Ready since: <tomorrow>" | **ACCEPT** | Future `readyAt` → "Ready · pickup from <day>" |
| R3-T-02 | P2 | Proposal sub-state leaks: Withdraw attributed to Sarah; T02 Accept books the original time while proposed; expiry-while-proposed blames "no tailor" | **ACCEPT** | `declineProposedTime(a, by)` ("You withdrew your proposed time"); T02 while proposed: `Withdraw Proposal` primary + Decline, no Accept; `a.lapsedProposal` on expiry → customer copy "Marco proposed … but the request lapsed before you answered" |
| R3-T-03 | P2 | T01 "Active Jobs" mixes open, completed and closed rows; same-day requests indistinguishable | **ACCEPT** | Partition: New Requests / Active Jobs (confirmed → ready + Leo) / "Done today" (delivered, then cancelled / withdrawn / expired, muted `closed` card variant); request cards gain "$108 · 1 item" style discriminator. Ledger: the `t01-home-closed` frame gets the "Done today" section row |
| R3-T-04 | P2 | Payout date "Mon, Jul 20" and order id `TLY-2026-4417` are literals on every job | **ACCEPT** | `payoutDate(a)` = handoff day + 4 rounded to a weekday (seed still Mon, Jul 20); `a.orderId` per appointment (seed keeps 4417; fresh bookings increment) shared by 06 / 03-Summary / T08 |
| R3-T-06 | P3 | Calendar tab opens a completed job over a confirmed visit; T03B View Calendar = Back to Home | **ACCEPT** | `primaryJob` excludes delivered; View Calendar behaves like the tab |
| R3-T-07 | P3 | T04 "Contact Taily Support" is a toast outside the allow-list | **DEFER (default kept)** | Support has no destination in scope; treated as an out-of-scope area with an honest toast — Kevin to confirm or ask for a canned support chat |

Opportunities logged: need-by shift on accepting a later proposal (= the deferred real
reschedule); Home outcome banner; decline reason shown to the customer; single-day handoff
collapses into the CTA; live countdown on 03/Requested; "Sarah accepted your time" toast;
Message Sarah on T02 before accepting; closed rows dismissable; per-booking order number.

### Round 3 — Figma sync applied (Sep 10 2026, 00:45)
All 20 ledger rows applied; the ledger is **cleared** except one BLOCKED item.
- **Text edits in place:** 03/Tailoring `308:3578` (note "Sun, Jul 12", CTA bar `Message Marco` primary; 03.3's backdrop clone matched); TM1 `570:8782` is now the tailor view ("TM1 - Message Customer") — the End state's TM1 reference is `570:8782`, keyed `t10-messages`.
- **New sibling frames (duplicates of their base, placed at the right end of the stage row, instances and variable bindings intact, no new tokens)** with fixture routes and seeded baselines: `03 - Order Status / Expired` 608:2338, `/ Declined` 608:2434, `/ Tailor Cancelled` 608:4333, `/ No-Show` 608:4433, `/ New Time` 609:2594; `04 - Review & Approve / Removed` 609:2649; `05.1 - Window Confirmed / Dated` 609:2779; `09 - Bookings / Closed Cards` 609:4676; `T01 - Home / Closed Rows` 611:4243; `T02 - Appointment Request / Accepted` 609:4983, `/ Expired` 609:5032; `T03 - Upcoming Visit` 610:3963; `T03.1 - Can't Make It` 612:4397; `T03A - Decline Request / Suggest Time` 609:5082; `T03B - Job Cancelled / By You` 609:5126, `/ No-Show` 609:5156, `/ Withdrawn` 609:5186; `T05 - Confirm Final Pricing / Removed` 610:4088; `T06 - Appointment Status / Sarah Has Questions` 610:4205; `T07 - Job Ready / Waiting` 610:4283. Routes live in `js/fixtures.js` + 21 one-line modules; base deep links unchanged; persona gate now `/^t\d/`.
- **Harness:** 58 screens diff-gated; `npm run check` ALL PASS (317 s). Text parity: dead `04-review-approve-modified` ALLOW removed; two documented inherited ALLOWs added (`03-status-new-time`, `05.1-window-confirmed-dated`).
- **BLOCKED (Kevin):** the Appointment Card `Status=Requested` variant has no Actions slot, so `09 - Bookings / Closed Cards` cannot show the `Review Time` CTA the code renders — baseline sits at 8.08 until the variant gains an Actions row.
- **For Kevin:** the new 03 variants hug their content (784–820 tall); the frames sit at the far right of their rows; live-only states still without a frame: 03/Tailoring scheduled / ready / delivered heroes and the dated Ready card meta, the T03A wheel title. Pre-round-2 `- $20` / `7:00PM` ALLOWs (6 frames) remain — a cheap follow-up sync if wanted.

### Round 3 — results (Sep 10 2026, 01:20)
- **Accepted items:** 13 of 13 DONE (R3-U-01…09, R3-T-01…06); R3-T-07 deferred (Support toast
  treated as out-of-scope — Kevin to confirm). Substrate additions: `proposalDays(a)`,
  `isAfterDay`, `payoutDate(a)`, `nextOrderId()` / `a.orderId`, `proposeTime` refuses dates after
  the need-by day, `declineProposedTime(a, by)`, `expireAppointment` stashes `lapsedProposal`,
  `requestTailor` clears the booking form and Home selection.
- **Customer:** 03/Requested reads the appointment; proposals bounded on both sides with the
  need-by named in the hero; Home shows today's terminal outcome once above the live card and
  falls back to "Recent Appointment"; 01 Leave Review live; terminal guards on every 03 view +
  `replace` navigation so back never lands on a spent status screen; refund wording on
  tailor-cancel / no-show for confirmed bookings; card grammar nits; "Ready · pickup from …".
- **Tailor:** T03A wheel bounded (+ no-slot line, refusal toast); Withdraw attributed to Marco;
  T02 while proposed = Withdraw Proposal / Decline; Expired row names an unanswered proposal;
  T01 partitioned into New Requests / Active Jobs / Done today (closed rows muted, no payout;
  request cards "$108 · 1 item"); `payoutDate` + `orderId` on T06/T08; Can't-make-it modal with
  a consequence line, reason-specific confirm and a time-gated no-show row; T03B refund copy;
  Calendar prefers open jobs; View Calendar = the tab.
- **Figma (round 3 frames only):** 03 Tailor Cancelled / No-Show bodies + fee rows, 09 Closed
  Cards note, 03 New Time body, T01 Closed Rows "Done today" section, T03.1 consequence line +
  "Cancel Job", T03B By You / No-Show bodies. Refs re-exported; baselines re-accepted for
  `09-bookings-closed` (8.28, still the BLOCKED Review Time row), `t01-home-closed` 1.29,
  `t03.1-cant-make-it` 3.62, `t03b-by-you` 5.05, `t03b-no-show` 4.65.
- **Harness:** `npm run check` ALL PASS (340 s): diff 58/58, text parity, click-through, tailor
  click-through 174, **sync click-through 796**, style hygiene.
- **Figma sync pending ledger:** empty (BLOCKED item carried: Appointment Card Requested
  variant needs an Actions row for `Review Time`).
- **Noticed, not changed:** Home picks the live card by list order (a date sort would reorder the
  seed fixture); 03/Reminder reached by browser back after an appointment happened is a stale
  non-terminal screen; T03A's sub is 12px where the frame draws 14 (pre-existing).
