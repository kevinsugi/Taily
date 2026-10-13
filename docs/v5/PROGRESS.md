# v5 Progress ledger

Resume: say "resume v5". The orchestrator reads this file and continues from **Next action**.

| M | Status | Last green commit | Figma | Notes |
|---|---|---|---|---|
| M0 Foundation | code done (`npm run check` green) | — | — | model, components, harness, integration (sys-index + sys-components, Test-flows menu, ref/v5 baselines) landed. Figma pages not yet created |
| M1 Customer booking | in progress | | | |
| M2 Tailor onboarding + Shop | todo | | | |
| M3 Request loop | todo | | | |
| M4 Fitting → completion | todo | | | |
| M5 Messaging, accounts, earnings, system | todo | | | |
| M6 Final pass | todo | | | |

**Next action:** M0 Figma pages (the 4 pages, `Flow v5`, new components on Explorations), then commit M0 and start M1 (customer booking).

## Open findings carried forward
(none)

## Orchestration
Milestone template workflow script (M1–M5, pass args {m, title, personas, focus}):
`~/.claude/projects/-Users-kevintung-Projects-taily/4890e1be-fc92-438d-8536-dcb580932dce/workflows/scripts/taily-v5-milestone-wf_8f73b7f5-8f1.js`
M1 run: wf_8f73b7f5-8f1 (resume with resumeFromRunId). If the script file is gone in a new session, re-author from this description: Spec(Opus) → Components(Sonnet) → Screens per cluster(Sonnet, parallel) → Integrate(Sonnet) → Review per persona(Opus) ⇄ Fix (≤2 rounds) → Figma(Opus).
