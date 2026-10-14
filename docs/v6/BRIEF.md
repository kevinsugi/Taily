# Taily v6 — redesign brief (Kevin, Oct 2026)

V6 branches from V5 at 8a3bff7 and **keeps every screen, flow, state, money rule, copy decision and UX decision** from V5
(docs/v5/DECISIONS.md K-01..K-06, D-01..D-221, MASTER-PLAN §2). V6 changes the **visual system only**, by applying the
`redesign-existing-projects` skill (audit → targeted upgrades, never a rewrite) with the `minimalist-ui` skill as the
aesthetic. Behaviour, flows, money and copy do not change unless a visual rule forces a wording change.

## Locked V6 decisions (V6-K-01) — these override K-03 where they conflict
| Area | V6 rule |
|---|---|
| Fonts | **Instrument Serif** (display / titles) + **Geist** (UI, body, numbers) from Google Fonts; Geist Mono only for meta if needed. Tight tracking on serif titles (−0.02 to −0.04em, line-height 1.1). |
| Palette | **Pure warm monochrome**: bone canvas (#F7F6F3 family), white surfaces, off-black ink (#111 / #2F3437), muted grey #787774, borders #EAEAEA / rgba(0,0,0,.06). **No brand accent**: links and active states use ink + underline / weight. |
| Status | **Pastel pills incl. blue** (reverses K-03's dot + word and no-blue rule): small, uppercase, wide-tracked pills on the skill's four pastels — pale red #FDEBEC/#9F2F2D, pale blue #E1F3FE/#1F6C9F, pale green #EDF3EC/#346538, pale yellow #FBF3DB/#956400 — mapped by meaning (error / info / success / action-needed). Pastels are the ONLY colour in the UI besides the garment illustrations. |
| Shapes | **Crisp**: buttons 6px radius, cards 12px max, inputs 6px, 1px #EAEAEA borders, **no shadows** (overlays at most ultra-diffuse < 0.05). Primary CTA solid #111, white text; hover #333; active scale(0.98). |
| Icons | **Phosphor Regular** for every UI icon (nav, meta, actions), inlined as SVG (no library at runtime), one consistent weight. |
| Illustrations | **Keep the coloured garment illustrations** as they are (signature). |
| Signatures kept | **Stitched dashed divider** above totals. |
| Signatures dropped | Circle avatars → **rounded-square (squircle) initial avatars**; serif hero money → money in **Geist** (tabular, weight for hierarchy); icon-only nav → **icon + small label** nav (K-06 Back-in-nav stays: Back replaces the logo). |
| Motion | **Skill's full motion**: scroll-entry fade-up (translateY 12px, 600ms, cubic-bezier(.16,1,.3,1), IntersectionObserver), staggered list reveals (80ms), card hover lift (≤0.04 shadow), active scale(0.98), optional ambient radial blob (fixed, pointer-events none, opacity ≤ 0.04). All gated by prefers-reduced-motion; content visible at rest in tests (`html.is-test` disables motion). |
| Theme | Light only. |
| Layout | Phone only (390), as V5. |
| Kept from V5 | Every K-01..K-06 behaviour (edit the job + approval gate, required Before/Pinned photos, garment row = bare icon then underlined name + photo stack, Back in the top nav, headings flush left), money in dollars only, one primary button per screen, booking flow bar, Test-flows menu, harness. |

## Process (Kevin)
Fully autonomous, Opus (spec / reviews / Figma) + Sonnet (build). Figma: new pages "User - v6", "Tailor - v6",
"Tailor - Onboarding v6" and a "V6" component section in the same file; V5 pages untouched. When V6 passes its checks,
GitHub Pages switches from V5 to V6. One local folder; switch with `git checkout V5|V6`.
Before set for the before/after page: `.shots/V6/before/` (= V5 at 8a3bff7).

## Hand-off when V6 lands (Kevin, Oct 2026)
1. `git branch V4 main && git push -u origin V4` — preserve v4 before main moves.
2. Fast-forward `main` to `V6` (V6 descends from main via V5; no history rewrite) and push.
3. GitHub Pages source → `main` (which is V6).
4. `git switch main` locally for Kevin's review.
V5 stays untouched on `V5`; Kevin can `git switch V4|V5|V6|main` at any time.
