# Pre-MVP review — findings coverage (Oct 18 2026)

Every item of `docs/v5/PRE-MVP-REVIEW.md` (blockers B-01…B-15, should-fix S-01…S-42, polish P-01…P-34, decisions D-01…D-24, design
gaps DG-1…DG-4) and the readiness plan's design flags a1…a9, traced to where it was fixed. Kevin's answers: **K-48** (fix everything;
D-01…D-24 verdicts), **K-49** (DG picks), **K-51** (texts), **K-52** (log in), **K-53** (readiness verdicts). Deferred by Kevin:
tipping (D-20), masked calling (D-14), Figma (a5).

Status: **fixed** = built as the review proposed (or as Kevin's verdict on it said) · **fixed-differently** = closed by a later Kevin call
that changed the answer · **deferred-by-Kevin** = Kevin moved it after the MVP. "Sweep" = `9977768`, the commit that added this file
(`pre-mvp: findings coverage sweep + leftovers`, decisions D-440…D-445).

Commits: `528ad2e` the 44 small fixes SF-01…SF-44 (D-304) · `b1ab7a7` A1 texts, timers, visit day, courier (D-310…D-318) ·
`17311db` B1 verification, payouts, listing, onboarding (D-350…D-362) · `2510261` A1+B1 merge (D-363) · `d1816bf` A2 Help, admin,
disputes, report / block (D-330…D-338) · `15be002` B2 Account v2, deposit V3, receipts, reviews, notes (D-370…D-379) · `a19dc43`
A2+B2 merge (D-380, D-381) · `7dc61de` K-51 texts (D-382…D-385) · `5786ec8` K-53 M hold at Ready, fee 15, ledger (D-400…D-411) ·
`4319301` K-53 L log in, admin sign-in, availability, legal drafts (D-420…D-431) · `1f24ef3` L+M merge (D-432…D-435).

## Summary

| Group | Items | fixed | fixed-differently | deferred-by-Kevin | fixed in the sweep |
|---|---|---|---|---|---|
| Blockers | 15 | 13 | 2 | 0 | B-02, B-07 (On the way) |
| Should-fix | 42 | 41 | 1 | 0 | S-17 (rem type), S-18 |
| Polish | 34 | 34 | 0 | 0 | — |
| Decisions | 24 | 18 | 5 | 1 | — |
| Design gaps | 4 | 4 | 0 | 0 | — |
| **Total** | **119** | **110** | **8** | **1** | 4 items + a8's shell |

Partly deferred inside a fixed item (named in its note): masked calling in S-32 / D-14 (Kevin: after the MVP).

## Blockers

| Id | Status | Where | Note |
|---|---|---|---|
| B-01 | fixed | 528ad2e (SF-01, D-304) | `threadReadOnly` stays writable while any job with that tailor is live; flows `c-thread--declined-active`, `t-thread--declined-active` |
| B-02 | fixed | **sweep**, D-440 | `approvePriceChange(id, { revision })`, `approveJobEdit(id, { revision })`, `answerProposal(id, accept, { start })` fail `revised` when the tailor re-sent; c-price-change re-renders with "Amara updated the order while you were looking · New total $X (was $Y). Check it before you approve."; c-booking toasts the new asked-for time. `sim.race` simulates the other phone. Flows `c-price-change--revised`, `--edit-revised`; model block "B-02". `acceptSuggestion` needs no version (a suggestion can't be revised, only withdrawn → `not-suggested`); the re-quoted courier is K-53 Q6 (D-403: she sees the new price before anything is booked) |
| B-03 | fixed | 528ad2e (SF-03) | "New total / Was" + "Rush fee · Removed · later due date" on both sides; flows `c-price-change--edit-due-rush`, `t-job--edit-pending-rush` |
| B-04 | fixed | 528ad2e (SF-02); 17311db (D-351, D-352) | Finish later never publishes; since B1 only a submitted tailor whose four checks passed is listed |
| B-05 | fixed | d1816bf (D-330…D-338); a19dc43 (D-380); 4319301 (D-430) | Help = a thread with Taily (c-case / t-case), Get help on every order + the tailor's ⋯, "Taily is reviewing · Reply by", admin a-inbox / a-case (K-48.1, K-49 DG-1 B), HELP text reply, Help hours |
| B-06 | fixed | b1ab7a7 (D-310, D-311); 7dc61de (D-382…D-385) | every event is a text through `notify()` (js/texts.js, 94 texts, docs/v5/TEXTS.md); one-time notice cards on c-job / t-home |
| B-07 | fixed | b1ab7a7 (D-312); 5786ec8 (D-400…D-402); **sweep** D-441 | every waiting state ends in `tick()` (24 / 72 h texts, 7-day Taily review, Withdraw changes, problem → review at 72 h, abandoned close); K-53 replaced the 14-day ready default with the hold at Ready; the unclaimed charge pays the tailor. The sweep adds the proposal's last piece: **On the way** on t-earnings (her booked jobs not paid yet, with what she takes home so far); flow `t-earnings--on-the-way` |
| B-08 | fixed | 528ad2e (SF-05); b1ab7a7 (D-310); 4319301 (D-429 SMS terms page) | consent copy with STOP / HELP and the "Taily: " prefix; booking texts a separate opt-in (c-name, c-texts, t-texts); auto-cancel only after a delivered reminder; "Texts are off" banners |
| B-09 | fixed-differently | 15be002 (D-372) → 4319301 (D-423, K-53 Q9) | social sign-in was routed to a required phone + code; Kevin then made the pilot phone-only (`POLICY.SOCIAL_SIGN_IN` false, the code kept) |
| B-10 | fixed | 528ad2e (SF-04); 7dc61de (D-383); 5786ec8 (D-409) | c-pay + deposit sheet state the reminder and the auto-cancel rule; K-51 / K-53 wording |
| B-11 | fixed | 528ad2e (SF-07); 17311db (D-350, D-352); 4319301 (D-427) | four checks, Verified derived (`isVerified`), not listed until all pass; background check last (K-53 Q8); disclosure is a counsel draft |
| B-12 | fixed | 528ad2e (SF-06); 17311db (D-351, D-355); 15be002 (D-373); 4319301 (D-429) | hosted payouts (Stripe Connect Express) with Verifying / Action needed / Paused, Tax documents, Tailor Agreement clickwrap, legal drafts (counsel) |
| B-13 | fixed | 17311db (D-354, K-48.2) | a tailor who can't do every item is never listed; c-pay's own banner; to-services says so |
| B-14 | fixed-differently | b1ab7a7 (D-313) → 5786ec8 (D-400…D-404, K-53 d2 / Q5 / Q6) | day-6 capture first; K-53 then placed the hold at Ready (`POLICY.BALANCE_HOLD_H` 114) with every window inside it, card-failed states for both sides, a pricier courier window charged on its own |
| B-15 | fixed | 17311db (D-356) | private courier pickup address on to-where when there is no shop; to-returns, t-shop, t-job name it |

## Should-fix

| Id | Status | Where | Note |
|---|---|---|---|
| S-01 | fixed | 528ad2e (SF-08) | Home leads with the reminder / the reply she owes |
| S-02 | fixed | 528ad2e (SF-09) | Confirm card kept in the missed state (overrides D-296(4); K-48 D-22) |
| S-03 | fixed | 528ad2e (SF-10) | shop-visit wording ("Confirm, I'll be there") |
| S-04 | fixed | 528ad2e (SF-11); b1ab7a7 (D-315); 7dc61de (D-384) | no Cancel / Reschedule after the start; "Did the visit happen?" at +2 h; K-51's evidence rule replaced the 24 h cancel-with-refund |
| S-05 | fixed | 528ad2e (SF-12) | Home / Bookings / t-home rows for handoff and pending edits |
| S-06 | fixed | b1ab7a7 (D-314, K-48.3) | "Confirm received" only after the mark or the pickup time |
| S-07 | fixed | 528ad2e (SF-13); 5786ec8 (D-400, D-401) | handoff times end inside the hold (now measured from Ready) |
| S-08 | fixed | 528ad2e (SF-14); 5786ec8 (D-411) | both sides see the day the held balance is charged |
| S-09 | fixed | 528ad2e (SF-15) | no unclaimed banner once marked; the sheet says she was charged |
| S-10 | fixed | 528ad2e (SF-16) | Picked up stays on a reported problem |
| S-11 | fixed | 528ad2e (SF-17) | withdraw / accept races land with the right words; `t-job--withdrawn` |
| S-12 | fixed | b1ab7a7 (D-318) | offline never moves money; inline errors by the button |
| S-13 | fixed-differently | K-48.4 (no quiet hours); 7dc61de (D-383); 4319301 (D-428, K-53 Q10) | Kevin: no quiet hours — texts go out at once; the reminder moved to 48 h / nudge 26 h (a 9 AM visit is no longer nudged at 3 AM); slow reminders only 8:00 AM–9:00 PM |
| S-14 | fixed | 528ad2e (SF-18) | Back on c-ready and every c-request entry but c-pay |
| S-15 | fixed | 528ad2e (SF-19) | the page strip is announced with the h1 (`aria-describedby="page-strip"`) |
| S-16 | fixed | 528ad2e (SF-20) | persistent live regions; action toasts 10 s, pause on hover / focus |
| S-17 | fixed | 528ad2e (SF-21); **sweep** D-443 | CTA min-height (SF-21); the sweep does the "before MVP" half: `--size-*` tokens in rem (16 px root), the layout tiers as em media queries (a doubled text size gets the 200 % zoom reflow, the c-tailors filter row wraps), garment tiles `min-height`. Identical pixels at the default size |
| S-18 | fixed | **sweep** D-442 | `tailorRow` is an `<article>` with a stretched-link button (the K-25 request-card pattern); the Verified check is a real sibling `<button>` above it; no visual change |
| S-19 | fixed | 528ad2e (SF-22) | saving Where rechecks Returns and Availability |
| S-20 | fixed | 528ad2e (SF-23) | the shop-off note + warning toast with Return options |
| S-21 | fixed | 17311db (D-361) | a tailor who isn't live lands on her next step / Shop; "Finish setting up" / "Under review" cards |
| S-22 | fixed | 17311db (D-360) | top-nav "Leave without saving?" (`register(…, { canLeave, discard })`) |
| S-23 | fixed | 15be002 (D-370, D-371); d1816bf (D-337) | Account v2 both personas: profile, phone change by code, texts, Help, policies, Delete account |
| S-24 | fixed | 528ad2e (SF-24); 15be002 (D-373); a19dc43 (D-380); 4319301 (D-429) | Terms line by Send code; real policy pages (drafts, Taily Group LLC, counsel); agreement version + time logged |
| S-25 | fixed | 528ad2e (SF-25); 15be002 (D-376) | "Paid $160.00"; c-receipt with number, charges, Email receipt (prototype) |
| S-26 | fixed | 15be002 (D-377) | c-reviews, "From customers who booked through Taily" |
| S-27 | fixed | 15be002 (D-379) | note for the tailor, access notes, saved-address picker, one address form |
| S-28 | fixed | 528ad2e (SF-26) | Tailoring step "Due Fri, Oct 23" |
| S-29 | fixed | 528ad2e (SF-27); 7dc61de (D-385) | none-left copy true for every ending; C6 lets her send Amara a new request |
| S-30 | fixed | 528ad2e (SF-28) | "Start over with new items"; "Start a new request" |
| S-31 | fixed | 528ad2e (SF-29) | Message Sarah on a new request |
| S-32 | fixed | b1ab7a7 (D-316); d1816bf (D-335) | On my way / I'm here (required before Mark as no-show, shown as evidence), Call placeholder, Report / Block, Safety. Masked calling: **deferred-by-Kevin** (D-14, after the MVP) |
| S-33 | fixed | b1ab7a7 (D-316, D-12) | Suggest a new time on a confirmed visit; Accept / Keep (now version-checked, D-440) |
| S-34 | fixed | b1ab7a7 (D-316 travel buffer); 4319301 (D-424…D-426); 1f24ef3 (D-432) | 30-min buffer, two windows a day, time off, minimum notice; handoff times read them |
| S-35 | fixed | b1ab7a7 (D-317); 5786ec8 (D-403, D-404) | Handed to courier → out → delivered (door / lobby photo, 24 h report) / returned → new window |
| S-36 | fixed | 528ad2e (SF-30…SF-32) | to-done texts + photo + payday steps; payout timing; pre-filled hours lead |
| S-37 | fixed | 528ad2e (SF-33) | `shopPlace(t)` skips an empty business name |
| S-38 | fixed | 17311db (D-353, D-18) | Years tailoring; under 5 → the waitlist |
| S-39 | fixed | 17311db (D-359) | previews show only what customers see, "What customers see" everywhere |
| S-40 | fixed | 528ad2e (SF-34) | photo consent on t-adjust; the fitting step says she pins and photographs |
| S-41 | fixed | d1816bf (D-336); 4319301 (D-429) | garment protection ($500 per order, 48 h report; counsel draft) on c-pay, the courier card, Help |
| S-42 | fixed | 17311db (D-357) | mock geocoder: city / neighborhood from the ZIP, unserved ZIPs refused, suite field, distances from her address (production: real geocoding) |

## Polish

| Id | Status | Where | Note |
|---|---|---|---|
| P-01 | fixed | 528ad2e (SF-35) | countdowns name the day ("by tomorrow 10:00 AM") |
| P-02 | fixed | 528ad2e (SF-35) | missed pickup names the day; "Pick a new time" |
| P-03 | fixed | 528ad2e (SF-36) | auto-completed pickup dated by the pickup mark |
| P-04 | fixed | 528ad2e (SF-39); b1ab7a7 (D-311) | review reminder copy + ✕ dismiss; not on c-complete |
| P-05 | fixed | 528ad2e (SF-36) | "Taily courier" keeps its capital |
| P-06 | fixed | 528ad2e (SF-37) | ready line: refund wording at $0; courier clause only when offered |
| P-07 | fixed | 528ad2e (SF-37) | "She's coming to your shop." |
| P-08 | fixed | 528ad2e (SF-37) | "Sarah doesn't have the code?" |
| P-09 | fixed | 528ad2e (SF-37) | edit intro: notes are hers, the rest needs Sarah's approval |
| P-10 | fixed | 528ad2e (SF-37) | "Start it when you're with Sarah." |
| P-11 | fixed | 528ad2e (SF-37) | "Send it by 12:00 PM, or the request expires." |
| P-12 | fixed | 528ad2e (SF-37) | rush marked in the visit row |
| P-13 | fixed | 528ad2e (SF-38) | "Update bank details" everywhere |
| P-14 | fixed | 528ad2e (SF-39) | "Charged when you get it" fallback (K-44…K-47 wording) |
| P-15 | fixed | 528ad2e (SF-39) | one precision in the Home reminder card |
| P-16 | fixed | 528ad2e (SF-40) | `fmtWhen` dates on notes and photo captions |
| P-17 | fixed | 528ad2e (SF-40) | one label per action; NOTE_EMPTY |
| P-18 | fixed | 528ad2e (SF-41); 15be002 (D-375) | c-cards remove: one title, a bottom sheet |
| P-19 | fixed | 528ad2e (SF-41) | "Pick a delivery window first." |
| P-20 | fixed | 528ad2e (SF-39) | refund timing on every refund state |
| P-21 | fixed | 528ad2e (SF-39); 15be002 (D-377) | review provenance caption |
| P-22 | fixed | 528ad2e (SF-42) | onboarding stepper is a nav + ol with aria-current |
| P-23 | fixed | 528ad2e (SF-42) | garment stepper count announced; no duplicate "removed" |
| P-24 | fixed | 528ad2e (SF-43) | one resume sentence (`resumeText`) |
| P-25 | fixed | 528ad2e (SF-43) | photo guidance on to-profile |
| P-26 | fixed | 528ad2e (SF-43) | `editScopeNote()` + "Saved. New requests use this now." |
| P-27 | fixed | 17311db | `textArea` section-label variant; the c-review override removed |
| P-28 | fixed | 528ad2e (SF-44); 15be002 (D-375) | tailor Sign out confirms in the bottom sheet |
| P-29 | fixed | 17311db (D-359) | `ownRow(job)`: a paused shop previews her real K-19 row |
| P-30 | fixed | 17311db (D-362) | About stops at 300 |
| P-31 | fixed | 15be002 (D-374) | single-target cards carry `--card-ring-tap` (3:1); the sweep keeps it on the restructured tailor row |
| P-32 | fixed | 15be002 (D-375); a19dc43 (D-381) | one confirm container: the bottom sheet (`confirmSheet` / `confirmAction`) |
| P-33 | fixed | b1ab7a7 (D-318) | one Message control on tailor handoff screens |
| P-34 | fixed | 17311db (D-358) | "Text me when a tailor covers 11201" |

## Decisions (Kevin's answers)

| Id | Status | Where | Note |
|---|---|---|---|
| D-01 | fixed | K-48.1 → d1816bf (D-330…D-332, D-337); 4319301 (D-430) | Help chat with the order attached; the CEO / admin resolves it (refund / keep deposit, release / capture hold, cancel, pause payout, reply) |
| D-02 | fixed | K-48 approved → b1ab7a7 (D-310); 7dc61de (K-51) | notification matrix = js/texts.js; booking texts a separate opt-in |
| D-03 | fixed | K-48 approved → b1ab7a7 (D-312); 5786ec8 (D-402) | clocks per waiting state; the 14-day default later replaced by the hold at Ready (K-53) |
| D-04 | fixed-differently | K-48 approved → b1ab7a7 (D-313) → K-53 d2 / Q5 → 5786ec8 (D-400, D-401) | day-6 capture became the hold placed at Ready (4 days 18 hours) |
| D-05 | fixed | K-48 approved → 17311db (D-352) | `POLICY.LIVE_REQUIRES_VERIFIED`; "Under review" on Shop / to-done |
| D-06 | fixed | K-48 approved → 17311db (D-351, D-355) | hosted payout onboarding, status states, fee card kept |
| D-07 | fixed-differently | K-48 approved → 15be002 (D-372) → K-53 Q9 → 4319301 (D-423) | Apple / Google then phone; the pilot is phone-only (flag off) |
| D-08 | fixed | K-48.2 → 17311db (D-354) | never list a tailor who can't do every item |
| D-09 | fixed | K-48.3 → b1ab7a7 (D-314) | "Confirm received" |
| D-10 | fixed-differently | K-48.4 (no quiet hours); K-53 Q10 → 4319301 (D-428) | none built by Kevin's call; only slow reminders keep daytime hours |
| D-11 | fixed-differently | K-48.5 → b1ab7a7 (D-315), d1816bf (D-334) → K-51 → 7dc61de (D-384) | asked at +2 h, admin at +4 h from the start; K-51 replaced the 24 h cancel-with-refund with the evidence rule (deposit held, 72 h to dispute) |
| D-12 | fixed | K-48 approved → b1ab7a7 (D-316) | tailor suggests a new time; Accept / Keep (version-checked, D-440) |
| D-13 | fixed | K-48 approved → b1ab7a7 (D-316) | `TRAVEL_BUFFER_MIN` 30 |
| D-14 | fixed | K-48 approved → b1ab7a7 (D-316); d1816bf (D-333, D-335) | "That's not right" → a Taily case; I'm here before Mark as no-show; masked calling after the MVP (deferred-by-Kevin, the recommendation itself) |
| D-15 | fixed | K-48 approved → 17311db (D-362) | "Change final order" |
| D-16 | fixed | K-48.6 → 17311db (D-362) | to-services intro in Kevin's words |
| D-17 | fixed-differently | K-48.7 → 17311db (D-362); K-49 → 15be002 (D-378) | tailor screens say "charged at pickup"; the deposit CTA became V3 "Reserve · $16.00 deposit / Charged only if Amara accepts" (not "Hold $16.00") |
| D-18 | fixed | K-48 approved → 17311db (D-353) | years collected; under 5 → waitlist |
| D-19 | fixed | K-48 approved → 17311db (D-362) | notes open from confirmed |
| D-20 | deferred-by-Kevin | K-48 ("tipping = after MVP: no build") | on the post-MVP list below |
| D-21 | fixed | K-48 approved → d1816bf (D-336); K-49 ("Taily provides insurance") | garment protection by Taily, $500 cap, 48 h report (counsel draft) |
| D-22 | fixed | K-48 approved → 528ad2e (SF-09, D-304) | Confirm card in the missed state |
| D-23 | fixed | K-48 approved → b1ab7a7 (D-313) | "Your bank may show it as pending until then." under Pay |
| D-24 | fixed | K-48 approved → 17311db (D-362) | underlined item names open their services popover |

## Design gaps

| Id | Status | Where | Note |
|---|---|---|---|
| DG-1 | fixed | K-49 option B → d1816bf (D-330…D-337); a19dc43 (D-380, D-381) | "Get help" person button + tailor ⋯ Get help, Help threads with topic chips, Help home, the case strip |
| DG-2 | fixed | K-49 option A → b1ab7a7 (D-310, D-311); 7dc61de (K-51) | notice cards + the text catalogue (sys-texts board) |
| DG-3 | fixed | K-49 option A → 15be002 (D-370) | grouped account settings, both personas |
| DG-4 | fixed | K-49 option B → 17311db (D-350…D-355); 4319301 (D-427) | checklist on Shop, Earnings mirror, no insurance item; background check last |

## Readiness plan design flags (a1–a9)

| Flag | Status | Where | Note |
|---|---|---|---|
| a1 land A2 + B2 | done | d1816bf, 15be002, a19dc43 | merged, checks green |
| a2 build K-51 | done | 7dc61de | 48 h / 26 h reminders, evidence rule, C/T/A numbering |
| a3 final journey review + tag | in progress | — | a separate read-only reviewer is walking the happy paths now; tag `mvp-spec-1.0` after its P0 / P1 fixes |
| a4 availability (S-34) | done | 4319301 (D-424…D-426), 1f24ef3 (D-432) | |
| a5 Figma catch-up | deferred-by-Kevin | K-53 ("a5 Figma ignored") | |
| a6 design-system handoff | done | `baf3977` (D-446) | DESIGN.md brought up to date, the gallery covers every shared component built since K-22 (`sys-components--since-k22` + live overlays), docs/v5/DESIGN-SYSTEM.md (engineering handoff) |
| a7 copy freeze | done (the deck; the freeze itself is Kevin + counsel) | `pre-mvp: copy deck for the freeze (K-53 a7)` (D-447) | docs/v5/COPY-DECK.md, generated by `node scripts/v5/copy-deck.mjs`: every state's screen copy, the 94 texts, the policy pages' headings + In short, every COUNSEL / made-up placeholder flagged |
| a8 remove prototype chrome, web-app shell | done (deep link left for the build) | 4319301 (D-422); **sweep** D-443, D-444, D-445 | Test flows admin-only (D-422). The sweep: `manifest.json` + theme colour + app icon + Apple web-app metas; the drawn 9:41 status bar only in the admin's test session (every harness / study boot, so no baseline moves) and the gallery — a real visitor's device draws its own (D-444); rem type (D-443). Deep-link route per appointment: left for the build — it needs persisted appointments and signed link tokens; the contract is written down (D-445) |
| a9 keep the deferred list deferred | done | this file, below | |

## Post-MVP list (a9 — deliberately deferred, do not build for the pilot)

- Tipping on c-complete, no Taily fee (D-20, K-48).
- Masked calling through a proxy number; the Call tile says so today (D-14, K-48).
- Figma catch-up from K-22 (a5, K-53).
- Apple / Google sign-in (code kept behind `POLICY.SOCIAL_SIGN_IN`, off — K-53 Q9, D-423).
- A native app (K-06: web app first).
- Tailor replies to reviews and reporting a review (review "Missing MVP features"; the all-reviews page itself shipped, D-377).

## The review's unnumbered "Missing MVP features" list

Not findings, so not counted above; where each stands. Platform items belong to the build (engineering spec), not the prototype.

| Item | Where it stands |
|---|---|
| Get help everywhere; Something not right after completion | built (B-05, D-330; c-complete Get help, damage topic) |
| Account v2, receipts, notes, saved addresses, all reviews, waitlist | built (S-23, S-25, S-27, S-26, P-34) |
| Texts for every event; Withdraw changes; Suggest a new time; visit-day tools; time off + buffer; courier states | built (B-06, B-07, S-33, S-32, S-34, S-35) |
| Notes before the fitting | built (D-19, D-362) |
| Earnings: tax documents · jobs in flight | built (D-355) · **sweep** "On the way" (D-441); a "paid this year" total is not built (post-MVP) |
| Customer history on the tailor side ("Booked you before"), finished photos at Mark ready, cover-photo crop preview, resume texts for an unfinished setup | not built — post-MVP candidates (no finding asked for them) |
| Get verified, hosted payouts, agreement clickwrap, courier address, years, Finish setting up, geocoding | built (B-11, B-12, B-15, S-38, S-21, S-42) |
| SMS service + 10DLC, support console, versioned approvals, one error contract, authorization handling | prototype shows each (D-310, D-331, D-440, D-318, D-400); production = the build |
| Random pickup codes, signed expiring links, UTC + tailor zone, idempotent payout job, deep link `/r/<token>` | the build (D-445 records the deep-link contract) |
| Web app shell (manifest, theme colour, status bar, rem type) | **sweep** (D-443, D-444) |
| Legal pages | drafts built (D-429, "Draft — counsel review required"); counsel owns the final text |
