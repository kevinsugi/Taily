# K-17 audit — messy status-screen heads (read-only)

Shots: `k17audit/shots/flow_<key>.png` (132 states, 390w full-page; the sticky action bar floats mid-page in full-page
captures, ignore it). t-request was mid-K-15 when shot, so it is judged on structure only. Kevin's waiting copy
($120.50, down $27.00) is a study variant; the `t-job--waiting` fixture renders the same structure as $188.00, up $40.50.

## Shared causes (fixing these clears most of the list)

| # | Component / spot | What it causes |
|---|---|---|
| S1 | `statusHero` + `headingRow` (components.js:306, :418) | Every status screen gets status pill → serif title → body notes. Screens pass a `pillLabel` that rewords the title, so the status line repeats it on almost every screen. |
| S2 | Screen-level stacks under the hero: `banner()` (t-job.js:295 approved, :352 rescheduled; c-price-change.js:62; t-payout.js:66; t-earnings.js:78), `deltaFigure` (components.js:2184; t-job.js:248; c-price-change.js:64; t-payout.js:62), `noteQuote` (t-job.js:235-240; c-price-change.js:65; c-booking.js:106; c-request.js:129) | Adds 1–3 more layers before content. The banners restate the status. The delta figure brings 2–3 meta lines. |
| S3 | `personBlock` via t-job `personCard(a,v,title,rows)` (t-job.js:103) | The section label sits above the person row, but it describes only the rows under it. `dueCard` gives "Timing" with one row (t-job.js:121). The return-mode titles do the same (t-job.js:305 + courier/pickup/drop-off). |
| S4 | c-booking `fitted` line (c-booking.js:278-300) | Adds a 4th header layer, "Fitted Thu, Oct 15 · At my place", on every post-fitting customer state. |
| S5 | t-job single-row `__money` (t-job.js:83) | Repeats the amount the subtitle has already given. |

---

## Ranked candidates

### 1. Approval cycle: money hero + quotes (Kevin #2, plus its customer mirror) — High — S1 S2
- Tailor: `t-job--waiting`, `t-job--waiting-unchanged`, `t-job--docs-unsent`, `t-job--messaged`, `t-job--replied`
- Customer: `c-price-change` (and `--item-added --item-removed --removed --repriced --docs --docs-pinned --photo-viewer`), `c-price-change--unchanged`, `--comment-masked`, `c-price-change--messaged`
- Problems:
  - The status repeats the title: "● Waiting on Sarah" / "Waiting for Sarah to approve", "● Reply to Sarah" / "Sarah wants to talk about the order", "● Approve order" / "Review your final order".
  - 5–6 layers come before the order:
    - status
    - title
    - subtitle ("You sent the final order at 5:00 PM. Start the work once Sarah approves.")
    - YOUR PAYOUT $188.00
    - "Was $147.50 · up $40.50"
    - "Sarah sees a new total of $205.00 (was $160.00)."
    - "Your note" quote
  - The hero's $188.00 appears again as the total of "YOUR PAYOUT IF APPROVED" further down.
  - `--messaged` / `--replied` stack two quote cards ("Sarah's latest message" + "Your note"/"Your reply").
  - `c-price-change--messaged` is the worst: title + subtitle + yellow banner ("You messaged Amara about the order. Approve when you're ready, or keep talking in chat.") + NEW TOTAL hero + note quote.
- Direction: keep one head line and one money line. Fold was/up and "Sarah sees…" into the breakdown. Show at most one quote (the latest) next to the order.
- Shots: flow_t-job--waiting.png, flow_t-job--waiting-unchanged.png, flow_t-job--docs-unsent.png, flow_t-job--messaged.png, flow_t-job--replied.png, flow_c-price-change.png, flow_c-price-change--unchanged.png, flow_c-price-change--messaged.png

### 2. Tailor in-work head + "Timing" person block (Kevin #1) — High — S1 S2 S3
- Keys: `t-job--approved`, `t-job--in-progress`, `t-job--docs`, `t-job--docs-pinned`, `t-job--mark-ready`, `t-job--fitting`, `t-job--fitting-docs`
- Problems:
  - The status repeats the title: "● In progress" / "Work in progress", "● Fitting" / "Fitting with Sarah Chen".
  - `approved` adds a green banner, "Sarah approved your changes. Your payout is $188.00." It restates the state, and the same $188.00 is in the breakdown.
  - "TIMING" labels a person block whose only other row is "Needed by Fri, Oct 23 · in 8 days" / "Fitting was Thu, Oct 15", then a full-width Message button.
  - In the fitting states it reads "Fitting was Thu, Oct 15" while the fitting is still happening.
- Direction: drop the banner (or make it a one-time toast). Make the due date part of the head or the person line rather than a labelled single-row block.
- Shots: flow_t-job--approved.png, flow_t-job--in-progress.png, flow_t-job--docs.png, flow_t-job--fitting.png, flow_t-job--fitting-docs.png

### 3. Return-stage person block mislabelled — Med-High — S1 S3
- Keys: `t-job--ready`, `t-job--courier`, `t-job--returning-pickup`, `t-job--returning-dropoff`
- Problems:
  - The label sits over the person row but describes something else:
    - "RETURN OPTIONS YOU OFFERED" over Sarah Chen + In-store pickup / Home drop-off / Taily courier (bare rows, nothing chosen)
    - "IN-STORE PICKUP" over Sarah Chen + Reyes Tailoring
    - "HOME DROP-OFF" over Sarah Chen + "Sarah's home"
  - `courier`: "HAND-OFF" holds only Sarah Chen plus Message (an orphan block). The courier card above it carries its own meta line, "Paid by Sarah · nothing comes out of your payout".
  - `ready`: "● Waiting on Sarah" / "Ready. Waiting for Sarah", plus a 3-line subtitle with "$144.00, plus the courier if she picks it".
- Direction: put the person row in one place and the return mode in another. A label only heads the list it describes.
- Shots: flow_t-job--ready.png, flow_t-job--courier.png, flow_t-job--returning-pickup.png, flow_t-job--returning-dropoff.png

### 4. Customer post-fitting heads (4 layers + timeline repeats the status) — Med — S1 S4
- Keys: `c-booking--in-progress`, `c-booking--docs`, `c-booking--returning-pickup`, `c-booking--returning-dropoff`, `c-booking--returning-courier`, `c-booking--completed`
- Problems:
  - Four layers before content: status / title / subtitle / "Fitted Thu, Oct 15 · At my place".
  - The status line repeats inside the timeline: "● In progress" next to the "Tailoring" now-step, and "● Ready for pickup" next to "Back with you · Ready for pickup".
  - The $144.00 balance appears in the subtitle, the timeline and Price.
  - `completed` says the same thing three times: "● Completed" / "All done with Amara" / "Amara completed your order on Thu, Oct 15." then "Fitted…".
  - `returning-pickup`: the title "Pick it up at Reyes Tailoring" repeats in the IN-STORE PICKUP block, along with the extra line "Amara marks the order completed when you have it."
  - `returning-courier`: "You've paid in full" in the subtitle, then a courier-cost block (Uber quote / fee / total / "Included in the $154.45…") before the timeline.
- Direction: drop the Fitted line (or move it into the timeline's done step). Let the status or the title carry the state, not both plus the timeline.
- Shots: flow_c-booking--in-progress.png, flow_c-booking--completed.png, flow_c-booking--returning-pickup.png, flow_c-booking--returning-courier.png, flow_c-booking--returning-dropoff.png

### 5. Tailor terminal heads: status = title + money stated twice — Med — S1 S5
- Keys: `t-job--completed`, `t-job--completed-paid`, `t-job--completed-failed`, `t-job--no-show-done`, `t-job--cancelled-late`, `t-job--cancelled`, `t-job--cant-make-it-done`
- Problems:
  - `completed`:
    - "● Completed" / "Job completed" / "Sarah's order, completed Thu, Oct 15." (three layers, one fact)
    - The YOUR PAYOUT hero has a pill plus a meta line ("Pending Arrives Fri, Oct 16 · to Chase •••• 6789"). `-failed` instead shows "Didn't go through" / "Sends again once you update your bank details." / "See the payout".
    - An orphan line, "Picked up at your shop · Thu, Oct 15", sits inside the payout section.
  - `no-show-done`: "● No-show" / "Marked as a no-show". The subtitle says "You're paid $25.00 in total", then the row "No-show pay $25.00 · Arrives Fri, Oct 16" says it again.
  - `cancelled-late`: "● Cancelled by Sarah" / "Sarah cancelled". The subtitle says "you keep her $16.00 deposit", then the row "Kept deposit $16.00" repeats it.
  - `cant-make-it-done`: "● Cancelled" / "Visit cancelled", plus the meta "Your reason: Family emergency".
- Direction: keep the pill or the title, not both. State the amount once, in the money row, not in the subtitle.
- Shots: flow_t-job--completed.png, flow_t-job--completed-failed.png, flow_t-job--completed-paid.png, flow_t-job--no-show-done.png, flow_t-job--cancelled-late.png, flow_t-job--cant-make-it-done.png

### 6. Suggested-time heroes with stacked meta (both sides) — Med — S1 S2
- Keys: `c-request--suggested`; `t-request--suggested`, `t-request--withdraw` (t-request mid-K-15)
- Problems:
  - Customer:
    - "● New time suggested" / "Amara suggested a new time"
    - A NEW TIME hero "Thu, Oct 15 · 6:00 PM" with three meta lines: "You asked for Thu, Oct 15 · 5:00 PM", "Same price. If you accept, your $16.00 deposit is charged and you're booked.", "Amara is holding this time until Wed, Oct 14 · 10:00 AM".
  - Tailor:
    - Strip "You suggested Thu, Oct 15 · 6:00 PM · 24h", then "Waiting on Sarah" + a 2-line note, then the head.
    - The visit row repeats "6:00 PM" and "Sarah asked for…".
    - The new time appears 2–3 times above the work.
- Direction: one time figure with one "was" line. The hold deadline goes into the countdown, not a sentence.
- Shots: flow_c-request--suggested.png, flow_t-request--suggested.png, flow_t-request--withdraw.png

### 7. Payout failure: banner restates the hero — Med — S1 S2
- Keys: `t-payout--failed`, `t-earnings--failed`, `t-earnings--failed-and-next`
- Problems:
  - `t-payout--failed`: "● Didn't go through" / "Your payout" / $147.50 / "Sends again once you update your bank details.", then a red banner, "Update your bank details to get paid · We'll send $147.50 again on Fri, Oct 23 after you save them." $147.50 shows 3× before the breakdown.
  - `t-earnings--failed`: banner "Your Friday payout didn't go through · Chase •••• 6789 returned $147.50…", then the label "DIDN'T GO THROUGH" over $147.50 with 2 meta lines.
  - `failed-and-next`: the hero is a whole sentence, "Fri, Oct 23 · $260.00 once you update your bank details".
- Direction: either the banner or the hero carries the failure, not both. Keep the hero a figure with one meta line.
- Shots: flow_t-payout--failed.png, flow_t-earnings--failed.png, flow_t-earnings--failed-and-next.png

### 8. Customer notice heads: long subtitle + note quote — Med-Low — S1 S2
- Keys: `c-booking--cant-make-it`, `c-request--declined`, `c-booking--no-show`, `c-booking--cancelled`, `c-booking--cancelled-late`, `c-request--expired*`
- Problems:
  - `cant-make-it`: "● Cancelled by Amara" / "Amara can't make it", a 4-line subtitle ("Amara cancelled your Thu, Oct 15 · 5:00 PM visit. Your $16.00 deposit is refunded in full, and your items and services are saved…"), then the quote "Family emergency". The deposit appears again in Price ("Refunded").
  - `declined`: "● Declined" / "Amara declined your request", a 3-line subtitle, then the quote "Fully booked that week".
  - `no-show`: a 5-line subtitle.
- Direction: a one-sentence subtitle. The note goes into the person/visit block. Money appears only in Price.
- Shots: flow_c-booking--cant-make-it.png, flow_c-request--declined.png, flow_c-booking--no-show.png

### 9. Low: status = title / minor orphans
- `c-ready*`: "● Ready" / "Your order is ready". In `c-ready--refund`, the 3-line subtitle repeats $6.50, which the CTA and rows also carry. Shots: flow_c-ready.png, flow_c-ready--refund.png
- `c-complete`: "● Completed" / "All done" / "Amara marked your order completed. Thanks for booking with Taily.", plus an orphan strip "2 items · back with you". Shot: flow_c-complete.png
- `t-job`, `t-job--rescheduled`, `t-job--no-show`, `t-job--visit`:
  - The title "Visit with Sarah Chen" is followed by a VISIT block whose first row is "Sarah Chen" again.
  - The `rescheduled` banner ("Sarah moved this visit to Thu, Oct 15 · 5:30 PM (was 5:00 PM).") restates the row directly below.
  - Shots: flow_t-job.png, flow_t-job--rescheduled.png
- `t-home--in-progress` card: the section label "IN PROGRESS", the pill "● In progress" and "Tailoring · needed by Fri, Oct 23" (wraps to 2 lines) all say the same thing. Shot: flow_t-home--in-progress.png
- `t-payout` (paid/kept/no-show): "● Paid" / "Your payout" / $147.50 / "Paid Fri, Oct 16 · …" says "paid" twice. Shot: flow_t-payout.png

## Checked, no issue of this kind
c-request (band + title + one line), c-booking confirmed/fitting/default, t-request new/urgent/rush/shop (strip + head, mid-K-15), t-home default/suggested, t-earnings default/pending/kept, c-orders*, c-review*, c-bookings*.
