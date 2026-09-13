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

## Round 4 — started Sep 10 2026, 01:25 (code-only round)

Baseline: `a145dbb`, `npm run check` ALL PASS (58 screens, sync 796).

### Tailor flow — director verdict: **SIGN-OFF**
Report: scratchpad `round4/tailor/tailor-flow-review.md` (86 shots). Round 3 verification: **6/6 PASS**.
No P0–P2 open; every End-state branch reaches its tailor screen and its customer screen with the
same facts; no inert control; remaining toasts are on the allowed list or guards. Four P3 polish
notes listed below.

### User flow — director verdict: NOT YET (one P2)
Report: scratchpad `round4/user/user-flow-review.md` (200 shots). Round 3 verification: **11/11 PASS**
(R3-U-01…09 + customer halves of R3-T-02/04). Control sweep: 41 live states, 598 controls, every
toast on the allowed list or a guard; 35 cold deep links error-free. One P2 the round 3 guard
pattern did not cover, plus two P3s.

| ID | P | Finding (short) | Decision | Reason / scope |
|---|---|---|---|---|
| R4-U-01 | P2 | Two back gestures after the visit reach a stale "Appointment Confirmed" whose Reschedule / Cancel cancels a measured, sent order | **ACCEPT** | 03.2 Confirm and the 03/Confirmed tailor-card demo navigate with `replace`; the 03 family guard extends from terminal-only to "not the status this view renders" (post-appointment → 03/Tailoring with `replace`); `cancelAppointment()` refuses post-appointment statuses |
| R4-U-02 | P3 | Refund line names the current pay method, not the one the booking paid with | **ACCEPT** | `requestTailor()` stamps `a.payMethod`; 03/Cancelled, 03.1 and T03B read `a.payMethod ?? state.payMethod` |
| R4-U-03 / R4-T-01 / R4-T-04 | P3 | On the need-by day the proposal wheel offers hours after the need-by time; the "no later slot" line is unreachable | **ACCEPT** | Cap the hour rows on the last proposable day to slots before the need-by time; drop the day when none fit (which makes the no-slot line reachable); `proposeTime` compares datetime when the days are equal |
| R4-T-03 | P3 | A stale T05 reached by browser back guards a cancelled job with the wrong reason | **ACCEPT** | Terminal job check first on T05 Send and T06 Mark Ready: toast "This job is no longer on your calendar" + T01 with `replace` |
| R4-T-02 | P3 | Marco's garment note and captured photos never reach Sarah's cards (her frames have no slot) | **DEFER** | Figma decision for Kevin (note row + photo counts on the customer's PostAppt card); until then the T04 placeholder reads "Note on this garment…" |

Opportunities logged: delivered outcome on Home when another booking is live; per-booking pay
method on the receipt row; per-appointment visit address on T01; order number on the customer's
receipt; "Sarah accepted your time" cue; Message Sarah on T02 before accepting.

### Round 4 — plan
One implementer (both clusters; small, cross-cutting), then `npm run check`, commit. Round 5 is a
verification round: both directors re-verify round 4 and confirm sign-off; if both sign off with
the harness green and the ledger empty, the loop ends (no frame-visible change in round 4, so no
final Figma sync is needed beyond the BLOCKED item carried for Kevin).

### Round 4 — results (Sep 10 2026, 02:05)
- **Accepted items:** 5 of 5 DONE (R4-U-01, R4-U-02, R4-U-03 / R4-T-01 / R4-T-04, R4-T-03, plus the
  R4-T-02 placeholder reword). All live-only; no baseline changes; no Figma edits; ledger stays
  empty (BLOCKED `Review Time` frame gap carried for Kevin; R4-T-02 note/photo slot on the
  customer's card is Kevin's Figma decision).
- 03.2 Confirm and the Confirmed→Reminder demo navigate with `replace`; 03/Confirmed and
  03/Reminder redirect a post-appointment entry to 03/Tailoring; `cancelAppointment()` refuses
  post-appointment statuses (03.1 toasts and closes). `a.payMethod` per booking. Proposal hours
  are capped on the need-by day (`proposalHours` / `proposalMins`, shared `STUDIO_HOURS`); the wheel
  re-rows hours as the day settles; `proposalDays` may return `[]`, which makes T03A's no-slot line
  reachable; `proposeTime` compares the datetime on the need-by day. T05 Send / T06 Mark Ready on a
  closed job toast "This job is no longer on your calendar" and return to T01.
- **Harness:** `npm run check` ALL PASS (357 s): diff 58/58 at baseline, text parity,
  click-through 117, tailor click-through 199, **sync click-through 807**, style hygiene.
- **Round 5 = verification round:** both directors re-verify round 4 and confirm sign-off.

## Round 5 — verification round (Sep 10 2026, 02:10) — **both flows SIGN-OFF**

Tree `3e94aa0`, `npm run check` ALL PASS (357 s; 58 screens, click-through 117, tailor 199,
sync 807). No code changed in this round.

- **Tailor flow — SIGN-OFF holds** (report `round5/tailor/tailor-flow-review.md`, 76 shots).
  Round 4 items 4/4 PASS with evidence; regression sweep 62/62 (seed day + every branch); no
  P0–P2. P3 notes: R5-T-01 back from the replaced T01 reaches the stale T04 editor (guards hold,
  nothing written); R5-T-02 a deep-linked T06 for a closed job draws the Tailoring view under the
  guard.
- **User flow — SIGN-OFF** (report `round5/user/user-flow-review.md`, 95 shots). Round 4 items
  3/3 PASS on the exact paths that found them; 03 family opens and backs cleanly on every status;
  19 cold deep links unchanged; no P0–P2. P3 note: R5-U-01 Approve pushes rather than replaces,
  so back after approving shows a stale 04 (Approve again is a no-op; Request Changes there stamps
  a tailoring order).

## Loop closed — End state met (Sep 10 2026, 02:45)

| Criterion | Status |
|---|---|
| Complete — scope | ✔ 27 user screens/overlays + 11 tailor frames (TM1 = `570:8782` / `t10-messages`) + 21 sibling frames for the new states; suggest another time, request expiry, tailor cancel / no-show built on both personas. Out of scope untouched (onboarding, Calendar day list, Shop). |
| Complete — interactions | ✔ Every in-scope control real and state-backed (user sweep: 41 states / 598 controls; tailor: every screen). Remaining toasts are on the allowed list (Profile, Add to Calendar, View All, Shop, Calendar), guards, labelled demos, or the deferred Support toast. |
| Synchronized | ✔ `scripts/clickthrough-sync.mjs` — 807 assertions inside `npm run check` covering book → accept / decline / propose / expire → pre-visit → visit edit (incl. removal) → send → approve / request changes → tailoring → ready → handoff (pickup and delivery) → complete → review, plus customer cancel (before and after acceptance), tailor cancel, no-show, and two bookings coexisting. |
| Quality gate | ✔ Both directors SIGN-OFF in the same round after verifying the previous round; harness green. |

**Rounds:** 1 (`3191d79`, 35 fixes, Figma-first) · 2 (`249afc0`, 26 fixes, branches + sync
proof) · 3 (`67b1949` Figma sync, `a145dbb` 13 fixes) · 4 (`3e94aa0`, 5 fixes) · 5 verification.
**Figma sync pending ledger:** empty. No push was made (Kevin's call).

### Carried for Kevin
- **BLOCKED (Figma):** the Appointment Card `Status=Requested` variant has no Actions slot, so
  `09 - Bookings / Closed Cards` cannot show the `Review Time` CTA (baseline 8.28 until fixed).
- **Figma decisions:** R4-T-02 note row + photo counts on the customer's PostAppt card; R3-T-07
  Support toast (allow, or a canned support chat); T03A "Other" textarea; the "2 hours to accept"
  line on 03/Requested; the new 03 variants hug their content (784–820 tall) and sit at the far
  right of their rows; pre-round-2 `- $20` / `7:00PM` ALLOWs on 6 frames; the flow chart
  `263:6457` lacks the approval gate and a suggest-time edge.
- **Product calls:** fee policy on tailor cancel / no-show (built as no charge, deposit refunded);
  a real reschedule path (need-by shift on a later proposal); tailor named before matching
  (R1-U-10); dated window in the 05A/05B CTAs (R1-U-17); clipped "Pinned" label (R1-U-23);
  T02 visit/subtotal rows (R3-T-12); T03 hero copy (R3-T-15); "Done today" rows dismissable.
- **P3 leftovers (XS each):** R5-U-01 Approve should `replace` + 04 needs a non-awaiting guard;
  R5-T-01/02 T04/T05/T06 should redirect a terminal job on render; the persona toggle can overlap a
  toast.

### Post-loop — P3 leftovers closed (Sep 10 2026, 03:10, Kevin: "Run the P3s")
- **R5-U-01:** Approve navigates with `replace`; 04 redirects on render when the order is not awaiting approval (terminal → 03/Cancelled, otherwise 03/Tailoring). A stale 04 can no longer re-approve or request changes on a tailoring order.
- **R5-T-01 / R5-T-02:** T04, T05 and T06 redirect on render for a closed job ("This job is no longer on your calendar" → T01 with `replace`); no editor is drawn for a cancelled job reached through history or a deep link.
- **Toggle vs toast:** `toast()` flags `html.has-toast` while a toast is up and the persona toggle steps above it (`bottom` = 16 + 40 + 8 px, tokens only).
- Tailor click-through gained three redirect assertions (replacing the click-based R4-T-03 T06 check). `npm run check` ALL PASS (362 s): 58 diffs at baseline, parity, click-through, tailor, sync 807, style hygiene. No Figma change (all live-only). Remaining for Kevin: the BLOCKED Requested-card Actions slot and the Figma / product decisions listed above.

## Round 6 — Kevin's decisions on the carried items (Sep 10 2026, 03:20) — Figma round

Kevin resolved every carried item. Exact copy below is the single source for Figma and code.

### Decisions
| Item | Decision |
|---|---|
| Tailor's garment note / photos | **Tailor-only.** Never shown on the customer's cards. No Figma slot. |
| Contact Taily Support (T04) | **Canned support chat.** Opens `10-messages` on a "Taily Support" thread (avatar `TS`, header "Taily Support", sub "Usually replies in 10 min", pill hidden). Seed bubble from Support: "Hi Marco — Taily Support here. How can we help with this visit?" Marco sends → canned reply "Thanks, we're on it. A specialist will reply within 10 minutes." Back returns to T04. |
| T03A "Other" | **Text field.** Selecting Other reveals a textarea (placeholder "Tell us more (optional)"); stored as `a.declineNote`. Figma: T03A / Suggest Time frame gains the field state (new sibling `T03A - Decline Request / Other`). |
| "Tailors have up to 2 hours to accept your request." | **Into the 03/Requested frame** (`281:1237`) under the hero; code renders it on the fixture too (it stays the expiry demo tap live). |
| New 03 variant frames | **Pad to 844** (Expired, Declined, Tailor Cancelled, No-Show, New Time) — frame height 844, content unchanged; routes' `min-height` follow; refs + baselines re-accepted. |
| `- $20` / `7:00PM` on 6 older frames | **Sync the frames** to `-$20` and `7:00 PM`; remove the matching text-parity ALLOWs. |
| Flow chart `263:6457` | **Add** a Decision "Customer approves final order?" between 05 and 06 (Yes → tailoring; No → "Talk it over" → back to 05) and a "Suggest another time" edge: Accept? → "Suggest another time" process → Sarah decides (Accept new time → 03; Keep looking → back to matching). Same Flow / components as the rest of the chart. |
| Fee policy | **Tailor cancels → deposit refunded. Customer cancels within 12 hours of the visit, or no-shows → deposit NOT refunded.** Customer cancels earlier → refunded. ("Fee" = the customer's 10% deposit; the tailor's Taily fee is unchanged.) |
| "Rescheduling" | **= cancel + resubmit the same job for a new tailor at the same time.** 03.1's reschedule confirm cancels the appointment (12-hour rule applies), copies items, requested time, need-by and visit type into the booking form, and lands on **02 (Appointment Details)**. The customer never chooses the tailor. |
| Tailor name before matching | **Never shown until a tailor accepts.** `requestTailor()` leaves `name` / `initials` / `tailorId` empty; `tailorAccepts()` assigns Marco. Requested cards, 03/Requested's card, 03.1's withdraw copy, the proposal hero and chat entry points use neutral copy (below). Figma: 03/Requested card name, Requested card variants on 01 / 09 / 09 Closed Cards, 03 New Time hero. |
| 05A / 05B (best judgement) | CTA carries the dated window: `Confirm Pickup · Fri, Jul 17 · 4–6 PM` / `Confirm Delivery · …`; secondary CTA reads `Switch to Delivery` / `Switch to Pickup` (UX-008 resolved). Figma 05a `283:1328`, 05b `283:1372` + the 05.1 backdrops if they carry copies. |
| "Pinned" photo row | **Leave clipped** (hints at scrolling). No change. |
| T02 | **Add** the visit type, travel distance and subtotal: first row `◉ 88 Leonard Street, 4B · Home visit · 1.2 mi`; fee rows `$200 Subtotal` / `$20 Taily Fee (10%)` / `$180 Your Payout`. Figma `455:2170` + the Accepted / Expired siblings. |
| T03 hero | **Keep** "Booking Confirmed!" as is. |
| "Done today" rows | **Dismissable**: a `Clear` link on the section row hides the closed rows for the session (`state.tailorUi.clearedClosed`). Figma: `T01 - Home / Closed Rows` gains the link. |

### Exact copy
- **Matching (no tailor yet):** card title `Matching you with a tailor`, avatar glyph `✂` (no initials), meta `Requested: Thu, Sept 10 · 9:30 AM`; 03/Requested card name `Matching you with a tailor`, sub unchanged; 03.1 withdraw row `Your Thu, Sept 10 · 9:30 AM request is withdrawn`; proposal hero title `A tailor proposed a new time`, body `Your Thu, Sept 10 · 9:30 AM slot isn't free. They can do Fri, Sept 11 · 11:00 AM. Your need-by stays Fri, Sept 11.`; card meta `New time proposed: …`; no Message CTA while matching.
- **Customer cancel, confirmed, ≥ 12 h before the visit (03.1 rows):** `✕ Your Sun, Jul 12 · 7:00 PM with Marco is cancelled` / `✓ Your $20 deposit is refunded` / `↻ Your items and time are kept — we'll find you a new tailor` (reschedule mode) · CTA `Reschedule / Cancel` (unchanged) — 03/Cancelled: `Your $20 deposit is refunded to Apple Pay.`
- **Customer cancel, < 12 h:** 03.1 row `✕ Your $20 deposit is not refunded — you're within 12 hours of the visit` (replaces the ✓ row) — 03/Cancelled body `Cancelled within 12 hours of the visit, so your $20 deposit was kept. Rebook whenever you're ready.` — T03B (customer cancel) adds `Her $20 deposit stays with you.` when kept.
- **No-show:** T03.1 line `The job closes and Sarah is notified. Her $20 deposit stays with you.`; T03B `Sarah didn't show. The job is closed and the slot is open again. Her $20 deposit stays with you.`; customer 03/Cancelled `Marco marked the Sun, Jul 12 · 7:00 PM visit as a no-show, so your $20 deposit was kept.` + `Find Another Tailor`.
- **Tailor cancels:** unchanged (`…her $20 deposit is refunded.` / `Your $20 deposit is refunded to …`).
- **Reschedule landing:** toast on 02 `Appointment cancelled — send the same job to find a new tailor`; 02 pre-filled with the copied items, requested time, need-by and visit type.
- **Done today:** section row `Done today` + right link `Clear`.
- **T03A Other:** textarea placeholder `Tell us more (optional)`.

### Round 6 — results (Sep 10 2026)
Three agents (substrate + customer, tailor, Figma). Every decision applied:
- **Fee policy:** `cancelAppointment` applies the 12-hour rule (`a.refund`, `a.depositKept`);
  no-show keeps the deposit; tailor cancel refunds. 03.1 rows, 03/Cancelled bodies, T03.1's
  no-show line and T03B read the outcome with the real amount; live deposit row reads
  `Kept` / `Refunded <date>` (fixtures keep "Paid 7/7/26").
- **Reschedule = cancel + resubmit:** `rescheduleAppointment(a)` → 02 pre-filled (items, time,
  need-by, visit type) + toast; Request Tailor opens a new matching request.
- **No tailor name before matching:** `requestTailor()` leaves the tailor unassigned
  (`a.matching`), `tailorAccepts` assigns Marco; cards read "Matching you with a tailor" with a
  ✂ glyph and `Requested: <when>`; the proposal hero says "A tailor proposed a new time";
  pre-accept terminal copy is neutral ("A tailor couldn't take this request", "Declined by a
  tailor", "No tailor matched" on 03/Cancelled's card — wording chosen by the implementer).
  03/Requested keeps the frame's plain info card (the frame has no name row).
- **Support chat:** T04 → `10-messages` support thread (TS / Taily Support / canned reply).
- **T03A Other:** textarea "Tell us more (optional)" → `a.declineNote`; new frame
  `T03A - Decline Request / Other` 629:4443, route `t03a-other`.
- **T02:** first row `◉ 88 Leonard Street, 4B · Home visit · 1.2 mi` (wraps to two lines) and a
  `$200 Subtotal` fee row, on the base frame and the Accepted / Expired siblings.
- **Done today:** `Clear` link hides closed rows for the session; a new closure re-shows them.
- **05A / 05B:** `Confirm Pickup · Fri, Jul 17 · 4–6 PM` / `Switch to Delivery` (mirror on 05B),
  frames + 05.1 backdrops synced (UX-008 resolved).
- **Frames:** "Tailors have up to 2 hours…" added to 03/Requested (16px, under the hero);
  03 New Time hero neutral; Expired / Declined padded to 844; No-Show + T03B/No-Show bodies per
  policy; `-$20` / `7:00 PM` synced on the six older frames (parity ALLOWs removed);
  09 Closed Cards' Requested card renamed; T01 Closed Rows `Clear` link.
- **Flow chart 263:6457:** "Customer approves final order?" decision (No → "Talk it over (chat)"
  → back to 05) and the "Suggest another time" → "Customer accepts new time?" branch added; frame
  grew to 1400 tall, no crossings.
- **Harness:** `npm run check` ALL PASS (408 s): diff 60/60 (27 baselines re-accepted to the re-exported refs; T02 ×3 sit at 14.6–15.9 because the frame wraps the first row where the build wraps differently — revisit at the money sync), text parity (textarea placeholders now count; six `-$20` / `7:00 PM` ALLOWs removed), click-through 142, tailor click-through 250, sync click-through 903, style hygiene. 03/Requested keeps the plain info card (the frame has no name row) — the who-row the copy block asked for was dropped; two scripts updated to assert "no tailor name" instead.
- **Needs Kevin:** Tailor Cancelled (930), No-Show (930) and New Time (872) are already taller
  than 844 since the round 3 fee rows / second CTA — left hugging (trim content, or accept the
  height). The BLOCKED Requested-card Actions slot (Review Time) is unchanged. The customer-side
  fixture on 09 Closed Cards renders "Matching you with a tailor" (frame says the same now).

## Round 7 — Money model v2 (Kevin, Sep 10 2026) — code-first, one dedicated Figma money sync afterwards

### Kevin's rules (verbatim intent)
- **No 10% anything.** The 10% deposit flow and the 10% tailor commission are removed and never
  referenced on either side. Taily's MVP revenue is the visitation fee only; tailors receive
  100% of the alteration charges assigned to them.
- **Visitation fee by booked item count** (sum of quantities): 1–4 items **$25**; 5–10 **$50**;
  11+ **$100**. The $50 / $100 tiers carry the supporting line "Helps cover transportation for
  larger appointments." Shown clearly before the customer confirms and pays.
- **The visitation fee is the deposit.** Held at booking, **charged when a tailor accepts**
  (Kevin's choice). Refunded automatically if the request expires, is declined or withdrawn.
- **24-hour reminder = confirmation prompt.** Before confirming, the customer may cancel any time
  for a full refund. Confirming makes the fee **non-refundable** (no-show included); this is
  stated plainly on the reminder before the Confirm button. Unconfirmed 12 hours before the visit
  → auto-cancelled, fee refunded, tailor's slot reopened. **This replaces the 12-hour rule from
  round 6.** Tailor cancels → fee refunded, always.
- **Customer pricing** shows Alterations / Visitation fee / (Delivery $20 if chosen) / Total.
  Alterations (+ delivery) are charged at handoff, as today; the fee was charged at acceptance.
- **Tailor sees only their earnings:** per-alteration prices (their own) and "Your payout $X".
  Never the customer's total, the visitation fee, delivery, or any margin. Payout is prominent on
  the request screen and does not change after acceptance unless the scope changes; a scope change
  at the fitting shows "Payout $200 → $360" before Send.
- **Principle:** the customer buys a managed Taily service; the tailor accepts a job from Taily
  for a defined payout. Never model the tailor charging the customer or paying a commission.

### Assumptions (stated, not asked)
- Tier re-evaluates when the tailor adds items at the fitting; the customer sees the new fee on 04
  (approval) and it is charged with the alterations at handoff (the original fee stays charged).
- "Item" = garment quantity. Removing items never lowers an already-charged fee.

### Substrate contract (round 7)
- `data.js`: `VISIT_FEE_TIERS = [{ max: 4, fee: 25 }, { max: 10, fee: 50, note }, { max: Infinity, fee: 100, note }]`;
  `visitFee(count)`, `visitFeeNote(count)` (`''` for the $25 tier); `apptTotals(garments)` →
  `{ alterations, items, visitFee, delivery, total }` (no deposit, no subtotal-minus-deposit);
  `payout(garments)` = sum of alteration prices (tailor side).
- `state.js`: `a.totals = { alterations, visitFee, visitFeeCharged, delivery, total }`;
  `requestTailor()` sets `visitFee` from the booked count (`feeHeld: true`); `tailorAccepts(a)`
  stamps `feeChargedOn`; `confirmAppointment(a)` (the 24-h prompt) stamps `confirmedAt` and
  `feeLocked = true`; `cancelAppointment(a)` refund = `feeLocked ? 0 : visitFee` (withdraw /
  expiry / decline / tailor cancel → full refund, `feeLocked` ignored for tailor cancel);
  `tailorCancels(a, 'no-show')` → fee kept only if `feeLocked`; new `autoCancelUnconfirmed(a)`
  (terminal `cancelled`, `cancelledBy: 'none'`, `reason: 'unconfirmed'`, refund). The old
  `deposit` fields go away; `depositOn` → `feeChargedOn`. `writeFinalOrder` re-tiers the fee
  when the item count grows (`visitFeeAdded` = new − charged).
- Seed fiction: pre-visit alterations $200 (2 items) + fee $25 = **$225**; post-visit $360 (3
  items, still the $25 tier) → total $385, + $20 delivery = **$405**; tailor payout $200 → $360.
  SEED_PAST and James adjusted the same way.

### Exact copy (customer)
- 02 CTA: `Hold $25 Visitation Fee` (was "$20 Deposit (10%)"); above the CTA a fee card:
  `Visitation fee $25 · 2 items` (+ tier note on $50/$100); payment sheet title/sub: `Hold your
  $25 visitation fee — charged when a tailor accepts. Alterations are paid at pickup or delivery.`
- 03/Requested meta: `2 items · $200.00+ est. · $25 visitation fee held`; cancel line
  `Cancel request — nothing has been charged`.
- 03/Confirmed rows: `Alterations $200 (est.)` / `Visitation fee $25 — charged 7/7/26` /
  `Total $225`; body line `Alterations are paid at pickup or delivery.`
- 03/Reminder (24-h prompt): title as frame; **new line under the summary**: `Confirming makes
  your $25 visitation fee non-refundable. Cancel before confirming for a full refund.`;
  CTA `Confirm Appointment` unchanged; after confirming, the hero pill row reads `Confirmed ·
  fee non-refundable`. Demo affordance: tapping the reminder title = "12 hours pass without
  confirming" → auto-cancel.
- 03.1 rows: before confirmation `✓ Your $25 visitation fee is refunded`; after `✕ Your $25
  visitation fee is non-refundable (you confirmed the visit)`.
- 03/Cancelled bodies: unconfirmed auto-cancel `We didn't hear back before the visit, so it was
  cancelled. Your $25 visitation fee is refunded to Apple Pay.`; customer cancel after
  confirming `Your $25 visitation fee was kept — you had confirmed the visit.`; no-show `…so your
  $25 visitation fee was kept.`; tailor cancel / decline / expiry / withdraw → refunded / nothing
  charged. Fee rows: `Visitation fee $25 — Refunded 7/12/26` or `Kept`.
- 04 (approval): `Alterations $360` (items itemised, added marks) / `Visitation fee $25 — paid`
  (+ `Additional visitation fee $25` when re-tiered) / `Total $385` / `Due at handoff $360`.
- 05a/05b: `Due at pickup $360` / `Due at delivery $380 (incl. $20 delivery)`.
- 06 / 03-Summary receipt: `Alterations $360` / `Visitation fee $25 — paid 7/7/26` / (`Delivery
  $20`) / `Total $385` (`$405`) / `Paid at pickup 7/17/26 $360`.
### Exact copy (tailor)
- T01 request card: `$200 | Sarah Chen` with `$200 · 2 items`; job cards: `Payout $200`.
- T02: `$200 | New Request`; garment cards with alteration prices; rows `Hem / Adjust Length
  $120`, `Sleeve / Adjust Length $80`; `Your payout $200` (no fee row, no subtotal row);
  CTA `Accept Request · $200`.
- T03/T04/T05/T06/T07/T08: `Your payout $360` after the visit; T05 before Send: `Payout $200 →
  $360 (+$160)`; T08: `PAYOUT SUMMARY · TLY-2026-4417` → items → `Your payout $360` /
  `Arrives in your account · Mon, Jul 20`.
- Nothing on the tailor side prints the customer's total, the visitation fee or delivery.

### Figma sync pending ledger (opened round 7) — every money row
User: 02 CTA + fee card, 02.1–02.4 backdrops, 03/Requested meta, 03/Confirmed rows, 03/Reminder
new line, 03.1 rows, 03/Cancelled variants + fee rows, 03/Tailoring rows, 04 Default/Modified/
Removed rows, 05a/05b due lines, 05.1 backdrops, 06, 03/Summary, 06.1 backdrop, 03.3 backdrop,
09 cards (if any money). Tailor: T01 payouts, T02 ×3 rows/CTA, T03, T04, T05 (+ Removed), T06
(+ Questions), T07 (+ Waiting) summaries, T08. Baselines accepted with `pending-figma`; parity
ALLOWs reference this ledger. One dedicated money sync applies them all when Kevin says so.

### Round 7 — results (Sep 10 2026) — money model v2 built, code-first
- **Substrate:** `VISIT_FEE_TIERS` / `visitFee` / `visitFeeNote` / `apptTotals` (alterations, items,
  visitFee, visitFeeCharged, visitFeeAdded, delivery, total) / `payout`; `a.totals` in that shape
  on seeds and live bookings; fee held at request (`feeHeld`), charged at acceptance
  (`feeChargedOn`), locked by `confirmAppointment(a)` at the 24-hour prompt (`feeLocked`);
  refunds: unlocked cancel / withdraw / expiry / decline / tailor cancel → full refund, locked
  cancel and locked no-show → kept; `autoCancelUnconfirmed(a)` (reason `unconfirmed`).
  `chooseFulfilment('delivery')` adds $20 to the total. Deposit, 10%, Balance and the round 6
  12-hour rule are gone from both sides (grep-proven; `withinHours` stays for the no-show gate).
- **Customer:** 02 fee card + `Hold $25 Visitation Fee` CTA with tier notes (live count incl.
  quantities); 02.3 / 02.4 sub copy; 03/Requested meta + cancel line; 03/Confirmed and Reminder
  rows (Alterations est. / Visitation fee — charged / Total + "paid at pickup or delivery" note);
  the reminder's non-refundable warning before Confirm and the `Confirmed · fee non-refundable`
  pill after; 03.1 refund / non-refundable rows; 03/Cancelled variants incl. the new unconfirmed
  auto-cancel with fee rows Refunded / Kept; 04 rows with `Additional visitation fee` on re-tier;
  05a/05b due lines; 06 / 03-Summary receipts. Demo affordance: tapping the reminder title =
  12 hours pass without confirming → auto-cancel.
- **Tailor:** all commission rows removed; payout = 100% of alteration prices, prominent on
  T01/T02 before Accept and stored as `a.tailor.acceptedPayout`; T04 recomputes live; T05 shows
  `Payout $200 → $360 (+$160)` before Send; T06 awaiting line names the pending payout; T08 lists
  items → `Your payout`; refund lines name the visitation fee without amounts (Taily's money);
  a DOM sweep in the tailor click-through proves no tailor screen prints a customer total, the
  visitation fee, delivery or any margin.
- **Harness:** `npm run check` ALL PASS (427 s): diff 60/60 (36 baselines accepted `pending-figma`, height deltas = the removed / added money rows: T02 −41 to −62 px, T08 +45 px, 04 ×3 and 06 +41 px, 03/Reminder +60 px for the warning), text parity 59/59 with the `R7_*` ALLOW groups, click-through 194, tailor click-through 325 (incl. the no-customer-pricing DOM sweep), sync click-through 933, style hygiene.
- **Figma sync pending ledger:** every money row on both pages (see the round 7 ledger above);
  36 baselines accepted `pending-figma`; parity ALLOW groups `R7_*` reference this ledger.
- **Seed fiction now:** alterations $200 (2 items) + $25 fee = $225; after the visit $360 →
  $385, delivery $405; tailor payout $200 → $360; sync booking $240 → $400.
- **Noted:** `Confirmed · fee non-refundable` and the locked 03.1 row are reachable live only via
  the substrate because 03.2's Confirm both locks and completes the visit (demo compression);
  03/Reminder's fee caption wraps to two lines; the T06 frame's `$120` card price is in the ALLOWs
  (fixture now itemises $200/$80/$80).

### Round 7 — director verification of the money model (Sep 10 2026)
- **Tailor flow — SIGN-OFF** (`round7/review-tailor/money-review.md`, 147 assertions, 67 shots):
  payout leads every request surface, unchanged after acceptance, scope changes shown before Send,
  no customer pricing on 48 live + fixture states, tone = a job from Taily.
- **User flow — NOT YET** (`round7/review-user/money-review.md`, 159 assertions, 61 shots): the
  model is implemented as ruled on every path (tiers, held → charged → locked, every refund / keep
  outcome, re-tier, receipts, cross-persona equality, no old vocabulary on 35 deep links); two
  P2s about the customer *understanding* the rules.

| ID | P | Finding (short) | Decision | Scope |
|---|---|---|---|---|
| R7-U-01 | P2 | The non-refundable warning is 12px fine print on 03/Reminder; the committing 03.2 modal never mentions it | **ACCEPT** | Promote to a "Before you confirm" callout in the actions block (body size, ink, `!` glyph; Kevin's sentence as the body + "no-shows included"); 03.2 gains a row `! Your $25 visitation fee is now non-refundable.` |
| R7-U-02 | P2 | `Additional visitation fee` on 04 with no reason | **ACCEPT** | Caption where it first appears (04, 03/Tailoring): `Additional visitation fee — 5 items now, $50 tier`, plus a `fee-note` line "Your order grew to 5 items, so the visitation fee is now $50. The extra $25 is charged with your alterations at handoff." Receipts keep the short label |
| R7-U-03 | P3 | 02 never totals the alterations before the hold | **ACCEPT** | Fee card second line `Alterations est. $240 · paid at pickup or delivery` |
| R7-U-04 | P3 | 03/Cancelled keeps a `Total` row on a visit where only the fee was charged | **ACCEPT** | Drop the Total row on terminal entries; keep Alterations (est.) + the fee row with its outcome |
| O-3 / rule 4 | — | Tailor refund lines name "her visitation fee" (no amount) | **ACCEPT (rule-literal)** | T03.1 / T03B never mention the customer's fee: cancel `The job closes and Sarah is notified.`; no-show `The job closes and Sarah is notified.` (nothing about money) |
| R7-T-01 | P3 | Pending payout looks final on the job card while awaiting approval | **ACCEPT** | Card caption `Payout · pending` while awaiting-approval |
| R7-T-02 | P3 | Expired request still advertises a payout | **ACCEPT** | T02 expired: muted row labelled `Payout offered`, header `$240 \| Request Expired` kept |
| R7-T-03 | P3 | On a three-card draft T05's payout and change line sit below the fold | **ACCEPT** | Header sub `Reviewed with Sarah at the visit · Payout $360` (live) |
| Note | — | Tailor no-show compensation (a wasted trip earns nothing) | **Kevin** | Policy question, not built |

### Round 7 — fixes after verification (Sep 10 2026)
- 8 of 8 ACCEPTED items DONE: 03/Reminder "Before you confirm" callout (body size, ink, `!`)
  directly above Confirm, hidden once locked; 03.2 row `! Your $25 visitation fee is now
  non-refundable.`; `Additional visitation fee — 5 items now, $50 tier` caption + explanatory
  note on 04 and 03/Tailoring (receipts keep the short label); 02 fee card
  `Alterations est. $240 · paid at pickup or delivery`; 03/Cancelled variants drop the Total
  row; tailor refund lines never mention the customer's fee (grep: zero "visitation" hits in
  tailor files; the tailor DOM sweep now rejects the phrase); job cards `Payout · pending`
  while awaiting approval; expired T02 `Payout offered` muted; T05 live sub carries the payout.
- **Harness:** `npm run check` ALL PASS (429 s): diff 60/60, text parity, click-through 200, tailor click-through 343, sync click-through 936, style hygiene. Commit `bfb91d7`.
- 7 more baselines accepted `pending-figma` (02, 03/Reminder, 03.2, 03/Cancelled ×3 variants,
  T03B By You); no new parity ALLOWs.
- **Re-verification:** **both flows SIGN-OFF on the money model** — tailor (`review-tailor/money-review.md`, 147 assertions) and customer re-verification (`review-user-2/money-review.md`, 161 assertions, 47 shots): callout body-size and ink directly above Confirm and hidden once locked, 03.2 restates the lock, re-tier captioned and explained on 04 / 03-Tailoring with receipts keeping the short label, 02 alterations estimate, no Total on cancelled variants, tailor surfaces never name the fee, every held → charged → locked / refund / keep / receipt path unchanged, no old vocabulary on 35 customer + 19 tailor deep links.
- **For Kevin:** tailor no-show compensation (a wasted trip earns nothing while Taily keeps the
  fee) is a policy question the directors raised; the Figma money sync is pending (ledger above);
  03/Reminder is now 2506 px tall on the fixture (callout + rows) — the sync may want to tighten it.

## Round 8 — Figma money sync + no-show compensation + Requested card (Kevin, Sep 10 2026)

### Kevin's decisions
- **Label stays "Visitation fee."** Customers pay it; tailors never see it.
- **No-show compensation:** when the customer no-shows, the tailor receives **$20 on a $25 fee**
  and **half the fee at $50 or more** ($25 on $50, $50 on $100). Shown to the tailor **before
  accepting** (T02) and **paid on no-show** (T03B + the closed row). The tailor still never sees
  the customer's fee itself — only the compensation amount.
- **Figma sync scope: full parity** — every money row on every frame replaced by the current
  model, **no 10% / deposit / Taily fee / Balance / Subtotal-minus-deposit anywhere in the file**,
  plus a frame for every live-only state introduced since round 3 (list below).
- **Requested card:** the Appointment Card `Status=Requested` variant gains an Actions row with
  one `CTA_Small` `Review Time` so `09 - Bookings / Closed Cards` renders it (BLOCKED item closed).
- **Tall 03 frames:** re-measure after the money rows change; pad to 844 where the content fits,
  otherwise leave hugging and note it.

### Assumption
- Compensation is paid whenever the tailor marks a no-show (Taily pays it from the kept fee; if
  the visit was somehow unlocked, Taily absorbs it). Nothing changes on the customer side.

### Substrate / code contract (code agent)
- `data.js`: `noShowComp(visitFee)` → `visitFee >= 50 ? visitFee / 2 : 20`.
- `state.js`: `tailorCancels(a, 'no-show')` stamps `a.noShowComp = noShowComp(a.totals.visitFee)`.
- Tailor copy (verbatim): T02 (base + Accepted; not Expired) — a muted row under `Your payout`:
  price `$20`, caption `No-show protection · paid if Sarah doesn't show`. T03B no-show body:
  `Sarah didn't show. The job is closed and the slot is open again. You'll receive $20 for the trip.`
  T01 Done today no-show row right text: `No-show · $20`. (Amount = `noShowComp` of the job's fee;
  the tailor sweep must keep rejecting "visitation", "Total", "deposit", "10%".)
- **Fixture routes for the new frames** (code agent adds the route modules + fixtures and registers
  them in `app.js`; the Figma agent adds the id → node entries in `scripts/screens.json`):
  `03-status-reminder-locked` (03/Reminder after `confirmAppointment`: pill `Confirmed · fee
  non-refundable`, no callout), `03-status-confirmed-locked` (03/Confirmed locked pill),
  `03-status-unconfirmed` (03/Cancelled unconfirmed auto-cancel variant), `04-review-approve-retiered`
  (04 Modified after a re-tier: `Additional visitation fee — 5 items now, $50 tier` + note).
  Existing routes already render the other live states as fixtures: `t02-expired` (`Payout offered`),
  `t05-confirm-final-pricing` (payout change line), `03.2-appointment-confirmed` (locked row).

### Figma sync (Figma agent) — frame names and what each shows
- **Money rows on existing frames:** for every id in `scripts/screens.json`, screenshot the served
  fixture (`http://127.0.0.1:4173/index.html?screen=<id>`) and read its `.fee-row`, fee card, callout,
  hero body and CTA texts; edit the frame's Fee Row instances (clone / hide as needed) and text
  nodes so the frame reads exactly what the build renders. Then search every text node in the file
  for `10%`, `Deposit`, `deposit`, `Taily Fee`, `Taily fee`, `Balance`, `Subtotal - Confirmed`,
  `- $20`, `-$20`, `$180`, `$324`, `$340`, `$36` and resolve each (edit or hide).
- **New sibling frames** (duplicate of the base, placed at the right end of the base's row; only the
  state's text / visibility changed): `03 - Order Status / Reminder Locked` ← 03/Reminder;
  `03 - Order Status / Confirmed Locked` ← 03/Confirmed; `03 - Order Status / Unconfirmed` ←
  03/Cancelled; `04 - Review & Approve / Re-tiered` ← 04 Modified. Add
  `03-status-reminder-locked`, `03-status-confirmed-locked`, `03-status-unconfirmed`,
  `04-review-approve-retiered` → node ids to `scripts/screens.json` `screens` (no baselines).
- **Existing frames that gain a live-state element:** T02 base + Accepted (no-show protection row);
  T05 + T05 Removed (`Payout $200 → $360 (+$160)` line above Send); T02 Expired (`Payout offered`
  muted row); 03/Reminder (callout `Before you confirm` above Confirm); 03.2 (locked row);
  02 (fee card with `Alterations est.` line); 04 ×3 and 03/Tailoring (rows); 03/Cancelled ×5 (no
  Total row; fee row outcome); T01 Closed Rows (`No-show · $20` right text on the no-show row).
- **Requested card:** edit the Appointment Card component set (`Status=Requested` variant, 571:9099):
  add an Actions row (clone from the Confirmed variant's Actions) with a single `CTA_Small`
  `Review Time`; verify `09 - Bookings / Closed Cards` 609:4676 renders it.
- **Heights:** re-measure Tailor Cancelled 608:4333, No-Show 608:4433, New Time 609:2594 (and any 03
  variant) after the rows change; set 844 fixed where content ≤ 844, else hug and report.
- **Refs:** `node scripts/export-refs.mjs <every edited or new id>`.

### After both agents (orchestrator)
Register nothing further (code agent registers routes); `npm run diff -- <ids> --accept` for every
re-exported frame; remove the `R7_*` parity ALLOW groups (frames now match); `npm run check`;
commit; verification review of the sync (both flows, parity-focused).

### Round 8 — results (Sep 10 2026)
- **No-show compensation (Kevin):** `noShowComp(visitFee)` = $20 on a $25 fee, half the fee at
  $50+; `tailorCancels(a, 'no-show')` stamps `a.noShowComp`. T02 (base + Accepted) shows a muted
  `$20 · No-show protection · paid if Sarah doesn't show` row under the payout; T03B no-show says
  `You'll receive $20 for the trip.`; T01 Done today no-show row reads `No-show · $20`. The tailor
  still never sees the fee itself; the customer side is unchanged.
- **Figma money sync (full parity):** every money row on both pages now reads what the build
  renders — 02 fee card + `Hold $25 Visitation Fee` CTA (and the four sheet backdrops), 03 rows
  (Alterations est. / Visitation fee — charged / Total + note), the reminder callout and the 03.2
  locked row, 03/Tailoring · 04 ×3 · 03.3 rows with Total and Due at handoff, receipts (06 /
  Summary / 06.1) with Paid at delivery, 03/Cancelled ×5 fee outcomes, 05 / 05A / 05B / 05.1 due
  lines; tailor T01 / T02 ×3 / T03 ×2 / T03.1 / T04 / T05 ×2 / T06 ×2 / T07 / T08 / T03B with payout-only
  rows, the T05 payout-change line, T02 Expired "Payout offered", T02 no-show protection. A
  file-wide search finds zero visible old-vocabulary text (the hidden fee rows remain hidden per
  the hide-don't-delete convention). Components-page masters cleaned.
- **New frames (a frame for every live state):** `03 - Order Status / Reminder Locked` 644:5949,
  `/ Confirmed Locked` 644:6051, `/ Unconfirmed` 644:6149, `04 - Review & Approve / Re-tiered`
  644:6244, with routes `03-status-reminder-locked`, `03-status-confirmed-locked`,
  `03-status-unconfirmed`, `04-review-approve-retiered`.
- **Requested card:** the Appointment Card `Status=Requested` variant gained an Actions row with a
  `Review Time` small CTA; `09 - Bookings / Closed Cards` renders it (BLOCKED item closed).
- **Heights:** no 03 variant fits 844 after the rows changed; all stay hugging (Tailor Cancelled
  889, No-Show 868, New Time 872, Cancelled 907, Unconfirmed 910; Expired / Declined stay 844).
- **Harness:** `npm run check` ALL CHECKS PASS — 447s: diff 64/64 (63 baselines accepted to the synced refs), text parity 64/64 with the R7 groups emptied, click-through 207, tailor click-through 362, sync click-through 939, style hygiene. The `R7_*` parity ALLOW groups are emptied — parity passes without them.
- **Follow-up:** the 04 Re-tiered frame was first drawn before its route existed (three cards,
  $410) and was re-synced to the build (fourth added card `2 × Pants / Jeans · Hem · $240`, $600 /
  $25 / $25 / $650 / $625); the Confirmed / Reminder Locked pills un-clipped. Refs re-exported; baselines accepted.

### Round 8 — verification and close (Sep 10 2026)
- **User flow — SIGN-OFF** (`round8/review-user/sync-review.md`): every user-page frame reads what
  the build renders (16 frames composited side by side, all 35 fixture routes read via REST);
  zero old vocabulary on the user page (visible and hidden) and on every served route; the
  Requested card renders `Review Time` on the frame and the route; nothing about tailor
  compensation reaches the customer; the held → charged → locked → kept / refunded ladder and
  both receipts re-driven (35/35).
- **Tailor flow — SIGN-OFF** (`round8/review-tailor/sync-review.md`): all 15 tailor frames match
  the build; no `Taily Fee` / `Subtotal` / `10%` / `$180` / `$324` / `deposit` / `visitation` on
  any tailor frame or fixture; the no-show protection row reads as part of the offer without
  exposing the fee, T03B's trip line is honest, compensation follows the tier ($20 / $25 / $50)
  and is paid whether or not the visit was locked (121 assertions).
- **Housekeeping after sign-off:** 04 Modified's paid $25 painted ink; 03/Cancelled refund card weights match the prepare cards; T06 / T06 Questions card 1 now $200 with the Sleeve line (the round 1 $120 fiction retired, $120 ALLOW dropped); Status Hero Ready default sentence and the flow-chart label lost their deposit/balance wording; the 11 hidden Taily-fee rows deleted; the re-tiered route's missing body gap fixed (13.47% → 0.30%). Refs re-exported, 5 baselines accepted. `npm run check` ALL CHECKS PASS — 445s.
- **Carried for Kevin (low):** T03B no-show gives no payout timing for the trip money (needs the
  payout cadence); "paid if Sarah doesn't show" is agentless (optional reword); 03 variant frames
  above 844 hug their content by his rule; Leo Von's progress-bar colour differs between the T01
  frame and the build (pre-existing, non-money).


## Round 9 — Kevin's user-flow edits (Sep 11 2026; Figma round 9, user page only)

### Kevin's edits (verbatim intent)
- 02: "Requested time" / "Need by" pills default to **Select Time**; both pills share one grammar.
- 02: the Visitation Fee card takes the **garment card's layout** — the $25 on the left, the
  description on the right.
- 02 CTA: "Hold $25 Visitation Fee" → **"Reserve Appt · $25"** (Kevin typed a bullet "•"; built
  with the app's middle dot "·" used by every other CTA / caption — flagged below).
- 03/Confirmed: the booking garment cards' photo thumbnails **open the photo viewer** (the same
  03.3 popup the post-appointment Before / Pinned rows use).

### Results
- **Pills.** `APPT_DEFAULT.when / needBy` start `null`; `filterPill` prints "Select Time" for an
  empty value. `requestBlocker()` (02) keeps Reserve inert until the requested time AND the need-by
  are picked (pill error line + toast: "Select a requested time" / "Select a need-by time", then the
  R1-U-11 order rule); the wheel's Set Time clears the error in place. `fmtPill()` (data.js) is the
  pills' one grammar — "Jul 12, 7:00 PM" (day alone when the source has no time); reschedule /
  re-request copies pass through it, so the seed's "Sunday Jul 12, 7PM" / "Fri, Jul 17" read
  "Jul 12, 7:00 PM" / "Jul 17". `requestTailor()` tolerates a null time (harness shortcuts);
  03/Requested's deep-link form row falls back to the seed's time.
- **Fee card.** `.fee-card` is the 02 garment card's chassis (pad 16/12/16/16, gap 12, r16, card
  shadow): a 68px price column (`.fee-card__price`, the card's Medium 16 ink) and a content column
  at gap 4 — "Visitation fee · 2 items" (garment-row SemiBold 16 ink), the Alterations est. line,
  the tier note. It now sits INSIDE `.cta-bar` above the CTA, as the frame always drew it (the R7
  build had it outside — that 12px offset was most of 02's 9.05 baseline). The 12px est. line wraps
  to two lines in the narrower column on both sides (card 73 → 89 tall).
- **CTA.** `Reserve Appt · ${fee}` — follows the tier ($25 / $50 / $100) like before.
- **Photo viewer (booking mode).** `wireBookingPhotos(root)` (03.3 module) wires the ViewOnly
  cards' tiles on 03/Confirmed (+ its Locked fixture, same wire): tap → `openPhotoViewer({ booking,
  count, active })` = the same panel with title "<garment> — Your photos", sub "Added when you
  booked", no Before / Pinned legend, one thumb per photo (tapped one active). Tiles get
  role=button + labels; `.photo-tiles--tappable` cursor. 03/Reminder's and 03/Tailoring's
  pre-visit tiles stay inert (Kevin named the Confirmed page only).
- **Figma (user page).** 02 + the four sheet backdrops (02.1–02.4): both pill labels "Select
  Time"; CTA "Reserve Appt · $25"; Fee Card rebuilt in place (HORIZONTAL, space/12 gap, space/16 ·
  space/12 paddings, garment-card shadow, `Price Chip` 68×FILL centred "$25" Medium size/16 ink,
  `Content` FILL column with the two lines, first SemiBold) — same node ids (640:2913 … 640:2925),
  frame heights unchanged (02 stays 1012). New sibling frame `03.3 - Photo Viewer / Booking`
  (654:5774, end of the 03 row): 03/Confirmed clone as backdrop, retitled panel, legend hidden,
  thumbs 3–5 hidden, thumb 1 ringed, arrows re-centred on the stage → route
  `03.3-photo-viewer-booking` (baseline 0.01).
- **Harness.** 02 min-height 1012 (frame height). Refs re-exported for the six frames; 02 baseline
  9.05 → 0.64 (accepted); the four sheets unchanged (0.22 / 0.05 / 0.64 / 0.42). Text parity passes
  on all seven touched routes with no new ALLOWs. Click-through: pills default + blocked-request
  checks, fee-card column assertions, `Reserve Appt` CTA per tier, reschedule pre-fill compared
  through `fmtPill`; sync click-through: photos added on 02 (camera tile) so 03/Confirmed opens the
  viewer in booking mode (title / sub / no legend / thumb count) and closes back to 03/Confirmed.

### Flags for Kevin (low)
- "•" vs "·": built "Reserve Appt · $25" with the app's middle dot. Say the word and it becomes "•".
- The fee card's est. line now wraps to two lines (both sides). A shorter line ("Alterations est.
  $200 · paid at handoff") would keep it to one — your call.
- Copy I chose: "Select a requested time" / "Select a need-by time" (blocked request), and the
  booking viewer's "<garment> — Your photos" / "Added when you booked".
- 03/Reminder's booking cards still don't open the viewer (only 03/Confirmed per the ask); one
  line to extend if wanted.


## Round 10 — Kevin's user + tailor edits (Sep 13 2026; Figma round)

### Kevin's asks and answers
- **02 Appointment Details:** Kevin deleted the old frame and drew a new one (657:4875) — the
  editable garment cards sit as flat rows inside ONE white garments card like every other page,
  followed by Alterations (est.) / Visitation fee - Due Today / Total and the paid-at-handoff
  note; "+ Additional Garment" below the card; the fee card is gone. Copy kept verbatim
  ("Due Today").
- **Approve flow:** one screen. Answer: **04 Review & Approve directly** — the Home / Bookings
  card and every status guard open 04 while the order awaits approval (blue marks vs the booking,
  Approve Final Order / Request Changes); 03/Tailoring takes over once approved.
- **"View All Appointments":** removed from **every 03 and 04 screen** (answer: all, not just the
  approve screen). Bookings tab is the way back.
- **03/Requested:** the request card's items / estimate and the visitation fee are two rows
  (`✂ 2 items · $200.00+ est.` / `🏠 $25 visitation fee`), verbatim from the frame.
- **Tailor — awaiting customer:** T06 gains **Edit Details** → T04 (the sent order reopened) →
  T05 **Resend to Sarah for Approval**. Answer on the customer side: **line + chat note** — 04
  reads "Marco updated the order on <day>. Changes are highlighted below." and a canned bubble
  from Marco lands in the thread; a pending Request Changes clears.

### Results
- **Substrate.** `statusScreen(a)` (state.js) is the one map from status to screen —
  `apptTarget`, the 03/Confirmed · Reminder · Tailoring guards, 04's stale guard and 03.2's
  Confirm all use it; awaiting-approval → `04-review-approve[-modified]`. Tailor side:
  `reopenDraft(a)` (the draft restarts from the SENT order, ids kept so marks stay measured
  against the booking) and `resendFinalOrder(a, draft)` (writeFinalOrder + `resentAt`,
  `resendCount`, clears `changesRequestedAt`, queues `pendingTailorNote` which 10-messages
  pushes as a tailor bubble once). T06: Edit Details (secondary) while awaiting — Message Sarah /
  Edit Details / Mark Ready / Back when Sarah has questions, Mark Ready / Edit Details / Back
  otherwise; the status line names a resend. T05: "Updated after sending · Payout $X" + Resend CTA
  when the job is already awaiting; Send resends instead of completing.
- **02.** `garmentCard({ flat })` + `.garment-card--flat` (pad 16/0, hairline, no shadow, ✕ at
  the content's top-right) inside `.garments-card`; `orderRows(totals, { est, feeDesc:
  'Visitation fee - Due Today' })`; the tier note stays as a second fee-note on the $50 / $100
  tiers. Frame id → 657:4875 in screens.json; the four sheet backdrops re-synced via API (the
  "Screen" group replaced by clones of the new 02's children).
- **Figma (user page).** View All CTAs HIDDEN on 03/Confirmed, Confirmed Locked, Tailoring,
  Summary (its whole CTA Bar — it was the only CTA), Requested, and both 03.3 backdrops; the 04
  frames already lacked it. 03/New Time's request card split like 03/Requested. Frame heights →
  `min-height`: Confirmed / Locked 1098, Tailoring 1152.25, Summary 1089.5.
- **Figma (tailor page).** `T06 - Appointment Status / Sarah Has Questions` gained Edit Details
  (after Message Sarah); new `T06 - Appointment Status / Awaiting Approval` (666:4837 →
  `t06-awaiting`: reviewing line, Mark Ready primary / Edit Details / Back) and `T05 - Confirm
  Final Pricing / Resend` (666:4979 → `t05-resend`).
- **Flows menu.** `c-awaiting` (03/Tailoring awaiting) replaced by `c-resent` (04 after a
  resend); tailor `t-edit-details`, `t-resend`, `t-status-resent`.
- **Harness.** clickthrough / sync: awaiting-approval lands on 04 directly (no Review Final Order
  hop, no link row), 04 CTAs = Approve / Request Changes, tailoring bar = Message Marco only, 02
  money rows per tier, 03/Requested rows split; flows click-through covers the new entries.
  Baselines accepted: 02 7.64 (see flags), sheets ≤ 1.53, 03/Requested 1.56, New Time 1.52,
  Confirmed 0.35, Locked 0.40, Tailoring 2.99, Summary 0.64, T06 Questions 5.84, T06 Awaiting
  5.95, T05 Resend 6.79.

### Figma inconsistencies raised (not silently fixed)
- **New 02, card 2 has no service line** — the $80 jacket's Content has Garment Row → Additional
  Service → photos, no "Sleeve / Adjust Length" row (the old frame had it). Built with the service
  (a priced garment always has one); the 02 baseline (7.64) carries the 25px shift until the frame
  gets the row back.
- **New 02's "Additional Service" selector is detached and smaller** (frame 155×29, ⊕ 20 with a
  17 vector) where the Selector master `Type=Additional` (541:1975) is 159×32 with a 24 icon.
  Built per the master (3px per card in the baseline).
- **Tailor Active Job Card master (Kevin, between rounds):** its items label was re-created
  (659:5821) and reads "2 Suit Jackets" by default, which bled into the T06 frames; the instance
  overrides were restored to "3 Suit Jackets" (the fixture's three jackets). Other tailor frames
  showing "2 Suit Jackets" are listed in the round log if any.

### Flags for Kevin (low)
- **T01 is mid-edit on your side** (untracked this round): frame 455:3560 is now named "T01 - Home / View Requests", carries a second, un-overridden Active Job Card instance (the master's DUE / 9/2 / APPT / 8/29 / $102 / 2 Suit Jackets defaults) and a `Decline` small CTA in the request card; T01 / Closed Rows shows a "Past Jobs" heading. Nothing was built for these — text parity ALLOWs them on `t01-home` / `t01-home-closed` until you say what T01 should become; the T01 refs were NOT re-exported (diff still measures the Sep 10 frames).
- "Visitation fee - Due Today" is drawn (and built) even though the fee is only HELD at booking and
  charged when a tailor accepts — kept verbatim per your answer.
- The resend note copy is mine: "I updated the order — please take another look and approve it
  when it looks right." and the 04 line "Marco updated the order on <day>. Changes are highlighted
  below."


## Round 11 — Kevin's tailor edits: Appt_Request component, Request New Time, frame cleanup (Sep 13 2026)

### Kevin's asks and answers
- **Appt_Request component** (Components page 659:6509, `Property 1 = Default | NewTime`) is the
  T01 request card; T01 / Closed Rows uses NewTime. Both variants end in View Details + Decline;
  NewTime adds "Time proposed · … — waiting for Sarah" under the items. Answer: **Decline on the
  card opens T03A** (reasons), like T02's Decline.
- **T02 "Request New Time"** (third CTA, secondary): opens the 02.1 date & time sheet as
  "Request New Time" with a **Propose · <day> at <time>** CTA; proposing lands on T01 with the
  NewTime card. Answer: **keep both** entry points — T03A's Schedule-conflict primary uses the
  same wheel (`proposeNewTime` in t03a-decline-request.js).
- **Frames as the source of truth**: Kevin deleted T03 Booking Confirmed, T03A Decline (base),
  T05 Removed, T06 Sarah Has Questions and round 10's T06 Awaiting Approval / T05 Resend. Answer:
  follow the frames; **review** other redundant / conflicting frames (list below), no deletions
  by me.
- **T01**: build to the new frames now — "Done today" is **Past Jobs** (Clear kept); the Active
  Jobs list follows the frame.

### Results
- `requestCard` (tailor-components) renders the component: Timer strip / $payout | name / meta
  rows / items (+ the NewTime line in `.req-card__items-block`) / View Details + Decline. Withdraw
  is T02's **Withdraw Proposal** only (the card's link is gone).
- `openDateTimeOverlay` gained `opts.header` / `opts.cta` (the verb before "· <day> at <time>");
  `proposeNewTime(a)` (exported from t03a) titles it "Request New Time" / "Propose", bounded by
  Sarah's need-by (day + time), restarts the request timer and lands on T01. T02's new CTA calls
  it (toasts when the request is no longer open or no slot before the need-by remains).
- T01: "Past Jobs" section (rows unchanged: delivered, cancelled-by-you, no-show · $X, withdrawn,
  expired; Clear). The base frame's Sarah card is an un-overridden Active Job Card (APPT / 8/29 /
  $102) — built live (JUL 12 / $200 / Confirmed), parity ALLOWs the defaults, baseline 2.19.
- Harness: the six deleted frames left `screens.json` (60 screens), their refs and route
  min-heights are gone; their routes stay registered (Test flows menu). New flow entry
  `t-request-new-time` (T02 → the propose wheel). Tailor / sync click-throughs withdraw via T02.
  Refs re-exported: T01, T01 Closed Rows, T02 (baselines 2.19 / 1.80 / 14.36 — the T02 fast-build
  baseline was 15.06).

### Frame review — redundant or conflicting (no deletions made; your call)
Rule I applied when reading: a sibling frame earns its place when it changes LAYOUT (rows added,
a section, a different card); a frame that differs only by copy, a pill or one CTA is a code
state the Test flows menu already covers.
- **Copy-only siblings (candidates to delete):** tailor `T02 / Accepted`, `T02 / Expired`,
  `T03B / By You`, `T03B / No-Show`, `T03B / Withdrawn`, `T07 / Waiting`, `T03A / Suggest Time`
  (T02's Request New Time now covers the path; T03A's primary flips label only); user
  `03 / Confirmed Locked`, `03 / Reminder Locked` (pill + callout only), `05.1 / Dated`,
  `03.3 / Booking` (the same viewer minus the legend).
- **Stray:** `01 - Home` (455:2081) sits on the tailor page — a copy of the user Home, not keyed
  to any route.
- **Conflicts to resolve:**
  - `T01 - Home / View Requests` (the base T01, 455:3560): Sarah's Active Job Card is
    un-overridden — reads APPT / 8/29 / $102 where the fiction is JUL 12 / $200; Leo Von's reads
    DUE / 9/2 (the master's default) where every other frame says SEP 2.
  - Active Job Card master (470:3993): the items label was re-created and defaults to "2 Suit
    Jackets"; T06's instance carries the "3 Suit Jackets" override (three jackets after the visit).
  - `02 - Appointment Details` (657:4875): card 2 has no service line ($80 with no job); the
    Additional Service selector is a detached 155×29 frame where the Selector master is 159×32.
  - `03 - Order Status / New Time` inherits 03/Requested's stale "Thu, Jul 9 · 9:30 AM" fixture
    (ALLOW'd since round 3).
  - `T03A / Suggest Time` vs T02's new CTA: two entry points to one wheel (you chose to keep both).
- **Kept as-is (they change layout):** T01 / Closed Rows, T03A / Other, T03.1, T03 / Upcoming
  Visit, 03 Expired / Declined / Tailor Cancelled / No-Show / New Time / Unconfirmed, 04 Removed /
  Re-tiered, 09 Closed Cards, 02.1–02.4, 03.1–03.3, 04.1, 05.1, 06.1.

### Flags (low)
- **Sibling / base conflict (untracked edit):** T02 / Accepted, T02 / Expired and T03 / Upcoming Visit now end the address row with "· 1.2 mi" ("·1.2 mi", no space, on Expired and T03) while the T02 base row is "◉ 88 Leonard Street, 4B". Built to the base; parity ALLOWs the three siblings.
- **Adopted from your latest edits:** T05's secondary CTA reads "Edit Details" (was Review Details); T02 / Accepted's single CTA is "Back to Home" (the build's accepted state now offers it instead of the inert "Accepted").
- Kevin wrote "Propose - (time)"; built "Propose · Sun, Jul 12 at 10:00 AM" (the app's middle
  dot and the sheet's day/time grammar).
- The T02 CTA is inert once a proposal is out (T02 then shows Withdraw Proposal / Decline, as
  before) and toasts when no slot before the need-by is left.


## Round 12 — money model v3 (tiers + tailor cut), one card per garment, address gate, 04.1 / 06.1 (Sep 13 2026)

### Kevin's asks and answers
- **Fee Update Screen** (04 / Re-tiered): show the updated amount in blue, never the fee twice.
  Answer: one row, "$90 | Visitation fee — 5 items, $90 tier" in semantic/info, the fee-note
  under the rows keeps the explanation ("… now $90. The extra $40 is charged with your
  alterations at handoff.").
- **Visitation fee tiers**: customer $50 / $90 / $150, tailor's cut $25 / $50 / $90. Answer:
  bands 1–4 / 5–10 / 11+ (as before); the cut is its own "Visitation fee" row and **Your payout
  includes it**; no-show compensation = the cut.
- **01 Home**: plus icon above the badge, controls stacked vertically (01a - Home_Selected).
- **01 / 02**: address defaults to "Please Enter Address"; every garment on its own card, the
  quantity selector is gone (02 - Appointment Details). Answer: quantity leaves the model
  everywhere (every garment is one item; Home + / − add or remove a card); Reserve is gated on
  the address (toast + the 02.2 sheet opens), the seed's booking keeps 88 Leonard St.
- **04.1**: new copy; Sounds Good only closes. Answer: the round-2 "Sarah has questions" trace
  (requestChanges, canned chat bubble, T06 / T01 state) is removed entirely.
- **06.1**: five stars by default; Confirm → "Review Submitted", gone after 2 s or on a tap.
  Answer: sibling frame "06.1 - Leave Review / Submitted" (check + title only).
- Figma: everything not already drawn was written via the API (01a and 02 were Kevin's).

### Results
- data.js: `VISIT_FEE_TIERS` 50 / 90 / 150, `TAILOR_FEE_TIERS` 25 / 50 / 90 (`tailorFee`),
  `payoutParts()` / `payout()` = alterations + cut, `noShowComp(items)` = the cut, `itemCount` =
  garments.length; seeds $200 + $50 = $250, final $360 + $50 = $410 (+ $20 delivery = $430),
  past $120 + $50 = $170; `qty` is gone from every seed, fixture and write path.
- components.js: `orderRows` draws ONE fee row — the re-tiered amount in info with
  `retieredFeeCaption` ("Visitation fee — 5 items, $90 tier"); `receiptRows` folds the extra into
  the paid row; editable garment cards have no quantity selector; the selected tile stacks
  plus / badge / minus (`TILE_PLUS`, assets/icons/tile-plus.svg).
- tailor side: `jobView` / `orderMoney` carry `visitCut`; `payoutRows` prints "$25 Visitation fee"
  above "Your payout" (T02 / T03 / T04 / T05 / T06 / T07 / T08 + the T08 payout summary row);
  seed payout $200 → **$225**, final $360 → **$385**, T05 "Payout $225 → $385 (+$160)"; the
  customer-pricing sweep now allows the tailor's own row and forbids the customer captions.
- state.js: `contact.street` starts empty; `ADDRESS_PLACEHOLDER` / `hasAddress` / `addressLine` /
  `homeAddress(a)` / `FIXTURE_CONTACT`; 02's `requestBlocker` checks the address first (toast
  "Enter your address" + the 02.2 sheet); `requestChanges` removed; `approveOrder` simplified.
- 04.1: informational only. 06.1: `rating = 5`, `submittedHtml()` swaps in after Confirm
  (`SUBMITTED_MS` = 2000, first tap dismisses), route `06.1-leave-review-submitted`.
- Test flows: `c-review-submitted` added, `t-status-questions` retired (`t06-questions` route
  deleted).
- Figma (API): every "$25" fee → "$50", "$225" → "$250", "$385" → "$410", "$405" → "$430",
  "$305" → "$330" on both pages' frames + backdrops and the fee bodies ("your $50 visitation
  fee…", "Hold your $50…", "Reserve Appt · $50"); 04 / Re-tiered = one $90 info row + caption +
  note, two Pants / Jeans cards at $120; 04.1 body; 01 / 01a / 02 + the 02.1–02.4 backdrops read
  "📍 Please Enter Address" (01 was already Kevin's); 06.1 fifth star filled; new frame
  684:5355. Tailor page: payouts $225 / $385, "Accept Request · $225", new "Visitation fee $25"
  Fee Rows above every "Your payout" (hairline from T02's rows), No-show protection $25, T03B
  "$25 for the trip", T01 / Closed Rows "No-show · $25", T08 "Visitation fee $25" price row.
- Harness: customer 220 / tailor 361 / sync 1008 / flows 89 assertions; refs re-exported;
  baselines re-accepted for the money frames.

### Flags (low)
- The 02.2 address-sheet frame still draws the filled form (88 Leonard St / 4B / 10013) —
  the route renders that fixture when nothing is entered; live it opens empty.
- 05b's "Due at delivery" breakdown still lists the re-tier difference as "Additional
  visitation fee $40" (it is the amount still owed, not the fee again) — say if you want it
  folded too.
- T02 / T03 frames print the tailor's "$25 Visitation fee" row — the tailor never sees the
  customer's $50 / $90 / $150; the click-through sweeps for those captions.
