# Taily v5: copy review (impeccable `clarify`)

Proposals only. No source file was changed. Branch `V5`, after M7 polish (commit f81baad), Oct 14 2026.

## Scope and method

- **Surface mode:** Operate (app UI), both personas. This is a refinement of what is already built. The brief comes from Kevin's K-01..K-03 decisions and MASTER-PLAN §2, and where it conflicts with taste, the brief wins. The voice stays as it is: plain, warm, short sentences, money always stated as a dollar amount. Nothing here adds a claim or changes a policy.
- **What was read:** the visible text and accessible names of all 287 flow states in `ref/v5/` (rendered headless at 390 px through `?flow=<key>`, not taken from the source). On top of that: every `toast(...)` call, every error map (`ERRORS`, `MSG`, `ERR`, `RETRY_ERRORS`, `CARD_ERRORS`), the info sheets (`INFO` in `js/components.js`), the system thread lines (`say(...)` in `js/state.js`), the status words (`statusWord` in `js/focus.js`, `PILL_VARIANTS`) and `js/data.js` labels.
- **Context:** the impeccable launcher ran. There is no PRODUCT.md or DESIGN.md, so the code is the reference for the existing design. `/impeccable init` can capture PRODUCT.md later if Kevin wants it. No one was available to answer interview questions in this workflow run, so audience and emotional state were inferred from MASTER-PLAN §2 and CORE-JOURNEY (Sarah is booking and paying; Amara is working at a fitting table with a customer watching).
- **Money rule:** every amount in the *Proposed* column is written as a token (`{deposit}`, `{refund}`, `{kept}`, `{balance}`, `{payout}`, `{noShowPay}`, `{rush}`, `{amount}`) and stands for the value already computed in `js/money.js` or `appt.money`. No new rate, no new literal and no percentage. The *Current* column shows the seed values as they render today. Times and names are tokens too (`{first}`, `{expires}`, `{needBy}`, `{next}`, `{zip}`).
- **Priority:** **P1** means a reader could misunderstand money, privacy or who has to act next. **P2** means the copy is unclear or inconsistent in a way that slows a decision. **P3** is polish.

## The five findings that matter most

1. **Whose money and whose move is often missing (P1).** "After that, the $16.00 deposit is kept" (c-pay, c-booking, the deposit info sheet), "cancelling now keeps the $16.00 deposit", and on the tailor side "Sarah has been told and refunded her $16.00 deposit" all leave out who keeps or refunds the money. The no-show sheet says "Sarah's $16.00 deposit is kept and you're paid $25.00". That reads as $41, but the model pays `max(deposit, $25)`, so Amara gets $25.00 in total. Each of these is fixed by naming who gets the money.
2. **A deadline is written from the wrong side (P1).** On c-request, Sarah sees "Reply by 12:00 PM" under "2h left". That is Amara's deadline, but it reads as an instruction to Sarah. The thread header already says it the right way ("2h left for Amara to reply"), and so does the tailor side ("Answer by 12:00 PM").
3. **"Charged when ready" isn't what happens (P1).** The action bar on c-price-change says "New balance, charged when ready". In practice Sarah picks how to get the order back and taps **Pay $X** on c-ready. Nothing is charged automatically. The Balance row on the same screen already says "Due when ready".
4. **The customer sees the tailor's word "job" (P2).** Sarah's side uses request, booking and order, but declines, expiries and the read-only thread switch to "job": "can't take this job", "Your job details are saved", "Start a different job", "hidden for this job", "Declined this job". The c-tailors declined state says it four times in a row. See the glossary below. "job" stays on the tailor side only.
5. **Rush fees are described four different ways (P2).** The customer ladder says "Ready within 1 day", the breakdown says "Need-by 1 day after the visit", c-book says "visit 1 day before your need-by", and t-suggest says "1-day turnaround". All four describe one rule: the number of days between the visit and the need-by date. The proposal settles on the breakdown's wording on the customer side.

Smaller items that come up across screens: the Taily fee prints without a minus in the service rows ("Taily fee $2.50"), against the house rule "Taily fee −$12.50". The wrong-code error has two wordings. A failed payout is called "didn't go through", "came back" and "sent back". Generic statements about "a customer" use "she". One system thread line tells the tailor to "choose how to get it back".

## Glossary (one word per idea)

| Idea | Customer side | Tailor side | Retire |
|---|---|---|---|
| What Sarah sends before an accept | request | request | — |
| An accepted visit and what follows | booking | job (visit) | "job" on the customer side |
| The garments and services | order / items and services | the work / the job | "job details" (customer) |
| Final list after the fitting | final order | final order | "price change" in UI copy (the status id stays) |
| Deposit kept on a late cancel or no-show | "{first} keeps the deposit" | "you keep the deposit" | passive "the deposit is kept" |
| Need-by vs. visit gap (rush) | "Need-by N days after the visit" | "Ready within N days of the visit" (t-rush editor only) | "turnaround", bare "Ready within 1 day" |
| Date the work is due | need-by / needed by | needed by | "due" (t-home, t-job Timing) |
| A payout the bank returned | didn't go through | didn't go through | "came back", "sent back", "once your bank is fixed" |
| Return choice | how to get it back / return options | return options | "ways back" |
| Free text from the tailor | note (on the order) · comment (on one item) | same | — (keep both, label them) |

---

## Review table

Locations are `file:line` at f81baad. "Shared" rows are string sources that more than one screen renders.

### Shared: components, data, state, system

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| shared (c-pay, c-booking, c-request info ⓘ) | `js/components.js:970` (`INFO.deposit`) | "Free cancellation until 24 hours before the visit. After that, the deposit is kept." | "Free cancellation until 24 hours before the visit. After that, the tailor keeps the deposit." | **P1** The passive voice hides who gets the money. The cancel sheet already says it "pays {first} for the time set aside". |
| shared (c-tailor, t-rush preview, to-done) | `js/components.js:1732` (`rushLadder`) | "Ready within 1 day +$40 · Within 2 days +$25 · Within 3 days +$15 · 4+ days No rush fee" | Customer preview: "Need-by 1 day after the visit +{rush1} · 2 days after +{rush2} · 3 days after +{rush3} · 4+ days after: no rush fee" | **P2** "Ready within 1 day" doesn't say of what. This matches the breakdown caption (`components.js:1416`) and c-book's note, so Sarah reads one rule everywhere. |
| shared (to-services, sys-components) | `js/components.js:1621` (`takeHtml`) | "You take home $22.50 · Taily fee $2.50" | "You take home {payout} · Taily fee −{fee}" (`fmtNeg`) | **P2** House money rule: the Taily fee always prints as a deduction, as on every tailor breakdown ("Taily fee −$12.50"). |
| shared (t-adjust, t-job, c-price-change docs viewer) | `c-booking.js:447`, `c-price-change.js:115`, `t-adjust.js:663`, `t-job.js:530` (viewer `by` line) | "Taken by Amara · Thu, Oct 15, 5:00 PM" | "Taken by Amara · Thu, Oct 15 · 5:00 PM" | **P3** Every other date and time in the app uses "Thu, Oct 15 · 5:00 PM". |
| shared (c-tailors, c-tailor, gallery) | `js/components.js:1090` (`tailorRow`) | "Declined this job" | "Declined this request" | **P2** Glossary: the customer side doesn't use "job". |
| shared (c-tailor) | `js/components.js:936` (`VERIFIED_LINES[1]`) | "Cleared before the first booking." | "Passed a background check before their first booking." | **P3** "Cleared" doesn't name the check, and the row title above it ("Background check") is easy to skip. No new claim. |
| shared (c-price-change, t-adjust, t-job) | `js/components.js:1937` (`changeSummary`, unchanged) | "No changes. Same items, same price as booked." | Keep on the tailor side. On c-price-change, leave this line out when nothing changed (see c-price-change). | **P2** On the customer screen it is the third statement of the same fact (lead, "Same as booked", this line). |
| shared (statusPill defaults) | `js/components.js:145-146` | "New Request", "Awaiting Customer" | "New request", "Awaiting customer" | **P3** Sentence case everywhere (D-111). The live screens override these labels, but the defaults can leak through the gallery or a new call site. |
| shared | `js/components.js:181`, `:335` | "Select Time", "Visit Details" | "Select time", "Visit details" | **P3** Same reason: sentence case at the source, uppercased by CSS (D-192). |
| shared (thread, both readers) | `js/state.js:995` (`markReady` system line) | Both readers see: "Ready — choose how to get it back" | Customer: "Ready. Choose how to get it back." · Tailor (`tailorText`): "You marked it ready. Waiting for {first} to choose how to get it back." | **P2** Amara currently reads an instruction meant for Sarah. Every other system line has a reader-specific version (D-98). |
| shared (thread) | `js/state.js:753` | "Amara can't make it" (straight apostrophe) | "Amara can’t make it" | **P3** Typography: every other string uses ’. |
| shared (thread, customer reader) | `js/state.js:659` | "Amara withdrew her suggested time" | "Amara withdrew the suggested time" | **P3** The template assumes a pronoun for any tailor. |
| shared (thread) | `js/state.js:94` | "Amara’s suggested time passed" (name hard-coded) | "{tailorFirst}’s suggested time passed" | **P3** The wording is the same for the seed, but it breaks for any other tailor. |
| shared (thread, customer reader) | `js/state.js:695` | "Request expired" | Customer: "Request expired. Your hold was released." · Tailor: "Request expired" | **P3** Sarah's thread is the record she scrolls back to. The money result belongs on the line. |
| sys-session-expired, sys-session-expired-tailor | `js/system.js:63` | "That code isn’t right. Check the text and try again." | "That code doesn’t match. Check your texts and try again." | **P3** Same error, same words as c-code and t-code. |
| sys-error-toast (c-pay) | `c-pay.js:281` + inline banner | Banner: "Something went wrong on our side. Nothing was held. Try again." · Toast: "Couldn’t send your request" | Keep. | Good pattern: what failed, the money state, and the next step. Use it as the model for the generic errors below. |
| shared (t-request, t-suggest, t-adjust, c-request toasts) | `t-request.js:289`, `t-suggest.js:136`, `t-adjust.js:488/495/518/597`, `c-request.js:274/286` | "Something went wrong. Try again." | Name the action, e.g. "Couldn’t accept the request. Try again." · "Couldn’t send your suggestion. Try again." · "Couldn’t save the photo. Try again." · "Couldn’t accept the new time. Your hold is unchanged." | **P3** A toast disappears, and "something" doesn't say whether the action took effect. |
| shared (to-* editing toasts) | `to-where.js:248`, `to-returns.js:186`, `to-availability.js:247`, `to-profile.js:241`, `to-services.js:252`, `to-payouts.js:229` | "Where you work saved" / "Return options saved" / "Availability saved" | "Saved. Customers see the change now." (one string for every section) | **P3** "Where you work saved" reads as broken grammar. The section is already on screen. |

### c-welcome · c-phone · c-code · c-name · c-account · c-addresses · c-cards · c-orders · c-messages

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-name | `c-name.js` lead | "Tailors see your first name and last initial until they accept your request, then your full name and address." | Keep. | The privacy meaning is exact, and it is placed where the name is typed. |
| c-addresses--error | `c-addresses.js:155` (toast) | "Couldn’t remove it" | "Couldn’t remove the address" | **P3** The toast floats over the list, and "it" points nowhere. |
| c-cards--in-use | `c-cards.js` sheet | "You need a card on file while a booking is open. Add another card first, then you can remove this one." | Keep. | Says what blocks the action and how to unblock it. |
| c-welcome | `c-welcome.js:45` (toast for Terms / Privacy) | "Not built yet" | "Terms and Privacy aren’t in this prototype yet." | **P3** It's a dead end anyway, so the toast should say what isn't there. |

### c-job (step 1)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-job, c-job--max, c-job--no-service | `c-job.js:51` (caption beside the camera tile) | "Optional" | "Photo (optional)" | **P2** A bare "Optional" under the services line reads as if the services were optional, and the no-service error says the opposite. |

### c-where (step 2)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-where--rush | `c-where.js:71` | "Rush fees may apply for this date." | "A date this soon can add a rush fee. Each tailor’s price includes it." | **P2** "May apply" leaves the money vague. The amount depends on the visit time, so the honest fix is to say where it will show up (the list's "Includes … rush fee"). |
| c-where--needby-past | `c-where.js:25` | "That date has passed. Pick a date from tomorrow on." | "That date has passed. Pick tomorrow or later." | **P3** Shorter and more natural. |

### c-tailors (step 3)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-tailors--declined | `c-tailors.js:95-97` (banner) | Title "Amara can’t take this job" · "Your job details are saved. You can still book Amara for a different job." · action "Start a different job" | Title "Amara declined this request" · "Your items and services are saved. You can still book Amara for other work." · action "Start a new request" | **P2** Glossary, and "declined" is the word Sarah sees on the thread and the pill. |
| c-tailors--declined, --none-left | `c-tailors.js:118` (count line) | "No tailors available for this job" | Leave it out when the empty state below is shown. | **P2** With the banner, the row note and the empty-state title, this is the fourth message saying the same thing. |
| c-tailors--none-left, --declined | `c-tailors.js:76`, `:125` | Title "No other tailors for this job yet" · "Amara didn’t reply in time. We’ll let you know when more tailors join near 11211." | Title "No other tailors for this request yet" · "Amara didn’t reply in time, and no other tailors cover {zip} yet. A later need-by date or another ZIP may open more." | **P2** Glossary. "We’ll let you know" promises a notification that doesn't exist (see *Ask Kevin*). The replacement gives two things she can actually do, which match the two buttons. |
| c-tailors--nothing-open | `c-tailors.js:69` | CTA "Pick a later date" | "Change need-by date" | **P3** The same action is called "Change need-by date" on c-tailors--declined and c-book--no-slots. |

### c-tailor (step 3, profile)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-tailor (all) | `c-tailor.js:48` | "Williamsburg · 12 years" | "Williamsburg · 12 years tailoring" | **P2** A bare number could mean age or time on Taily. The data field is `years` of tailoring (`trustCard` already says "Tailor for 12 years"). |
| c-tailor, --home-only | `c-tailor.js:114` | "Comes to you in 11211, 11222, 11206, 11237" | "Comes to you in Williamsburg, Greenpoint, East Williamsburg and Bushwick" (ZIPs on a second line in `.c-600`) | **P2** Customers recognise neighbourhoods, not ZIP lists. The names come from `ZIP_INFO`, and eligibility still keys on the ZIP shown underneath. |
| c-tailor--declined | `c-tailor.js:159`, `:175` | Banner "Amara can’t take this job" / "Your job details are saved. You can book Amara for a different job." · bar "Start a different job" + note "Amara can’t take this job" | Banner "Amara declined this request" / "Your items and services are saved. You can book Amara for other work." · bar "Start a new request" + note "Amara declined this request" | **P2** Glossary, the same strings as c-tailors. |
| c-tailor (rush ladder) | see shared `rushLadder` | "Ready within 1 day" | "Need-by 1 day after the visit" | **P2** One rush rule (shared row). |

### c-book (step 4)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-book--no-slots | `c-book.js:53`, `:49` | Title "No open times before Thu, Oct 15" · "Amara’s next opening is Thu, Oct 15 · 5:00 PM, too close to your need-by date. The visit has to be at least a day before." | Title "No times before your need-by date" · "Amara’s first opening is {next}. A visit has to be at least a day before your need-by date, {needBy}. Pick a later date or message Amara." | **P2** The title and the body show the same date for two different things (the need-by and the opening). The new copy names each date once and ends with the two actions. |
| c-book | `c-book.js` subtitle | "At my place · 60-minute visit" | "At my place · 60 min" | **P3** c-booking, c-request and t-job all write "60 min". |

### c-pay (step 5)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-pay, --rush, --3ds, … | `c-pay.js:43` | "Free cancellation until Wed, Oct 14 · 5:00 PM. After that, the $16.00 deposit is kept." | "Free cancellation until {cutoff}. After that, Amara keeps the {deposit} deposit." | **P1** Who keeps the money. This line changes the decision, so it stays inline (D-191). |
| c-pay--shop | `c-pay.js:40` | "This visit is less than 24 hours away. If you cancel after Amara accepts, the $12.50 deposit is kept." | "This visit is less than 24 hours away. If you cancel after Amara accepts, Amara keeps the {deposit} deposit." | **P1** Same reason. |
| c-pay (hold line) | `c-pay.js` | "We hold $16.00 now. You’re only charged if Amara accepts. If Amara declines or doesn’t reply, it’s released in full." | Keep. | Clear sequence: what happens now, when the charge happens, and what happens otherwise. |
| c-pay--declined | `c-pay.js` banner + action bar | Banner action "Use another card" **and** primary CTA "Use another card" | Keep the CTA. Leave out the banner action. | **P3** The same label twice on one screen makes it look like two different actions. |

### c-request (request status)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-request, --withdraw, sys-push-prompt-customer | `c-request.js:81` | "2h left" / "Reply by 12:00 PM" | "2h left" / "Amara has until {expires} to reply" | **P1** It reads as Sarah's deadline. The thread header says it correctly ("2h left for Amara to reply"). |
| c-request--soon | `c-request.js:80` | "10m left" / "Amara has 10m left to reply." | "10m left" / "Amara has until {expires} to reply." | **P3** The sub-line repeats the chip. A clock time is new information. |
| c-request (timeline) | `c-request.js:91` | "Amara replies" / "Usually within the hour" | "Amara replies" / "Within 2 hours" | **P2** "Usually within the hour" is a claim no data supports (see *Ask Kevin*). The 2-hour window is a policy (`POLICY.REQUEST_EXPIRY_H`). |
| c-request--declined | `c-request.js:125-126` | Title "Amara can’t take this job" · "Your $16.00 hold has been released — you weren’t charged. Your job details are saved." | Title "Amara declined your request" · "Your {deposit} hold is released, so you weren’t charged. Your items and services are saved for the next tailor." | **P1** The glossary, plus the outcome stated as fact. Same money meaning. |
| c-request--expired-final, --suggested-passed | `c-request.js:145`, `:170` | "Your $16.00 hold was released. Amara is hidden for this job, so you can choose someone else." | "Your {deposit} hold was released. We won’t show Amara for this request again, so you can choose another tailor." | **P2** "Hidden" is system language and sounds like a penalty. Same rule (MASTER-PLAN §10: hidden from the list for this job). |
| c-request--expired | `c-request.js:176`, `:192` | "…Send the same request again for another 2 hours, or message Amara first." · CTA "Try again (1 of 2)" | "Your {deposit} hold was released. You can send the same request again, and Amara gets another 2 hours." · CTA "Send request again" | **P2** "Try again" doesn't say what is retried. "(1 of 2)" makes her work out the counter. "Try again" stays as the internal feature name. |
| c-request--expired-2 | `c-request.js:176`, `:192` | "…Last try: if Amara doesn’t reply this time, we’ll show you other tailors." · CTA "Try again (2 of 2)" | "Your {deposit} hold was released. You can send it once more. If Amara doesn’t reply by {expiresNext}, we’ll show you other tailors." · CTA "Send again (last try)" | **P2** Same reason. The CTA sub-line already prints "Amara has until 4:00 PM to reply", so use that time. |
| c-request--withdraw | `c-request.js:233` | "The $16.00 hold is released right away. Your job stays saved so you can pick another time or tailor." | "The {deposit} hold is released right away. Your items and services stay saved, so you can pick another time or tailor." | **P2** Glossary. |
| sys-push-prompt-customer | `c-request.js:341` | "Amara has 2 hours to answer. Turn on notifications to see the reply the moment it lands, even before our text." | "Amara has 2 hours to reply. Turn on notifications to hear back the moment Amara replies." | **P2** "Even before our text" contradicts the hero line above it ("We’ll text you the moment Amara replies"). "Answer" becomes "reply", the word used everywhere else on the customer side. |

### c-bookings · c-messages · c-orders

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-bookings--push-denied, c-bookings (requested row) | `c-bookings.js:77` | "2h to reply" · "Reply overdue" | "2h for Amara to reply" · "No reply yet" | **P2** The perspective: the row caption sits where her own actions ("Pay now", "Leave a review") usually go. |
| c-bookings (expired row) | `c-bookings.js:79` | "Try again (1 of 2)" | "Send again" | **P3** Matches the c-request CTA. The counter belongs on the detail screen. |

### c-booking (booking detail)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-booking, --confirmed, --reschedule | `c-booking.js:145` | "Free cancellation until Wed, Oct 14 · 5:00 PM. After that, the $16.00 deposit is kept." | "Free cancellation until {cutoff}. After that, Amara keeps the {deposit} deposit." | **P1** Who keeps the money (same as c-pay). |
| c-booking--cancel-late | `c-booking.js:146` | "Less than 24 hours to go: cancelling now keeps the $16.00 deposit." | "The visit is less than 24 hours away. If you cancel now, Amara keeps your {deposit} deposit." | **P1** Grammatically, "cancelling" is the thing that "keeps" the money. Name the person. |
| c-booking--cancel-late | `c-booking.js:328` | CTA "Cancel booking ($16.00 not refunded)" | "Cancel and lose the {kept} deposit" | **P2** Matches the early-cancel CTA ("Cancel and get $16.00 back"). The brackets read like small print on a destructive button. |
| c-booking--cancel-late | `c-booking.js` (sheet rows) | "Kept $16.00" | "Kept by Amara $16.00" | **P3** It's the only row in the breakdown with no owner. |
| c-booking--cant-make-it | `c-booking.js:84` | "Amara cancelled your Thu, Oct 15 · 5:00 PM visit. Your $16.00 deposit is refunded in full, and your job is saved." | "Amara cancelled your {when} visit. Your {refund} deposit is refunded in full, and your items and services are saved so you can book someone else." | **P2** Glossary. The added clause explains the "Find another tailor" CTA. |
| c-booking--no-show | `c-booking.js:89` | "Amara marked the visit as missed at 5:20 PM, 20 minutes after the start. The $16.00 deposit is kept. Nothing else is charged." | "Amara marked the visit as missed at {at}, {n} minutes after the start. Amara keeps your {kept} deposit. Nothing else is charged. If you were there, message Amara." | **P2** It names who keeps the money, and gives the one way to dispute it. Disputes are settled in chat (§2), and "Message Amara" is already the CTA. |
| c-booking--returning-pickup | `c-booking.js:252` | Pill "Ready for pickup" + title "Ready for pickup" | Pill "Ready for pickup" + title "Pick it up at {shopName}" | **P3** The title repeats the pill. The new title names the place, which is the useful fact. |
| c-booking--in-progress | `c-booking.js` hero | "You approved the order. You’ll pay the $144.00 balance when it’s ready." | Keep. | It states the next money step in dollars. Good. |

### c-price-change (Review your final order)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-price-change (all changed states) | `c-price-change.js:75` (action-bar lead) | "New balance, charged when ready  $189.00" | "New balance, due when it’s ready  {balance}" | **P1** Nothing is charged automatically. Sarah pays on c-ready ("Pay $X"). The Balance row on the same screen already says "Due when ready". |
| c-price-change--unchanged, --comment-masked | `c-price-change.js:75` | "Balance, charged when ready  $144.00" | "Balance, due when it’s ready  {balance}" | **P1** Same reason. |
| c-price-change (changed) | `c-price-change.js:48` | "Amara updated your order at the fitting. Approve it and Amara starts the work." | "Amara changed your order at the fitting. Once you approve, the work starts." | **P3** The name appears twice in one sentence. "Changed" matches the "What changed" heading. |
| c-price-change--unchanged | `c-price-change.js:49` + `changeSummary` | Lead "Amara checked everything at the fitting. Nothing changed." · figure "Same as booked" · list head "No changes. Same items, same price as booked." | Keep the lead and "Same as booked". Leave out the list-head line when unchanged. | **P2** The same fact three times above one button (D-123 already makes "No changes" the one-tap case). |
| c-price-change--unchanged | `c-price-change.js` (Services row caption) | (no caption) | "Amara’s final prices" | **P3** The changed states have it. Unchanged still means "final". |
| c-price-change (docs) | `components.js` `garmentDocs` · `t-adjust` note | "Amara’s note" (order) and "Amara’s comment" (per item) look alike | "Amara’s note on the order" · "Amara’s comment" (per item, unchanged) | **P3** Two free-text sources on one screen. The order-level one should say it covers the whole order. |

### c-ready (pay the balance)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-ready--refund | `c-ready.js:153` | CTA "Confirm and get $6.50 back" | "Confirm {returnChoice} and get {refund} back" (e.g. "Confirm pickup and get $6.50 back") | **P3** "Confirm" doesn't say what is being confirmed, and the bar note says to choose a return first. |
| c-ready | `c-ready.js:190`, `:202` (toast) | "That way back is no longer offered." | "Amara no longer offers that option. Pick another way back." | **P3** Names who changed it and the next step. |
| c-ready--courier-failed | courier card + bar note | Card "Uber didn’t answer. Try again, or pick another way back." + bar "Try the courier price again, or pick another way back." | Keep the card copy. Bar note: "Get a courier price, or pick another way back." | **P3** The two lines are near-duplicates. The bar note should name what the disabled button is waiting for. |

### c-thread · c-review · c-complete

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| c-thread--read-only | `c-thread.js:90`, `:92` | "Amara declined this request, so this chat is closed. Send Amara a new request for a different job to chat again." · link "Start a different job with Amara" | "Amara declined this request, so this chat is closed. To talk again, send Amara a new request." · link "New request to Amara" | **P2** Glossary, and it says what she can do first. |
| c-thread--masked | `components.js:1171` | "Hidden from Amara. Numbers and emails stay private on Taily." | Keep. | The sender's note is exact and only the sender sees it (§2 privacy). |
| c-complete | `c-complete.js` | "Tap a star. Shown on Amara’s profile." | "Tap a star to rate. Reviews show on Amara’s profile as Sarah C." | **P3** It's a sentence fragment, and the name she'll appear under (shown on c-review) is useful before she commits. |

### t-phone · t-code · t-home (tailor inbox)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| t-home--paused | `t-home.js:59` | "Paused  Turn back on" | "You’re paused, so customers can’t send new requests.  Take requests again" | **P2** "Paused" alone doesn't say what is paused. The new link matches t-shop's "Taking requests" toggle and the toast "You’re taking requests again". |
| t-home--suggested, t-request--suggested | `components.js` (`requestCard` countdown, suggested) | "24h left" + pill "Waiting on Sarah" | "24h for Sarah to answer" | **P2** On a new request the countdown is Amara's own deadline. Here it's Sarah's. One phrase can't mean both. |
| t-home--in-progress | `t-home.js:43` | "Tailoring · due Fri, Oct 23" | "Tailoring · needed by Fri, Oct 23" | **P3** Glossary: t-request and t-job use "Needed by". |

### t-request (request detail)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| t-request--expired-final, --suggested-passed, --withdraw (done) | `t-request.js:121`, `:123`, `:125` | "…This job has gone to other tailors." | "…Sarah can now book another tailor." | **P2** Nothing is assigned to anyone else. Sarah chooses. The current line states something the product doesn't do. |
| t-request--withdraw (sheet) | `t-request.js:221` | "Sarah is told right away and her hold is released. This job then goes to other tailors, so she can’t accept this time." | "Sarah is told right away and her {deposit} hold is released. She can’t accept this time anymore, and can book another tailor." | **P2** Same reason, and it adds the amount. |
| t-request--declined, withdrawn | `t-request.js:140`, `:123` | "Sarah has been told and her hold released." | "Sarah has been told, and her {deposit} hold is released." | **P3** It's missing a verb, and the amount is known. |
| t-request (all) | header / countdown | "2h left" / "Answer by 12:00 PM" | Keep. | Correct perspective. This is the model the customer side should follow. |
| t-request--decline (sheet) | `t-request.js` | "Sarah is told right away and her hold is released. She sees your reason." | Keep. | Says the consequence and what is shared. Good. |

### t-suggest

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| t-suggest--rush-window | `t-suggest.js:31` | "1-day turnaround · no rush fee on this request" (or "rush fee $40 as booked") | "1 day before Sarah’s need-by date. No rush fee is added to this request." (or "The {rush} rush fee stays as booked.") | **P2** "Turnaround" is a fourth word for the rush rule. The fix spells out that rush fees aren't added after the request is sent (D-155). |

### t-job (job detail)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| t-job--no-show (sheet) | `t-job.js:430` | "It’s 5:20 PM — 20 minutes past the start. Sarah’s $16.00 deposit is kept and you’re paid $25.00 for your time." | "It’s {now}, {n} minutes past the start. You’re paid {noShowPay} in total for your time. Sarah’s {deposit} deposit isn’t refunded." | **P1** The current line reads as $16 + $25 = $41. The model pays `max(deposit, NO_SHOW_COMP)` = {noShowPay} in total. |
| t-job--more (menu) | `t-job.js:148` | "Mark as no-show" / "If Sarah isn’t there by 5:15 PM" | "Mark as no-show" / "Available from {from} if Sarah isn’t there" | **P3** The sub-line is the unlock time (D-200), but it reads like a condition on something else. |
| t-job--no-show-done | `t-job.js:52` | "Sarah has been told. Her deposit was kept." | "Sarah has been told, and her {deposit} deposit isn’t refunded. You’re paid {noShowPay} for your time." | **P2** It has the amounts and the result for Amara, which the No-show pay row then confirms. |
| t-job--cant-make-it-done | `t-job.js:46` | "Sarah has been told and refunded her $16.00 deposit. Nothing is paid out for this job." | "We told Sarah and refunded her {refund} deposit. Nothing is paid out for this job." | **P1** As written, Sarah is the one doing the refunding. |
| t-job--cant-make-it (sheet) | `t-job.js` | "Sarah is told right away and gets her $16.00 deposit back in full. Her job stays saved so she can rebook." | "Sarah is told right away and gets her {refund} deposit back in full. Her order stays saved so she can rebook." | **P3** Amara reads "job" as her own work. What stays saved is Sarah's order. |
| t-job--fitting, --fitting-docs | `t-job.js:199` | CTA "Review the order" → lands on t-adjust titled "Edit the job" | Either CTA "Edit the job" or the t-adjust title "Review the order" (needs Kevin, D-123) | **P3** The button and the screen it opens use different names. |
| t-job--docs-unsent | `t-job.js:251` | "You changed photos or comments since you sent the order. Send the updated order so Sarah sees them." (CTA "Edit the order") | "You changed photos or comments since you sent the order. Open the order and send it again so Sarah sees them." | **P2** The line says "Send", but the only button says "Edit". |
| t-job--approved | `t-job.js:303` + note | Lead "Sarah approved the order. Mark it ready when the work is done." + banner "Sarah approved your changes. You take home $188.00." | Banner: "Sarah approved your changes. You take home {payout}." Lead: "Mark it ready when the work is done." | **P3** The approval appears twice. Each line should carry one fact. |
| t-job (Timing) | `t-job.js:117` | "Due Fri, Oct 23 · in 8 days" | "Needed by Fri, Oct 23 · in 8 days" | **P3** Glossary: the same date is "Needed by" in the Visit block. |
| t-job--rescheduled | `t-job.js:360` | "Sarah moved this visit from 5:00 PM to Thu, Oct 15 · 5:30 PM." | "Sarah moved this visit to Thu, Oct 15 · 5:30 PM (was 5:00 PM)." | **P3** The new time comes first. The old one is context. |
| t-job--returning-dropoff | `t-job.js:224` | "Agree a time in chat, then mark the job completed when it’s delivered." | "Agree on a time in chat, then mark the job completed when it’s delivered." | **P3** US English. |
| t-job--mark-ready, t-job--ready | `t-job.js:479`, `:313` | "Ways back for this order" · "Ways back you offered" | "Return options for this order" · "Return options you offered" | **P3** Shop and onboarding call this "Return options". |
| t-job--completed* | `t-job.js:231` | "Sarah’s order, Thu, Oct 15." | "Sarah’s order, completed Thu, Oct 15." | **P3** A date with no verb. |
| t-job--completed-failed, t-payout--failed | `tailor-data.js:151` | Status "Didn’t go through" + line "Didn’t go through · sends again once your bank details are updated" | Line: "Sends again once you update your bank details." | **P3** The status is printed twice. The line should only add the fix. |
| t-job (customer card) | `t-job.js:125` | "Sarah Chen" / "Customer" | Keep, or leave out "Customer" | **P3** Everything on t-job is about Sarah. The label adds nothing. |

### t-adjust (Edit the job at the fitting)

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| t-adjust (all) | `t-adjust.js:295` | Label "Note to Sarah (optional)" (order) vs per-item "Comment for Sarah" | "Note to Sarah about the whole order (optional)" | **P3** Two text boxes, two names, and no hint of the difference. The new label matches the customer's "Amara’s note on the order". |
| t-adjust--leave | `t-adjust.js` modal | "Sarah can’t approve the order until you send it. Your photos and comments are saved. Item and price changes aren’t." | Keep. | Exact about what is lost. A model leave modal. |
| t-adjust (bar) | `t-adjust.js:311` | "Add before and pinned photos for 2 items." | Keep. | Says what's missing and how many. |
| t-adjust--error | `t-adjust.js` | "Fix 1 price to see the new total" (twice: figure caption and bar note) | Keep in the bar. Figure caption: "—" alone. | **P3** It's repeated within one viewport. |

### t-earnings · t-payout · to-payouts

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| t-earnings--failed-and-next | `t-earnings.js:93` | "Fri, Oct 23 · $260.00 once your bank is fixed" | "Fri, Oct 23 · {amount} once you update your bank details" | **P2** "Your bank is fixed" blames the bank and isn't what she has to do. The same screen says "once your bank details are updated". |
| to-payouts--returned | `to-payouts.js:85` | Title "Your $147.50 payout came back" · "Chase ••6789 sent it back. Update the account below and we’ll send it again on Fri, Oct 23." | Title "Your {amount} payout didn’t go through" · "Chase ••6789 returned it. Update the account below and we’ll send it again on {retryDay}." | **P3** Glossary: Earnings and the job say "didn’t go through". |
| t-earnings--empty | `t-earnings.js:68` | "When you complete a job, its payout shows up here. Taily pays out every Friday." | Keep. | |
| to-payouts | | "On $100.00 of services, Taily keeps $10.00 and you take home $90.00." | Keep. | The fee in dollars, worked through as an example (§2). |

### t-shop · t-rush

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| t-shop--incomplete | `t-shop.js:92`, `:95` | Banner "Customers can’t book you right now" / "Finish Availability to show up again." / action "Fix it" · preview caption "Customers can’t find you until Availability is finished." | Banner text "Finish your availability so customers can book you again." · action "Finish availability" · leave out the preview caption. | **P2** "Fix it" is vague, the capitalised section name reads like a variable, and the caption repeats the banner. |
| t-shop | `t-shop.js:53` | "Shop on 312 Metropolitan Ave" | "Shop at 312 Metropolitan Ave" | **P3** Preposition for a street address. |
| t-shop, to-done | `t-shop.js:98`, to-done preview | "Sample job: suit pant and suit jacket, home visit" · "Example job: …" | "Example: suit pant and suit jacket, home visit" (both) | **P3** One word for the same preview caption. |
| t-rush--invalid | `t-rush.js` | "Can’t be more than your 1-day fee ($15)." | Keep. | It's a dollar amount, and it says the rule. |

### t-thread · t-messages

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| t-thread--question | `t-thread.js:41` | "No request yet" / "Her request will show here when she books." | "No request yet" / "The request shows here once {first} books." | **P3** It assumes a pronoun for any customer, and "Her" has no name to refer to. |
| t-thread (no job) | `t-thread.js:62` | "Messages with a customer show up here once she has sent a request." | "Messages with a customer show up here once they send a request." | **P3** A generic customer gets no pronoun. |

### to-profile · to-services · to-where · to-returns · to-availability · to-done

| Screen id | Location | Current copy | Proposed copy | Why |
|---|---|---|---|---|
| to-where (all) | `to-where.js:102`, `:114` | Toggle "Customers come to my shop" + helper "30-minute visits at your shop." · "I visit customers at home" + "60-minute visits at the customer’s place." | "Customers come to your shop" · "You visit customers at home" | **P3** The label is first person and the helper is second person, on the same row. The rest of onboarding speaks to "you". |
| to-returns (all) | `to-returns.js:25` | "How do orders get back?" | "How do customers get their orders back?" | **P3** Orders don't travel on their own. The list below names who does what. |
| to-returns--none | `to-returns.js:38` | "Pick at least one way to get orders back." | "Pick at least one return option." | **P3** Glossary. |
| to-availability (all) | lead | "Set your usual week. You have 2 hours to reply to each request." | "Set your usual week." | **P3** The reply window has nothing to do with hours, and to-done and t-home already say it. |
| to-services--none | action-bar note | "Pick at least one service to continue" | "Pick at least one service to continue." | **P3** Every other note ends with a full stop. |
| to-done | | "You’re bookable" / "Customers near you can book you now. You have 2 hours to reply to each request." | Keep. | Says the outcome and the one rule that changes behaviour. |

---

## Ask Kevin (factual claims; not changed without a yes)

These lines state facts the prototype doesn't model. The clarify guide says to ask before changing a factual claim, so each one has a proposal but is marked for confirmation.

1. **c-request** timeline: "Usually within the hour". Is there a typical response time to quote? If not, use the policy fact ("Within 2 hours").
2. **c-tailors** none-left and declined: "We’ll let you know when more tailors join near {zip}". Nothing in the product notifies her. Keep it as a roadmap promise, or drop it?
3. **sys-push-prompt-customer**: "even before our text" against "We’ll text you the moment Amara replies". Which channel is first?
4. **t-request**: "This job has gone to other tailors." The proposal says Sarah *can* book another tailor, not that she has.
5. **t-job--fitting**: whether the primary CTA should be "Review the order" (D-123) or should match the editor title "Edit the job". One of the two should change.
6. **t-phone**: "six short steps, about 10 minutes". Fine if the timing has been checked.

## Checked and kept

These were read in context and are already clear. Keep them as models for the rest:

- **Sign-in:** the phone helper and its error, the code errors, and the c-name privacy lead.
- **c-pay:** the hold explanation and the declined card ("didn’t go through, and nothing was held").
- **c-booking:** the early-cancel sheet ("You’re cancelling more than 24 hours before the visit, so your $16.00 deposit comes back in full" with "Cancel and get $16.00 back").
- **c-ready:** "Your $16.00 deposit is already taken off", and the refund line "Your final total is less than your deposit, so $6.50 comes back to your card".
- **Info sheets:** pricing, fee, payouts, privacy and fitting.
- **Tailor sheets:** the t-request decline sheet, the t-adjust leave modal and photo notes, and t-rush's "Rush fees are yours in full."
- **to-payouts:** the fee shown worked through in dollars.
- **Privacy:** every masked-text note ("Hidden from Amara…", "Phone numbers and emails are hidden from Sarah.").
- **Booking chrome:** the step labels "What needs work · Where and when · Choose a tailor · Pick a time · Review and send".

No proposal here adds a percentage, a new rate or a typed dollar amount. Every amount is a token for a value `js/money.js` already computes.
