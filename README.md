# Taily

A marketplace for booking local tailors — request alterations, get per-item
quotes, pay a small deposit, and track the appointment from request to pickup.

**This repo is the interactive web prototype** (plain HTML/CSS/JS, no build
step). It mirrors the Figma file `TAILY` and is used to plan and validate
product changes before real implementation.

## Run it

Open `index.html` in a browser — that's it. No dependencies, no server.

## What's inside

| File | Purpose |
| --- | --- |
| `index.html` | The app. User - Main Flow (booking, payment, appointment lifecycle). |
| `taily-prototype-v1.html` | Archived first prototype (mobile-framed). |
| `taily-prototype-v2.html` | Archived second prototype (onboarding, per-tailor pricing). |

## Product flow (User - Main Flow)

Home (garment tiles) → Appointment Details (items, photos, requested time /
need-by / visit type) → Nearby Tailors (per-item quotes) → Tailor Details →
Confirm (10% deposit) → Payment sheet (Apple Pay / Google Pay / card) →
Request Sent → lifecycle: Confirmed / New Time Proposed / Order Edited /
Declined / Ready / Completed / Review.

## Product flow (Tailor - Main Flow)

Switch personas with **View as Tailor** under the app. Tailor side: Home
(new requests + in progress) / Calendar / Shop (services → price list →
availability setup), job detail with accept / suggest times / edit order /
decline / mark ready / mark completed.

Both personas render the **same appointment objects** — one state machine
(`requested → confirmed → ready → completed`, with `declined` / `cancelled`
branches). Book as the customer, switch to the tailor, accept the request,
switch back: the booking is Confirmed. Dashed "Prototype demo" panels remain
as shortcuts for single-persona demos.

## Conventions

- Design source of truth: Figma `TAILY` → *User - Main Flow* page.
- Tokens mirror the Figma variable collections (colors / spacing / radius / type).
- Branches: `feat/*` per flow, merged to `main` via no-ff merges.
