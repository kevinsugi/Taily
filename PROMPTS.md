# Claude Code prompts — Figma → Taily v4 prototype

One prompt per phase. Each is self-contained (every Claude Code session starts fresh), so paste
the whole block. Run one phase per conversation, `/clear` between, commit when the phase's
"Done when" holds. Order: user flow (Phases 0–6), then tailor flow (Phase 7).

Conventions used throughout:
- Figma file `spK8ZHnsPlWEuD8zRmf5sY`, page **User - Main Flow 2** `277:2636`, **Components** `183:2293`, **Flow 2** `263:6366`.
- Screen IDs (use these as file names and diff keys):
  `01-home 277:2653 · 02-appointment-details 277:2676 · 02a-date-time-sheet 277:2916 · 09-bookings 277:2804 · 04a-payment-sheet 277:2887 · 04b-add-card-sheet 277:2967 · 04c-appointment-confirmed 277:2844 · 04d-appointment-complete 308:3578 · 03-finding-tailor 281:1237 · 05-appointment-reminder 308:4108 · m1-message-tailor 282:1239 · 06-order-status 282:1283 · 06a-review-approve 308:3171 · 07-items-ready 283:1287 · 07a-pickup-window 283:1328 · 07b-delivery-options 283:1372 · 08-journey-complete 283:1419`
- Phase 0 can run here in Cowork (Figma tools are connected) or in Claude Code once the Figma MCP is added.

---

## Phase 0 — Figma readiness audit (Figma, before any code)

```
You are auditing the Figma file spK8ZHnsPlWEuD8zRmf5sY, page "User - Main Flow 2" (277:2636), to make it
implementation-ready. Nothing gets coded until this passes. Load the figma-use skill before any use_figma call.

Scope: these 17 frames only —
01 Home 277:2653, 02 Appointment Details 277:2676, 02A Date & Time Sheet 277:2916, Bookings 277:2804,
04A Payment Method Sheet 277:2887, 04B Add Card Sheet 277:2967, 04A Appointment Confirmed 277:2844,
04B Appointment Complete 308:3578, 03 Finding Your Tailor 281:1237, 05 Appointment Reminder 308:4108,
M1 Message Tailor 282:1239, 06 Order Status 282:1283, 06 Review & Approve 308:3171, 07 Items Ready 283:1287,
07A Select Pickup Window 283:1328, 07B Delivery Options 283:1372, 08 Journey Complete 283:1419.

Step 1 — Audit (read-only). For every frame, walk the whole subtree with use_figma and report, per frame:
  a. Fills/strokes/text colors NOT bound to a color variable (list node name + hex).
  b. Padding, gaps, item spacing not bound to a space/* variable, or not on the 4px grid.
  c. Text nodes whose font size is not 12/16/28 or whose family is not Cormorant Garamond / the family/sans variable.
  d. Buttons that are not instances of the CTA component; navs not Top Nav instances; pills not Status Pill instances; detached instances.
  e. Root layout: is the root V auto-layout? Status bar at (0,0) 390x44 absolute? Top Nav at (0,44) 390x56 absolute? Content top offset (report the number — currently 120/124/128 varies)?
  f. Layer names that are generic (Frame 123, Rectangle, Group) at the first two levels.
Pay special attention to the nine "body"-structured screens (03, 05, M1, 06, 06 Review, 07, 07A, 07B, 08) — they were built differently and are the likeliest to fail a–d.
Present the audit as a table: frame → count of issues per category → the worst three items. Then STOP and wait for my go-ahead before changing anything.

Step 2 — Fix (after I approve). Apply, in this order, and re-verify after each:
  1. Rebind every unbound color to the matching variable (ink 72:115, white 72:116, neutral/50–700 72:117–72:124, accent/base 72:125, accent/ink 72:126, accent/bg 72:127, sage 72:128, success 72:129/bg 72:130, warning 103:449/bg 103:450, error 103:451/bg 103:452). If a color has no variable, list it — do not invent a variable.
  2. Snap spacing to the 4px grid and bind to space/4–40 (72:133–72:141).
  3. Replace hand-drawn buttons with CTA instances (Default/Secondary), navs with Top Nav (correct Active), pills with Status Pill variants.
  4. Normalize content top offset to ONE value across all 17 frames (use 128 unless I say otherwise), CTA width to one value, sheet scrims to ink @ 0.4 node opacity over the screen (no flat #8c8a85).
  5. Rename duplicates so every screen has a unique ID: keep "04A - Payment Method Sheet"/"04B - Add Card Sheet" as sheets, rename the full screens to "04C - Appointment Confirmed" and "04D - Appointment Complete", and "06 - Review & Approve Final Order" to "06A - Review & Approve Final Order". Report the final names.
  6. Rename generic layers at the first two levels to semantic names: Header, Body, Section, Card, CTA Bar, Summary, List.
Font gotcha: before editing any text containing symbols (🏠 ▤ ◉ ★ ✎ › ✓), preload Noto Sans, Noto Sans Symbols, Noto Sans Symbols2 in try/catch.
Do not change copy, colors, or layout intent — only bindings, naming, and consistency. If something looks like a design mistake, list it under "Needs Kevin" instead of fixing it.

Done when: re-running Step 1 reports zero unbound colors, zero off-grid spacing, zero non-component buttons/navs/pills, one top offset, unique frame names. Finish by printing the final frame-name → node-id list so I can paste it into CLAUDE.md.
```

After Phase 0, save a named version in Figma ("v4 build start") and update the screen-ID list at the top of this file if any names changed.

---

## Phase 1 — Project setup, restructure, CLAUDE.md, reference exports

```
We are rebuilding the Taily prototype (this repo) so it matches the Figma screens exactly. Figma is the source of truth
for visuals; the current index.html (v3) is the source of truth for behaviour. This session is setup only — no screen work.

1. Archive: copy index.html to taily-prototype-v3.html (keep the original for now; it will be replaced in Phase 4).
2. Tooling: npm init -y; npm i -D playwright pixelmatch pngjs. Playwright's Chromium is already installed locally — do not
   run "playwright install" unless a launch actually fails. Add .gitignore entries: node_modules, diff/, .env.
3. Structure (plain files, no bundler — this must keep deploying to GitHub Pages from main as-is):
     index.html                shell: Google Fonts link, <div class="stage"><div class="screen" id="screen"></div></div>, css links, module script
     css/tokens.css            (empty placeholder, generated in Phase 2)
     css/base.css              (placeholder)
     css/components.css        (placeholder)
     css/screens.css           (placeholder)
     js/data.js                seed data extracted from v3 (tailors, garments, JOB_TYPES, seed appointments) — port verbatim, no redesign
     js/state.js               the v3 appointment state machine (requested → confirmed → ready → completed; declined/cancelled) ported verbatim as an ES module
     js/screens/               empty for now
     js/app.js                 minimal router: render(screenId) + history stack; no screens registered yet
     ref/                      Figma frame exports (ground truth)
     diff/                     generated diff images (gitignored)
     scripts/export-refs.mjs   see 4
     scripts/diff.mjs          see 5
   Read v3 carefully before porting: extract data.js and state.js as-is, then `node --check` each file. Do not port any v3 CSS or markup — the visuals are being rebuilt from Figma.
4. scripts/export-refs.mjs: reads FIGMA_TOKEN from env, calls GET https://api.figma.com/v1/images/spK8ZHnsPlWEuD8zRmf5sY?ids=<comma ids>&format=png&scale=2,
   downloads each PNG to ref/<screen-id>.png using this map:
     01-home 277:2653, 02-appointment-details 277:2676, 02a-date-time-sheet 277:2916, 09-bookings 277:2804,
     04a-payment-sheet 277:2887, 04b-add-card-sheet 277:2967, 04c-appointment-confirmed 277:2844,
     04d-appointment-complete 308:3578, 03-finding-tailor 281:1237, 05-appointment-reminder 308:4108,
     m1-message-tailor 282:1239, 06-order-status 282:1283, 06a-review-approve 308:3171, 07-items-ready 283:1287,
     07a-pickup-window 283:1328, 07b-delivery-options 283:1372, 08-journey-complete 283:1419
   Put the map in scripts/screens.json so diff.mjs shares it. Add npm scripts: "refs": "node scripts/export-refs.mjs", "diff": "node scripts/diff.mjs".
5. scripts/diff.mjs <screen-id|all>: launches Chromium (Playwright), viewport 390 x (ref PNG height / 2), deviceScaleFactor 2,
   opens index.html?screen=<id> via file:// or a tiny static server, waits for fonts (document.fonts.ready), screenshots the
   .screen element, compares with ref/<id>.png using pixelmatch (threshold 0.1), writes diff/<id>.png, prints "<id>: X.XX% mismatch".
   Exit code 1 if any screen > 1.0%. Handle height mismatch by padding the shorter image, and report the height delta separately.
6. Write CLAUDE.md with exactly this content, then adjust the screen list if Phase 0 renamed anything:

   # Taily v4 prototype
   Visual source of truth: Figma spK8ZHnsPlWEuD8zRmf5sY, page "User - Main Flow 2" (277:2636). Components page 183:2293.
   Screens (id → node): see scripts/screens.json. Behaviour source of truth: js/state.js (ported from v3, do not redesign).
   Rules
   - Match Figma exactly: px, weights, colors, line-heights from get_design_context. Never round, "improve", or re-space.
   - Colors, spacing, radius, type sizes ONLY through css/tokens.css variables. No literal hex/px for those outside tokens.css.
   - 3 type sizes (12/16/28); hierarchy via weight + color only.
   - Components live in css/components.css + js/components.js, one class per Figma variant. Add a variant there before using it in a screen. Never fork a component inside a screen.
   - Screens: 390 wide, background var(--neutral-50); .status-bar absolute 0/0 h44; .top-nav absolute 0/44 h56; .body padding-top 128, sides 20 (confirm against Figma after Phase 0).
   - If Figma looks wrong or inconsistent, STOP and report it; do not fix it silently.
   Workflow per screen: get_design_context (per top-level child for tall frames) → js/screens/<id>.js → npm run diff -- <id> → ≤1% → commit "feat(screen): <id>".
   ref/ PNGs are Figma exports @2x (npm run refs, needs FIGMA_TOKEN). Re-export if Figma changed.
   No build step. Plain HTML/CSS/JS. Deploys to GitHub Pages from main.

7. Create .claude/commands/screen.md:
   ---
   description: Implement one Figma screen and diff it
   ---
   Implement screen $ARGUMENTS (a screen id from scripts/screens.json). Steps: (1) get_metadata on the node, then get_design_context
   on each top-level child (not the whole frame) and get_screenshot on the frame. (2) Write js/screens/<id>.js exporting render(state)
   that returns the screen's HTML using ONLY components from js/components.js; if a needed variant is missing, add it to
   components.css/js and components.html first. (3) Register the screen in js/app.js. (4) npm run diff -- <id>. (5) Iterate until
   ≤1% mismatch; then list every remaining pixel deviation and its cause. Do not touch other screens. Do not modify tokens.css.

8. Ask me for FIGMA_TOKEN, run npm run refs, confirm 17 PNGs in ref/ with widths of 780px.
9. node --check every js file; open index.html in Playwright and confirm no console errors.

Done when: the tree above exists, refs are exported, CLAUDE.md and the /screen command are in place, and a commit
"chore: v4 scaffold" is made on a branch feat/v4-scaffold.
```

---

## Phase 2 — Tokens, type, stage

```
Read CLAUDE.md first. This session produces css/tokens.css and css/base.css only. No components, no screens.

1. Tokens: call get_variable_defs on Figma node 277:2653 (file spK8ZHnsPlWEuD8zRmf5sY), then on 277:2844 and 282:1283 to catch
   variables the Home screen doesn't use. Write css/tokens.css as :root custom properties using the Figma names verbatim,
   kebab-cased: --ink, --white, --neutral-50 … --neutral-700, --accent-base, --accent-ink, --accent-bg, --sage, --success,
   --success-bg, --warning, --warning-bg, --error, --error-bg, --space-4 … --space-40, --radius-sm/md/lg/xl/full,
   --size-12/16/28, --font-sans, --font-serif. Add a header comment "GENERATED FROM FIGMA VARIABLES — do not hand-edit".
   If a variable exists in Figma that I haven't listed, include it. If a value in Figma is missing (e.g. no size/13), do NOT invent one — list it.
2. Fonts: confirm the actual family behind family/sans from the variable defs. Put a single Google Fonts <link> in index.html
   with exactly the families and weights used across the 17 screens (get_design_context on 277:2653, 277:2676, 282:1283 to
   enumerate weights). Cormorant Garamond is the serif. Add real fallback stacks.
3. Type classes in base.css — exactly three sizes. For each, take font-size, weight, line-height (in px, as Figma renders it —
   do not use "normal"), and letter-spacing from get_design_context on real text nodes in 277:2653:
     .t-title  → 28 serif SemiBold (page titles)
     .t-body   → 16 sans (Regular/Medium/SemiBold via modifier classes .w-500 .w-600)
     .t-caps   → 12 sans SemiBold uppercase, letter-spacing as in Figma
   Color is applied via utility classes .c-ink .c-600 .c-500 etc. mapped to tokens. Nothing else sets font-size anywhere.
4. Stage + chrome in base.css:
     html/body reset, background outside the stage = var(--neutral-100) (desktop only)
     .stage: centered, width 390, min-height 100vh
     .screen: width 390, min-height 844, position relative, background var(--neutral-50), overflow hidden (scrolling happens on .body or the page — match Figma: frames grow taller than 844, so let the page scroll)
     .status-bar: absolute 0/0, 390x44 — implement V2/Status Bar from Figma (get_design_context on the instance inside 277:2653) pixel-exact: time, signal, wifi, battery as inline SVG.
     .top-nav: absolute 0/44, 390x56 — get_design_context on the Top Nav instance in 277:2653; three items Home/Bookings/Profile with an Active state class.
     .body: padding-top per Figma (128 after Phase 0 — verify), padding sides 20, display flex column, gap from Figma.
     Hide .status-bar under @media (display-mode: standalone).
5. Write tokens.html: a swatch/type specimen page rendering every token and the three type classes. Screenshot it with
   Playwright at 390 wide and view the PNG yourself; compare against a get_screenshot of 277:2653's heading block.

Done when: tokens.css contains every Figma variable and nothing else, base.css has the three type classes with explicit
line-heights, the status bar and top nav render pixel-identical to the Figma instances (crop-compare via a temporary diff),
and `grep -nE '#[0-9a-fA-F]{3,8}' css/base.css` returns nothing. Commit "feat: tokens + base".
```

---

## Phase 3 — Component library + gallery (use plan mode first)

```
Read CLAUDE.md. Enter plan mode before writing code. This session builds every component used by the 17 user screens,
into css/components.css and js/components.js (small render functions returning HTML strings), plus components.html —
a gallery page that renders every variant, labelled with its Figma name.

1. Inventory: get_metadata on the Components page 183:2293 and on each of the 17 screens; list every instance name that
   appears (Garment Tile, User - Garment Card, Appointment Card, Status Hero, CTA, Status Pill, Filter Pill, Top Nav,
   V2/Status Bar, Active Job Card, wheel picker rows, payment method rows, message bubbles, pickup-window rows, delivery
   option rows, progress/step indicators, etc.). Show me the inventory with counts and which screens use each. Wait for OK.
2. For each component, get_design_context on the main component (or one clean instance) and implement:
   - one CSS class per Figma variant (e.g. .pill--requested, .cta--secondary, .appt-card--past), never per-screen overrides
   - sizes exactly as Figma: CTA h53 full-width-in-body; Garment Tile 108.67 x 110 via `grid-template-columns: repeat(3, 1fr); gap: 12px` on the 350 track; Status Bar 390x44; sheets: scrim rgba(ink, .4) + white panel, radius var(--radius-xl) top corners, 36x4 grabber
   - every color/space/radius via tokens; every text via .t-* classes
   - garment illustrations: reuse the base64 WebP data URIs already in taily-prototype-v3.html (extract them, do not re-encode). Other icons: download_assets from Figma as SVG and inline them.
   - states the prototype needs (pressed/disabled/active) only if they exist as Figma variants; otherwise a simple opacity rule and a note.
3. components.html renders all variants in a 390-wide column with the Figma variant name above each. Screenshot it and
   get_screenshot on the Figma component set; view both and fix visible differences before moving on. For the three most
   used (CTA, Appointment Card, Status Pill) do a crop diff against a Figma export at 2x.
4. No screen files yet. Do not modify tokens.css; if a token is missing, stop and tell me.

Done when: every instance name from the inventory has an implementation and a gallery entry, `grep -nE '#[0-9a-fA-F]{3,8}|[0-9]+px' css/components.css` shows only values that have no token (list them), and commit "feat: components".
```

---

## Phase 4 — Screens

Use the `/screen <id>` command for each screen; batch 3–5 per session. Two batch prompts:

### 4A — original-structure screens

```
Read CLAUDE.md. Implement these screens in order using /screen for each: 01-home, 02-appointment-details, 02a-date-time-sheet,
09-bookings. Then, in a second pass if context allows: 04a-payment-sheet, 04b-add-card-sheet, 04c-appointment-confirmed,
04d-appointment-complete.
Rules for this batch:
- Sheets (02a, 04a, 04b) render on top of their parent screen (02 for the date sheet, 04c-flow for payment/card): the
  screenshot for diffing is the parent screen + scrim + sheet, exactly as the Figma frame shows.
- Wire behaviour to js/state.js as you go: garment tile selection → 02; Continue → 02a; Bookings nav → 09-bookings; payment
  method choice → add card. Use the v3 handlers in taily-prototype-v3.html as reference for logic only — never copy its markup or CSS.
- After each screen: npm run diff -- <id>, paste the mismatch %, and commit. Stop and show me the diff image if any screen
  sits above 1% after three iterations.
Done when: all 8 screens ≤1%, the click path Home → Appointment Details → Date sheet → Bookings works in the browser, and
each screen has its own commit.
```

### 4B — new flow screens

```
Read CLAUDE.md. Implement with /screen, in order: 03-finding-tailor, 05-appointment-reminder, m1-message-tailor,
06-order-status, 06a-review-approve, 07-items-ready, 07a-pickup-window, 07b-delivery-options, 08-journey-complete.
These frames were built as a single "body" frame in Figma; still map them onto the shared .status-bar/.top-nav/.body
structure — the pixel result must be identical, the DOM must be consistent with the other screens.
Wire into js/state.js: 03 is the post-request searching state → 04c on confirm; 05 fires from a confirmed appointment;
M1 opens from any active appointment; 06 → 06a (approve) → 07 → 07a or 07b → 08. Add the new states to the machine
(searching, awaiting-approval, ready-for-pickup, delivered) rather than faking them with flags — show me the state
diagram diff before coding.
Same loop: diff, %, commit per screen; escalate above 1% after three tries. Any Figma inconsistency you hit goes in a
"Needs Kevin" list at the end, untouched in code.
```

---

## Phase 5 — Verification sweep

```
Read CLAUDE.md. Do not change any screen until the report is complete. Spawn a subagent for step 1 and another for step 2
so the checks are independent of the code that produced the screens.
1. Pixel: npm run diff -- all. Table: screen → mismatch % → height delta. For anything above 0.5%, open diff/<id>.png,
   view it, and name the exact element and cause (font hinting noise vs real spacing/color/size difference).
2. Text: for each of the 17 frames, pull every TEXT node's characters from Figma (get_design_context, or use_figma findAll
   type TEXT) in document order, and compare with the rendered screen's innerText in the same order. Report every
   mismatch (copy drift, missing string, extra string, casing).
3. Tokens: grep css/ and js/ for literal hex colors, px font sizes, and px spacing outside tokens.css; list offenders.
4. Behaviour: Playwright script that clicks through Home → 02 → 02a → 03 → 04c → 06 → 06a → 07 → 07a → 08 and asserts the
   expected screen id and the state machine's status at each step; and Bookings shows the seeded upcoming/past cards.
5. Accessibility sanity (do not redesign): every CTA is a <button>, nav items are links with aria-current, sheets trap
   focus and close on Escape, contrast of text tokens on neutral-50 and white computed and reported.
Then fix only what the report proves is a real deviation from Figma, re-run, and commit "fix: verification sweep".
Done when: all 17 ≤1%, zero text mismatches, zero token offenders, the click-through script passes.
```

---

## Phase 6 — Interactions and ship

```
Read CLAUDE.md. Add motion and ship. Static pixels must not change — run npm run diff -- all before and after and show both tables.
1. Sheets: scrim fades in (opacity, 200ms), panel slides up (transform translateY, 240ms, ease-out); reverse on close;
   close on scrim tap and Escape. Wheel picker (02a): scroll-snap rows, selected row style from Figma.
2. Screen transitions: forward = slide-in from right 200ms, back = slide-out; respect prefers-reduced-motion (no transform,
   opacity only).
3. Tap feedback on CTA and cards: 100ms opacity/scale as a CSS :active rule only.
4. Deep links: index.html?screen=<id> keeps working (needed by diff.mjs); back button uses history.
5. Update README.md: v4 structure, how to run (open index.html or `npx serve`), npm run refs/diff, that the data is fake.
6. Merge feat branches to main with --no-ff; confirm GitHub Pages serves kevinsugi.github.io/taily; load it on a phone at
   390 wide and check the status bar hides in standalone mode.
Done when: diff table unchanged, Pages URL live, README current, commit "feat: interactions + ship v4 user flow".
```

---

## Phase T — Tailor flow (parallel track; supersedes the old Phase 7)

Read the "Phase T" section of PROTOTYPE-PLAN.md first — it defines the isolation contract these
prompts rely on. Run T0 here in Cowork or in Claude Code; T2/T3 run in the `../taily-tailor`
worktree folder; T1 and T4 run in the main Taily folder.

### T0 — Tailor flow in Figma

```
Load the figma-use and figma-generate-design skills. In file spK8ZHnsPlWEuD8zRmf5sY, create a page "Tailor - Main Flow 2".
Sources: (a) the tailor flow chart on page "Flow 2" — frame "TAILY · END-TO-END TAILOR FLOW" 263:6457 — read every
Flow/Screen, Decision and Process label for the screen list and transitions; (b) the tailor screens in
taily-prototype-v3.html in this repo (persona "tailor") for content and structure ONLY — visuals follow the current
design system, not v3.
Conventions = identical to "User - Main Flow 2": 390w frames, V2/Status Bar instance at (0,0), Top Nav at (0,44), body
top offset 128, sides 20, every color/space/radius/type bound to the existing variables. NO new tokens unless a real gap
appears — if one does, stop and ask me before creating it.
Components, in this order:
1. Reuse untouched: CTA, Garment Card, sheets, Time Chip, Status Bar.
2. Extend shared sets (deliberate, one pass, tell me before doing it): Top Nav → add Active variants T-Home, T-Calendar,
   T-Shop; Status Pill → add any missing tailor states. Adding variants must not disturb existing instances.
3. Build new, in a "TAILOR — T/ COMPONENTS" section on the Components page, token-bound: T/Appointment Request Card
   (New/Awaiting/Closed), T/Status Hero (New/Awaiting/Confirmed/Ready/Completed/Cancelled), T/Job Action Bar
   (New/Confirmed/Ready), T/Setup Checklist Card + Row, T/Price List Row, T/Availability Day Row, T/Suggest New Times Card.
Content canon: money = $20 fee / $180 subtotal / $200 total ($120+$80 garments); Sarah = store visit, 350 W 51st St.
Font gotcha: preload Noto Sans / Noto Sans Symbols / Noto Sans Symbols2 (try/catch) before editing texts with symbols.
Build one screen at a time and screenshot each; STOP after T01 Home and T02 New Request for my review before the rest.
When all screens are done, run the Phase 0 audit (see the Phase 0 prompt) against the new page, fix what it finds, save a
named version "tailor build start", and print the final frame-name → node-id list.
```

### T1 — Branch, worktree, substrate prep (main Taily folder)

```
Read CLAUDE.md and the "Phase T" section of PROTOTYPE-PLAN.md. Setup session — no tailor screens yet.
1. `npm run check` must be green on main before anything.
2. Make screen registration data-driven so adding screens touches zero lines of app.js: each js/screens/*.js module
   self-registers into a shared registry (js/registry.js); app.js only reads the registry. No visual change — run
   `npm run check` after; the diff table must be identical. Commit to main: "refactor: data-driven screen registry".
3. `git branch feat/tailor && git worktree add ../taily-tailor feat/tailor`. Explain to me in two sentences how the two
   folders relate.
4. Add a "Tailor branch rules" section to CLAUDE.md (commit on main, then merge main into feat/tailor): the isolation
   contract — tailor-only files are js/screens/t*.js, js/tailor-components.js, js/tailor-data.js, css/tailor.css,
   ref/t*.png, tailor-components.html, scripts/clickthrough-tailor.mjs; shared files (tokens/base/components.css,
   state.js, app.js, registry.js, diff/check scripts, CLAUDE.md) change ONLY via main; screens.json is append-only on
   the tailor branch; screen ids are t-prefixed; one shared-substrate change in flight at a time.
5. In the worktree: append the tailor frames to scripts/screens.json (I will paste the node-id list from T0), set
   FIGMA_TOKEN, `npm run refs` for the t* ids only, commit "refs: tailor baseline exports" on feat/tailor.
```

### T2 — Tailor components (run in ../taily-tailor)

```
You are in the taily-tailor worktree on branch feat/tailor. Read CLAUDE.md, especially "Tailor branch rules" — you may
not modify shared files; if a task needs a shared change, stop and tell me so it can land on main first. Enter plan mode.
Build css/tailor.css + js/tailor-components.js + tailor-components.html (gallery) for every component on the Figma
"Tailor - Main Flow 2" page and the TAILOR — T/ COMPONENTS section: one class per Figma variant, tokens only, .t-* type
classes only. Nav T-Home/T-Calendar/T-Shop are additive classes on the shared .top-nav base, defined in tailor.css.
Inventory first (get_metadata on the tailor page + components section, list instance names with usage counts), show me,
then implement. Gallery-compare against Figma screenshots; crop-diff the three most used. Commit "feat: tailor components".
```

### T3 — Tailor screens + mirror model (run in ../taily-tailor; batches of 4–5)

```
You are in the taily-tailor worktree on branch feat/tailor. Read CLAUDE.md ("Tailor branch rules"). Before the first
batch: design the mirror model — one appointment entry shared by both personas; confirmBooking() pushes it into the
tailor job list; tailor actions (accept / suggest time / decline / mark ready / complete / cancel) mutate it so user
screens update. This touches state.js/data.js (SHARED): show me the state-diagram diff, and once approved implement it
as a minimal additive commit ON MAIN (git -C ../Taily, run npm run check there — user flow must stay green), then
`git merge main` here.
Then /screen each tailor id in Figma-frozen order: <paste list from T0>, batches of 4–5 per session. Refs are ref/t*.png;
first `npm run diff -- <id> --accept` seeds each baseline. Wire behaviour into the shared state machine as you go.
Create scripts/clickthrough-tailor.mjs: the tailor path (setup → accept → ready → complete, plus suggest-time and
decline branches) and one cross-persona assertion (user books → tailor accepts → user sees confirmed). Commit per screen.
```

### T4 — Merge (main Taily folder)

```
Read CLAUDE.md. Merge session. Preconditions: `npm run check` green on main AND in ../taily-tailor (run both, show me).
Then: git merge --no-ff feat/tailor (expect only a trivial screens.json append conflict — resolve by keeping both lists).
Extend scripts/check.mjs to run both clickthrough scripts and the full user+tailor screen set. `npm run check` on the
merged main — all screens within baselines, both clickthroughs green. Update README (two personas, how to switch),
tag proto-v2, push, confirm GitHub Pages still serves. Then `git worktree remove ../taily-tailor` and delete the branch.
```

### T5 — Persona gate (main; onboarding comes later as its own mini Phase T)

```
Read CLAUDE.md. Add a `persona` field to app state (default "user") and a "View as Tailor" / "View as Customer" toggle
in the stage caption OUTSIDE .screen (pixel diffs must not see it — `npm run check` before and after, identical tables).
persona decides which home screen and nav render; deep links ?screen=<id> still override for the diff harness. Keep it
throwaway-simple: onboarding will replace this toggle by setting persona from a role-choice screen; nothing else should
need to change when it does.
```

## Quick reference — when something goes wrong

- Diff stuck at 2–4% with fuzzy edges everywhere → font rendering; check line-height and letter-spacing are explicit px/em from Figma, and that the right weight is loaded (a missing 600 silently synthesizes bold).
- Screen height differs from ref → a hug/auto-layout gap or padding-bottom mismatch; compare the body's gap and the last child's margin.
- Colors slightly off → an unbound Figma fill got read as a raw hex; fix in Figma, re-export refs, rebuild.
- Claude Code "cleaned up" a spacing → point it at CLAUDE.md rule 1 and revert; the rule is px-for-px.

---

## Phase R-tooling — refinement harness (build before the first refinement round)

```
Read CLAUDE.md and the "Phase R" section of PROTOTYPE-PLAN.md. This session builds the refinement harness only — no
screen or design changes. Three pieces:

1. Ratchet baselines. Run `npm run diff -- all` and record each screen's current mismatch % into scripts/screens.json as a
   `baseline` field (keep node ids as they are). Change scripts/diff.mjs so the pass condition per screen is
   mismatch ≤ baseline + 0.1 (not a flat 1%). Add a `--accept` flag: `npm run diff -- <id> --accept` re-runs that screen
   and writes its new mismatch as the baseline. Print a table: id, mismatch, baseline, PASS/FAIL, height delta.
2. `npm run check` (scripts/check.mjs): runs, in order, diff -- all → text parity for ALL 17 screens (Figma text nodes in
   document order vs rendered innerText; reuse whatever the Phase 5 sweep used, or implement it) → scripts/clickthrough.mjs
   → grep for literal hex colors and px font-sizes outside css/tokens.css and css/base.css. Prints one summary block and
   exits 1 on any failure. Must run start-to-finish in under two minutes.
3. `npm run refs:check` (scripts/refs-check.mjs): for each ref/<id>.png, load the committed version (`git show HEAD:ref/<id>.png`)
   and the working-tree version, pixelmatch them, and print only screens that visually differ with their % — never compare
   bytes. Exit 1 if any screen differs, so it can be used as a guard.

Then: `git tag proto-v1`, confirm `git status` shows ref/ clean, run `npm run check` once and paste the output, and update
CLAUDE.md's workflow line to: "per round: npm run refs → npm run refs:check → code → npm run diff -- <id> --accept for
intended screens → npm run check → commit". Commit "chore: refinement harness (baselines, check, refs:check)".
```

## Phase R0 — Intake

```
Read the "Phase R" section of PROTOTYPE-PLAN.md. I'm going to paste a list of refinements. Create REFINE.md as a checklist,
classify each item T / C / S / B / N with a one-line reason, note its blast radius (which screens — grep js/screens/ for the
component render functions where relevant), and group the items into rounds in dependency order (T before C before S where
they actually depend on each other; unrelated S items can be their own light round). Show me the grouping before writing
the file. Don't change any code.
Items: <paste>
```
