# v5 Progress ledger

Resume: say "resume v5". The orchestrator reads this file and continues from **Next action**.

| M | Status | Last green commit | Figma | Notes |
|---|---|---|---|---|
| M0 Foundation | code done (`npm run check` green) | 6105507 | **not started** — the 4 Figma pages, `Flow v5` and the new components do not exist yet | model, components, harness, integration (sys-index + sys-components, Test-flows menu, ref/v5 baselines) landed. Figma pages not yet created |
| M1 Customer booking | **done** | see git log | 16 frames (3 screens re-sync in M2) | review r2 fixed + director polish | | | |
| M2 Tailor onboarding + Shop | committed (655cb6a, `npm run check` green); no milestone review — covered by the M6 audit, findings in `M6-fixlist.md` | 655cb6a | not synced | 11 screens, 38 new baselines; c-welcome + sys-index re-accepted (intended: Join Taily line, new screens listed) |
| M3 Request loop | **done** | see git log | M3 sections on both pages (t-request/t-job/c-bookings re-sync in M4) | review r2 fixed + director fixes | | | |
| M4 Fitting → completion | **done** (07fb6b4) + K-01 done | | M4 frames; M3 re-synced | 25 P3s in .shots/M4-p3.json → M6 | | | |
| M5 Messaging, accounts, earnings, system | committed (140b2a4, `npm run check` green); no milestone review — covered by the M6 audit, findings in `M6-fixlist.md` | 140b2a4 | not synced | 8 new screens + M5 states on c-thread / t-thread / hosts, journeys J7–J9; re-accepted on purpose: c-thread--new, t-thread (header + context row), sys-components (M5 gallery), sys-index (new screens listed); t-thread--declined removed (now t-thread--read-only) |
| M7 World-class polish | **done** (f81baad) | | V5 masters + all frames re-synced | before/after: https://claude.ai/artifact/DaSb9aAmGFEF2RSJAJ4SDa |
| M6 Final pass | in progress: audit triaged into `docs/v5/M6-fixlist.md`, fix batches running (decisions D-154…D-174 logged) | | | |

**Next action:** WAITING ON KEVIN — review docs/v5/IMPECCABLE-CRITIQUE.md, IMPECCABLE-AUDIT.md, IMPECCABLE-COPY.md. Apply nothing until he approves (and says which items).

## Queued after M7 — impeccable (Kevin, Oct 14) — REVIEW GATE
Run `/impeccable:impeccable` (Operate mode; launcher binary download approved by Kevin's "yes"):
1. `document` → write DESIGN.md from the polished code (doc only).
2. `critique` (both personas) → report only, docs/v5/IMPECCABLE-CRITIQUE.md.
3. `audit` (a11y / perf / responsive) → report only, docs/v5/IMPECCABLE-AUDIT.md.
4. `clarify` → PROPOSED copy changes only, as a before → after table in docs/v5/IMPECCABLE-COPY.md. Do NOT edit screens.
**Gate:** Kevin reviews the critique, audit and revised copy BEFORE any change is applied. Do not apply until he approves.

## Open findings carried forward
(none)

## Orchestration
Milestone template workflow script (M1–M5, pass args {m, title, personas, focus}):
`~/.claude/projects/-Users-kevintung-Projects-taily/4890e1be-fc92-438d-8536-dcb580932dce/workflows/scripts/taily-v5-milestone-wf_8f73b7f5-8f1.js`
M1 run: wf_8f73b7f5-8f1 (resume with resumeFromRunId). If the script file is gone in a new session, re-author from this description: Spec(Opus) → Components(Sonnet) → Screens per cluster(Sonnet, parallel) → Integrate(Sonnet) → Review per persona(Opus) ⇄ Fix (≤2 rounds) → Figma(Opus).
