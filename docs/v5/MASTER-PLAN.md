# Taily v5 — Master Build Plan

Oct 12, 2026 · Kevin · branch `V5` · source spec: `~/Desktop/Taily — Core Journey v5.md` (copied to `docs/v5/CORE-JOURNEY.md` in M0)

Goal: build the entire v5 customer + tailor experience — every screen, flow, edge and error state — in the existing prototype, fully autonomously, syncing Figma at each milestone. Kevin reviews asynchronously via the V5 branch, the live preview and Figma.

---

## 1. Operating model

| Setting | Value |
|---|---|
| Build target | Evolve the v4 prototype (plain HTML/CSS/JS, no build step) on `V5` |
| Order of work | **Code first → Figma** at each milestone |
| Human in the loop | **None.** Fully autonomous; decisions agents can't make are defaulted, logged in `docs/v5/DECISIONS.md` and flagged in the milestone commit |
| Models | **Opus 5.5 + Sonnet 5.5 mix** — Opus where judgment matters (orchestrator/triage, specs, UX-director reviews, Figma sync); Sonnet for volume work (components, screens, integration, fixes). See §5 |
| Budget | Runs until Kevin's session limit. Work is checkpointed per milestone so a new session resumes cleanly (§7) |
| Check-ins | Commit + push `V5` at every milestone; GitHub Pages serves `V5` → `https://kevinsugi.github.io/Taily/` |
| Figma | Same file `spK8ZHnsPlWEuD8zRmf5sY`; new pages (below). Written only through the Figma MCP (`use_figma`), following the **Taily Design System rules** (§5). No REST token — parity is checked via MCP metadata + a few screenshots |
| Visual direction | Keep the v4 design system: Taily / Colors, Cormorant Garamond (headings) + Hanken Grotesk (UI), sizes 10/12/16/24/28/32/36, existing Components page |

### New Figma pages
`User - v5` · `Tailor - v5` · `Tailor - Onboarding v5` · `Flow v5` (journey + state diagrams) · `Explorations` (existing; new components prototyped here before promotion). v4 pages are untouched.

---

## 2. Product decisions register (locked)

From Core Journey v5 + Kevin's answers. Anything not here that an agent must decide goes into `DECISIONS.md` as **DEFAULTED** with a reason.

**Marketplace**
- Customer browses a filtered list and books one tailor. No auto-match; v4 "Finding Tailor" is removed.
- Visit type is chosen up front: **At my place** or **At the shop**. Both exist (v5 overrides the old "delivery-only" rule; the Figma rules file is updated in M0).
- Home-visit tailors appear only if the customer's zip is in their zip list.
- Returns: each tailor offers any of **in-store pickup / home drop-off / Taily courier**. Courier = mocked Uber quote + 10% markup, paid by the customer.

**Money** — always shown as **dollar amounts, never percentages** (both sides)
- Prices come from each tailor's per-service price list. Estimates are shown from it.
- **Home-visit fee**: tailor-set, home visits only, goes to the tailor in full.
- **Rush fee**: kept. A **per-tailor rush ladder** (e.g. ≤1 day / 2 days / 3 days → $ amounts, 4+ days free) that the tailor edits in Shop → *Rush fees*. Shown in list estimates and the breakdown when the need-by date triggers it.
- **Taily fee**: 10% of the services subtotal (excludes home-visit fee, rush fee and courier — DEFAULTED for rush, flagged). Deducted from the tailor's payout; shown to the tailor as "Taily fee −$36.00".
- **Deposit** = 10% of (services + home-visit fee), shown as a dollar amount. Authorized when the request is sent, captured when the tailor accepts. Declined / expired → hold released in full.
- **Cancellation**: more than 24 h before the visit → full refund. Within 24 h → deposit kept (covers the non-refundable home-visit fee).
- **Balance** (remaining services + rush + courier) is paid when the order is Ready.
- **Price change** after the fitting: tailor sends adjusted prices → customer **Approves or Messages** the tailor. No reject/cancel path at this step; disputes are settled in chat. The deposit is unchanged; the balance changes.
- **No-show**: v4 $25 compensation to the tailor is **kept**.
- All rates live in one config table, `js/money-config.js`, mirroring the doc's "Taily fee settings" table. No hard-coded rates elsewhere.

**Requests**
- Tailor actions: **Accept · Suggest time · Decline** (optional reason).
- Expiry: 2 h. The customer gets **Try again** ×2 (new 2-h window each), then sees other tailors.
- Declined → back to "Tailors near you" with the job kept. The thread goes read-only with "Find another tailor"; that tailor can be requested again for a different job.
- Suggested time → the customer accepts it or picks another tailor.
- **Dropped from v4:** the 24-hour confirm prompt (Unconfirmed / Reminder screens), the Concierge fee, auto-match.
- **Kept from v4:** tailor "can't make it" and no-show flows (both sides), the Scheduler wheel (now limited to the chosen tailor's open slots), the persona switch, the Test-flows menu.

**Messaging**: one thread per customer–tailor pair, from "Ask a question" through the review. Phone numbers and emails are masked for both sides, and the sender sees a privacy note. Photos are allowed. Read-only after a decline.

**Accounts**: phone + SMS code (Apple / Google as secondary). Tailor sign-up leads straight into the 6-step onboarding.

**Seed data (Brooklyn, 1 mock tailor)**: the prototype ships **one** mock tailor in Brooklyn (modelled loosely on the two real Brooklyn prospects, but fictional), with a shop **and** home visits on, a zip list covering nearby Brooklyn zips (e.g. 11211, 11222, 11206, 11237), a full price list, a home-visit fee, all three return options, a rush ladder, availability, a rating and a few reviews. Customer Sarah is in a covered zip (11211). "Tailors near you" therefore lists one tailor. List-filtering states are reached from the **Test-flows** menu, not extra tailors: customer zip outside the list → *no tailors* empty state; "At the shop" with the shop toggled off → empty state; need-by earlier than the first opening → *nothing open* state; tailor previously declined → note on the row.

---

## 3. Scope — screen inventory

IDs are provisional; M0 fixes them in `scripts/screens.json`. "+ states" = sibling states built as code + Test-flows entries (sibling frames only when the layout changes).

### Customer
| # | Screen | States / errors |
|---|---|---|
| C-A | Welcome, Phone, SMS code, Name | invalid phone, wrong/expired code, resend timer, Apple/Google |
| C1 | What needs work (garments + job per garment) | empty selection, max items, photo add |
| C2 | Where and when (visit type, zip/address, need-by) | invalid zip, address required for home, need-by in past, rush preview |
| C3 | Tailors near you | loading skeleton, **no tailors in zip/visit type**, nothing open before need-by, filter/sort, previously-declined tailor note |
| C4 | Tailor profile (prices, reviews, returns, shop address, Ask a question) | no reviews yet, home-only/shop-only variants |
| C5 | Book: time slots → breakdown → pay deposit | no slots, payment sheet, add card, **card declined**, 3-D Secure, processing |
| C6 | Request sent / Waiting (2-h countdown, chat open) | — |
| C7 | Request outcomes | Confirmed · Suggested time · Declined · Expired (Try again 1/2, 2/2, then list) |
| C8 | Booking detail (Bookings tab) | upcoming, cancel (>24 h refund / <24 h kept), reschedule, tailor can't make it, no-show |
| C9 | Price change review (Approve / Message) | added, removed, re-priced items |
| C10 | Ready: pick return option → pay balance | courier quote loading/failed, payment failure |
| C11 | Completed → Review (stars, text, photos) | submitted |
| C12 | Messages list + thread | masked contact note, failed send/retry, read-only (declined), photo send |
| C13 | Account: profile, addresses, payment methods, past orders | empty states, remove card confirm |

### Tailor
| # | Screen | States / errors |
|---|---|---|
| T-A | Sign up (phone + code) | same errors as C-A |
| T-O1…O6 | Onboarding: Profile · Services & prices · Where you work · Return options · Availability · Payouts | per-field validation, "at least one of shop/home" rule, missing prices, invalid zip, bank details invalid, progress + resume, **bookable** confirmation |
| T1 | Home inbox (new requests + upcoming) | empty inbox, push-permission denied banner |
| T2 | Request card (garments, estimate, visit type + neighborhood/zip, time, need-by, **payout after Taily fee**, expiry timer) | expiring soon, expired |
| T3 | Accept / Suggest time (picker) / Decline (optional reason) | confirmations |
| T4 | Upcoming job (full address after accept, chat) | can't make it, no-show |
| T5 | Adjust price after fitting → waiting for approval | approved, customer messaged |
| T6 | Mark Ready → choose return method → Mark Completed | courier booked |
| T7 | Shop (edit any onboarding section) + **Rush fees** editor | validation, unsaved changes |
| T8 | Earnings: payout history, per-job fee breakdown, upcoming payouts | payout pending/failed |
| T9 | Messages list + thread | same rules as C12 |

### System-wide (both personas)
Offline banner + retry, loading skeletons, session expired → re-auth, toast/inline error patterns, push-permission prompt/denied.

---

## 4. Milestones

Each milestone is **one Workflow run** (kept under ~10 agents) and ends green on `npm run check`, with a Figma sync and a push.

| M | Name | Contents | Figma at end |
|---|---|---|---|
| **M0** | Foundation | Copy spec; rewrite `CLAUDE.md` for v5 (keep the token/harness rules, replace the money/v4 rules); `js/money-config.js`; v5 state machine in `js/state.js` (request → accepted/suggested/declined/expired → confirmed → fitting → price-change → in-progress → ready → returning → completed; cancel/no-show branches); Brooklyn single-tailor seed in `js/data.js` + `js/tailor-data.js`; retire v4-only routes (unregistered from `SCREEN_MODULES` and Test flows, files kept); screen inventory in `screens.json`; new shared components (tailor list row, price-list row, countdown, chat bubble/masked note, form field + error, stepper, skeleton, empty state, banner); update the Figma rules file (pickup allowed) | Create the 4 pages; `Flow v5` journey + request-state diagram; new components on Explorations → promoted to Components |
| **M1** | Customer booking | C-A, C1–C6, C4 "Ask a question" → thread stub; all listed errors | `User - v5`: booking frames |
| **M2** | Tailor onboarding + Shop | T-A, T-O1…O6, T7 incl. Rush fees; validation | `Tailor - Onboarding v5` |
| **M3** | Request loop (both sides) | T1–T4, C7, C8 (cancel/reschedule/can't make it/no-show), cross-persona sync (book as Sarah → accept as tailor → Sarah sees Confirmed) | `User - v5` + `Tailor - v5` request frames |
| **M4** | Fitting → completion | T5, T6, C9–C11, return options + courier quote, balance payment, reviews | both pages |
| **M5** | Messaging, accounts, earnings, system | C12, T9 (full rules), C13, T8, the system-wide states | both pages |
| **M6** | Final pass | Cross-persona director review of the whole journey, fix P0–P2, P3 batch, `Flow v5` refresh, README + HISTORY, final push | full sync + flow diagram |

---

## 5. Agent roster and per-milestone pipeline

Model split: **Opus 5.5** for roles that decide or judge; **Sonnet 5.5** for roles that execute a written spec. Orchestrator = Opus (this session). Each agent gets a **context slice**, never the whole repo or history.

| Role | Model | Count / milestone | Reads | Writes |
|---|---|---|---|---|
| **Spec writer** | Opus | 1 | `CORE-JOURNEY.md` section, `DECISIONS.md`, `CONTEXT.md`, the relevant `ref/*.png` names | `docs/v5/M#-spec.md`: per screen its focal element, data, copy, states, components used, the `FLOWS` + `EXPECT` entries. Runs the ui-ux-pro-max UX checks (forms, touch, a11y, empty/error) and the interface-design "Before writing each component" checkpoint |
| **Component builder** | Sonnet | 1 (serial, before screens) | spec + `components.js` / `components.css` grep ranges | new variants in `components.js` / `css/components.css` / `tailor-components.js`, tokens only |
| **Screen builders** | Sonnet | 2–4 in parallel, one per screen cluster | spec slice + component signatures | only `js/screens/<id>.js` + their CSS block + fixture entries in `js/fixtures/<milestone>.js`. **Never** edit shared files |
| **Integrator** | Sonnet | 1 | builder outputs | the shared registrations (`app.js` `SCREEN_MODULES`, `flows.js`, `screens.json`, `clickthrough-flows.mjs`); runs `npm run check` sequentially; fixes breakage |
| **UX director reviewer** | Opus | 1 per persona touched, parallel, read-only | live preview at 390×844 via Playwright, spec | findings `R{M}-U/T-##`, P0–P3, using the UX-LOOP format |
| **Fixer** | Sonnet (Opus if a finding failed a previous fix) | 1 | accepted findings | code fixes → `npm run check` |
| **Figma sync** | Opus | 1 | spec + `screens.json` + Components page | frames on the v5 pages using real Component instances and variable-bound tokens. Uses the `figma-use` skill; one `use_figma` call per page batch; verifies bindings; 3 spot-check screenshots |

**Pipeline per milestone:** Spec → Components → Screens (parallel) → Integrate + check → Review (parallel) → Triage (orchestrator: ACCEPT P0–P2, defer P3 to M6) → Fix → check → Figma sync → `DECISIONS.md` / `PROGRESS.md` update → commit + push `V5`.

**Review loop:** repeat Review → Fix until there are no open P0/P1, with **max 2 loops** per milestone. Anything left over is logged in `PROGRESS.md` and picked up in M6.

### Taily Design System rules (every Figma agent; no token resolution / ghost check step, per Kevin)
1. Check the Components page before building anything new; explorations go on Explorations in labeled neutral/50 wraps; never edit tokens/shared components while exploring.
2. Type sizes only 10/12/16/24/28/32/36; serif for display, sans for UI; Taily / Colors only; scrims use raw paints; spacing space/4–40; radius sm|md|lg|xl|full|20.
3. Bind every text fill, fontSize and fontFamily, and every frame fill/stroke; fallbacks equal a current token value; verify bindings and report any fallbacks.
4. Prefer variable modes over variants for content/state (Fee Row pattern); reuse Calendar/Cell, Time/Chip, Status Pill v2, CTA.
5. ~~Delivery-only~~ → **v5: shop visits and in-store pickup allowed**; times 9 AM–9 PM on :00/:30.

---

## 6. Token-efficiency rules

- **Context slices:** each agent prompt = its spec section + `docs/v5/CONTEXT.md` (≤150 lines: file map, component signatures, token names, conventions). No agent reads `HISTORY.md`, `UX-LOOP.md`, v4 specs or `garment-icons.js`.
- **Read narrowly:** `grep -n` / `sed -n` ranges; edits use short unique anchors.
- **Shared files have one writer** (the Integrator), so parallel builders never conflict and nothing is re-read to resolve merges.
- **Screenshots only in review and Figma spot checks.** Builders verify through `npm run check` and DOM assertions.
- **Figma:** batch frames into one `use_figma` call per page; verify via `get_metadata`, not screenshots; 3 visual spot checks per milestone.
- **Resumable workflows:** each milestone is its own Workflow run. If a run stops, `resumeFromRunId` replays cached agent results, so finished work isn't redone.
- **Structured outputs:** reviewers and builders return JSON (findings / files changed / check result), not prose.

---

## 7. Checkpointing and resume (session limit)

- `docs/v5/PROGRESS.md` is the single ledger: milestone status, last green commit, open findings, Figma sync status, next action.
- A milestone is "done" only after: check green → Figma synced → pushed. A partial milestone is resumed from its last completed phase.
- To resume in a new session, Kevin says **"resume v5"**. The orchestrator reads `PROGRESS.md` and continues from the next action.

---

## 8. Quality gates per milestone

1. `npm run check` green: diff baselines for new screens accepted on first build, click-throughs (customer, tailor, cross-persona sync, Test flows), style hygiene (no literal hex/px outside tokens).
2. Every screen in the milestone has a Test-flows entry and an `EXPECT` snippet; every state in §3 is reachable from the Test-flows menu.
3. Money assertions come from `js/money-config.js` via `scripts/money.mjs` and show dollar amounts only. The harness fails on any "%" in rendered money copy.
4. Contact masking unit check (phone/email patterns) in the chat click-through.
5. UX director verdict: no open P0/P1.
6. ui-ux-pro-max pre-delivery checklist: 44 px targets, 4.5:1 contrast, visible labels, error next to the field, loading feedback, reduced motion.

---

## 9. Deliverables Kevin reviews

| Where | What |
|---|---|
| `https://kevinsugi.github.io/Taily/` (Pages from `V5`) | Live prototype; Test-flows menu reaches every state |
| GitHub `V5` commits | One milestone commit each, with a summary + DEFAULTED decisions in the body |
| Figma `User - v5` / `Tailor - v5` / `Tailor - Onboarding v5` / `Flow v5` | Synced frames per milestone |
| `docs/v5/DECISIONS.md` | Every defaulted call, with a reason, ready to overrule |
| `docs/v5/PROGRESS.md` | Where the run is and what's next |

---

## 10. Defaults already taken (overrule anytime)

- Taily fee excludes the rush fee (as well as the home-visit fee and courier).
- Deposit authorized at request, captured on Accept.
- Courier quote is mocked: $8 base + $2.50/mile, then +10%.
- Reviews: 1–5 stars, optional text, up to 3 photos; shown on the tailor profile with average + count.
- Suggested time: accept, or pick another tailor (no counter-proposal).
- "Try again" re-sends the same job/time to the same tailor; after the 2nd expiry that tailor is hidden from the list for this job.
- v4 screens that v5 replaces are unregistered, not deleted; v4 Figma pages are untouched.
