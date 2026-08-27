# Figma → Prototype Plan (v4)

Goal: a web prototype that matches the Figma screens exactly — type, spacing, color, component
variants — built and verified in Claude Code. Figma is the source of truth for visuals; the
existing `index.html` (v3) is the source of truth for behaviour (state machine, personas).

## Decision: build directly in Claude Code

Do **not** wire a Figma prototype first. Figma prototyping produces a click-through that is
thrown away — none of it transfers to code, and the interaction logic already exists in v3.
What Figma needs is not a prototype but an **implementation-ready cleanup** (Phase 0), because
the Figma MCP hands Claude Code exactly what is in the file: an unbound hex becomes a hardcoded
hex, an off-grid padding becomes an off-grid padding, a detached instance becomes a one-off div.

Only exception: if you want to user-test the new 03→08 flow with people before investing,
a 30-minute Figma click-through is fine — but it is a research tool, not a build step.

## Current Figma state (checked Aug 27, 2026)

File `spK8ZHnsPlWEuD8zRmf5sY`. Pages: `User - Main Flow 2` (277:2636), `Components` (183:2293),
`Flow 2` (263:6366). The old User/Tailor Main Flow pages and their node IDs are gone.
**The tailor screens are no longer in this file** — decide whether they are in scope (Phase 0.1).

Screens on `User - Main Flow 2` (all 390w):

| # | Frame | Node | Structure |
|---|---|---|---|
| 01 | Home | 277:2653 | original (children padded 20, Status Bar + Top Nav absolute) |
| 02 | Appointment Details | 277:2676 | original |
| 02A | Date & Time Sheet | 277:2916 | sheet |
| 09 | Bookings | 277:2804 | original |
| 04A | Payment Method Sheet | 277:2887 | sheet |
| 04B | Add Card Sheet | 277:2967 | sheet |
| 04C | Appointment Confirmed | 277:2844 | original |
| 04D | Appointment Complete | 308:3578 | original |
| 03 | Finding Your Tailor | 281:1237 | NEW — `body` frame at y=128, nav absolute |
| 05 | Appointment Reminder | 308:4108 | NEW — `body` |
| M1 | Message Tailor | 282:1239 | NEW — `body` |
| 06 | Order Status | 282:1283 | NEW — `body` |
| 06A | Review & Approve Final Order | 308:3171 | NEW — `body` |
| 07 | Items Ready | 283:1287 | NEW — `body` |
| 07A | Select Pickup Window | 283:1328 | NEW — `body` |
| 07B | Delivery Options | 283:1372 | NEW — `body` |
| 08 | Journey Complete | 283:1419 | NEW — `body` |

The nine NEW screens were built differently (one `body` frame, 390 wide, no 20px side padding
at the root). They must be audited before coding — they are the most likely place for unbound
colors, hardcoded spacing, and detached components.

## Phase 0 — Make Figma implementation-ready (Figma / Cowork, ~1–2 h)

0.1 Scope: confirm the 17 frames above are the prototype. Decide tailor side: out of scope for
    v4 (recommended — it is not in the file) or restore it first.
0.2 Audit the 9 `body` screens: every fill/text color bound to a variable, every padding/gap on
    the 4px grid and bound to `space/*`, every button a `CTA` instance, every nav a `Top Nav`
    instance, every pill a `Status Pill` variant. Rebind or replace what fails.
0.3 Normalize the drift that already exists: content top offset (120 / 124 / 128 → pick one),
    CTA width (350 vs 310), sheet scrim (ink @ 0.4 opacity over the screen, not flat #8c8a85),
    duplicate screen numbers (two 04A, two 04B, two 06 — rename so each ID is unique).
0.4 Name layers semantically (`Header`, `Body`, `CTA Bar`, `Summary`). `get_design_context`
    turns layer names into class names; good names = readable CSS.
0.5 Fix the open content issues (the modified-order math, "Need by Thurs, Sept 1" vs canon
    dates) — whatever is wrong in Figma will be reproduced faithfully in code.
0.6 Freeze: save a named version in Figma history ("v4 build start"). Record the 17 node IDs
    (above) in CLAUDE.md.

## Phase 1 — Claude Code setup (~30 min)

1.1 Add the Figma remote MCP: `claude mcp add --transport http figma https://mcp.figma.com/mcp`,
    then `/mcp` → authenticate. Test with `get_metadata` on `277:2636`.
1.2 `npm init -y && npm i -D playwright pixelmatch pngjs` (Chromium already installed locally
    via Playwright; no runtime deps — the prototype stays dependency-free).
1.3 Restructure for Claude Code. A 300 KB single file is the wrong shape for an agent — every
    edit becomes a grep-and-hope. Split into:
    ```
    index.html            shell only: fonts link, stage, script/css tags
    css/tokens.css        Figma variables → CSS custom properties (generated, do not hand-edit)
    css/base.css          reset, stage, status bar, top nav, type classes, sheets
    css/components.css    one block per Figma component
    css/screens.css       per-screen layout only
    js/data.js            seed data (tailors, garments, appointments)
    js/state.js           the v3 state machine, ported as-is
    js/screens/*.js       one render function per Figma frame
    js/app.js             router + persona toggle
    ref/*.png             Figma frame exports @2x (ground truth)
    scripts/export-refs.mjs, scripts/diff.mjs
    ```
    Plain `<link>`/`<script>` tags — still no build step, still works on GitHub Pages.
    Archive current `index.html` as `taily-prototype-v3.html`.
1.4 Write `CLAUDE.md` (see template at the end). This is the single most important file:
    it is what stops Claude Code from "improving" the design.
1.5 Export reference PNGs: `scripts/export-refs.mjs` hits the Figma REST API
    (`GET /v1/images/:fileKey?ids=…&format=png&scale=2` with a `FIGMA_TOKEN`) and saves
    `ref/01-home.png` … `ref/08-journey-complete.png`. Re-run whenever Figma changes.

## Phase 2 — Tokens and type (1 session)

2.1 `get_variable_defs` on `277:2653` → write `css/tokens.css` with the Figma names verbatim:
    `--ink`, `--white`, `--neutral-50…700`, `--accent-base/ink/bg`, `--sage`, `--success`,
    `--warning`, `--error` (+bg), `--space-4…40`, `--radius-sm/md/lg/xl/full`,
    `--size-12/16/28`, `--font-sans`, `--font-serif`.
2.2 Google Fonts link with exactly the families/weights used (Cormorant Garamond 600; the
    sans family from `family/sans` — confirm, v3 used Hanken Grotesk 400/500/600/700).
2.3 Three text classes only (`.t-title` 28 serif SemiBold, `.t-body` 16, `.t-caps` 12 SemiBold
    uppercase) with **explicit px line-heights taken from `get_design_context`**. Figma's
    "auto" line height is not the browser's `normal`; if you leave line-height unset, every
    text block will be a few px off and the whole screen drifts.
2.4 Stage: `.screen` = 390 wide, min-height 844, background `--neutral-50`, `position:relative`,
    overflow-y auto. `.status-bar` absolute 0/0 h44; `.top-nav` absolute 0/44 h56;
    `.body` padding-top = the value chosen in 0.3, sides 20. Yes, render the iOS status bar —
    "exactly like the screens" includes it. On a real phone (`display-mode: standalone`) hide it.

## Phase 3 — Components (1–2 sessions, use plan mode)

Build `css/components.css` + `js/components.js` one component at a time, **one CSS class per
Figma variant**, from the `Components` page: V2/Status Bar, Top Nav (Active=Home/Bookings/
Profile), CTA (Default/Secondary, h54), Status Pill (8 variants), Garment Tile (108.67×110 —
CSS grid `repeat(3, 1fr)` gap 12 on a 350 track gives exactly that), User – Garment Card,
Appointment Card (Upcoming/Past), Status Hero, Tailor Summary Card / Active Job Card, Time Chip
(Default/Selected, 501:1039), Select Time (502:1035), Filter
Pill, Sheet (scrim ink@0.4 + white panel r24 top + 36×4 grabber), Wheel Picker rows, plus
whatever the audit in 0.2 turns up on the new screens (message bubbles, pickup-window rows,
delivery option rows, progress steps).

Ship `components.html`: a gallery rendering every variant. Open it next to the Figma
Components page and compare before touching a single screen. Getting components exact first
means each screen is mostly composition.

## Phase 4 — Screens (batches of 3–5 per session)

Per frame, always the same loop — make it a slash command (`.claude/commands/screen.md`):

1. `get_design_context` for the node (for tall frames call it per top-level child — the
   node IDs come from `get_metadata` — to keep the context manageable).
2. `get_screenshot` for the visual reference.
3. Implement `js/screens/<id>.js` using existing components only; if a component is missing,
   add it to components.css + the gallery first, then use it.
4. `npm run diff -- <id>` → mismatch % + `diff/<id>.png`.
5. Fix until ≤ 1% (font anti-aliasing is the noise floor), then commit
   `feat(screen): <id> <name>`.

Order: 01 → 02 → 02A → 09 Bookings → 04A Payment → 04B Add Card → 04C Confirmed → 04D Complete
(all original-structure, reuse most v3 logic) → then the new flow 03 → 05 → M1 → 06 → 06A Review
→ 07 → 07A → 07B → 08. Wire each screen into `state.js` as you go so the click-through works
at every commit.

## Phase 5 — Verification (continuous + one final sweep)

- `scripts/diff.mjs`: Playwright, viewport 390 × frame height, `deviceScaleFactor: 2`,
  screenshot the `.screen` element, `pixelmatch` against `ref/<id>.png`, write the diff image,
  print mismatch %. Fails the run above the threshold.
- Text audit: extract every text node from the Figma frame (`get_design_context` or
  `use_figma` findAll TEXT) vs `document.querySelector('.screen').innerText` — catches
  copy drift that pixel diffs hide behind similar-looking glyphs.
- Final pass: open `index.html` at 390 and the Figma frames side by side, screen by screen.
  Pixel diffs miss things like a wrong nav Active state that happens to be the same size.

## Phase 6 — Interactions and ship

Sheet slide-up (transform, 240 ms), scrim fade, wheel-picker scroll-snap, screen transitions,
persona toggle (keep if the tailor side comes back, else remove). Then push `main` → GitHub
Pages (`kevinsugi.github.io/taily`).

## Claude Code working rules

- One screen (or one component group) per conversation. `/clear` between. Commit every green diff.
- Tell it explicitly: "Match Figma px for px. Do not improve, round, or 'fix' spacing. If Figma
  looks wrong, stop and list it — do not resolve it silently."
- Never let it type a hex or px that has a token. `grep -E '#[0-9a-f]{6}' css/` should only
  hit `tokens.css`.
- Use plan mode for Phase 3; use a verification subagent for the Phase 5 sweep.
- Expect ~8–10 focused sessions: 1 setup, 1 tokens, 2 components, 4 screens, 1 verify/ship.

## CLAUDE.md template

```
# Taily v4 prototype
Source of truth for visuals: Figma spK8ZHnsPlWEuD8zRmf5sY, page "User - Main Flow 2" (277:2636).
Screens: 01 Home 277:2653 · 02 Appt Details 277:2676 · 02A Date&Time 277:2916 · 09 Bookings 277:2804 ·
04A Payment Sheet 277:2887 · 04B Add Card 277:2967 · 04C Confirmed 277:2844 · 04D Complete 308:3578 ·
03 Finding Tailor 281:1237 · 05 Reminder 308:4108 · M1 Message 282:1239 · 06 Order Status 282:1283 ·
06A Review&Approve 308:3171 · 07 Items Ready 283:1287 · 07A Pickup 283:1328 · 07B Delivery 283:1372 ·
08 Complete 283:1419. Components page 183:2293.

Rules
- Match Figma exactly (px, weights, line-heights from get_design_context). Never round or "improve".
- Colors/spacing/radius/type only via css/tokens.css variables. No literal hex or px outside tokens.css.
- 3 type sizes (12/16/28). Hierarchy by weight + color only.
- Reuse components in css/components.css; add a variant there before using it in a screen.
- Screens are 390 wide; status bar abs 0/0 h44, top nav abs 0/44 h56, body padding-top <N>, sides 20.
- If Figma looks wrong or inconsistent, STOP and report; do not fix silently.

Workflow per screen: get_design_context → implement js/screens/<id>.js → npm run diff -- <id> →
≤1% mismatch → commit "feat(screen): <id>". Refs in ref/ are exported @2x; re-export if Figma changed.
No build step. Plain HTML/CSS/JS, deployable to GitHub Pages as-is.
```
