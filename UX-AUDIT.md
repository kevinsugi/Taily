# UX Audit — Taily v4 prototype (Phase R5, commit c200d16)

Auditor: Claude (senior product designer / UX researcher / QA), per `ux-audit-approval-loop.md`.
Tested: local build (`node scripts/serve.mjs`, port 4173), Chrome, mobile viewport 375×812 (device emulation) plus desktop pane; automated click-through (25 screens); targeted keyboard and interaction probes. No product changes were made during the audit.

## Context & assumptions

- **Product:** mobile-web prototype of Taily, a tailor-booking service. One design fiction: Kevin books 3 suit-jacket alterations with Marco Tailor (Jul 12 appointment, Jul 17 delivery, $360 order).
- **Intended user:** a first-time customer booking alterations from their phone.
- **Primary workflow:** browse → book → pay deposit → get matched → appointment → approve final order → tailoring → schedule pickup/delivery → done.
- **Constraints treated as intentional:** frame-verbatim visuals (diff-gated against Figma), demo affordances that simulate the tailor (map tap = accepts; 04D order tap while tailoring = finishes), placeholder photos/map, single seeded fiction.
- **Not tested:** real touch hardware, screen readers, Safari/Firefox, network/latency states, empty-data states beyond the seeds.

## Testing plan (executed)

1. Full happy path at 375×812: 01 → 02 (pills, picker, address, selectors) → 04A pay → 03 → accept → 04C → 05 → R1 (open/dismiss) → 05C → 04D → PV3 → 06B → RC1 → approve → 04D tailoring → ready → 07 → 07A/07B (chips, custom time, cross-nav) → 08. Evidence: `npm run check` click-through log (24 PASS, no console errors).
2. Cancel path: 03 → cancel → R1 → confirm → 05X → home.
3. Requested-state probes: card render, click inertness, path back to 03.
4. Keyboard: Tab focus visibility, Escape on sheets vs modals.
5. Drag-scroll: pan vs click suppression on 09.
6. Viewports: 375×812 emulated; desktop pane (centered 390 column).

---

# UX Audit

## Executive Summary

- **Overall quality:** high for a prototype at this stage. The happy path is complete, self-consistent, visually faithful to Figma (all 25 screens inside diff gates), and now behaves like a mobile web app (drag-pan, tap targets respond, overlays layer correctly). Status logic is real state, not window dressing.
- **Biggest strengths:** coherent status system (pill + progress + card variants driven by one state machine); overlay popups (R1/RC1/05C/PV3) that keep context; live order data flowing through 02→03→04D/04E/08.
- **Biggest risks:** (1) a **requested booking becomes untouchable** the moment you leave 03 — no way to check on it or cancel it; (2) **money summaries that ignore reality** — 08's receipt charges $20 delivery even when the user chose free pickup, and R1/05X quote the $200/$20 fixture regardless of the actual order; (3) a cluster of **inert or mislabeled controls** that quietly erode trust.
- **Counts:** P0 × 0 · P1 × 4 · P2 × 6 · P3 × 2.
- **Highest-impact changes:** UX-001 (requested-card access), UX-002 (receipt honesty), UX-003 (popup copy honesty), UX-004 (dead controls), UX-005 (focus visibility).
- **Coverage limits:** no assistive-tech or real-device testing; findings there are code-inferred and labeled as such.

## Flow Scorecard

| Flow | Clarity (1–5) | Friction (1–5) | Trust (1–5) | Value Communication (1–5) | Key Evidence |
|---|---:|---:|---:|---:|---|
| Book (01 → 02 → pay → 03) | 4 | 4 | 4 | 4 | 2-pill + card editing is quick; deposit shown up front; live totals on 03 |
| Get matched → confirm (03 → 04C → 05/05C) | 4 | 4 | 3 | 4 | clear statuses; but leaving 03 orphans the request (UX-001) |
| Review & approve (04D → 06B/RC1) | 4 | 4 | 4 | 4 | added items highlighted in info blue; RC1 sets pricing expectations |
| Tailoring → handoff (04D → 07 → 07A/07B → 08) | 4 | 3 | 2 | 4 | ready-gating works; 08 receipt contradicts a pickup choice (UX-002) |
| Reschedule / cancel (R1 → 05X) | 3 | 4 | 2 | 3 | one popup serves reschedule AND cancel; amounts are fixture, not real (UX-003) |
| Browse & message (09, M1) | 4 | 4 | 4 | 4 | cards scan well; chat has auto-replies; back button works |

(Friction: 5 = low friction.)

## Recommended Changes

### P0 — Blocking

*None found — the core workflow completes end-to-end on mobile with no console errors.*

### P1 — Major UX Problems

### UX-001 — A requested booking is unreachable once you leave 03

**Screen / flow:** 01/09 appointment card (Requested) ↔ 03 - Finding Your Tailor
**Problem:** After requesting a tailor, leaving 03 (its own "View All Appointments" CTA invites this) strands the user: the Requested card is inert per spec, so there is no way to re-check matching status — and **no way to cancel the request**, since cancel lives only on 03.
**Observed behavior:** Booked a jacket → 03 → rendered 01. Card shows "Requested" pill + "We will match you with a tailor within the next 2 hours." Clicking it does nothing (verified: screen unchanged). No other route back to 03 exists.
**Reproduction:** 1. Book any garment and pay. 2. On 03, tap "View All Appointments." 3. Tap the Requested card → nothing; no cancel anywhere.
**Why it matters:** the reassurance copy promises a 2-hour match but offers no way to monitor or bail out; in the demo the flow also can't progress (the accept simulation lives on 03's map).
**Evidence:** live probe `clickInert: true`; `apptTarget()` returns null for searching/requested (per your directive).
**Recommended change:** keep the card free of a detail screen, but let tapping a Requested card return to 03 (the status view for that state) — or add "Cancel Request" as the card's action. Your call on which; the current spec ("does nothing") plus 03's exit CTA is the trap.
**Expected impact:** removes the only dead-end in the product.
**Effort:** XS **Confidence:** High **Status:** AWAITING APPROVAL

### UX-002 — 08's receipt charges $20 delivery even when the user chose free pickup

**Screen / flow:** 07 → 07A (pickup) → 08 - Journey Complete
**Problem:** The receipt always renders "Delivery - Paid 7/17/26 $20 / Total $360." Choosing Pickup (labeled **Free**) still shows a $20 delivery charge and a $360 total.
**Observed behavior:** Click-through path is pickup; 08 shows the delivery row regardless. `state.fulfilment.method` is recorded but never read by 08.
**Reproduction:** 1. Reach 07. 2. Choose Pickup → 07A → confirm. 3. 08 shows Delivery $20, Total $360.
**Why it matters:** the final money screen contradicts a choice the user just made — worst possible place to lose trust.
**Evidence:** [08-journey-complete.js](js/screens/08-journey-complete.js) fee rows are static; click-through confirms the pickup path lands here.
**Recommended change:** drive the row from `a.fulfilment`: pickup → no delivery row, Total $340 ("Due at pickup — paid" per your wording); delivery → $20/$360 as now. (Needs a small Figma decision for the pickup variant of 08.)
**Expected impact:** receipt matches reality on both paths.
**Effort:** S **Confidence:** High **Status:** AWAITING APPROVAL

### UX-003 — R1 and 05X quote fixture amounts and the wrong appointment

**Screen / flow:** R1 - Reschedule Popup, 05X - Appointment Cancelled (opened from 01/03/04C/05/09)
**Problem:** R1 always says "Thursday's 7:00 PM with Marco is cancelled" and "Your $20 deposit is refunded"; 05X always shows the $200/$20/$180 summary — regardless of the actual order (a fresh request has a $12 deposit, a Sunday appointment, different items).
**Observed behavior:** From 03 with a 1-item/$12-deposit request, R1 still cited Thursday/$20; confirming showed 05X's $200 fixture.
**Reproduction:** 1. Book one jacket → 03. 2. Cancel request → read the popup. 3. Confirm → read 05X.
**Why it matters:** money and dates are exactly where users check for correctness before a destructive action.
**Evidence:** live flow probe this session; both renders are hardcoded fixtures ([r1-reschedule-popup.js](js/screens/r1-reschedule-popup.js), [05x-appointment-cancelled.js](js/screens/05x-appointment-cancelled.js)).
**Recommended change:** interpolate from state (day/time, tailor first name, `totals.deposit`; 05X summary from the cancelled appointment). Also: when opened from 03's "Cancel request," the title "Before you reschedule" misframes a pure cancel — consider a cancel-worded variant.
**Expected impact:** destructive confirmations become trustworthy everywhere they open.
**Effort:** S **Confidence:** High **Status:** AWAITING APPROVAL

### UX-004 — Inert and mislabeled controls

**Screen / flow:** 04C, 04D, 01/09 cards, top nav, 08
**Problem:** Several visible controls do nothing or mislead: 04C "Message Tailor" (dead — its 04D twin works), "Add to Calendar" on 04C and 04D (dead), top-nav "Profile" (dead on every screen), "Leave Review" on completed cards (dead), and 08's "Leave a Review" which actually navigates to Bookings.
**Observed behavior:** wiring audit + click tests; no handler for the listed data-acts/labels.
**Reproduction:** tap any of the above.
**Why it matters:** every silent tap teaches the user not to trust buttons; "Leave a Review" going to Bookings is actively misleading.
**Evidence:** grep of `data-act` vs `addEventListener` per screen (R3 audit, re-verified at R5).
**Recommended change:** minimum viable pass — wire 04C's Message to M1 (one line); give Add to Calendar/Leave Review/Profile either a lightweight acknowledgment (toast/pressed state noting it's out of prototype scope) or remove them from these frames; relabel or re-route 08's review CTA.
**Expected impact:** every visible control does something honest.
**Effort:** S **Confidence:** High **Status:** AWAITING APPROVAL

### P2 — Meaningful Improvements

### UX-005 — No visible keyboard focus anywhere

**Screen / flow:** global
**Problem:** No `:focus-visible` styles exist, and the three input styles explicitly remove outlines; CTA focus probe returned no outline. Keyboard/switch users can't see where they are.
**Evidence:** css grep (only `outline: none` rules); live probe on a CTA.
**Recommended change:** one global rule — e.g. `:focus-visible { outline: 2px solid var(--info); outline-offset: 2px; }` — plus restoring a visible treatment on the form fields.
**Effort:** XS **Confidence:** High (code-verified; not screen-reader-tested) **Status:** AWAITING APPROVAL

### UX-006 — Modals ignore Escape and don't trap focus (sheets do)

**Screen / flow:** R1, RC1, 05C, PV3
**Problem:** Bottom sheets close on Escape and trap focus (`wireSheetA11y`); the newer `modalOverlay` popups don't — Escape does nothing (probe: `escCloses: false`), and Tab can wander behind the scrim.
**Recommended change:** run `wireSheetA11y(holder, close)` (or equivalent) inside `modalOverlay`.
**Effort:** XS **Confidence:** High **Status:** AWAITING APPROVAL

### UX-007 — 04D's card copy doesn't change with status

**Screen / flow:** 04D - Appointment Status
**Problem:** The pill and progress bar now track the real status, but the body always reads "…We'll tell you the moment they're ready" and the badge/need-by stay "JUL 17" — so a **Ready** order still says we'll tell you when it's ready, next to a Ready pill.
**Recommended change:** vary the note per status (awaiting-approval / tailoring / ready / completed — 2 short lines to write, needs your copy).
**Effort:** S **Confidence:** High **Status:** AWAITING APPROVAL

### UX-008 — 07A/07B secondary CTAs read as actions, act as navigation

**Screen / flow:** 07A / 07B
**Problem:** "Select Delivery" under "Confirm Pickup · …" looks like an alternate submit; it actually navigates to the other screen. First-time users may tap it expecting to confirm.
**Recommended change:** wording that signals a switch — e.g. "Switch to Delivery" / "Switch to Pickup" — or a segmented pickup/delivery toggle at the top instead of a bottom CTA. (Figma change; frames currently say "Select Pickup"/"Select Delivery" same-screen, which is a third variant.)
**Effort:** XS (copy) **Confidence:** Medium **Status:** AWAITING APPROVAL

### UX-009 — Sub-44px touch targets on small controls

**Screen / flow:** 02 (garment ✕ ~19px, selector menu options ~36px), PV3 legend text buttons, card ✕ on photos
**Problem:** Several tap targets sit well under the 44px mobile guideline; on a real phone the garment-remove ✕ will be a miss-tap magnet next to the Item selector.
**Recommended change:** keep visuals, expand hit areas (padding/pseudo-element hit zones).
**Effort:** S **Confidence:** Medium (emulated, not device-tested) **Status:** AWAITING APPROVAL

### UX-010 — Date/label format drift across screens

**Screen / flow:** cross-screen
**Problem:** The same facts render in competing formats: "Need by: Fri, Jul 17" (04D card) vs "Need By: Friday Jul 17" (04C/05 rows) vs pill "Jul 17, 3:00PM"; windows "4–6 PM" (chips) vs "4-6PM" (CTAs); and a **Ready** card's meta reads "Completed: Jul 1, 3PM." Each is frame-verbatim, but together they read as inconsistency.
**Recommended change:** pick one date grammar (suggest "Fri, Jul 17" / "Jul 17, 3:00 PM") and one meta label per status ("Ready since…" not "Completed:"), then sync frames + build together.
**Effort:** M (touches many frames) **Confidence:** High **Status:** AWAITING APPROVAL

### P3 — Polish

### UX-011 — "Please Confirm Tomorrows Appointment." missing apostrophe

**Screen / flow:** 05 (and the R1/RC1/05C backdrops)
**Problem:** "Tomorrows" → "Tomorrow's." Frame text; carried verbatim by the build.
**Recommended change:** fix in Figma (I can do it via the API); build follows.
**Effort:** XS **Confidence:** High **Status:** AWAITING APPROVAL

### UX-012 — PV3's controls suggest more than the placeholders deliver

**Screen / flow:** PV3 - Photo Viewer
**Problem:** Arrows/filmstrip/legend respond (ring moves, label toggles) but the stage never changes — feels broken rather than placeholder.
**Recommended change:** stamp a subtle "Photo 3 of 5 — Before" caption on the stage that updates with the selection, so the interaction visibly works even with placeholder art.
**Effort:** XS **Confidence:** Medium **Status:** AWAITING APPROVAL

## Opportunity Backlog (not usability defects — unprioritized)

- Requested state: a live "matching…" progress on the card itself (pulse, elapsed time) so 01 communicates without returning to 03.
- 05C: show the actual appointment date/time in the modal instead of only reassurance copy.
- M1: seed context-aware auto-replies per status (e.g., during tailoring, Marco replies about progress).
- 08: "Add a tip" / rate-with-stars inline, deferring the full review screen.
- Drag-scroll: momentum/inertia would sell the mobile feel further (currently 1:1 pan).
- Desktop: frame the 390 column in a device chrome to signal the intended viewport.

---

# Phase 5 — Decision Queue

| ID | Priority | Problem | Proposed Fix | Impact | Effort | Recommendation | Approval |
|---|---|---|---|---|---|---|---|
| UX-001 | P1 | Requested booking unreachable/uncancellable after leaving 03 | Requested card tap returns to 03 (or gains Cancel) | High | XS | Approve | ⬜ |
| UX-002 | P1 | 08 receipt shows $20 delivery on the free-pickup path | Fee rows follow `fulfilment` (pickup: no delivery row, $340) | High | S | Approve | ⬜ |
| UX-003 | P1 | R1/05X quote fixture $/dates, not the real order | Interpolate from state; cancel-worded variant from 03 | High | S | Approve | ⬜ |
| UX-004 | P1 | Dead/misleading controls (04C Message, Calendar ×2, Profile, Leave Review, 08 review→Bookings) | Wire Message; acknowledge-or-remove the rest; fix 08 label | High | S | Approve | ⬜ |
| UX-005 | P2 | No visible keyboard focus | Global `:focus-visible` ring + field treatment | Medium | XS | Approve | ⬜ |
| UX-006 | P2 | Modals ignore Escape / no focus trap | Reuse `wireSheetA11y` in `modalOverlay` | Medium | XS | Approve | ⬜ |
| UX-007 | P2 | 04D note/badge static across statuses | Per-status note copy (needs your wording) | Medium | S | Consider | ⬜ |
| UX-008 | P2 | 07A/07B "Select …" CTAs read as submit | "Switch to Delivery/Pickup" wording (Figma + build) | Medium | XS | Consider | ⬜ |
| UX-009 | P2 | Sub-44px touch targets (✕, selector options, PV3 legend) | Expand hit areas, visuals unchanged | Medium | S | Consider | ⬜ |
| UX-010 | P2 | Date/label format drift; Ready card says "Completed:" | One date grammar + per-status meta labels (Figma+build) | Medium | M | Consider | ⬜ |
| UX-011 | P3 | "Tomorrows" typo (Figma) | Fix apostrophe via API | Low | XS | Approve | ⬜ |
| UX-012 | P3 | PV3 placeholder feels broken | Live "Photo N of 5 — Before/Pinned" caption | Low | XS | Defer | ⬜ |

**Kevin's decision (recorded):** APPROVE UX-001/002/003/004/006/007/009/010/011 · REJECT UX-005 (mobile web — the system keyboard handles focus) · UX-008/012 deferred. Plus one extra approved fix: 04D's status card and order details must reference the appointment card that was clicked.

---

# UX Verification Report

## Summary

- **Approved:** UX-001, 002, 003, 004, 006, 007, 009, 010, 011 + the 04D-context fix. **Rejected:** UX-005. **Deferred:** UX-008, UX-012.
- **Implemented:** all 9 approved IDs + the 04D-context fix.
- **Tests:** full `npm run check` (25 diffs, text parity, click-through, lint — all PASS, no console errors); live browser verification of every item below; mobile-emulated viewport.
- **Overall result: PASS** (UX-009 and UX-010 PARTIAL by design — see notes).

## Item Results

- **UX-001 — PASS.** Before: Requested card inert; request uncancellable after leaving 03. After: tapping a Requested card returns to 03 (`apptTarget` → `03-finding-tailor`); verified live (card tap landed on 03, cancel available there).
- **UX-002 — PASS.** Before: 08 always showed Delivery $20 / Total $360. After: pickup renders `−$20 / $340 Total - Paid at pickup 7/17/26` (no delivery row); delivery path unchanged. Verified both paths live; harness default (no fulfilment) stays frame-verbatim.
- **UX-003 — PASS.** Before: R1/05X quoted the $200/$20 Thursday fixture. After: R1 rows read the actual appointment ("Jul 12, 7:00 PM with Marco…", "$12 deposit" on a fresh 1-item request); from 03 the modal is cancel-worded ("Before you cancel" / "Cancel Request"); 05X renders the cancelled order ($120/$12/$108, $12 refund). Direct harness loads keep the frame fixtures; R1's fixture row is a documented parity ALLOW.
- **UX-004 — PASS.** 04C Message → chat (verified); Add to Calendar (04C/04D) → "Added to your calendar" toast; Profile → "Profile is outside this prototype" toast (verified); Leave Review (09) and 08's Leave a Review → honest review toast (verified; 08 no longer jumps to Bookings). New `toast()` component.
- **UX-006 — PASS.** `modalOverlay` now runs the shared a11y wiring (the helper previously bailed without a `.sheet` panel — generalized to `.modal`/`.photo-viewer`). Escape verified closing R1 live; Tab is trapped in the panel; sheets regression-checked via click-through.
- **UX-007 — PASS.** 04D's note now varies: awaiting-approval ("…Review and approve the final order…"), tailoring (frame fixture), ready ("Your items are ready. Tap the order below — or use your appointment card — to choose how you'd like them back."), delivered ("…see your receipt."). Verified tailoring + ready live. Copy is mine — revise freely.
- **UX-009 — PARTIAL (by scope).** Invisible ~44px hit zones added to the garment ✕, photo-tile cancel, and PV3 legend (verified `::after inset: -12px` over the 13px ✕ glyph). Selector menu options (~36px rows) left as-is — taller rows would change the menu's Figma look; flag if you want them padded anyway.
- **UX-010 — PARTIAL (by scope).** Done in Figma + build together: "Need by: Fri, Jul 17" grammar unified across 04C/05/05X (+ popup backdrops), Ready-card meta now "Ready since: Jul 1, 3PM" (frame + build), 05X's when-row synced to Fri, Jul 12. Remaining drift, not yet touched: card metas use full weekday ("Sunday Jul 12, 7PM") vs abbreviated elsewhere; 07A/07B frame CTAs still write "4-6PM". Say the word for a second sweep.
- **UX-011 — PASS.** "Tomorrow's" fixed via the Figma API in all four frames (05 + R1/RC1/05C backdrops) and in the build.
- **04D-context fix — PASS.** The status card's badge, tailor name, and need-by now come from the clicked appointment (`a.month/day/name/needBy`; seeds and `requestTailor()` now carry `needBy`, and a fresh request derives its badge from the requested time instead of the stale AUG 29). Garments/totals were already appointment-driven. Verified: Marco renders JUL 12 / "Need by: Fri, Jul 17" with a status-true pill.

## Regression Findings

One self-inflicted defect found and fixed during verification: replacing 04D's card with the component instance had appended it to the end of the frame's (auto-layout) children, reflowing the hero to the bottom — caught by the 16% diff spike, fixed by reordering (`insertChild(0)`), re-verified at 0.42%. No other regressions: all 25 screens sit exactly on their baselines and the click-through passes end to end.
