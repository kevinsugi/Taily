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

---

# Phase R — Refinement rounds (post-v1, minimal regressions)

v1 of the prototype is built and verified: 17 screens ≤1% against `ref/`, text parity, the
click-through script, and a CLAUDE.md that Claude Code obeys. That harness — not caution — is
what makes refinement safe. The plan below is about using it deliberately, sized for one
person refining a prototype (reviewed and trimmed — see "Review notes" at the end).

## Which strategy, and why

| Strategy | Verdict |
|---|---|
| All changes at once | **No.** Every ref changes in the same round, so a regression can't be attributed — you can't tell an intended diff from an accident, and you can't bisect. Only acceptable for a pure token change (class T below), which is "all at once" by nature. |
| Screen by screen only | Safe for screen-local edits, but wrong for shared changes: a CTA tweak applied screen-by-screen gets fixed in 5 screens and forgotten in 12, and components fork — the exact thing CLAUDE.md forbids. |
| Components first only | Right for shared changes, overkill for local ones — routing a one-screen copy edit through the component layer is ceremony. |
| **Classify by blast radius, batch by layer** | **Yes.** Sort every refinement into a class (below), then run rounds by layer: tokens → components → screens → behaviour/motion — as a dependency rule, not a strict phase gate (an isolated screen fix never queues behind an unrelated token debate). One round = one deliberate ref re-export. |

## The invariant, and the two rules that keep it

**Invariant: `main`, Figma, and `ref/` never disagree.** Everything below exists to hold that.

1. **Figma before merge.** Anything visual must exist in Figma by the time it lands on `main`,
   with refs re-exported so they agree. Exploring in code first is allowed — on a branch, as
   much as you like — because spacing and motion decisions are often better made in the browser
   than in Figma. But a visual change does not merge until Figma has caught up. Behaviour, motion
   timing, and a11y live in code only (Figma can't represent them), so they're exempt.
2. **`ref/` may only change on purpose.** Refs are committed. After every `npm run refs`,
   `npm run refs:check` (pixel-compares old vs new refs — see R-tooling; never trust raw byte
   diffs, Figma's PNG encoder isn't byte-stable) must list exactly the screens this round meant
   to touch. An unexpected ref change means an accidental Figma edit — check Figma version
   history before writing any code. On the code side, `npm run check` after every round must
   pass for all 17 screens including the untouched ones, whose refs didn't move and therefore
   prove no collateral damage.

## R-tooling — two small scripts to build before the first round (one Claude Code session)

1. **Per-screen ratchet baselines** instead of a flat 1%. A flat gate lets screens rot slowly
   (0.2% → 0.9% over five rounds, each "passing"; 1% of a 390×990 @2x screen is ~30k pixels —
   a wrong pill color fits under it). Store each screen's current mismatch in
   `scripts/screens.json` as `baseline`. `diff.mjs` gates on `mismatch ≤ baseline + 0.1`.
   When a round intentionally changes a screen, `npm run diff -- <id> --accept` writes the new
   score as its baseline (commit that with the round). Seed baselines from the current scores.
2. **`npm run check`** — one command, exit 0/1: `diff -- all` against baselines → text parity
   on ALL screens (cheap; don't be selective) → `clickthrough.mjs` → grep for literal hex / px
   font sizes outside `tokens.css`/`base.css`. If it isn't one command it won't get run.
3. **`npm run refs:check`** — decode old (git HEAD) and new `ref/*.png`, pixelmatch each pair,
   print only the screens that visually differ and by how much. This is the design-side tripwire.

## R0 — Intake and classification (one short session, no changes)

Collect every refinement into `REFINE.md` as a checklist and classify each item:

- **T (token)** — a color, spacing value, radius, or type-scale change. Blast radius: everything.
- **C (component)** — CTA, cards, pills, nav, sheets, chips. Blast radius: every screen using it.
- **S (screen-local)** — layout, content, or copy on one screen. Blast radius: that screen.
- **B (behaviour/motion)** — state machine, transitions, interactions. Blast radius: no pixels
  (static diffs must NOT change), click-through must.
- **N (new screen)** — runs the existing `/screen` loop, not this protocol.

Then `git tag proto-v1` and confirm `ref/` is clean in git, so before/after ground truth is
always recoverable. Keep one round in flight at a time — in Figma too, because restoring a
named version restores the whole page.

## The round protocol

Heavy rounds (T, C — blast radius is real): branch `refine/<name>`, named Figma version,
merge `--no-ff`. Light rounds (a batch of S items, or B): work on `main`, `npm run check` before
every push. A lighter process you follow beats a stricter one you abandon by round four.

1. Figma: apply just this round's edits; save a named version (`refine: <name>`) for heavy rounds.
   (Or, if you explored in code first: backport to Figma now, before anything merges.)
2. `npm run refs` → `npm run refs:check` → confirm only the intended screens differ.
   Commit the refs by themselves: `refs: <name>`.
3. Code, by class:
   - **T**: edit `css/tokens.css` only (regenerate from `get_variable_defs`, never hand-edit).
     If a token's *name* changed, grep for the old name everywhere. Expect every ref to change —
     this is the one round where "everything changed" is correct.
   - **C**: edit `css/components.css` + `js/components.js` only. Verify in `components.html`
     against the Figma component first, then let the screen diffs confirm propagation. Sheets
     composite over parent screens, so sheet component changes need the three sheet screens'
     full diffs, not just gallery crops. If a screen you didn't expect fails, that's a fork from
     v1 to fix, not to work around.
   - **S**: edit that screen's `js/screens/<id>.js` (+ its `screens.css` section) only. If the
     fix is tempting to make in `components.css`, it's a C item — reclassify, don't fork.
     Copy edits are caught by text parity, not pixels — `npm run check` runs both.
   - **B**: extend `scripts/clickthrough.mjs` with the new expected behaviour FIRST (it fails),
     then change `js/state.js`/`js/app.js` until it passes. The diff table must be identical
     before and after.
4. `npm run diff -- <id> --accept` for each intentionally changed screen; `npm run check` must
   pass; eyeball `diff/` images for touched screens. Then merge/push and tick the item in REFINE.md.
5. If a round goes sideways: re-cut from `main` — never stack a fix on a broken round. Figma
   rolls back via the named version.
6. If a round changes a rule (new token, new component, changed offset), update CLAUDE.md in
   the same commit, or the next session regresses it.

## Claude Code prompt skeleton for a round

```
Read CLAUDE.md. This is refinement round "<name>", class <T|C|S|B>. Scope — ONLY these items
from REFINE.md: <paste>. Figma is already updated and refs re-exported; `npm run refs:check`
reported: <paste>. Touch only <the files this class allows>. Run `npm run check` before starting
(must pass — that's the baseline) and after every change. Untouched screens must stay within
their baselines. For each screen I intentionally changed, run `npm run diff -- <id> --accept`
and commit the baseline update with the code. Finish with the check output. If any out-of-scope
screen regresses, stop and show me the diff image instead of fixing it ad hoc.
```

## Review notes (why the plan looks like this)

Reviewed as a senior engineer would; four changes made from the first draft. (1) Flat ≤1% gate
replaced by per-screen ratchet baselines — the flat gate permitted slow rot. (2) The five-step
manual gate replaced by `npm run check` — checklists in docs don't get run. (3) "Figma first,
always" relaxed to "Figma before merge" — feel decisions need a browser, and an absolute rule
would either slow every 2px nudge or get quietly broken. (4) `git diff --stat ref/` replaced by
a pixel-compare — PNG bytes aren't stable across exports, so byte diffs can cry wolf. Plus
ceremony trimmed for a solo repo: branches and `--no-ff` only where blast radius justifies them.

---

# Phase T — Tailor flow (parallel to user-flow refinement)

Goal: build the tailor persona from Figma with the same tokens and modified components, on its
own branch so the shipped user flow is never at risk — workable simultaneously with user-flow
refinement rounds — then merge, with a persona gate that shows each audience only its flow once
onboarding exists. As of Aug 29 the Figma file has no tailor page, so this starts in Figma.

## The isolation contract (what makes "simultaneously" safe)

Two kinds of files, two rules:

- **Tailor-only files — create freely on the tailor branch.** Everything tailor gets its own
  file: `js/screens/t*.js`, `js/tailor-components.js`, `css/tailor.css`, `js/tailor-data.js`,
  `ref/t*.png`, `tailor-components.html` (gallery), `scripts/clickthrough-tailor.mjs`. New
  files can't conflict with user-flow work, so the final merge is nearly automatic.
- **Shared files — change on `main`, never fork.** `tokens.css`, `base.css`, `components.css`,
  `state.js`, `app.js`, `diff.mjs`/`check.mjs`, CLAUDE.md. If the tailor work needs a shared
  change (a Status Pill variant, a state-machine extension, a nav variant), make it a small
  additive commit, land it on `main` first, and pull `main` into the tailor branch. Both flows
  then sit on the same substrate and the substrate never diverges. `scripts/screens.json` is
  the one shared file the tailor branch appends to; its merge conflict is trivial (a JSON list).

One structural prep makes `app.js` conflict-free: make screen registration data-driven
(each screen module self-registers into a registry object), so adding 15 tailor screens
touches zero lines of `app.js`.

## T0 — Tailor flow in Figma (design work, ~the biggest chunk)

Create page "Tailor - Main Flow 2" in the Figma file. Sources: the tailor flow chart on
"Flow 2" (frame 263:6457 — screen list and transitions) and the tailor screens in
`taily-prototype-v3.html` (content and structure reference only). Same conventions as the user
page: 390w, V2/Status Bar (0,0), Top Nav (0,44), body top 128, sides 20, every value bound to
the SAME variables — no new tokens unless a real gap appears, and then the token lands in the
collection (a shared change).

"Modified components" concretely means three kinds, in this order:
1. **Reused as-is**: CTA, Garment Card, Status Bar, sheets, Time Chip — instances, untouched.
2. **Extended shared components**: Top Nav gains Active variants T-Home / T-Calendar / T-Shop;
   Status Pill gains any missing tailor states. Adding variants to a component set does not
   disturb existing instances, so user screens are safe — but these edits are "shared substrate":
   do them deliberately, once, and re-run `npm run refs:check` on the user refs afterward to
   prove nothing moved.
3. **New T/ components**: T/Appointment Request Card, T/Status Hero set, T/Job Action Bar,
   T/Setup Checklist, T/Price List Row, T/Availability Day Row, T/Suggest New Times — built in
   a "TAILOR — T/ COMPONENTS" section of the Components page, token-bound like everything else.

Then run the Phase 0 audit against the new page, fix, save a named version ("tailor build
start"), and freeze the frame-name → node-id list.

## T1 — Branch + worktree setup (one short session)

`main` keeps the user flow and its refinement rounds. The tailor work lives on `feat/tailor`,
checked out as a **git worktree** in a sibling folder:

    git branch feat/tailor
    git worktree add ../taily-tailor feat/tailor

Now `Documents/Taily` is always `main` (user flow, refinement rounds) and
`Documents/taily-tailor` is always `feat/tailor` — two folders, two Claude Code sessions, one
repo underneath. No stash-and-switch, no half-states. Sync habit: after anything lands on
`main`, run `git merge main` inside the tailor worktree (routine, usually conflict-free thanks
to the contract). In the same session: land the data-driven screen registry on `main`, add a
"Tailor branch rules" section to CLAUDE.md (the isolation contract, tailor file names, `t`-id
naming), and extend `scripts/screens.json` on the tailor branch with the tailor frames + refs.

## T2 — Tailor components (tailor worktree)

`css/tailor.css` + `js/tailor-components.js` + `tailor-components.html` gallery, one class per
Figma variant, exactly like Phase 3. Nav T-variants are additive classes on the shared
`.top-nav` base (in `tailor.css`, not `components.css`). Gallery-compare against Figma before
any screen. Any needed change to a shared component goes to `main` first (contract).

## T3 — Tailor screens (tailor worktree, batches)

The `/screen` loop, unchanged: refs exported to `ref/t*.png`, baselines seeded on first accept,
batches of 4–5. Suggested order: t01-home, t01-home-setup, t01a-calendar, t01b-price-list,
t01c-services, t01d-availability, then the job lifecycle t02-new-request, t02s-suggest-time,
t02a-new-time-sent, t02b-request-declined, t03-job-confirmed, t04-job-ready, t05-job-completed,
t03a-job-cancelled (final list = whatever T0 froze). Behaviour wired into the SAME state
machine — which is the point:

**Linkage (the mirror model, restored from v3):** one appointment entry, referenced by both
personas. `confirmBooking()` on the user side pushes it into the tailor's job list; tailor
actions (accept / suggest time / decline / mark ready / complete / cancel) mutate that entry so
the user's screens update. This is a `state.js`/`data.js` change — shared substrate, so design
it early in T3, land it on `main` as an additive commit (user flow must still pass `npm run
check` with it in), then build tailor screens against it. `scripts/clickthrough-tailor.mjs`
covers the tailor path plus one cross-persona assertion (user books → tailor accepts → user
sees it confirmed).

## T4 — Merge

By merge day the only real diffs are new files plus the appended `screens.json`. In the main
folder: `npm run check` green on `main`, green in the worktree, then
`git merge --no-ff feat/tailor`, resolve the trivial JSON append, extend `check.mjs` to run
both clickthrough scripts and the full (user + tailor) screen set, run `npm run check` on the
merged result, tag `proto-v2`, push. Then `git worktree remove ../taily-tailor`. From here the
Phase R rounds cover both flows — tailor screens are just more rows in the baseline table.

## T5 — Persona gate now, onboarding later

Until onboarding exists: a `persona` field in app state (default `user`), a dev toggle in the
stage caption ("View as Tailor", outside `.screen` so pixel diffs never see it), and deep links
`?screen=t01-home` keep working for the diff harness. The toggle is the temporary stand-in for
onboarding — same mechanism, throwaway UI.

When you design onboarding in Figma (welcome → phone → verify → location, plus role choice and
tailor shop setup — the Flow 2 chart already sketches both), it becomes its own small build
phase using this same Phase T pattern: new Figma frames → audit → refs → `/screen` loop. Its
final screen simply sets `persona` and routes to the right home; the dev toggle then demotes to
a debug feature or gets deleted. Nothing about the merge waits for onboarding — the gate ships
with a toggle, onboarding replaces the toggle's UI.

## Working simultaneously — the honest caveats

- Two Claude Code sessions (one per folder) are fine; keep each session's scope inside its
  folder's flow. The failure mode is both sessions editing a shared file — the contract exists
  to prevent exactly that, and CLAUDE.md's tailor section is what enforces it on the agent side.
- Figma has no branches on your plan tier's file here — user-flow refinement rounds and tailor
  design edits share one file. Keep discipline: a refinement round's `refs:check` must still
  list only its intended screens; tailor page edits can't touch user frames except the
  deliberate shared-component extensions in T0-2, which get their own refs:check pass.
- One shared-substrate change in flight at a time (registry, mirror model, nav variants) —
  land it, sync both sides, then start the next.
