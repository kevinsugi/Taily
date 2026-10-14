# Taily v6 prototype — rulebook

Plain HTML/CSS/JS, no build step, branch `V6` = the v5 prototype with a visual redesign (`docs/v6/BRIEF.md`,
`docs/v6/V6-spec.md`, calls in `docs/v6/DECISIONS.md`). Every v5 screen, flow, state, money and copy rule below still holds.
`V5` stays the v5 branch; v4 lives on `main`; its rulebook is archived verbatim at the end of `docs/HISTORY.md`
("v4 rulebook (archived Oct 2026)").

**Start here:** `docs/v5/CONTEXT.md` (file map, signatures, tokens, FLOWS contract). Then only what your task names:
`docs/v5/MASTER-PLAN.md` (locked product rules §2, defaults §10), `docs/v5/SCREENS.md` (every screen id + state key),
`docs/v5/M#-spec.md` (the milestone you are on), `docs/v5/DECISIONS.md` (calls already made), `docs/v5/PROGRESS.md`
(where the run is; "resume v5" continues from its Next action), `docs/v5/CORE-JOURNEY.md` (Kevin's source spec).

## How v5 is built

- **Code first, Figma after.** Each milestone: spec → components → screens → integrate + `npm run check` → review →
  fix → Figma sync → commit + push. Figma (`spK8ZHnsPlWEuD8zRmf5sY`, V6 pages `User - v6`, `Tailor - v6`,
  `Tailor - Onboarding v6` + a `V6` component section) is written only through the Figma MCP (`use_figma`), once per
  milestone, following the Taily Design System rules in MASTER-PLAN §5. V4 and V5 pages are never touched.
- **No human in the loop.** A call not covered by MASTER-PLAN §2 / §10 is appended to `docs/v5/DECISIONS.md` as the
  next `D-##` (format at the top of that file) and flagged in the milestone commit. V6 calls go to `docs/v6/DECISIONS.md` as `V6-D-##`.
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

## Design rules (V6 — minimalist warm monochrome)

- Colours, spacing, radius, type sizes ONLY through `css/tokens.css` variables; no literal hex / px font-size outside
  `tokens.css` / `base.css` (hygiene step enforces it).
- **Fonts:** Instrument Serif (one weight, `font-synthesis: none`) for `.t-display` 40 · `.t-title` 32 · `.t-h2` 24, tracking
  −0.02 to −0.03em, line-height 1.05–1.15; Geist for everything else; Geist Mono only for codes, last-4 masks, routing/account
  digits and ZIP chips. Loaded from Google Fonts in `index.html`.
- **Type scale** 11 / 13 / 16 / 24 / 32 / 40 via `.t-display .t-title .t-h2 .t-money .t-figure .t-body .t-label .t-small .t-caps
  .t-micro` + `.w-*` + `.c-*` (`base.css`). Money is Geist (`.t-money` hero, `.t-figure` card, rows 16), tabular, never serif.
  Section heads are sentence-case `.t-label`; uppercase only inside pills / tags. Hierarchy by size step + weight + ink vs muted.
- **Palette:** canvas `--canvas` #F7F6F3, surfaces white, ink #111 (titles, money, CTA, links, active), body `--text` #2F3437,
  secondary `--text-muted` #6B6A66, glyphs `--text-faint` #787774, rules `--border` #EAEAEA / `--hairline`. **No brand accent**:
  links = ink + underline; active = ink + weight.
- **Pastels** are the only colour besides the garment illustrations: red / blue / green / yellow (`--pastel-*-bg` + `-ink`) +
  neutral grey, mapped by meaning — error / info / success / action-needed — through `statusPill` (small uppercase pills) and
  `.tag`, banners and field errors. The tone map lives in `V6-spec.md` §A4.
- **Shapes:** buttons, inputs, chips 6 px; cards, sheets, modals, banners 12 px max; pills / toggles / radios full. 1 px
  `--border` drawn INSIDE (`box-shadow: inset 0 0 0 1px …`, Figma strokes are inside). No shadows except `--shadow-hover`
  (interactive cards on hover devices) and `--shadow-float` / `--shadow-overlay` (< .05 alpha) on overlays. No gradients
  (the ambient blob is the one sanctioned radial light, three screens).
- **Icons:** Phosphor Regular only, inlined from `js/phosphor.js` (generated by `scripts/v6/phosphor.mjs` from
  `@phosphor-icons/core@2.1.1`) through `ph()` / the named exports in `js/icons.js`; never a unicode glyph as an icon, never a
  runtime icon library. Ratings use `star-fill` (the one Fill glyph). Avatars are squircle initials. Garment illustrations and
  the stitched dash above totals are the signatures — keep them.
- **Layout:** phone only, 390 wide on the canvas; status bar 0/0 h44 + top nav 0/44 h56 (icon + label; Back replaces the logo,
  K-06), `.body` padding-top `--body-top` 124, sides 20; rhythm 8 / 12 / 40 / 48; card padding 20. One ink primary per screen.
- **Motion:** press `scale(.98)`; hover lift; entry fade-up 12 px / 600 ms `cubic-bezier(.16,1,.3,1)` + 80 ms stagger via
  `js/motion.js` (IntersectionObserver, on screen arrival only). Everything gated by `prefers-reduced-motion`; `html.is-test`
  disables all motion and content is always visible at rest. Animate transform / opacity only.
- Add a component variant in `js/components.js` / `css/components-v6.css` (the V6 skin of the shared components; `components.css` /
  `components-v5.css` are the older layers it overrides) before using it; never fork a component inside a screen. 44 px touch
  targets, visible labels, errors next to the field, loading feedback, reduced motion.

## Harness

`npm run check` = `scripts/v5/check.mjs`: model unit test (Node) → flows click-through (every FLOWS entry lands on its
screen, `expect` holds, no console errors, money `%` lint, 44 px lint; cross-persona journeys from M3) → visual
regression vs `ref/v5/<flow-key>.png` self-baselines (`--accept-new` for new keys; `npm run visual -- --accept <key>`
for intended changes, listed in the commit) → style hygiene. Run steps sequentially, never in parallel.
`npm run serve` serves on 127.0.0.1:4173. Text expects match case-insensitively (V6-D-06). The v4 harness is archived, unrun, in `scripts/v4/`.

## Working rules (token budget)

- Read with `grep -n` / `sed -n` ranges, never whole large files; edit with short unique anchors. Never read
  `js/garment-icons.js` (120 KB base64), `docs/HISTORY.md`, `UX-LOOP.md`, `js/v4/`, `js/screens/v4/`, `scripts/v4/`.
- Screenshots only in UX review and the 3 Figma spot checks per milestone; builders verify through `npm run check`.
- Agents return structured JSON (files changed, check result, findings), not prose reports.
- Commits: one per milestone (the orchestrator commits and pushes `V5`), body lists the DEFAULTED decisions, ending with
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- `FigToken.env` (gitignored, `*.env`) holds a Figma token; never print or commit it. v5 does not use it.
