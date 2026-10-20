# Taily — post-launch design backlog

Explorations approved by Kevin after the design freeze (`mvp-spec-1.0`). Nothing here ships before launch: each entry is
built into taily-app afterwards through its change log. This branch (`explore/post-launch`) never merges into `V5` or `main`.
Shipped calls stay in `DECISIONS.md`; an entry here may evolve a K-## but never edits it.

## Entry format

    ### PL-## · YYYY-MM-DD · <topic>
    - **Verdict:** <approved variation, Kevin's words>
    - **Artifact:** <link>
    - **Changes:** screens · components · copy · money · texts / emails
    - **Evolves:** K-## / D-## (or "new")
    - **Build notes:** <for taily-app, later>

## In exploration

- **Tailor onboarding: profile + background check** (to-profile, background-check step): move Photo ID off the profile
  step into the background-check step, as its last part, on the same screen as the consent.

## Approved

### PL-01 · 2026-10-20 · Welcome screen (c-welcome)
- **Verdict:** Kevin: "I like B3 but replace the tag with a dress", then "Yes" → approved as B3 · Jacket + dress, no band.
- **Artifact:** https://claude.ai/artifact/18DKyxp87RhGAydGGXth3z (board "B3 · Jacket + dress, no band"; rounds 1–2 kept on
  the canvas for reference)
- **Changes:**
  - *Screens:* c-welcome only. One centre axis for everything (logo, drawing, title, subheading, benefit block, button,
    footer); the empty gap between the copy and the button closes; the bottom lines become one footer (the Log in line,
    then one 12 px block: tailor line + legal line).
  - *Graphic:* the Suit Jacket circle is replaced by the K-18 hang rail on the page ground (no linen band, no tag): the
    cognac stitch edge to edge, a Suit Jacket and a Formal Dress on threads, with the same motion (the stitch sews in
    700 ms, the garments drop in 1000 ms, staggered 450 / 580 ms; still under reduced motion).
  - *Copy:* title "Doesn’t fit? *Taily it*" on one line (serif 36; "Taily it" Cormorant italic 700); subheading
    "Book expert tailors near you" (sans 16 / 600, neutral-700); three benefits as an icon list, left-aligned inside a
    centred block: "Vetted master tailors you can trust" (shield-check), "Fittings at home or at the shop" (house),
    "See prices before you book" (price tag); 20 px icons in accent-ink. Drops "A tailor near you, booked in five
    steps." and "Real prices up front. Your deposit is held, not charged, until the tailor accepts."
  - *Components:* `hangStage` gains a no-tag option (`tag: null` → no tag slot; the garments centre on their own); three
    new 20 px stroke icons. No new type sizes or tokens.
  - *Money:* none shown (the deposit line goes).
  - *Texts / emails:* none.
- **Evolves:** D-198 (garment illustration + one money line, K-03 #4); reuses K-18 / D-249 (the hanging stage); keeps the
  live "Continue with email" entry (K-55).
- **Build notes:**
  - "Master tailors" must be true of every vetted tailor; otherwise ship "Vetted expert tailors you can trust".
  - The one-line title is `nowrap` at 390; let it wrap below 360 px and at 200 % text so nothing clips.
  - Load Cormorant Garamond italic 700 (only the title uses it); serif stays titles-only.
  - The rail's accessible name: "A suit jacket and a formal dress hung on a stitched rail".
  - Short viewports (390 × 664): tighten the rail's top margin first; the button stays above the fold (AU-P2-4).
