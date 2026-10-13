# Taily — Core Journey v5

Oct 12, 2026 · @Kevin

## Summary

v5 turns Taily from an auto-matched service into a marketplace: customers pick a tailor in 5 steps, and tailors accept a job in 1 tap. Tailors set their own prices, home-visit fee and home-visit zip codes. Taily keeps 10% of each order's services, taken from the tailor's payout and shown to them in dollars.

Why: two tailor interviews agreed on three things. Tailors want to set their own prices. They want to choose whether to do home visits. They will gladly pay a cut as long as they get customers.

What this replaces: Taily-set pricing, no platform cut, and the auto-match "Finding Tailor" step.

## Decisions

| Area | Rule |
| --- | --- |
| Matching | Customer browses a filtered list and books one tailor. No auto-match. |
| Visit type | Chosen up front with the job: At my place or At the shop. It filters the list. |
| Home-visit eligibility | A tailor appears for home visits only if the customer's zip is in their zip list. |
| Pricing | Each tailor sets a per-service price list. Customers see estimates from it. |
| Price changes | A tailor can adjust after seeing the garment. The customer approves before work starts. |
| Home-visit fee | Set by each tailor. Added to home-visit orders only. Non-refundable if cancelled within 24 hours. |
| Taily fee | 10% of the services subtotal (not the home-visit fee), taken from the tailor's payout and shown in dollars. The rate lives in an editable table under Money. |
| Payments | Customer pays in the app: deposit at booking, balance at completion. Taily pays out the tailor. |
| Accepting | Tailor approves each request: Accept, Suggest time or Decline. |
| Request expiry | 2 hours with no reply. The customer can try again twice, then sees other tailors. |
| Messaging | "Ask a question" before booking; the same thread continues after. |
| Contact info | Phone numbers and emails are always hidden in chat. |
| Returns | Each tailor picks what they offer: in-store pickup, home drop-off and/or Taily courier. Courier = Uber quote + 10%, paid by the customer. |

## Customer journey

A customer goes from opening the app to a sent request in 5 screens.

1. **What needs work** — pick garments and the job for each (hem, take in, etc.).
2. **Where and when** — At my place or At the shop; zip or address; date needed by.
3. **Tailors near you** — a list showing only tailors who match the visit type and zip. Each row shows the estimated total from their price list, home-visit fee if any, rating, distance and next opening.
4. **Tailor profile** — prices, reviews, return options and shop address. "Ask a question" opens a chat here without booking.
5. **Book** — pick a time, see the price breakdown, pay the deposit. The request is sent.

After the request:

- **Waiting** — a 2-hour countdown. The chat stays open.
- **Confirmed** — the tailor accepted. The appointment and chat show under Bookings.
- **Suggested time** — the customer accepts the tailor's new time or picks another tailor.
- **Declined or expired** — Declined sends the customer back to step 3 with their job details kept; they can still request that tailor for a different job later. Expired offers Try again up to 2 times, then shows other tailors.
- **Price change** — after the fitting, the tailor sends an adjusted price. The customer approves it, or messages first.
- **Ready** — the customer picks a return option the tailor offers (courier adds the Uber quote + 10%), then pays the balance.
- **Completed** — review the tailor.

## Tailor onboarding

A tailor is bookable once these 6 steps are done. Each one can be edited later under Shop.

1. **Profile** — name, photo, a short bio and a few photos of their work.
2. **Services and prices** — tick the services they offer and set a price for each.
3. **Where you work** — shop address (optional) and a home-visits toggle. If on: their zip codes and their home-visit fee. At least one of the two is required.
4. **Return options** — in-store pickup, home drop-off and/or Taily courier.
5. **Availability** — weekly hours, split by shop and home visits if they do both.
6. **Payouts** — bank details for Taily payouts, plus a plain view of the 10% Taily fee.

## Tailor job loop

A new request takes one tap to answer, from a push notification or the Home inbox.

**The request card shows everything needed to decide:**

- Garments and services, with the estimate from the tailor's own prices
- Visit type, with the neighborhood and zip for home visits (full address after accepting)
- Requested time and date needed by
- What the tailor takes home after the Taily fee
- Time left before the request expires

**One-tap actions:** Accept · Suggest time · Decline. Suggest time opens a short time picker; Decline asks for an optional reason.

**After accepting:** the job sits under Upcoming with its chat. The tailor can adjust the price after the fitting, mark it Ready, pick the return method, and mark it Completed.

## Messaging rules

There is one thread per customer and tailor, and it lives inside Taily from the first question to the review.

| Situation | Customer can message? | What they see |
| --- | --- | --- |
| Before booking | Yes | "Ask a question" on the tailor profile |
| Request pending | Yes | Chat plus the 2-hour countdown |
| Tailor declined | No | Thread is read-only, with "Find another tailor". They can request this tailor again for a different job. |
| Request expired | Yes | "Try again" (up to 2 times) re-sends the request with a new 2-hour window, or they can send a message |
| Booked through completion | Yes | Chat on the booking |

**Contact info is always hidden.** Phone numbers and emails typed into chat are masked for both sides, and the sender sees a short note that contact details stay private on Taily. Photos of garments are allowed.

## Money

The customer pays the tailor's prices plus any home-visit fee. Taily keeps 10% of the services subtotal, taken from the tailor's payout. The home-visit fee goes to the tailor in full. Courier delivery is charged to the customer at the Uber quote + 10%.

**What the customer sees:** services subtotal + home-visit fee (if any) + courier (if chosen) = total. A 10% deposit is due at booking, refundable if cancelled more than 24 hours ahead; the balance is due when the order is ready.

**What the tailor sees:** order total − Taily fee (10%) = your payout. The fee shows as a dollar amount on every job.

### Taily fee settings

This table is the source of truth. Edit it here; the app should read fees from it rather than hard-coding them.

| Setting | Value |
| --- | --- |
| Taily fee | 10% of services only (not the home-visit fee), from the tailor's payout |
| Deposit | 10% of the total, due at booking; refundable if cancelled more than 24 hours ahead |
| Courier price | Uber quote + 10%, paid by the customer |
| Home-visit fee on cancellation | Non-refundable within 24 hours of the visit |
| Try again after expiry | Up to 2 times, then show other tailors |

## Request states

&#91;embedded content: request states · Requested to Completed\]

A request ends in one of four ways within 2 hours. Expired loops back with Try again; Declined closes the thread. After a suggested time, the customer can also pick another tailor instead.

## Screen changes vs v4

The customer side loses 1 screen and gains 2; the tailor side gains onboarding and a chat.

| Screen | Change | Notes |
| --- | --- | --- |
| 03 Finding Tailor | Removed | Replaced by the tailor list |
| 02 Appointment Details | Changed | Visit type first; zip/address; date needed by |
| Tailors near you | New | Filtered list with estimates, fee and next opening |
| Tailor profile | New | Prices, reviews, return options, Ask a question |
| 02A Date & Time | Changed | Shows only the chosen tailor's open slots |
| 04A Payment | Changed | Breakdown adds the home-visit fee line |
| 04C Confirmed | Changed | Becomes "Request sent" with a 2-hour countdown; Confirmed comes when the tailor accepts |
| M1 Message Tailor | Changed | One thread per tailor, open before booking, contact info masked |
| Request declined / expired | New | Declined: find another tailor. Expired: Try again or message |
| 06A Review & Approve | Kept | Used for tailor price changes |
| 07A Pickup / 07B Delivery | Changed | Shows only the return options this tailor offers |
| Tailor onboarding (6 steps) | New | Profile, prices, where you work, returns, availability, payouts |
| Tailor request card | Changed | Adds payout after fee and expiry timer |
| Tailor chat | New | Same thread the customer sees |

## Open questions

None right now.

&#32;Yes
