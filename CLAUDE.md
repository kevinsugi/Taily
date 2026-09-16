# Taily v4 prototype — rulebook

Plain HTML/CSS/JS, no build step; deploys to GitHub Pages from `main`. Visual source of truth: Figma `spK8ZHnsPlWEuD8zRmf5sY` — user page "User - Main Flow 2" `277:2636`, tailor page "Tailor - Main Flow 2" `445:1491`, Components page `183:2293`. Screen id → node map: `scripts/screens.json`. Behaviour: `js/state.js` (ported from v3 — do not redesign).

**History lives in `docs/HISTORY.md`** (every phase / round note, verbatim) and the per-round log in `UX-LOOP.md`. Grep them for a screen id or a round; do not load them whole.

## Layout of the code

- `js/app.js` — router (`render(id, { replace, fresh })`, `?screen=` deep links render frame fixtures via `isFixture()` = `!window.__tailyNavigated`, `?flow=` boots a Test-flows step), `SCREEN_MODULES` (a route needs its own `js/screens/<id>.js` calling `register(id, render, wire)`), persona gate (`state.persona` flips to `tailor` on `t0*` screens).
- `js/data.js` — seeds, money model, date helpers (`fmtWhen / fmtDay / fmtPill`). Garment illustrations are in `js/garment-icons.js` (120 KB of base64 — never read it).
- `js/state.js` — one appointment, two personas (`a.mine`); transitions (`requestTailor / tailorAccepts / confirmAppointment / completeAppointment / writeFinalOrder / approveOrder / markReady / chooseFulfilment / deliver`, terminal `cancelAppointment / declineAppointment / expireAppointment / tailorCancels`); `statusScreen(a)` is THE status → screen map; address helpers (`addressLine / hasAddress / homeAddress / FIXTURE_CONTACT`).
- `js/components.js` + `css/components.css` — one render fn / class per Figma variant (`cta, statusPill, apptCard, garmentCard, orderRows, receiptRows, feeRow, modalOverlay, sheetOverlay, wheel, selector …`). Add a variant there before using it; never fork a component inside a screen.
- Tailor side: `js/tailor-data.js` (`jobView`, `payoutRows` inputs, `visitAddress`, `resendFinalOrder`), `js/tailor-components.js`, `css/tailor.css`, `js/screens/t*.js`.
- `js/flows.js` + `js/flow-menu.js` — the bottom-right **Test flows** menu (every step of both flows; entries compose the REAL transitions — never hand-write fixture fields in a setup). `js/fixtures.js` — frame fixtures for sibling routes.
- Harness: `scripts/check.mjs` = diff (ratchet baselines in `screens.json`, gate = baseline + 0.1) + text parity (`scripts/text-parity.mjs`, live Figma text, `ALLOW` map) + four click-throughs (`clickthrough / -tailor / -sync / -flows`) + style hygiene. Money numbers the click-throughs assert come from `scripts/money.mjs` (derived from `js/data.js`). `scripts/figma-find.mjs "<text>"` surveys Figma text nodes locally (REST, no MCP).

## Design rules

- Match Figma exactly (px, weights, colors, line-heights). Never round, "improve" or re-space. If Figma looks wrong or inconsistent, STOP and report it in UX-LOOP.md; do not fix it silently.
- Colors, spacing, radius, type sizes ONLY through `css/tokens.css` variables; no literal hex/px outside `tokens.css` / `base.css` (hygiene step enforces it).
- Type = the Figma scale (`size/10, 12, 16, 24, 28, 32, 36`; `.t-title .t-section .t-body .t-small .t-caps .t-micro` + `.w-*` + `.c-*` in `base.css`); serif = Cormorant Garamond (headings), sans = Hanken Grotesk. Hierarchy by weight + colour, never an invented size.
- Screens: 390 wide, `var(--neutral-50)`; status bar 0/0 h44, top nav 0/44 h56, `.body` padding-top 128, sides 20. Figma strokes are INSIDE → bordered hug components use `box-shadow: inset 0 0 0 1px …`.
- **Trust (round 14):** every booked tailor card shows a ✓ after the name + the three verification badges (`summaryCard({ verified, badges })` via `tailorTrust(a)`, nothing while matching); 03/Confirmed is the "Meet Marco" layout (`trustCard(tailorProfile(a))` + a Visit Details block in the garments card; frame 694:3361); tapping any tailor card on the 03 family opens the `03.4-tailor-details` popup (`openTailorDetails`). Profile facts live on `TAILORS[].profile` (data.js). (Round 15: the tailor side's Sarah card became Kevin's User Summary master.)
- **Round 15 (Kevin, component-wide):** the Home tiles are the Garment Tile's Selected_One / Multi / MultiRow states (`garmentTile`, chevron zones ±1, ≤6 icons); every garments card opens with `visitBlock(rows)` ("Visit Details"); the tailor card is avatar + name ✓ + badges only (`summaryCard`), tap → 03.4; the in-page Meet Marco card is inert; Sarah's card on the tailor side is the **User Summary** master (`summaryCard({ user, tag, badges })`, placeholder badges); fee rows carry captions (`feeRow({ caption })`, 02 all three, elsewhere the visitation row); `headingRow()` seats the Back beside every heading but Home / T01 / Bookings (app.js `wireBackButtons`); **rush fee** $150 when need-by ≤ 24 h from the visit (`isRush`, `a.totals.rush`, paid at handoff, the tailor's in full — `rushOf`); PostAppt cards draw Before | Pinned tabs; copy "Add Service" / "+ Add Garment".
- **Frames are the source of truth (Kevin).** Never delete Figma frames or nodes — hide. Sibling frames only for layout-changing states; copy-only states are code + a Test-flows entry. Fixture routes render each frame verbatim on a cold `?screen=` load; live navigation renders state.

## Money model (round 12)

Visitation fee by item count — customer **$50 / $90 / $150** for 1–4 / 5–10 / 11+ items (`visitFee`), held at request, charged when a tailor accepts, refundable until the customer confirms on the 24-hour prompt. The tailor's **cut** on the same bands is **$25 / $50 / $90** (`tailorFee`); `payout()` = alteration prices + cut, printed as a "Visitation fee" row above "Your payout"; no-show compensation = the cut. Alterations (+ $20 delivery) are paid at handoff. A re-tiered fee is ONE row ("Visitation fee — 5 items, $90 tier"). **Round 13: everything that changed at the visit paints semantic/success** — added services / garments carry a `.new-badge` ("NEW", 12/16, `--radius-4`) and success text (`garmentCard` PostAppt + `tailorGarmentCard` Appt_View; Figma: User - Garment Card `Additional` 687:7388, Tailor - Garment Card `Additional_View` 690:3457), changed money rows are `.fee-row--changed`; semantic/info is no longer used for order changes. Marked customer cards draw the variant's Before / Pinned label row (tappable) over one tile row. No deposit, no commission; the tailor never sees the customer's fee amount or totals. One garment = one item (no quantities). Seed: $200 + $50 = $250 booked; $360 + $50 = $410 final; payouts $225 → $385.

## Working rules (token budget)

- **Figma is written only when Kevin asks.** A normal round = code + harness + docs. Frame edits a round would need go into the "Figma sync pending" ledger in `UX-LOOP.md`; parity `ALLOW` entries and accepted baselines carry a `pending-figma` note until the sync. On "sync Figma": `npm run figma:find` for the ids, ONE `use_figma` call per page, then `npm run refs` + the diff harness (no verification screenshots).
- Per round: ask Kevin's clarifying questions first, then code → `npm run check` → commit (`Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`) → push branch + fast-forward `main` when he says "git push". One topic per round; commit per sub-task.
- Read with `grep -n` / `sed -n` ranges, not whole files; edit with short unique anchors. Delegate mechanical sweeps (assertion renumbering, Figma id lists) to a subagent. Run click-throughs sequentially, never alongside the diff step (parallel runs corrupt screenshots).
- Adding a screen or state = a `FLOWS` entry + an `EXPECT` snippet in `scripts/clickthrough-flows.mjs`; a new frame = `screens.json` entry + `npm run refs` + `npm run diff -- <id> --accept`.
- `FigToken.env` holds the Figma token and is gitignored (`*.env`); never print or commit it.

## Known Figma inconsistencies (raised, not fixed)

Kept in `docs/HISTORY.md` ("Known Figma inconsistencies") and in each round's "Flags" list in `UX-LOOP.md`. Standing ones: 03/Requested's map is a placeholder; three 03 hero groups carry scaled (squished) Status Pill instances; the T01 base frame's Sarah job card is un-overridden; 02's card 2 has no service line and its Additional Service selector is detached.
