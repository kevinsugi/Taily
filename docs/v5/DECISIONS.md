# v5 Decisions log

Locked decisions live in `MASTER-PLAN.md` §2 and §10. This file records every call an agent had to make on its own.
Format: `- **D-##** (M#, role) DEFAULTED — <decision>. Why: <reason>. Overrule: <what changes if Kevin disagrees>.`

- **D-01** (M0, orchestrator) DEFAULTED — The v4 harness (text parity against Figma, v4 click-throughs, Figma-ref diffs) is archived to `scripts/v4/` and no longer runs. v5's `npm run check` = v5 click-throughs (Test-flows entries + cross-persona sync) + visual regression against code-rendered baselines in `ref/v5/` + style hygiene + a no-"%"-in-money lint. Why: v5 is code-first, there is no Figma token, and v4 assertions describe retired behaviour. Overrule: re-port parity once v5 frames exist in Figma.
- **D-02** (M0, orchestrator) DEFAULTED — The v4 screens are unregistered in M0, so between M0 and M1 the app boots to a v5 index/placeholder screen. v4 stays intact on `main`. Why: v5 replaces the state model the v4 screens depend on. Overrule: none needed — v4 is reachable from `main`.
