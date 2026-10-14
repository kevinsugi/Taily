# Taily

A marketplace for booking local tailors. A customer describes the alterations,
sees each nearby tailor's price for exactly that job, sends a request with a
small refundable deposit, and follows the booking through the fitting, the
final order, the return and the review. The tailor runs the other half: sign-up
and shop setup, the request inbox, the job, the fitting, and getting paid.

**This repo is the Taily v5 interactive prototype** (branch `V5`): plain
HTML/CSS/JS, no framework, no build step. It is the working specification for
the product: every screen, flow, edge case and error state of both sides is
built and tested here before real implementation. Live preview of the branch:
**https://kevinsugi.github.io/Taily/**

## Run it

ES modules need `http://`, so open it through the bundled static server:

```
npm install        # only the dev tooling (playwright, pixelmatch, pngjs)
npm run serve      # http://127.0.0.1:4173
```

Useful URLs (add `?test=1` to make every simulated network wait instant):

| URL | Opens |
| --- | --- |
| `/` | The screen index (`sys-index`), every screen grouped by milestone |
| `/?flow=<key>` | A Test-flows step, e.g. `/?flow=c-request` |
| `/?screen=<id>` | That screen in its primary state, e.g. `/?screen=t-home` |

## Demo clock and seed

The prototype runs on a frozen clock, **Tue Oct 13, 2026, 10:00 AM**; countdowns,
the 24-hour cancel window and request expiries move only when a Test-flows step
or an action advances it. Two personas, one shared set of appointment objects:

- **Sarah Chen** (customer), 145 N 7th St, Williamsburg 11211, needs a suit
  pant hemmed and a suit jacket's sleeves and sides taken in.
- **Amara Reyes** (tailor, Reyes Tailoring, 312 Metropolitan Ave, Williamsburg),
  shop and home visits, three return options, a rush ladder, a full price list.

Book as Sarah, flip to Amara, accept, flip back: the booking is confirmed. Both
sides always read the same appointment and the same dollar amounts.

## Test flows menu

The **Test flows** button (bottom right, on every screen) lists about 270 named
steps in three tabs: Customer, Tailor, System. Picking one resets the demo, sets
up that exact state through the real transitions (never hand-written fixtures),
and opens the screen live. **View as Tailor / View as Customer** at the bottom
flips persona and keeps the current state. Each entry has a stable key
(`c-pay--declined`, `t-job--mark-ready`, ...) that is also its URL (`?flow=`) and
its visual baseline (`ref/v5/<key>.png`). `docs/v5/REVIEW-GUIDE.md` has a
ten-minute tour in the order worth clicking through.

## System index and component gallery

- `sys-index` (the default screen, `/?screen=sys-index`): every screen in the
  inventory, grouped by milestone and persona, linking to its primary state.
- `sys-components`: the component gallery, every shared component and variant
  in one place, including the M5 system states (offline banner, session
  expired, push prompt, error patterns).

## The two journeys

**Customer:** sign in with phone + code, pick garments and services, choose
at my place or at the shop and the need-by date, compare tailors (estimate,
distance, next opening), open a profile, pick a time, review and send the
request (deposit held, not charged), wait for the reply (accept / suggest a
time / decline / expired with Try again twice), booking detail with cancel
and reschedule, the fitting, approve the final order, choose the return
(pickup / drop-off / Taily courier), pay the balance, review. Messaging runs
through the whole journey in one thread per tailor; Account holds addresses,
cards and past orders.

**Tailor:** sign up with a phone, six onboarding steps (profile, services and
prices, where you work, return options, availability, payouts), the shop
(prices, rush fees, "Taking requests"), the inbox, a request decided in one
tap, the job (can't make it, no-show, start the fitting, edit the job, send
the final order for approval, mark ready, return), earnings and per-job payouts.

## Money model, in dollars

Every amount in the UI is a dollar amount, never a percentage, on both sides.
Rates live in one file, `js/money-config.js`; the math in `js/money.js` works
in integer cents.

- **Services** come from each tailor's own price list. A **home-visit fee**
  (tailor-set, goes to the tailor in full) and a per-tailor **rush fee** (a
  dollar ladder by days to the need-by date) are added when they apply.
- **Deposit** is held on the card when the request is sent and captured when
  the tailor accepts; a decline or expiry releases it in full. The **balance**
  is paid when the order is ready.
- **Taily fee** is taken from the tailor's payout, on the services only.
- **Cancel** more than 24 hours ahead: full refund. Within 24 hours: the
  deposit is kept and paid to the tailor. **No-show:** the tailor gets the
  larger of the deposit and the $25 compensation.
- **Final order:** at the fitting the tailor can change prices, add or remove
  items and services; the customer approves or messages. The deposit never
  changes, the balance does.
- **Courier:** a mocked Uber quote plus the Taily courier fee, paid by the
  customer; it never appears in the tailor's payout.

Seed example (Sarah and Amara): services $125.00, home-visit fee $35.00, total
$160.00, deposit $16.00, balance $144.00, Taily fee −$12.50, Amara takes home
$147.50. Decisions behind each rule are logged in `docs/v5/DECISIONS.md`.

## Check

```
npm run check
```

One command, run in sequence: the model test (`scripts/v5/model-test.mjs`),
every Test-flows entry in a real browser plus the cross-persona journeys
(`clickthrough-flows.mjs`, `journeys.mjs`), a pixel diff against the
code-rendered baselines in `ref/v5/` (`diff.mjs`), and style hygiene (no raw
hex or px, no rates outside the config, no "%" near money). Single steps:
`npm run model | flows | visual | lint`. When a visual change is intended,
re-accept the baseline (`node scripts/v5/diff.mjs --accept <key>`). Screenshots
of any state: `node scripts/v5/shoot.mjs <outDir> <screen-id | flow:key>...`.

## Layout

| Path | What |
| --- | --- |
| `index.html`, `css/`, `js/` | The app. `js/screens/<id>.js` + `css/screens/<id>.css` is one screen |
| `js/money-config.js`, `js/money.js` | Rates and the money model |
| `js/state.js`, `js/tailor-data.js`, `js/focus.js` | The state machine, transitions, selectors |
| `js/fixtures/` | Test-flows entries by milestone, `money-scenarios.js` for expected amounts |
| `js/inventory.js` | The screen inventory behind `sys-index` |
| `scripts/v5/` | The check harness |
| `ref/v5/` | Visual baselines, one per Test-flows key |
| `docs/v5/` | Plan, decisions, specs, progress ledger, review guide |
| `docs/HISTORY.md` | Build history (v4, then the v5 build) |
| `taily-prototype-v1/v2/v3.html` | Archived earlier prototypes |

## Figma

File `TAILY` (`spK8ZHnsPlWEuD8zRmf5sY`). v5 lives on its own pages: **User - v5**,
**Tailor - v5**, **Tailor - Onboarding v5** and **Flow v5** (journey and state
diagrams); the v4 pages are untouched. Code is built first and Figma synced per
milestone: the M1, M3 and M4 frames are on the pages, the sync for the rest
(M0 components, M2, M5, M6) is still to do. Figma node ids are in
`scripts/screens.json`.

## Conventions

- Tokens only (`css/tokens.css`): Cormorant Garamond for headings, Hanken
  Grotesk for UI, the 10/12/16/24/28/32/36 type scale, 390-wide screens.
- Persona comes from the screen id: `c-` customer, `t-` / `to-` tailor, `sys-` system.
- A shared component is added to `js/components.js` before a screen uses it.
- Branches: `V5` is the v5 line; `main` still holds v4.
