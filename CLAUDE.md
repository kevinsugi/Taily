# Taily v5 prototype — rulebook

Plain HTML/CSS/JS, no build step, branch `V5` (GitHub Pages serves it at https://kevinsugi.github.io/Taily/). v4 lives on
`main`; its rulebook is archived verbatim at the end of `docs/HISTORY.md` ("v4 rulebook (archived Oct 2026)").

**Start here:** `docs/v5/CONTEXT.md` (file map, signatures, tokens, FLOWS contract). Then only what your task names:
`docs/v5/MASTER-PLAN.md` (locked product rules §2, defaults §10), `docs/v5/SCREENS.md` (every screen id + state key),
`docs/v5/M#-spec.md` (the milestone you are on), `docs/v5/DECISIONS.md` (calls already made), `docs/v5/PROGRESS.md`
(where the run is; "resume v5" continues from its Next action), `docs/v5/CORE-JOURNEY.md` (Kevin's source spec).

## How v5 is built

- **Code first, Figma after.** Each milestone: spec → components → screens → integrate + `npm run check` → review →
  fix → Figma sync → commit + push. Figma (`spK8ZHnsPlWEuD8zRmf5sY`, pages `User - v5`, `Tailor - v5`,
  `Tailor - Onboarding v5`, `Flow v5`, `Explorations`) is written only through the Figma MCP (`use_figma`), once per
  milestone, following the Taily Design System rules in MASTER-PLAN §5. v4 Figma pages are never touched.
- **No human in the loop.** A call not covered by MASTER-PLAN §2 / §10 is appended to `docs/v5/DECISIONS.md` as the
  next `D-##` (format at the top of that file) and flagged in the milestone commit.
- **Money:** every rate and window comes from `js/money-config.js` (`MONEY`, `POLICY`) through `js/money.js` (integer
  cents, `fmt / fmtExact / fmtNeg`). Rendered money is **dollar amounts only, never percentages**, on both sides
  ("Taily fee −$12.50", "Deposit $16.00"). No rate literal anywhere else; the harness fails on `%` in money copy.
- **State:** `js/state.js` holds the v5 machine (request → confirmed / suggested / declined / expired → fitting →
  price-change → in-progress → ready → returning → completed, plus the cancel / can't-make-it / no-show branches);
  transitions are pure and take an appointment id; `statusScreen(appt, persona)` is THE status → screen map. The
  prototype runs on a frozen demo clock (`now()`); never call `Date.now()` in screens.
- **Screens:** one id = `js/screens/<id>.js` calling `register(id, view, wire)` + `css/screens/<id>.css`. Ids:
  `c-` customer, `t-` tailor, `to-` onboarding, `sys-` system. Screen builders never edit shared files (`app.js`,
  `flows.js`, `inventory.js`, `index.html`, `components*`, `state.js`, `data.js`, `money*`); the Integrator does.
- **Test flows:** every state in SCREENS.md is a `FLOWS` entry (`js/fixtures/m#.js`, own array per screen) with an
  `expect` snippet; setups compose real transitions and `state.sim` knobs — never hand-written fixture fields.

## Design rules (kept from v4)

- Colors, spacing, radius, type sizes ONLY through `css/tokens.css` variables; no literal hex / px font-size outside
  `tokens.css` / `base.css` (hygiene step enforces it).
- Type = the Figma scale 10 / 12 / 16 / 24 / 28 / 32 / 36 via `.t-display .t-title .t-h2 .t-body .t-small .t-caps .t-micro`
  + `.w-*` + `.c-*` (`base.css`), plus `.t-money` (32) / `.t-money--md` (24) for money. Serif = Cormorant Garamond for page and
  overlay TITLES only; sans = Hanken Grotesk for everything else, **all hero money included** (K-12: weight 600, tabular lining
  figures, never serif). Hierarchy by weight + colour, never an invented size.
- Screens: 390 wide, `var(--neutral-50)`; status bar 0/0 h44, top nav 0/44 h56, `.body` padding-top 116 (`--body-top`, D-204), sides 20.
  Figma strokes are INSIDE → bordered hug components use `box-shadow: inset 0 0 0 1px …`.
- Add a component variant in `js/components.js` / `css/components-v5.css` before using it; never fork a component
  inside a screen. 44 px touch targets, visible labels, errors next to the field, loading feedback, reduced motion.

## Harness

`npm run check` = `scripts/v5/check.mjs`: model unit test (Node) → flows click-through (every FLOWS entry lands on its
screen, `expect` holds, no console errors, money `%` lint, 44 px lint; cross-persona journeys from M3) → visual
regression vs `ref/v5/<flow-key>.png` self-baselines (`--accept-new` for new keys; `npm run visual -- --accept <key>`
for intended changes, listed in the commit) → style hygiene. Run steps sequentially, never in parallel.
`npm run serve` serves on 127.0.0.1:4173. The v4 harness is archived, unrun, in `scripts/v4/`.
**Run `npm run stamp` before committing** (any `css/` or `js/` change): it rewrites the `?v=<hash>` on every stylesheet /
modulepreload / main script and the import map in `index.html` + `components.html` so a deploy loads as one consistent
set (D-246). `npm run check` fails (first step) if the stamps are stale. Never hand-edit the `stamp:importmap` block.

## Working rules (token budget)

- Read with `grep -n` / `sed -n` ranges, never whole large files; edit with short unique anchors. Never read
  `js/garment-icons.js` (120 KB base64), `docs/HISTORY.md`, `UX-LOOP.md`, `js/v4/`, `js/screens/v4/`, `scripts/v4/`.
- Screenshots only in UX review and the 3 Figma spot checks per milestone; builders verify through `npm run check`.
- Agents return structured JSON (files changed, check result, findings), not prose reports.
- Commits: one per milestone (the orchestrator commits and pushes `V5`), body lists the DEFAULTED decisions, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `FigToken.env` (gitignored, `*.env`) holds a Figma token; never print or commit it. v5 does not use it.
