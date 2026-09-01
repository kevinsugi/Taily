# REFINE — refinement backlog (Phase R)

Classes: **T** token · **C** component · **S** screen-local · **B** behaviour/motion · **N** new screen.
Protocol per round: Figma first → `npm run refs` → `npm run refs:check` (only the round's screens may differ) →
code → `npm run diff -- <id> --accept` per intended screen → `npm run check` → commit.

## Round 1 — `refine: m1-chat + 01-upcoming` (single light round, on main)

One round by Kevin's call: total blast radius is three refs (m1, 01, 01a) across two
independent screen groups, and the four changes are visually disjoint, so per-item
attribution inside the diff images stays easy.

- [ ] **M1 — message font size → 16** — **C**: lands in `css/components.css`
      (`.bubble`, T2 / Chat Bubble master, currently `--size-14` → `--size-16`).
      Blast: **m1 only** — `bubble()` renders solely in `js/screens/m1-message-tailor.js`
      (+ the `components.html` gallery crop; verify there first, per the C rule).
      Also retires the "bubble 14 off-scale" note lineage in CLAUDE.md.
- [ ] **M1 — reduce padding between tailor details and header bar** — **S**:
      per-screen top-offset override in `screens.css` (like 03/06 have). Blast: **m1**.
- [ ] **01 & 01a — bottom padding** — **S**: scoped `[data-s="01-home"]` rule;
      `.body` deliberately has no global bottom padding. Blast: **01 + 01a**
      (one view, two refs — both baselines re-accepted).
- [ ] **01 & 01a — remove "View All"** — **S**: markup removal in `view01()`
      (its → 09 click handler goes with it; click-through never asserted it, so no B).
      Blast: **01 + 01a**.

No T items (16 is the existing `--size-16` token), no B, no N.
