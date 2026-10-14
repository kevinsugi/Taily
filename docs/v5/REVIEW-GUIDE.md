# v5 review guide — a 10-minute tour for Kevin

Live: https://kevinsugi.github.io/Taily/ (or `npm run serve`, then http://127.0.0.1:4173).
Add `?test=1` to skip the simulated waits. Open any step with `/?flow=<key>`, or use the **Test flows** button
(bottom right): pick a step, it resets the demo and opens it. **View as Tailor / View as Customer** in the same
menu flips persona and keeps the current state. The demo clock is frozen at Tue Oct 13, 10:00 AM.

Seed to keep in mind: services $125.00 + home-visit fee $35.00 = $160.00; deposit $16.00; balance $144.00;
Taily fee −$12.50; Amara takes home $147.50.

## 1. Customer side, first pass (about 4 minutes)

Open these in order. Each is a Test-flows key, so each one can be pasted after `?flow=`.

| # | key | look for |
|---|---|---|
| 1 | `c-welcome` | Phone-first entry; "Join Taily" for tailors |
| 2 | `c-job` | Garments and services per item, the booking stepper (5 steps, D-166) |
| 3 | `c-where` | At my place vs at the shop, need-by date; `c-where--rush` shows the rush preview |
| 4 | `c-tailors` | Estimate is the focal number on each row; `c-tailors--declined` for the dimmed "declined this job" row |
| 5 | `c-tailor` | "Your estimate" first, then returns, reviews, Ask a question |
| 6 | `c-book` | Scheduler limited to the tailor's open slots |
| 7 | `c-pay` | Deposit "Held today", not charged; `c-pay--declined` for the decline pattern |
| 8 | `c-request` | The 2-hour countdown; `c-request--soon` is the last minutes |

## 2. Tailor side, first pass (about 3 minutes)

| # | key | look for |
|---|---|---|
| 1 | `t-phone` then `to-profile`, `to-services`, `to-where`, `to-returns`, `to-availability`, `to-payouts` | The six onboarding steps; the take-home under each price you type (D-59) |
| 2 | `to-done` | "You're bookable" and the preview of what customers see |
| 3 | `t-shop`, `t-rush` | Shop settings, the "Taking requests" switch (D-161), the rush ladder in dollars |
| 4 | `t-home--push` | The in-app push card for a new request (D-167) |
| 5 | `t-home` | A request and an upcoming visit; count dots in the nav (D-164) |
| 6 | `t-request` | Decision first: take-home figure, visit, work, payout; Accept / Suggest time / Decline |
| 7 | `t-job--accepted` | "You accepted", the full name and address now shown (D-74, D-159) |

## 3. The booking from both sides (about 3 minutes)

Flip personas at the same moment of the story. Each pair is the same appointment, same dollars.

| moment | customer | tailor |
|---|---|---|
| Booked | `c-booking--confirmed` | `t-job--accepted` |
| Time suggested | `c-request--suggested` | `t-suggest`, `t-request--suggested` |
| Request expired | `c-request--expired` | `t-request--expired` |
| Fitting begins | `c-booking--fitting` | `t-job--visit`, `t-job--fitting` |
| Job edited at the fitting | `c-price-change--item-added` | `t-adjust--item-added`, `t-job--waiting` |
| Approved, tailoring | `c-booking--in-progress` | `t-job--approved`, `t-job--in-progress` |
| Ready, choose the return | `c-ready`, `c-ready--courier` | `t-job--mark-ready`, `t-job--ready` |
| Balance paid, done | `c-complete`, `c-review` | `t-job--completed` |
| Getting paid | `c-orders` | `t-earnings`, `t-payout`, `t-earnings--failed` |
| Talking | `c-thread--masked` | `t-thread--masked` |
| Cancel inside 24 hours | `c-booking--cancel-late` | `t-job--cancelled-late` |
| Customer no-show | `c-booking--no-show` | `t-job--no-show` |

Last, `sys-offline`, `sys-session-expired` and `sys-push-prompt` for the system layer, and `sys-index` /
`sys-components` for every screen and every component in one place.

## The decisions most worth your review

All are in `DECISIONS.md`; each says how to overrule.

1. **D-157** Late cancel (inside 24 hours) is deposit-only: no second charge, and the whole kept deposit goes to the tailor with no Taily fee (D-05). The master plan's wording "covers the home-visit fee" is left as it was; say if you want the tailor to get at least the home-visit fee.
2. **D-06** A customer no-show pays the tailor the larger of the deposit and the $25 compensation, not both.
3. **D-120** The fitting always ends in the customer's approval, even when nothing changed. There is no "no changes, start the work" shortcut.
4. **D-124 / D-23** The deposit never changes after the booking, even when items are added or removed at the fitting; only the balance moves. If the final order is worth less than the deposit, the refund settles with the balance (D-156).
5. **D-155 / D-25** The price is fixed when the request is sent. Moving the visit (suggested time, reschedule) can only lower the rush fee, never raise it.
6. **D-154** A suggested time lapses (24 hours, or 3 hours before it starts, whichever is first), and the request ends as expired with the hold released. This is a new timer you did not specify.
7. **D-74 / D-159 / D-88** Privacy: before accepting, the tailor sees "Sarah C." and only the neighborhood and zip; the full name comes with any accepted booking, the street address per booking, and goes away again on a cancel.
8. **D-75** The home card has no Accept button; the one-tap Accept / Suggest time / Decline live on the request screen, next to the take-home figure.
9. **D-100 / D-04 / D-160** Courier is quote + Taily courier fee = total, paid by the customer, shown in three dollar parts; the tailor sees only the pickup window, never courier money.
10. **D-24 / D-136 / D-152** Payouts are pending at completion and settle in a weekly run on Friday; a bank-returned payout is re-sent only when the bank details are saved again (D-148).
11. **D-07 / D-94** Expiry is 2 hours; Try again twice, then the tailor is hidden for that job; Try again is only offered while the visit still starts after the new window.
12. **D-87 / D-95** One status vocabulary on both sides, and the pill tone follows whose move it is (filled accent = you need to act).
13. **D-133** Account profile is read-only in the prototype ("You sign in with this number"); addresses are removed immediately with Undo, cards through a confirm sheet (D-134).
14. **D-70 / D-98** One money precision per screen: if any figure has cents, every figure on that screen shows cents.

## Known gaps and open items

From `M6-fixlist.md`. Fixes in that list are applied in batches; the last batch (copy sweep, flows, docs) was
still running when this was written, so `PROGRESS.md` is the source of truth for what has landed.

**Needs your call (recorded with overrule options):**
- Late home-visit cancel: keep deposit-only (D-157), or pay the tailor at least the home-visit fee.
- Home-visit no-show: same question (M6-T-19); the $25 compensation is unchanged until you say so.
- The 24-hour suggestion window (D-154) is a new `POLICY` timer.

**Deliberately not done (P3 and below, on the fixlist's Dropped table):**
- Address removal has no confirm sheet, only Undo, while cards do (M6-C-24; D-133 vs D-134).
- c-tailor's header differs from the rest of the booking path (M6-C-26; D-93).
- The profile email line is unused because the profile is read-only (M6-X-15).
- "Remind Sarah" on a waiting job and a weekly summary on tailor Home (M6-T-21, T-22): new features, not consistency fixes.
- No skeletons on t-home and c-bookings; one per persona is enough (M6-X-11d, D-141).
- A taste call left open on purpose (M6-P-45, D-54).

**Prototype limits worth knowing:**
- One mock tailor (Amara), one customer, Brooklyn only; payments, SMS codes, maps, photos and the courier quote are simulated.
- M2 and M5 were not reviewed at milestone time; the M6 audit covered them and its findings are on the fixlist.
- Figma: M1, M3 and M4 frames are on the v5 pages. M0 components, M2, M5, M6 and the `Flow v5` page still need the sync.
- Visual baselines in `ref/v5/` are code-rendered self-baselines, not Figma parity (D-01).
