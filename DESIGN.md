---
name: Taily
description: A calm tailor's counter in your pocket. Customers book a home-visit or in-shop tailor; tailors run the job from request to hand-back.
colors:
  ink: "#1C1B18"
  white: "#FFFFFF"
  neutral-50: "#F7F4EF"
  neutral-100: "#EFEAE2"
  neutral-200: "#E2DBD0"
  neutral-300: "#C9C1B4"
  neutral-400: "#ABA294"
  neutral-500: "#857C6F"
  neutral-500-ink: "#6E665A"
  neutral-600: "#5F584E"
  neutral-700: "#443F38"
  accent-base: "#A17C4E"
  accent-ink: "#7C5D34"
  accent-bg: "#F3ECE0"
  sage: "#5E6B60"
  success: "#4F7A5B"
  success-ink: "#456E50"
  success-bg: "#E9F0EA"
  warning: "#B7852F"
  warning-ink: "#7A5A1E"
  warning-bg: "#F6EEDD"
  error: "#B0553F"
  error-ink: "#9A4632"
  error-bg: "#F4E4DF"
typography:
  display:
    fontFamily: "Cormorant Garamond, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "32px"
    fontWeight: 500
    lineHeight: "38px"
    letterSpacing: "0"
  money:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "32px"
    fontWeight: 600
    lineHeight: "38px"
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  money-md:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "29px"
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  title:
    fontFamily: "Cormorant Garamond, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "28px"
    fontWeight: 500
    lineHeight: "34px"
    letterSpacing: "0"
  h2:
    fontFamily: "Cormorant Garamond, Iowan Old Style, Palatino Linotype, Palatino, Georgia, serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "29px"
    letterSpacing: "0"
  figure:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "24px"
    fontWeight: 600
    lineHeight: "29px"
    letterSpacing: "-0.01em"
    fontFeature: "\"tnum\" 1, \"lnum\" 1"
  body:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 400
    lineHeight: "21px"
    letterSpacing: "0"
  body-strong:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "16px"
    fontWeight: 600
    lineHeight: "21px"
    letterSpacing: "0"
  small:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: "16px"
    letterSpacing: "0"
  caps:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "12px"
    fontWeight: 600
    lineHeight: "16px"
    letterSpacing: "1px"
  micro:
    fontFamily: "Hanken Grotesk, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Helvetica Neue, Arial, sans-serif"
    fontSize: "10px"
    fontWeight: 600
    lineHeight: "13px"
    letterSpacing: "0"
rounded:
  "4": "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  "20": "20px"
  xl: "24px"
  full: "999px"
spacing:
  "2": "2px"
  "4": "4px"
  "8": "8px"
  "12": "12px"
  "16": "16px"
  "20": "20px"
  "24": "24px"
  "28": "28px"
  "32": "32px"
  "40": "40px"
  rhythm-tight: "8px"
  rhythm-group: "12px"
  rhythm-block: "24px"
  rhythm-section: "32px"
  rhythm-major: "40px"
  gutter: "20px"
  body-top: "116px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.neutral-50}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.20}"
    height: "54px"
    width: "100%"
  button-danger:
    backgroundColor: "{colors.error}"
    textColor: "{colors.white}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.20}"
    height: "54px"
    width: "100%"
  button-secondary:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.20}"
    height: "54px"
    width: "100%"
  button-small:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    rounded: "{rounded.20}"
    padding: "12px 0"
    height: "44px"
  text-link:
    textColor: "{colors.accent-ink}"
    typography: "{typography.body-strong}"
    padding: "0 8px"
    height: "44px"
  text-link-danger:
    textColor: "{colors.error-ink}"
    typography: "{typography.body-strong}"
    padding: "0 8px"
    height: "44px"
  text-link-muted:
    textColor: "{colors.neutral-700}"
    typography: "{typography.body-strong}"
    padding: "0 8px"
    height: "44px"
  card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "16px"
  input-field:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "0 16px"
    height: "48px"
  time-chip:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  time-chip-selected:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.neutral-50}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  segmented:
    backgroundColor: "{colors.neutral-100}"
    textColor: "{colors.neutral-600}"
    rounded: "{rounded.20}"
    padding: "4px"
  garment-tile:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    padding: "8px"
    height: "110px"
  avatar:
    backgroundColor: "{colors.accent-bg}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.full}"
    size: "56px"
  status-action:
    textColor: "{colors.accent-ink}"
    typography: "{typography.small}"
  status-pending:
    textColor: "{colors.warning-ink}"
    typography: "{typography.small}"
  status-progress:
    textColor: "{colors.neutral-700}"
    typography: "{typography.small}"
  status-done:
    textColor: "{colors.success-ink}"
    typography: "{typography.small}"
  status-stop:
    textColor: "{colors.error-ink}"
    typography: "{typography.small}"
  status-calm:
    textColor: "{colors.neutral-700}"
    typography: "{typography.small}"
  tag-changed:
    backgroundColor: "{colors.accent-bg}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  tag-removed:
    backgroundColor: "{colors.neutral-100}"
    textColor: "{colors.neutral-600}"
    typography: "{typography.micro}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  top-nav:
    backgroundColor: "{colors.neutral-50}"
    height: "56px"
    padding: "0 20px"
  top-nav-link:
    textColor: "{colors.neutral-600}"
    rounded: "{rounded.md}"
    size: "44px"
  top-nav-link-active:
    textColor: "{colors.ink}"
    rounded: "{rounded.md}"
    size: "44px"
  flow-bar:
    backgroundColor: "{colors.neutral-50}"
    height: "56px"
    padding: "0 12px"
  action-bar:
    backgroundColor: "{colors.neutral-50}"
    padding: "12px 20px 20px"
  sheet:
    backgroundColor: "{colors.neutral-50}"
    rounded: "{rounded.xl}"
    padding: "12px 20px 32px"
  modal:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.xl}"
    padding: "24px 20px 20px"
  toast:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.neutral-50}"
    typography: "{typography.caps}"
    rounded: "{rounded.20}"
    padding: "10px 16px"
  banner-info:
    backgroundColor: "{colors.accent-bg}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  banner-warning:
    backgroundColor: "{colors.warning-bg}"
    textColor: "{colors.warning-ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  banner-error:
    backgroundColor: "{colors.error-bg}"
    textColor: "{colors.error-ink}"
    rounded: "{rounded.md}"
    padding: "12px 16px"
  empty-state-art:
    backgroundColor: "{colors.accent-bg}"
    rounded: "{rounded.full}"
    size: "120px"
  # since K-22 (pre-MVP + K-53; K-53 a6 update, Oct 18 2026)
  button-primary-two-line:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.neutral-50}"
    typography: "{typography.body-strong}"
    rounded: "{rounded.20}"
    height: "auto (54px min)"
    width: "100%"
  card-tap:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "16px"
  request-strip:
    backgroundColor: "{colors.accent-bg}"
    textColor: "{colors.accent-ink}"
    typography: "{typography.small}"
    padding: "12px 20px"
  notice-card:
    backgroundColor: "{colors.white}"
    rounded: "{rounded.lg}"
    padding: "16px"
  text-banner:
    backgroundColor: "{colors.white}"
    textColor: "{colors.ink}"
    typography: "{typography.small}"
    rounded: "{rounded.lg}"
    padding: "12px 16px"
  confirm-sheet:
    backgroundColor: "{colors.neutral-50}"
    rounded: "{rounded.xl}"
    padding: "12px 20px 32px"
---

# Design System: Taily

> Derived from the shipped code: first at M7 (commit `f81baad`), brought up to date for the MVP handoff (K-53 a6, Oct 18 2026, on
> `feat/pre-mvp` after the pre-MVP fix pass, K-51, K-53 and the findings sweep `9977768`): `css/tokens.css`, `css/base.css`,
> `css/components.css`, `css/components-v5.css`, `js/components.js`, `js/icons.js`, and the visual baselines in `ref/v5/`. Authority
> order when they disagree: Kevin's locked calls (K-## in `docs/v5/DECISIONS.md`) > `css/tokens.css` > this file. The living gallery
> is `components.html` (and the `sys-components` screen); the engineers' short version is `docs/v5/DESIGN-SYSTEM.md`.
> `.impeccable/design.json` (machine-readable extensions) is the M7 snapshot; where it disagrees, this file wins.

## Overview

**Creative North Star: "The Tailor's Counter"**

Taily should feel like standing at a good tailor's counter: unbleached linen under your hands, a receipt book written in pencil,
the garment on the hanger in front of you. Sarah books between meetings; Amara answers between fittings with pins in her mouth.
Both glance, decide, and put the phone down. So the surface is calm and warm, the hierarchy is legible at a squint, and nothing
competes with the one decision on the screen. It is an app for running an errand, not a dashboard.

Every screen reads in the same order: a serif title, then one focal fact or figure, then quiet groups of rows separated by air,
then one black button. Depth is almost absent. The page is linen (`neutral-50`), and only things you can touch are lifted onto
tissue-white cards with a chalk ring. Colour is rationed: graphite ink does the work, basting-thread brown (`accent-*`) marks "your
move", and warm semantic tones (sage, ochre, green, brick) speak only through small status dots and money states. There is no blue
anywhere.

Personality comes from exactly two signatures, both locked by Kevin in K-03: **the garment illustrations** (wherever a garment
appears, including photo placeholders and empty states) and **the stitched dash** (a perforation above every money total, like the
tear line on a ticket stub). Everything else stays out of the way. The product is a 390 px phone web app with no bottom tab bar: an
icon-only top nav, a focused flow bar during booking, and a sticky action bar for the one primary action.

**Key Characteristics:**
- Linen page, tissue cards with an inside chalk ring, and only for interactive groups.
- Serif (Cormorant Garamond) only for page titles and overlay titles (K-12). Everything else, every hero money figure included, is Hanken Grotesk.
- Section headings whisper: 12 px sans caps in graphite, never serif.
- Status = an 8 px warm dot plus a 12 px word. No coloured chips, no blue.
- One filled ink button per screen; every other action is an accent text link.
- Two signatures only: garment illustrations and the stitched dash.
- Space separates groups (8 inside, 32 between, 40 around the hero); lines separate only rows inside a list.
- Money prints as dollar amounts only, never percentages, with one precision per group. The one exception is the tailor's fee
  explainer (`to-fee`, K-53): "Taily’s 15% covers:" — the rate itself, never an amount.

## Colors

A warm, low-chroma linen palette: graphite ink on oat and tissue, one basting-thread brown accent, and four earthy semantic tones
that appear as dots and small ink, never as fields of colour.

### Primary
- **Basting Thread** (`accent-base`): the "your move" colour and the only decorative accent. It fills the action status dot, the
  active-nav stitch, the unread dot and the rating star. Never used for text (3.47:1 on
  linen); use Thread Ink instead.
- **Thread Ink** (`accent-ink`): accent as text and as stroke that must read. Text links, "Next opening" lines, info banners,
  avatar initials, the current stepper segment, focus rings (2 px, 2 px offset), changed money amounts, "New" / "New price" tags.
- **Tissue Wash** (`accent-bg`): the accent's ground. Avatar fill, info banners, the action-dot halo, the "changed" tag, the 120 px
  disc behind empty-state art.

### Secondary
- **Pin-Cushion Sage** (`sage`): progress. The status dot for confirmed, fitting, in progress and tailoring (D-188 moved Confirmed
  here from blue). Paired with `neutral-700` for the word.

### Tertiary (semantic, warm)
- **Tag Ochre** (`warning`, `warning-ink`, `warning-bg`): pending and waiting states, the "expiring soon" 2 px ring on a request card,
  warning banners (push denied, shop paused).
- **Seam Green** (`success`, `success-ink`, `success-bg`): done states and the Verified mark (seal glyph + word in `success-ink`).
- **Brick** (`error`, `error-ink`, `error-bg`): stop states, errors, the danger text link, and the one filled danger button inside a
  destructive confirm sheet.

### Neutral
- **Pencil Graphite** (`ink`): all primary text, the filled primary button, selected chips, the active nav icon, completed stepper
  segments, the toast.
- **Unbleached Linen** (`neutral-50`): the page, every screen background, sheets.
- **Tissue** (`white`): cards, inputs, modals. The status bar, top nav, flow bar, onboarding bar and action bar are NOT Tissue: they share the Linen page ground (K-07 / K-08).
- **Oat** (`neutral-100`): `--hairline` between rows, muted avatars, segmented-control track, the removed tag, note quotes.
- **Chalk** (`neutral-200`): `--card-ring`, the inside 1 px ring on every card.
- **Tap ring** (`--card-ring-tap` = `neutral-500`): the ring of a card that is ONE tap target (tailor row, request card, thread context,
  appointment rows, Pay with, the When row) — 3.75:1 on linen, so the boundary of a control meets 3:1 (P-31, D-374).
- **Bisque** (`neutral-300`): outline rings on small buttons, time chips and select pills; stepper grabbers.
- **Dust** (`neutral-400`): the stitched dash ink and disabled link text only.
- **Control Taupe** (`neutral-500`): glyphs, chevrons, input rings and control boundaries (3.75:1 on linen, meets 3:1 for UI). Never
  for text.
- **Caption Taupe** (`neutral-500-ink`): secondary text that must pass 4.5:1 (captions under rows, sheet Cancel, list subtitles).
- **Graphite Soft** (`neutral-600`): `--text-footnote`. Section headings, footnotes, helpers, inactive nav icons, struck old amounts.
- **Graphite Deep** (`neutral-700`): field labels, muted text links, the word next to progress / calm dots.
- **Row Rule** (`hairline`, `neutral-100`): the action bar and thread composer hairline (on scroll only) and every in-list row separator (K-04 / D-213: one hairline,
  the unsorted `--bottom-border` variable is deleted).

### Named Rules

**The No-Blue Rule.** Nothing ships in blue. `--info`, `--info-bg` and `--media-placeholder` stay defined (they are Figma variables)
but no screen or component may reference them; `.c-info` and `.banner--info` resolve to Thread Ink on Tissue Wash.

**The Base-Is-For-Glyphs Rule (D-163).** Each semantic colour has a base (dots, glyphs, strokes, fills under white text) and an
`-ink` (text). Text in a semantic tone always uses the `-ink` token; `neutral-500` is a stroke colour and `neutral-500-ink` is its text
twin.

**The Your-Move Rule (D-95).** Accent marks whose turn it is. The action status is the loudest on any list (bold word, accent dot with
a 3 px Tissue Wash halo). An added charge is not a success, so "New" tags are accent, not green.

## Typography

**Display Font:** Cormorant Garamond (with Iowan Old Style, Palatino, Georgia)
**Body Font:** Hanken Grotesk (with the system sans stack)

**Character:** A tailor's label and a receipt. The high-contrast Garamond gives each page a single, unhurried name; the grotesk
does every working job (rows, money, buttons, fields) with tabular figures and quiet weight shifts.

### Hierarchy
- **Display** (serif 500, 32 px / 38 px): a welcome / index / onboarding title only (`.t-display`). Never money (K-12).
- **Money** (sans 600, 32 px / 38 px, -0.01em, tabular lining figures; `.t-money`): the one hero money figure on a screen (payout on
  t-request, t-job, t-payout, t-earnings; delta figures, receipts). K-12: all hero money is Hanken Grotesk, weight 600 for hierarchy.
- **Money MD** (sans 600, 24 px / 29 px; `.t-money.t-money--md`): money in cards (the request card's payout "$147.50", c-pay's
  "Hold $16.00").
- **Title** (serif 500, 28 px / 34 px): the single `h1` per screen, `statusHero` titles, sheet and modal titles, empty-state titles.
  A few SemiBold titles use `.t-title.w-600`.
- **H2** (serif 600, 24 px / 29 px): overlay (modal / sheet) titles. Not a section heading any more, and not money (K-12).
- **Figure** (sans 600, 24 px / 29 px, -0.01em, tabular lining figures): the non-money hero fact: a visit time ("Thu, Oct 15 · 5:00
  PM"), "2h left", the tailor-row estimate.
- **Body** (sans 400, 16 px / 21 px): paragraphs and row labels; 500 for row labels and inputs, 600 (`body-strong`) for buttons,
  links, chips, row titles and amounts.
- **Small** (sans 500, 12 px / 16 px): captions, meta lines, helpers, the status word (at 600).
- **Caps** (sans 600, 12 px / 16 px, +1 px tracking, uppercase): section headings via `sectionHead()` in `neutral-600`, and labels
  like "YOUR PAYOUT", "VISIT". Source copy stays sentence case; CSS uppercases it.
- **Micro** (sans 600, 10 px / 13 px): change tags ("New", "Removed", +1 px tracking, sentence case on purpose).

Line heights are unitless ratios (K-04: `calc(21 / 16)`, `calc(34 / 28)`, …) that equal the pixel values Figma renders for AUTO at 1x (Hanken about 1.31, Cormorant about 1.21), so text still scales with the user's font size. The scale is the
Figma scale 10 / 12 / 16 / 24 / 28 / 32 / 36; hierarchy comes from weight and colour (`.w-400…700`, `.c-*`), never a new size.

**Sizes are rem** (S-17, D-443): `--size-16: 1rem` on the browser's 16 px root, so the pixel values above hold at the default and the
reader's text-size setting scales every size (and the icons drawn at a size token). The reflow tiers are **em** media queries
(`max-width: 18.75em` = 300 px at 16 px: the 200 % zoom tier, which a doubled text size now reaches too). Spacing, radii and the
44 px targets stay px. The garment tile's height is `--tile-h` (6.875rem = 110 px).

### Named Rules

**The Serif-Is-A-Name Rule (K-03, K-12).** Cormorant appears only for a page or overlay title. Hero money is Hanken Grotesk 600 (`.t-money`),
never serif. A serif section heading, serif row, serif button or any serif number is wrong. `.t-section` (serif 20) is retired in v5.

**The Whisper Heading Rule.** Section headings are `h2.t-caps.c-600`: small, graphite, uppercase. The content under them leads.

**The Tabular Money Rule.** Every amount, time and count sets `font-variant-numeric: tabular-nums` (`.tabular`) so columns align and
figures do not jitter as they change. Never let Cormorant render numbers or dollar amounts, hero or running (its old-style figures read "IIzoI"; K-12 moved the hero money to the sans for the same reason).

## Layout

A single 390 px phone column, centred on a `neutral-100` desktop backdrop above 391 px. Chrome: status bar 0/0 h44 and top nav or flow bar
0/44 h56, both on the Linen page ground with no rule (K-07 / K-08); the nav scrolls away with the page. The drawn 9:41 status bar is
prototype chrome (a8, D-444): it shows only under `html.device-frame` (the admin's test session — every harness render — and the
gallery); for a real visitor and an installed web app `--status-h` is the device's top safe-area inset and the nav starts there. Only the sticky action bar (and the thread composer, D-227) draws
a 1 px hairline, and only while content continues under it. The content body starts at **116 px** (`--body-top`: nav bottom 100 + 16, K-04 / D-204) with **20 px** side gutters and no
bottom padding; when a sticky action bar is present the body pads by the bar height plus 24.

Spacing is on a 4 px base (2 / 4 / 8 / 12 / 16 / 20 / 24 / 28 / 32 / 40; the 2 is `--space-2`, only for hairline gaps inside one text group) with an **uneven rhythm** (K-03 #9, five roles, D-228).
The gap between blocks is always one of these names, never a bare 16 or 24 (the hygiene step fails on it in `css/screens/*`):
- `rhythm-tight` 8: label to value, row to row inside a group.
- `rhythm-group` 12: section heading to its first row; stacked controls.
- `rhythm-block` 24: a heading to an unlabelled card, banner or empty state; a banner under a heading; the privacy note to the messages in a thread.
- `rhythm-section` 32: between sections (`<section class="sec">`).
- `rhythm-major` 40: a heading or hero (`.hero + .sec`) to a section that carries a caps label; last section to in-page actions (`.page-actions`).

The one heading-to-content rule: 40 into a labelled section, 24 into anything unlabelled, and a stepper's title sits 12 under it (`--rhythm-group`; what is above a title belongs to it).
Nothing cancels a parent gap with a negative margin: a pair that needs a smaller gap is its own sub-group.

Grids are content-shaped: the garment picker is a 3-up tile grid (110 px tiles), appointment rows are a 4-column grid (avatar /
text / status-and-amount / chevron), booking filters are a row of pills. Every tappable is at least 44 x 44; inline controls that
must stay visually small (Verified, the rating link, Back) carry an invisible 44 px pseudo-element hit area (`data-hit="inline"`).

### Named Rules

**The Space-Is-The-Separator Rule.** Groups are separated by air, not lines or boxes. A screen stylesheet may not invent another
vertical gap between groups. Lines exist only between rows inside one list.

**The Squint Rule.** At a squint each screen reads: serif title, one focal fact or figure, quiet groups, one black button. If two
things shout, one is wrong.

## Elevation & Depth

Flat by default, with one depth strategy (D-193): an **interactive group** sits on tissue white with a 1 px chalk ring drawn inside
(`box-shadow: inset 0 0 0 1px var(--card-ring)`). Reference content (price lists, breakdowns, visit details, timelines, reviews,
About, the take-home hero) sits flat on the linen with no background, ring or padding. On a squint the eye finds the touchable blocks
because they are the only white. Strokes are always inside (Figma's INSIDE stroke), so a bordered element never changes size.

Drop shadows exist only on things that float above the page: sheets, modals, toasts, dropdown menus and the push banner.

### Shadow Vocabulary
- **Overlay lift** (`--shadow-overlay`, `0 12px 32px` of `ink` at 20 %): centred confirm modals, the ink toast pill and the in-app push banner.
- **Float lift** (`--shadow-float`, `0 4px 12px` of `ink` at 8 %): the filter-pill dropdown and the selector menu.
- **Scrims**: sheet scrim `ink` at 0.4 opacity; modal scrim `ink` mixed to 45 %.

### Named Rules

**The Tissue-Under-A-Finger Rule.** White plus a chalk ring means "you can touch this". Never put reference content in a card, and
never give a card a drop shadow.

## Shapes

Soft, tailored corners on a small set of radii: 8 for thumbnails, garment wells and check boxes; 12 for inputs, chips, banners, nav
link hit boxes and change panels; 16 for cards, garment tiles and row tickets; 20 for every full-width button, small button, toast and
the segmented track; 24 for the top corners of bottom sheets and for modals; full circles for avatars, status dots, the empty-state
disc, ZIP chips and the unread badge. The 4 px radius exists only for stepper segments.

Recurring forms: the 56 px circular avatar with initials; the 8 px status dot; the 40 px garment well (8 radius, linen fill); the
dashed 56 px camera tile (1.5 px dashed `neutral-500`, turning `error` after a failed send); the stitched dash (6 px dashes, 4 px gaps,
1.5 px tall, `neutral-400`).

## Components

### Buttons
Decisive and rare: one black slab per screen, everything else a link.
- **Shape:** gently rounded slab (20 px radius), full width, 54 px tall.
- **Primary:** ink fill, linen text, Hanken 16/600. Lives in the sticky Linen action bar (12/20/20 padding; the 1 px hairline shows only while content continues under it) or in
  `.page-actions`. Busy state shows an inline spinner and `cursor: progress`.
- **Disabled / soft-disabled:** 55 % opacity. `softDisabled` keeps the look but drops the `disabled` attribute (`aria-disabled`), so a
  tap can still explain why (t-adjust Send with photos missing).
- **Press:** `transform: scale(0.97)` over 120 ms `--ease-out`; transform only, never `transition: all`.
- **Secondary (outline):** white, 1 px `neutral-300` ring. Allowed only as the second button in a confirm sheet/modal or an empty
  state with two equal paths.
- **Danger:** brick fill, white text, only inside a destructive confirm sheet.
- **Small (`cta-small`):** white with a `neutral-300` ring, 12/600, 44 px min; `--filled` is ink. Used for Directions / Add to
  calendar style pairs and the docs editor's Save.

### Two-line button (K-46)
`cta(label, { sub })` / `actionBar({ ctaSub })`: the amount on line one, when it is charged on line two, inside the same 20-radius slab;
the slab grows (`min-height: 54px`, never a fixed height). With `subId` the button is named by line one and described by line two, so
a disabled button reads its reason. Uses: "Pay $144.00 / Charged at pickup" (c-ready), the deposit V3 "Reserve · $16.00 deposit /
Charged only if Amara accepts" (c-pay, K-49), busy "Reserving…" keeps line two so the height never jumps.

### Text Links
The secondary action everywhere an outline button used to be. Hanken 16/600 in Thread Ink, 44 px tall, 8 px side padding, optional
16 px leading glyph. `--danger` (Brick Ink) only for leaving or cancelling; `--muted` (Graphite Deep); disabled in Dust. In the action
bar, secondary and tertiary links sit centred in one row 24 px apart under the primary.

### Status (dot + word)
A fact, not a sticker. `statusPill(key, label)` renders an 8 px dot and a 12/600 word with 8 px between. Tones: action (accent dot
with 3 px halo, bold word), pending (ochre), progress (sage dot, graphite word), done (green), stop (brick), calm (hollow 1.5 px
ring, so closed reads differently by shape as well as hue). Muted past rows drop to calm unless money was kept.

### Strip-led pages (K-15, K-17)
A status screen opens with ONE full-width state strip under the nav (`requestStrip({ page: true, tone, icon, text, right })`, tones
action / warn / done / calm, a clock that turns warning then error near a deadline), then `pageHead(requestHead({ page: true, … }))`:
the other person (avatar, serif name, the Verified check for a tailor) with the one amount at the right and what it was under it
(`deltaLines`: "Was $160.00 · up $45.00"). The strip carries `id="page-strip"` and describes the `h1`, so the state is announced
with the name (SF-19). A note from the other person is a `noteQuote`; an edit's date is `dueChange` ("New due date … · was …").

### Cards / Containers
- **Corner Style:** 16 px.
- **Background:** Tissue on the Linen page.
- **Shadow Strategy:** none; inside 1 px Chalk ring (see Elevation).
- **Internal Padding:** 16 px; `.card--list` pads only the sides for row lists.
- **Hosts:** tailor rows, request cards, appointment rows, thread lists, thread context, account lists, form groups with controls
  (t-adjust garment cards, c-job item cards, toggle groups), the rating card, the failed courier card. A request card expiring soon
  swaps its ring for a 2 px ochre ring. A card that is one tap target carries the tap ring (`--card-ring-tap`).
- **Stretched-link cards** (K-25, S-18 / D-442): the request card and the tailor row are one `<button>` laid over the card (its label
  says what the card says) with any second control — the Verified check, the item cluster — a real sibling button above it.

### Inputs / Fields
- **Style:** Tissue box, 12 px radius, 48 px tall, inside 1 px `neutral-500` ring (3:1 control boundary), 16 px side padding, Hanken
  16/500. Label above in 12/600 Graphite Deep; helper below in 12/500 Graphite Soft; affixes in Caption Taupe.
- **Focus:** 2 px Thread Ink outline, 2 px offset (shared rule for every control).
- **Error:** message directly under the field in 12/600; ring turns Brick. Text areas show a live count that turns Brick when over.
- **Related controls:** toggle rows (52 x 44 switch), check rows (24 px box, 8 radius), segmented control (Oat track, full-radius
  options), time chips (Tissue with Bisque ring, ink when selected), filter pills (caption above a 44 px box with a pencil glyph).

### Navigation
- **Top nav:** Linen (the page ground), no rule, scrolls away with the page, 56 px, script "Taily" logo (74 x 34) left, four 44 x 44 icon links right, 4 px apart. Icons are 24 px line
  glyphs at 1.5 stroke (home, bookings, messages, account / home, shop, earnings, messages). Inactive Graphite Soft; hover (hover
  devices) ink on linen; active ink at 1.75 stroke with a 16 x 2 px Basting Thread stitch 4 px from the bottom. Unread = an 8 px
  accent dot with a 2 px white ring on the icon's corner. Labels live in `aria-label` + `title`.
- **Flow bar (booking steps 2-5):** replaces the nav. Grid 44 / 1fr / 44: Back chevron, a compact 5-segment stepper (3 px segments;
  done ink, current Thread Ink, upcoming Oat with Chalk ring) with "n of 5", and a 16 px close glyph ("Leave booking").
- **Onboarding bar:** linen, 56 px, Back left and "Finish later" text link right.
- **No bottom tab bar** (K-03): Taily is a web app.

### Heading (K-04)
Every screen with a heading stacks three things (`headingRow(inner, { back, status })`): (1) the status line (8 px dot + word) on its
own line when the screen has one; (2) ONE row holding the Back chevron and the `h1`: the chevron's 44 px hit box is pulled 12 px into
the gutter so the glyph sits on the 20 px text edge, the title starts 4 px after it and wraps beside it (hanging indent), the chevron
centred on the title's first line; (3) the notes / description below at the screen padding, full width. Tab roots (`back: false`)
show the title alone. The booking flow bar and the onboarding bar keep their Back inside the 56 px bar (D-205). The body starts
16 px under the nav (`--body-top`), so there is no separate Back row and no gap above the title.

### Garment Item Row and Photo Stack (K-04)
One shared `garmentHead` opens every item card (change list, work list, t-adjust, c-job): the item NAME first (16/600 ink, underlined
1 px, offset 4 px, skip-ink) so it reads apart from the service rows under it, then the 40 px garment icon in its white well 8 px after
the name, then a "New item" / "Removed" tag, and at the right end the photo stack (or the card's own control, c-job's ✕). The
underline is decoration only (not a link); a removed item swaps it for a strike. `photoStack` is up to three overlapping 32 px photo
stubs (-12 px overlap, 2 px Linen ring) then "1 photo" / "4 photos" (12/600 Graphite Deep), one 44 px-tall button; it opens the
photo viewer. Before the fitting it counts the customer's photos; once the tailor has documented the fitting it counts Before +
Pinned and the customer's photos are no longer shown on that card (c-job and t-adjust are editors and keep their photo tiles).

### Sheets, Modals, Toasts, Banners
- **Sheet:** Linen, 24 px top corners, 36 x 4 grabber, 12/20/32 padding; header row ✕ · title · ✓. Enters with transform over 280 ms,
  leaves over 200 ms, both `--ease-out`; scrim ink at 0.4.
- **Modal:** Tissue, 24 px radius, 24/20/20 padding, centred; enters from `translateY(8px) scale(0.98)` + opacity over 220 ms (never
  from scale 0).
- **Toast:** ink pill, 12/600 linen text, 20 radius, bottom 24 px; success / error tones fill with the base colour under white text;
  an Undo action sits inside the pill.
- **Banner:** 12 px radius, 12/16 padding, title 16/600 + text 16/500; tones info (accent), warning, error (each `-bg` with `-ink`).

### Confirm sheets (P-32, D-375 / D-381)
Every confirm is a **bottom sheet**: `confirmSheet({ title, body, primary, secondary })` for a question (one filled button — danger
for a destructive one — plus an outline Cancel), `leaveSheet()` for "Leave without saving?" (Keep editing / Discard changes), and
`confirmAction({ header, body, ok, busyLabel }, onOk)` when the confirm runs an action itself: its own busy label and the error line
under the body ("You're offline. Nothing was sent."). The centred modal stays for system moments only.

### Notices, reminders and texts (DG-2 A, K-28, K-41, K-43)
- **Reminder card** (`reminderCard`): a white card with a 44 px bell well, a 16/600 title, one 12 px line in dollars and one small
  button ("Leave a review"). With `dismissAct` it becomes a **one-time notice** (`.notice-card`): a 44 px ✕ top right, used for a
  cancellation someone else made within 48 hours of the visit, on Home for both personas.
- **Visit prompt** (`visitPrompt`): the reminder on Home — the accent strip ("Please confirm your visit · Free until 5:00 PM today"),
  the booking row, one rule line in dollars, Confirm (filled small) + Change or cancel.
- **Text banner** (`system.js textBannerHtml`): every notification is an SMS; the prototype draws the newest one over the status bar —
  "Taily: " + the body + the unique link — and tapping it lands on the statusScreen for that person. The catalogue is `js/texts.js`.
- **Texts are off** banner (warning) on t-home / c-bookings with "Turn on texts".

### Taily Help (DG-1 B, K-48.1)
- **Get help**: a person button (`helpActions()`, the life-ring glyph) on every customer order screen, and "Get help" in the tailor's ⋯.
- **Help home** (`helpHome(who)`, c-help / t-help): Message Taily (filled), your cases (list rows with a reply-by line and an unread dot),
  "Get help with" topics, policies, Contact Taily (text / email / help hours).
- **Case thread** (`helpThreadView`, `caseThread`, `tailyHead`): a chat with "Taily Help" (initials "Ta"), the order attached as the
  thread context card, topic chips to start, masked contact details, decisions as bubbles in dollars.
- **Case strip** (`caseStrip(v)`) on the order: warn "Taily is reviewing · Reply by Fri 5:00 PM", action "Taily replied · Read it",
  done "Taily decided" + the outcome line in dollars; then "Open Taily Help".
- **Garment protection row** (`protectionRow`): shield glyph, "Garment protection: Taily covers loss or damage up to $500 per order.",
  "How it works".

### Admin (K-48.1, K-52, K-53 c7)
The CEO's own screens, never linked from the customer or tailor app: `a-login` (email → emailed code → authenticator code),
`a-inbox` (cases with `statusPill` keys `case-reply` / `case-overdue` / `case-waiting` / `case-closed`), `a-case` (the case thread +
the order + money actions, each through `confirmAction`) and `a-ledger`. The nav is Inbox · Ledger; `adminTools()` (Test flows ·
Sign out) closes both tabs.
**Ledger table** (`a-ledger`): filters are chip groups (Day · Order · Person), Totals are `moneyRows` (On hold now, Charged, Refunded,
Released, Courier to Uber, Kept deposits, Payouts paid / pending / held, Taily revenue as the total), then one section per day
(`sectionHead(day, { count })`) of money rows — label, amount (refunds, releases and Taily's costs negative "−$16.00"), a status
word at the right (Hold · Charged · Refunded · Released · Taily · To tailor · Due Fri, Oct 16 · Sent) and a caption
"10:02 AM · A-1001 · Sarah Chen · Amara Reyes". All dollars; a footnote names QuickBooks Online / Xero as the books.

### Verification and payouts (DG-4 B, D-350…D-355, K-53 Q8)
`verifyChecklist(t)` is a `card--list` of the four checks in order — ID and profile photo · Years tailoring · Payout and tax info ·
Background check (run last, "You're approved, pending your background check") — each a list row with its words (`checkWords`) and a
status dot (`check-verified` Verified · `check-pending` Pending · `check-needs` Needs info (action) · `check-todo` Not started ·
`check-waitlist` Waitlist); a row she can act on is a button. `reviewPill(t)` ("Under review · 1 of 4 checks") heads Shop and Home.
The hosted payout step: `secureSetupCard()` (what the payments partner asks, "Taily never sees your full SSN or account number"),
then `payoutRows(t)` (Identity · Tax info (W-9) · Bank account with the partner's status). The background-check disclosure
(`disclosureHtml`) is a counsel draft shown in its own sheet. The Verified check customers see is derived (every check passed).

### Availability controls (K-53 a4, S-34)
`dayHours({ windows, addable })`: a weekday toggle row; open days show their time buttons (44 px, "10:00 AM – 6:00 PM"), a split day
shows a second window with a 44 px ✕, and a one-window day offers "+ Add more hours" (two windows a day at most). Time off is a
`card--list` of whole-day ranges ("Tue, Oct 20 – Sun, Oct 25 · 6 days", Remove) with "+ Add time off" (a sheet with the scheduler wheel).
Minimum notice is a chip group ("Customers can book you at least" 3 hours · 12 hours · 1 day · 2 days). Two schedules (shop / home)
switch through a segmented control.

### Policy pages (D-380, K-53 b)
`c-policy` / `t-policy` render `policySections(policyPage(key, who))`: a legal draft opens with the warning note "Draft — counsel review
required" (`data-counsel`), the version line ("Draft of Oct 18, 2026"), then **In short** and the full sections — each a caps
`h2` and 16 px Graphite Deep paragraphs or a list, money in dollars. The texts live in `js/policies.js` (Taily Group LLC, Brooklyn).

### The Taily fee page (`to-fee`, K-53)
Step 2 of tailor onboarding opens on what the fee pays for: the serif title, one lead line, "Taily’s 15% covers:" (16/700 — the ONLY
percent in the product, printed by `money.js feePercent()` inside `[data-fee-rate]`), five items (an 8 px accent dot, the name 16/600,
one 12 px line), "And more…", then "For example": "On a $100.00 job you keep $85.00." over a three-row money breakdown (Services ·
Taily fee −$15.00 · You keep). Everywhere else the fee is an amount.

### Handoff and completion (Study-1 A, K-21, K-24, K-40, K-44…K-47)
`garmentStrip` (the order as 32 px wells, each a 44 px button opening its services popover), `pickupCode` (caps label, the digits as
one sans figure, spelled out for screen readers), the When row (`handoffWhenRow`: "Pick a time ›" in accent until picked, then the
time in ink with an ink ring), `autoCompleteLine`, the **linen stage** (`linenStage` + `tagRail`: "Your order is ready" over white
tags hanging from the stitch) and the **hang stage** (`hangStage`: the garments and the customer's tag on a thread).

### Private notes (Study-1 B2, K-31)
`privateNotes`: "General notes" with the lock line "Only you can see these notes.", each note a white card (text, a photo row, the
time, Edit), "Add a note"; the editor is a text area, a photo tray, Save note / Cancel / Delete note.

### Money Rows (with the stitched dash)
Flat rows on the linen: label 16/500 ink with an optional 12 px caption, amount 16/600 tabular right-aligned, 8 px vertical padding,
44 px min height. Subtotal 600, total 700. Exactly one stitched dash sits directly above the first total, so every breakdown,
receipt and payout carries one. Negative amounts (the Taily fee) in Graphite Deep; changed amounts in Thread Ink; old amounts struck
in Graphite Soft.

### Garment Illustrations (signature 1)
Watercolour-style garment drawings (`assets/garments/`, `js/garment-icons.js`) through one helper, `garmentIcon(type, { size })`:
hero 96 (no well, empty states and welcome), card 40 (8 radius linen well, on every garment head), row 32, inline 24. Decorative
(`alt=""`) when the name prints beside it. Unknown types fall back to a hanger glyph in the same well. **Photo stubs** (`photoStub` /
`docPhoto`) stand in for every photo: one of four token-tone gradients (`t0` chalk to bisque, `t1` tissue wash to chalk, `t2` oat to
bisque, `t3` seam-green wash to chalk), the garment drawn at 70 % and tilted -4 or +3 degrees, a white pin badge on Pinned photos.
Empty states set the hero garment, tilted -4 degrees, in a 120 px Tissue Wash disc above the serif title.

### Garment Tile (picker)
110 px tall, 16 radius, Tissue with 1 px Chalk border, illustration above a 12/500 label. Selected: inside 1.5 px ink ring, the
icons, a count label, and a 44 px − / + control row under an inside Chalk rule.

### Avatar
Initials, never photos or black squares (K-03): a Tissue Wash circle with a 22 % accent ring, Thread Ink initials in Hanken 600 (sm
40 / md 56 at 16 px; lg 80 at 24 px). Muted rows use Oat with Graphite Soft and no ring.

### Stitched Dash Divider (signature 2)
`<hr class="stitch">`: full width, 1.5 px tall, `repeating-linear-gradient` of 6 px Dust dashes and 4 px gaps, 8 px margin above and
below. Used in exactly two places: above the first total in `moneyRows`, and on the completed receipt between the pickup line and the
rows. Nowhere else.

## Do's and Don'ts

### Do:
- **Do** take every colour, space, radius and size from `css/tokens.css`; screens contain no hex, no rgba and no literal px font size.
- **Do** keep one filled ink button per screen and make every other action a Thread Ink text link (44 px tall).
- **Do** put a garment illustration wherever a garment is named as a title, and a photo stub (tone gradient + tilted garment)
  wherever a photo would be.
- **Do** put exactly one stitched dash above a money total, and nowhere except the two sanctioned places.
- **Do** use `sectionHead()` (12 px sans caps, Graphite Soft) for every section heading, and `.t-figure` for a non-money hero fact.
- **Do** print status as `statusPill()`: an 8 px warm dot plus a 12/600 word.
- **Do** use `.card` (Tissue, 16 radius, inside Chalk ring, 16 padding) only for groups the user can touch.
- **Do** separate groups with the 8 / 12 / 32 / 40 rhythm and draw lines only between rows inside one list.
- **Do** use the `-ink` variant for any text in a semantic or accent colour (D-163), and `neutral-600` for footnotes.
- **Do** animate press with `scale(0.97)` over 120 ms `--ease-out`, sheets 280 / 200 ms, modals 220 ms, and turn transforms off under
  `prefers-reduced-motion` and `html.is-test`.
- **Do** print money as dollar amounts only (`fmt / fmtExact / fmtNeg / fmtColumn`), one precision per group, tabular figures.
- **Do** put every confirm in a bottom sheet (`confirmSheet`, `leaveSheet`, `confirmAction`).
- **Do** use the two-line button when a payment needs its "when" ("Pay $144.00 / Charged at pickup").
- **Do** size type through the rem tokens and reflow through the em tiers; keep spacing and touch targets in px.

### Don't:
- **Don't** use blue: no `--info`, `--info-bg` or `--media-placeholder` anywhere, and never `--component` (Figma's default purple).
- **Don't** set serif type for section headings, rows, buttons or list numbers; never use `.t-section` (20 px) or an off-scale size.
- **Don't** add a bottom tab bar, text labels in the top nav, or photo / black-square avatars.
- **Don't** add a third signature: no extra ornaments, illustrations in non-garment contexts, textures or decorative dividers.
- **Don't** give cards drop shadows or put reference content (prices, breakdowns, visit details, reviews) in a card.
- **Don't** use coloured chip badges for status, or green for an added charge (it is accent, "your move").
- **Don't** show percentages in any money copy ("Taily fee −$18.75", never "15 %") — the only percent is the rate on `to-fee`.
- **Don't** nest a control inside a button; use the stretched-link card.
- **Don't** use outline secondary buttons outside a confirm sheet / modal or a two-path empty state.
- **Don't** use `transition: all`, or animate an overlay in from `scale(0)`.
- **Don't** use a base semantic colour (`--error`, `--success`, `--warning`) or `--neutral-500` / `--accent-base` for text.
- **Don't** reintroduce `--bottom-border`; row rules use `--hairline` (the lint fails on it).

## Drift closed (K-04)

The five departures noted when this file was first written were all fixed in the K-04 pass (decisions D-203…D-217):

1. **Semantic base colours as text.** Error, success and warning copy now use the `-ink` twins (`.field__msg--error`,
   `.text-area__count--over`, `.countdown--expired`, `.chat-msg__retry`, `.c-review__error`, `.filter-pill__help`,
   `.modal__title--success`, `.banner--success`, `.toast--warning` as `--warning-ink` on `--warning-bg`). Base colours stay
   for glyphs, strokes and fills. A lint rule fails a base glyph colour set as a text colour.
2. **One hairline.** Every in-list row rule uses `--hairline`; `--bottom-border` is deleted and the lint fails on it.
3. **Overlay depth and motion tokens.** `--shadow-float` and `--shadow-overlay` replace the five literals; the toast, push banner,
   toggles and chevrons run on `--dur-modal` / `--dur-press` with `--ease-out`; `.modal` uses `--radius-xl`; `--ease-drawer` is gone.
4. **Dead serif and sizes.** `.rating-summary*` (with `ratingSummary`), `.sheet--picker` and `.t-section` are deleted; `--size-8` and
   `--size-18` are retired. `--size-11`, `--size-14`, `--size-20` and `--size-30` remain because shared overlay components (selector
   menu, modal, review sheet) still render them; v5 screens use only the 7-step scale and the lint enforces it.
5. **Docs lag code.** `docs/v5/CONTEXT.md` now describes the accent "New" tag and the K-04 anatomy.

Open: nothing.

## Since K-22 (K-53 a6 update)

What the system gained between the K-22 Figma sync and the MVP handoff, all in the gallery (`components.html`):
two-line button (K-46) · deposit button V3 (K-49) · strip-led pages + page head (K-15 / K-17) · reminder card, one-time notice card
and visit prompt (K-28, K-41, DG-2 A) · text banner + the texts catalogue (K-43, K-51) · Taily Help: Get help, Help home, case thread,
case strip, protection row (DG-1 B) · admin: sign-in, inbox, case, ledger, tools row (K-48.1, K-52, K-53 c7) · verification checklist,
review pill, secure setup card, payout rows, disclosure (DG-4 B) · availability: two windows, time off, minimum notice (K-53 a4) ·
policy pages with the counsel draft line (D-380, K-53 b) · the fee page, the only percent (K-53) · handoff pieces, linen and hang
stages (Study-1, K-21 / K-24 / K-40) · private notes (K-31) · one confirm container (P-32) · tap ring (P-31) · stretched-link tailor
row (S-18) · rem type + em tiers (S-17) · the status bar only in test sessions + the web-app manifest (a8).

Legacy, unused by any v5 screen (candidates to delete with their CSS): `trustBadges`, `trustCard`.

