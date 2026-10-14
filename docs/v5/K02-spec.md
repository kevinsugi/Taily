# K-02: Document the fitting (Before and Pinned photos + a comment per garment) and garment icons on every card (build instructions)

Oct 14, 2026 · spec writer / design director (Opus) · branch `V5` · follows Kevin's **K-02** (LOCKED, end of `DECISIONS.md`),
including his follow-up: **Before and Pinned photos are REQUIRED, not optional.** Builders read **§0 + §A (signatures) + their
cluster** + `docs/v5/CONTEXT.md`. Calls this spec had to make are **D-175…D-183** in `DECISIONS.md`, cited inline. This spec
**amends K01-spec §C1 / §C2 and M4-spec §C2** (t-adjust, t-job, c-price-change, c-booking); everything not named here is unchanged.
There is no money in this feature: no new amount, no new rate. Existing money copy stays as it is (dollars only, `fmtExact` on these
screens, never a percentage).

**Order:** (1) Model + component builder §A (serial) → (2) two screen builders in parallel: §C1 "Edit job" (`t-adjust`, `t-job`)
and §C2 "Final order" (`c-price-change`, `c-booking`, plus the icon pass on `c-job` / `c-pay` / `c-ready` / `t-request`, which
only re-render shared components) → (3) Integrator §D.

**K-02 done when:** `npm run check` green, including the extended journeys J6 and J6b. By hand at normal latency: Amara taps
**Start fitting** → **Edit the job** shows each garment card with its **garment icon** next to the title and **Before photos** /
**Pinned photos** rows with dashed camera tiles. **"Send to Sarah for approval" is off**, and the bar says **"Add before and pinned
photos for 2 items."** Each card shows "Add at least one before photo." / "…pinned photo." in error ink next to its rows. She taps
the tiles (a placeholder photo appears each time), adds a Pants / Jeans item (its card is flagged too: "…for 1 item"), photographs
it, adds a **comment** on the Suit Jacket ("Pinned both sleeves…"), and Send turns on → **Waiting on Sarah** lists, per garment,
**Before | Pinned** tabs and her comment. Sarah opens **Review your final order**: the same garments with the same icons, the same
**Before | Pinned** tabs (tap Pinned → the pinned photos; tap a photo → the viewer), **"Amara’s comment"**. She approves →
**c-booking** "Your order" still shows them, and so does Amara's job. Leaving Edit the job and coming back keeps every photo and
comment. Removing the only Before photo of an item turns Send off again.

---

## 0. Direction

**Who.** Amara is at the fitting with pins in her mouth. Before she touches a garment she photographs it as it is; after pinning
she photographs it again. Those two photos are her record: what the garment looked like when it came in and what Sarah agreed to
on her body. If Sarah later says "I never asked for the sleeves that short", the pinned photo settles it. That is why Kevin made
them **required**: the order cannot go to Sarah undocumented. Sarah, on her phone, sees the same photos with the order she
approves. They show her what she is agreeing to, in pictures as well as words.

**Feel: v4's garment card, in v5's ink.** v4's `t04 Appointment Details` card had the garment illustration on the left, then
**Upload Before Photos** / **Upload Pinned Photos** with dashed camera tiles, then **⊕ Add Comment**. Its customer cards
(`04 Review & Approve`, `03 Tailoring in Progress`) showed a **Before | Pinned** label pair over a row of thumbnails (active label
ink, idle label muted). v5 keeps exactly that structure. The illustration moves into the card head as a 40 px tile (v5's head-row
layout, already used on `c-job`, D-181), the labels become real tabs, and everything else follows v5's calm language: white cards
on `--neutral-50`, sans 16 / 12, hairlines, 44 px targets.

**Signature: "the same ticket on both sides" (continued from M4 / K-01).** Amara's "The order you sent" and Sarah's "What changed"
already print the same `changeList` from the same `priceChangeView()`. K-02 adds the same `garmentDocs` block, from the same
**sent snapshot** (`priceChange.docs`, D-175), under each garment on both sides: same tabs, same counts, same photos in the same
order, same comment. Flip persona to check. Only the comment label differs: "Your comment" for the tailor, "Amara’s comment" for
the customer.

- **One focal element** is unchanged: t-adjust = the garment cards, c-price-change = the total figure. Documentation sits inside
  the garment cards. It is part of the ticket, not a separate section.
- **Requirement, said once per place:** the card says what is missing for that garment, and the bar says how many garments still
  need photos. No banner, no modal, no toast. Error ink with an alert glyph, never colour alone (D-178).
- Type: row labels `.t-small w-600 c-700`, counts `.t-small c-600`, comment `.t-body`, comment label `.t-small c-600`. Tabs
  `.t-body w-600` (active ink, idle `--neutral-500-ink`). No new sizes, tokens only.
- `prefers-reduced-motion`: no transitions on tab switch or viewer paging (instant swap). There is no busy state for photo capture:
  a photo is local until the order is sent (D-177).

---

## A. MODEL + COMPONENTS (Component builder, serial, before the screens)

### A1. `js/data.js`
```js
export const FITTING_LIMITS = { PHOTOS_MAX: 4, COMMENT_MAX: 200 };   // per garment, per kind (D-176)
export const DOC_KINDS = ['before', 'pinned'];
export const DOC_LABEL = { before: 'Before', pinned: 'Pinned' };
```

### A2. `js/state.js`: fitting documentation (D-175)

**Shape.** Two places:
- `a.docs`: the tailor's **working** documentation, saved on the appointment the moment she makes it (so it survives Back,
  leaving the screen and coming back, D-175). `{ [garmentId]: { before: Photo[], pinned: Photo[], comment: '', commentMasked: false } }`.
  Keys are booked garment ids (`g1`…) or draft new-item ids (`n1`…).
- `a.priceChange.docs`: the **sent snapshot**, written by `sendPriceChange` for exactly the garments in the sent `lines` (same
  shape, deep clone). Sarah only ever sees this. It is replaced by each revise send and stays as the record once approved.
- `Photo = { id: 'p<k>', kind: 'before'|'pinned', at: nowIso(), tone: (k - 1) % 4 }`. `k` comes from `a.docSeq` (starts at 0,
  +1 per photo, never reused). `tone` picks the placeholder variant, so the same sequence always renders the same pictures (D-177).
- `fresh()` / seed appointments: `docs: {}`, `docSeq: 0` (add to the appointment created in `requestBooking`).

**Editable window** (one helper, `docsEditable(a)`): `a.status === 'fitting'`, or `a.status === 'price-change'` with
`priceChange.state` `pending|messaged` (the revise window). After approval the record is locked (D-175).

**Valid garment id** (`docGarment(a, garmentId)`): a booked garment (`a.job.garments` id or `a.lines` garmentId) or `/^n[1-9]\d*$/`
(a new item that exists only in the t-adjust draft until it is sent; K-01 D-121).

**Transitions** (take an appt id, return `{ ok, appt, ... } | { ok: false, error }`, all on `T`):
- `addFittingPhoto(id, garmentId, kind)` → `{ ok, appt, photo }`. Errors, in order: `not-editable` · `unknown-garment` ·
  `photo-kind` (kind not in `DOC_KINDS`) · `too-many-photos` (that kind already has `FITTING_LIMITS.PHOTOS_MAX`). Appends to
  `a.docs[garmentId][kind]` (creating the entry with empty lists, `comment: ''`, `commentMasked: false`).
- `removeFittingPhoto(id, garmentId, photoId)` → `{ ok, appt, photo, index }` (`index` = where it was, for Undo). Errors:
  `not-editable` · `not-found`.
- `restoreFittingPhoto(id, garmentId, photo, index)` → `{ ok, appt }`: puts a removed photo back at `index` (clamped). Errors:
  `not-editable` · `unknown-garment` · `too-many-photos` · `duplicate` (that photo id is already there). The Undo toast path.
- `setFittingComment(id, garmentId, text)` → `{ ok, appt, masked }`. Text is trimmed. Errors: `not-editable` · `unknown-garment` ·
  `comment-long` (> `FITTING_LIMITS.COMMENT_MAX`, measured on the trimmed text, code points). Stored **masked** with `maskContact`
  (`comment`, `commentMasked`), as the price note is (D-101) and chat is (D-128). An empty string clears the comment.

**`sendPriceChange(id, lines, { note })`**: one new check, after `max-items` and before `note-long`:
- `photos-missing`: for every distinct `garmentId` in `lines` (booked or new, in first-appearance order), `a.docs[garmentId]`
  needs `before.length >= 1` **and** `pinned.length >= 1`. Failure carries the gaps: `fail('photos-missing', { missing: [{ garmentId,
  before: boolean, pinned: boolean }] })`, where `true` means "this kind is missing". Removed garments (no lines) are never checked.
  The comment is optional.
- On success it also stores `a.priceChange.docs = { [gid]: clone(a.docs[gid]) }` for each garment in `lines`.
- Thread lines unchanged (D-179: the system line does not mention photos).
- Error order is now: `not-fitting` · `no-items` · `price-invalid` · `garment-type` · `service-type` · `service-not-offered` ·
  `duplicate-line` · `max-items` · **`photos-missing`** · `note-long`.

**`approvePriceChange`**: unchanged. The approved record is `priceChange.docs` (state `approved`). Garment ids survive the
`job.garments` rebuild (K-01), so the snapshot keys still match.

**Selectors** (DOM-free, exported, not on `T`):
- `docsOf(appt, garmentId, { sent = false } = {}) → { before, pinned, comment, commentMasked }`: the working entry (or the sent
  snapshot entry with `sent: true`), or an empty entry. Never `undefined`.
- `docsFor(appt, reader) → { [garmentId]: entry }`: what a reader sees. Customer: `priceChange.docs ?? {}` (never the working
  docs). Tailor: `a.docs` while `status === 'fitting'`, else `priceChange.docs ?? {}`.
- `docsMissing(appt, garmentIds) → [{ garmentId, before, pinned }]`: the garments in `garmentIds` (in that order) that lack a
  kind, using the working docs. Same rule as `photos-missing`.
- `docsDiffer(appt, garmentIds) → boolean`: working vs sent, for these ids. Compares photo id lists per kind and the comment
  text. Used by t-adjust revise (`isEdited`) and the t-job "unsent changes" line.
- `nextItemId(appt) → 'n<k>'`: one more than the highest `n<k>` among `a.docs` keys, `a.lines`, `priceChange.lines` and
  `job.garments`, so a new item never inherits the photos of a discarded one (D-182).

`tailor-data.js` **`requestView(appt)`**: each `garments[i]` gains `docs: docsFor(appt, 'tailor')[g.id] ?? null`.

### A3. `js/fixtures/common.js`
- `FITTING_COMMENTS` (copy, not money):
  `{ g1: 'Hem pinned for flats, with a slight break.', g2: 'Pinned both sleeves to just above the wrist. The lining moves with them.',
  n1: 'Jeans hem pinned at the ankle. I’ll keep the original hem.', masked: 'Call me at (347) 555-0118 if the pins move.' }`.
- `documentFitting(id, { lines = getAppt(id).lines, level = 'min' } = {})`: through the real transitions, for each distinct
  `garmentId` in `lines`: `level 'min'` = 1 Before + 1 Pinned; `'full'` = 2 Before + 2 Pinned + `setFittingComment(id, gid,
  FITTING_COMMENTS[gid])` where one exists. Throws on any failure (`must`). Does NOT reset. Returns the appt.
- **`driveTo(target, { docs })`**: new option `docs: 'none' | 'min' | 'full'`. Default `'none'` for `target === 'fitting'`
  (the fitting starts undocumented, the t-adjust ◆ state), `'min'` for every target after it. **Every target past `fitting`
  calls `documentFitting(id, { lines: changedLines(appt, recipe), level })` before `sendPriceChange`** (recipe lines, so the
  `item` recipe's `n1` is documented too). `driveTo('fitting', { docs: 'min'|'full' })` documents the booked lines and returns at
  the fitting. `docs: 'none'` past the fitting throws (the send would fail).
- **`completeJob(id)`**: `documentFitting(id)` before its `sendPriceChange`.
- The flows toolkit (`js/flows.js toolkit()`, integrator) gains `documentFitting` so setups call `S.documentFitting(a.id, …)`.

### A4. Components (`js/components.js`, CSS `css/components-v5.css`, gallery blocks in `js/gallery.js`)

1. **`garmentIcon(type, { size = 'card', alt = '' } = {})`** (D-181), the ONE helper every garment title uses:
   `<span class="garment-icon garment-icon--${size}"${alt ? '' : ' aria-hidden="true"'}><img src="${GARMENT_ICONS[type]}" alt="${esc(alt)}"></span>`.
   Sizes: `card` 40 × 40 (`--space-40`, radius `--radius-sm`, `--neutral-50` well, image `object-fit: contain`; identical to
   today's `c-job` `.job-item__icon`) · `row` 32 × 32 (`--size-32`, for sheet rows) · `inline` 24 × 24 (`--size-24`, no well).
   `alt` defaults to `''` because every current use sits next to the visible garment name (a repeated name would be read twice).
   Pass `alt: type` where the icon stands alone. **Fallback** (type not in `GARMENT_ICONS`): the same well with a 60 % size
   hanger glyph `ICON_HANGER` (new in `js/icons.js`, `currentColor`, `--neutral-500`), never a broken image. Builders must not read
   `js/garment-icons.js`. It exports `GARMENT_ICONS` keyed by the nine `GARMENT_TYPES` names. `c-job`'s `itemCard` switches to
   `garmentIcon(g.type)` with a pixel-identical result (`c-job*` baselines must NOT move).
2. **`docPhoto(photo, { type, size = 'thumb' })`**: the simulated photo (D-177). `<span class="doc-photo doc-photo--${size}
   doc-photo--t${photo.tone} doc-photo--${photo.kind}">`: a token-tone gradient (t0 `--neutral-200`→`--neutral-300`, t1
   `--accent-bg`→`--neutral-200`, t2 `--neutral-100`→`--neutral-300`, t3 `--success-bg`→`--neutral-200`) with the garment
   illustration (`GARMENT_ICONS[type]`, decorative) centred at 70 % of the tile, rotated `-4deg` on even ids and `3deg` on odd
   ones. Pinned photos add a 16 px pin glyph (`ICON_PIN`, new) in a white circle, bottom-right. `thumb` = 56 × 56, `--radius-sm`.
   `stage` = full width, `aspect-ratio: 3 / 4`, `--radius-md`. Purely visual. Its button carries the accessible name.
3. **`docsEditor({ garmentId, type, docs, missing = { before: false, pinned: false }, commentDraft = null, commentError = '',
   busy = false, first = 'Sarah' })`**: the documentation block inside a t-adjust garment card (v4 t04). Markup, top to bottom,
   after a hairline (`--neutral-200`, inset 0 / full card width) and `--space-16` gap:
   - Per kind (`before`, then `pinned`), a `<div class="docs-editor__row" data-kind data-missing="true|false">`:
     - head: label **"Before photos"** / **"Pinned photos"** (`.t-small w-600 c-700`) · right: `"${n} of ${PHOTOS_MAX}"`
       (`.t-small c-600`, only when n > 0).
     - tiles (`.photo-tiles`, gap `--space-8`, one row: 4 × 56 + add tile fits the 318 px card body): each photo is
       `<button type="button" class="docs-editor__thumb" data-act="view-doc" data-garment data-kind data-index aria-label="Before
       photo 1 of 2, ${type}. Open">${docPhoto(...)}</button>`, then, while n < max, the **add tile**: a 56 × 56 button
       `data-act="add-doc" data-garment data-kind`, dashed 1.5 px `--neutral-400` border (v4), `ICON_CAMERA` 24 px `--neutral-600`,
       `aria-label="Add a before photo of the ${type}${n ? `, ${n} added` : ''}"`. At max the tile is gone and a
       `.t-small c-600` line reads `Up to ${max} before photos.`
     - missing (n === 0): `<p class="docs-editor__missing t-small" data-missing-msg="before">${ICON_ALERT} Add at least one before
       photo.</p>` in `--error-ink`, glyph `--error`. Not `role="alert"` (it shows on load). It disappears once a photo is added.
   - Comment, one of three forms:
     - none and not editing: a 44 px text button `data-act="add-comment" data-garment` **"+ Add comment"** (`.t-body w-600`,
       `ICON_ADD_CIRCLE` 16 px like v4's ⊕), with a `.t-small c-600` "Optional" after it.
     - editing (`commentDraft !== null`): `textArea({ id: 'comment-' + garmentId, label: 'Comment for ' + first, value:
       commentDraft, rows: 3, max: COMMENT_MAX, helper: 'What you pinned and why. Phone numbers and emails are hidden.', error:
       commentError })`, then a row of two buttons: **Save** (`ctaSmall`, `data-act="save-comment" data-garment`) and **Cancel**
       (text button, `data-act="cancel-comment" data-garment`).
     - saved: `<figure class="docs-editor__comment"><figcaption class="t-small c-600">Your comment</figcaption><blockquote
       class="t-body">“${comment}”</blockquote></figure>` + a text button **"Edit comment"** (`data-act="edit-comment"`) + when
       `commentMasked` a `.t-small c-600` "Phone numbers and emails are hidden from ${first}."
   - `busy` disables every button in the block.
4. **`garmentDocs({ garmentId, type, docs, commentLabel = 'Comment', idPrefix = 'docs' })`**: the read-only block (v4
   `Photo_Row`), used inside `changeList` and `workList`. Renders nothing when `docs` has no photos and no comment.
   - A `role="tablist"` (`aria-label="${type} photos"`) of two tabs. Each tab is a 44 px tall button (`role="tab"`, `id`,
     `aria-controls`, `aria-selected`, roving `tabindex`, `data-act="docs-tab" data-garment data-kind`): **"Before"** /
     **"Pinned"** + a `.t-small c-600` count. Active = ink + a 2 px ink underline, idle = `--neutral-500-ink`. Default tab:
     Before. A kind with 0 photos keeps its tab, and its panel reads "No pinned photos." (`.t-small c-600`). This can only happen on
     the tailor's working view, because a sent order always has both kinds.
   - Two `role="tabpanel"` divs, the inactive one `hidden`. Each holds a row of 56 px `docPhoto` thumbnails as buttons
     (`data-act="view-doc" data-garment data-kind data-index`, `aria-label="Before photo 1 of 2, ${type}. Open"`).
   - The comment, if any: `figure.garment-docs__comment` (`figcaption` = `commentLabel`, `.t-small c-600`; `blockquote.t-body`
     “…”), then the masked line when `commentMasked` ("Phone numbers and emails in this comment are hidden.").
   - Ids: `${idPrefix}-${garmentId}-${kind}` (+ `-tab`). The gallery passes distinct prefixes.
5. **`changeList({ garments, format, docs = null, commentLabel = 'Comment' })`**, extended. Every garment head gains
   `garmentIcon(g.type)` before the type text (removed garments: the icon at 50 % opacity, `filter: grayscale(1)`). Head becomes
   a flex row, icon 40 px, `--space-12` gap, then type + tag. When `docs` is given and `g.kind !== 'removed'` and `docs[g.id]`
   exists, `garmentDocs({ garmentId: g.id, type: g.type, docs: docs[g.id], commentLabel })` follows the rows (inside the green
   panel for a new item), with `--space-12` above it.
6. **`workList(v, { final, estimateLabel, docs = false, commentLabel = 'Your comment' })`**, extended. Every garment head
   (`.work-list__top`) gains `garmentIcon(g.type)` before the name (the customer-photo thumbnail button stays on the right). With
   `docs: true`, `garmentDocs(...)` from `g.docs` after that garment's service rows.
7. **`openDocsViewer({ garmentId, type, docs, kind = 'before', index = 0, by = '', editable = false, onRemove = null })`**:
   `sheetOverlay`, `dataS: 'docs-viewer'`, header `${type} · ${DOC_LABEL[kind]}` (updates as you page or switch tabs). Body:
   - sub line `.t-small c-600`: `"${by} · ${fmtDay(photo.at)}, ${fmtTime(photo.at)}"` (`by` = "Taken by Amara" for the customer,
     "Taken by you" for the tailor).
   - Before / Pinned tabs (same markup as `garmentDocs`, `idPrefix: 'viewer'`). Switching a tab shows photo 1 of that kind.
   - the stage: `docPhoto(photo, { type, size: 'stage' })` with `role="img"` and `aria-label="${DOC_LABEL[kind]} photo ${i + 1} of
     ${n}, ${type} (placeholder)"`.
   - a controls row: **‹** (`data-act="doc-prev"`, 44 px, `aria-label="Previous photo"`, disabled on the first) · `"${i + 1} of
     ${n}"` (`aria-live="polite"`) · **›** (`doc-next`).
   - a thumbnail strip of the kind (56 px buttons, current one with an inset 2 px ink ring and `aria-current="true"`).
   - `editable`: a secondary `cta('Remove photo', { variant: 'secondary' })` with danger tone (`data-act="doc-remove"`, D-80
     danger-outline style) under the strip. It calls `onRemove(photo)` and closes the sheet.
   - Arrow keys page when the stage area has focus. No animation (reduced motion holds anyway).
8. **`wireGarmentDocs(root, { lookup, by = '', editable = false, onRemove = null })`**: call from a screen's `wire`. Handles
   `[data-act="docs-tab"]` (toggle `aria-selected` / `tabindex` / panel `hidden` in place, no re-render; ←/→/Home/End between the
   two tabs) and `[data-act="view-doc"]` (`lookup(garmentId) → { type, docs }`, then `openDocsViewer` at that kind and index).
   Ignores clicks inside `.screen-sheet--overlay`.
9. **Gallery** (`sys-components`, one "K-02 · fitting documentation" section): `garmentIcon` at card / row / inline + the
   fallback · `docPhoto` t0–t3 before and a pinned · `docsEditor` empty (both missing) · with photos (2 + 1, a saved comment) · at
   max (4 Before, no add tile) · comment editing with an error · `garmentDocs` Before active · Pinned active (render with the Pinned
   tab selected through a `tab` option) · with a masked comment · a `changeList` with icons and docs (a kept, a New item, a Removed
   garment). Re-accept `sys-components` once.

### A5. Model test additions (`scripts/v5/model-test.mjs`)
Import `documentFitting`, `FITTING_COMMENTS` from `js/fixtures/common.js` and `FITTING_LIMITS` from `js/data.js`.
- **Update the existing OK-path sends** so they document first (they would now fail `photos-missing`): line ~481 (`driveTo
  ('fitting')` → `documentFitting(a.id)` before `T.sendPriceChange(a.id, a.lines)`); the validation block at ~488 → call
  `documentFitting(a.id)` at the top of the block (every guard there fails earlier in the order, and the masked-note send at ~501
  then succeeds); ~686 and ~702 (`priceBelowDeposit`) → `documentFitting(b.id, { lines: P.lines })` before the send. The revise
  sends at ~1102–1103 run on a `driveTo('price-change')` appt and are already documented (the default `'min'`).
- New block "fitting documentation (K-02)":
  - `driveTo('fitting')` → `docsMissing(a, ['g1', 'g2'])` = both kinds missing for both; `sendPriceChange(a.id, a.lines)` →
    `photos-missing` with `missing` = `[{ garmentId: 'g1', before: true, pinned: true }, { garmentId: 'g2', before: true, pinned:
    true }]`; status still `fitting`, no `priceChange`.
  - `addFittingPhoto(a.id, 'g1', 'before')` → ok, `photo.id === 'p1'`, `photo.tone === 0`, `photo.kind === 'before'`;
    `'selfie'` → `photo-kind`; `'g9'` → `unknown-garment`; `'n1'` → ok (a draft new item). Five Before photos on g2 → the fifth is
    `too-many-photos` (`FITTING_LIMITS.PHOTOS_MAX`).
  - With g1 Before only, g2 fully documented: `missing` = `[{ garmentId: 'g1', before: false, pinned: true }]`.
  - Removing a booked garment from the order exempts it: `sendPriceChange(a.id, a.lines.filter(l => l.garmentId !== 'g1'))`
    succeeds while g1 has no Pinned photo. In a fresh fitting, a new item without photos blocks: `item` recipe lines with only g1 /
    g2 documented → `photos-missing` naming `n1`.
  - `removeFittingPhoto` → `{ photo, index }`; `restoreFittingPhoto` puts it back at `index`; restoring twice → `duplicate`;
    unknown photo id → `not-found`.
  - `setFittingComment(a.id, 'g2', FITTING_COMMENTS.masked)` → ok, `masked: true`, stored text has `[phone hidden]` and not
    `555`; `'x'.repeat(COMMENT_MAX + 1)` → `comment-long`; `''` clears.
  - Snapshot: after a successful send, `priceChange.docs` has exactly the sent garment ids; a later `addFittingPhoto` while
    `pending` changes `a.docs` but not `priceChange.docs`; `docsDiffer(a, ids) === true`; the revise send copies it
    (`docsDiffer === false`).
  - Lock: after `approvePriceChange`, every doc transition → `not-editable`; `docsFor(a, 'customer')` equals
    `priceChange.docs`; `docsFor(driveTo('fitting', { docs: 'min' }), 'customer')` is `{}` (Sarah never sees working docs).
  - `nextItemId`: on a fitting with `a.docs.n1` present (a discarded draft item) → `'n2'`.
  - `driveTo('in-progress')` → every garment in `a.lines` has ≥ 1 Before and ≥ 1 Pinned in `priceChange.docs`;
    `driveTo('price-change', { priceChange: 'item' })` → `priceChange.docs.n1` exists; `driveTo('in-progress', { docs: 'full' })`
    → g2 comment === `FITTING_COMMENTS.g2`, two photos per kind.

---

## B. Copy (both clusters)

| where | copy |
|---|---|
| row labels | **Before photos** · **Pinned photos** |
| count | `2 of 4` |
| at max | `Up to 4 before photos.` / `Up to 4 pinned photos.` |
| missing (card) | `Add at least one before photo.` · `Add at least one pinned photo.` |
| bar note, Send off for photos | `Add before and pinned photos for ${n} item${n > 1 ? 's' : ''}.` (counts garments with anything missing) |
| comment button | `+ Add comment` · `Optional` |
| comment field | label `Comment for Sarah` · helper `What you pinned and why. Phone numbers and emails are hidden.` · error `Keep the comment under 200 characters.` |
| comment saved | `Your comment` (tailor) · `Amara’s comment` (customer) · `Edit comment` |
| masked | tailor `Phone numbers and emails are hidden from Sarah.` · customer `Phone numbers and emails in this comment are hidden.` |
| tabs | `Before` · `Pinned` (+ count) · empty panel `No before photos.` / `No pinned photos.` |
| viewer | header `Suit Jacket · Before` · sub `Taken by Amara · Tue, Oct 13, 10:00 AM` / `Taken by you · …` · `1 of 2` · `Remove photo` |
| remove toast | `Before photo removed.` + **Undo** (5 s, D-71) |
| t-adjust hero note | `Take a before photo and a pinned photo of each item. Add or remove items and services with ${first}, then send ${first} the final order. You start the work once ${first} approves.` |
| t-job fitting note | `Go through each piece with ${first}. Take a before and a pinned photo of each, add or remove items and services, then send ${first} the final order. You start the work once ${first} approves.` |
| t-job waiting, unsent | `You changed photos or comments since you sent the order. Send the updated order so ${first} sees them.` |
| leave modal (t-adjust) | title unchanged `Leave without sending?` · body `${first} can’t approve the order until you send it. Your photos and comments are saved. Item and price changes aren’t.` |

---

## C1. CLUSTER "Edit job": `t-adjust`, `t-job`

### t-adjust: documentation on every garment card (amends K01-spec §C1)

**Card head.** `garmentIcon(g.type)` (40 px) first, then the type `h2`, then the tag (New item / Removed), then Remove item / Undo
on the right. A removed (`gone`) card shows the icon dimmed (component rule) and **no** docs block; its working docs are untouched,
so Undo brings them back.

**Docs block.** Every live card (booked or new) renders `docsEditor({ garmentId: g.id, type: g.type, docs: docsOf(a, g.id),
missing, commentDraft: d.comments[g.id] ?? null, commentError, busy, first })` after its rows and "+ Add a service", in v4's order:
Before, Pinned, comment. `missing` comes from `docsMissing(a, liveIds)` (live = not `gone`).

**Draft additions** (`state.ui['t-adjust']`): `comments: { [garmentId]: string }` = comment editors open with unsaved text, and
`commentErrors: { [garmentId]: code }`. `ensureDraft` defaults both to `{}`. Photos and saved comments are NOT in the draft. They
are saved on the appointment through `T` (D-175). `d.seq` is seeded with `Math.max(nSeq(d.items), Number(nextItemId(a).slice(1)))`
so an added item never reuses a discarded item's id (D-182). `openAddItem` keeps using `n${d.seq++}`.

**Actions** (in `wire`'s click delegate; all re-render through `rerender(sel)` and restore focus):
- `add-doc` → `T.addFittingPhoto(a.id, garmentId, kind)`. ok → rerender, focus the same add tile
  (`[data-act="add-doc"][data-garment][data-kind]`), or, at max, the last thumbnail of that row. `too-many-photos` cannot happen
  from the UI because the tile is gone. Any other error → toast `Something went wrong. Try again.` (error).
- `view-doc` → `openDocsViewer({ …, by: 'Taken by you', editable: true, onRemove })`. `onRemove(photo)` →
  `T.removeFittingPhoto` → rerender → focus that row's add tile → toast `Before photo removed.` with **Undo** →
  `T.restoreFittingPhoto(a.id, gid, photo, index)` → rerender (only if still on t-adjust, like `dropNewItem`'s Undo).
- `add-comment` / `edit-comment` → `d.comments[gid] = docsOf(a, gid).comment` → rerender → focus `#comment-<gid>`.
- `save-comment` → `T.setFittingComment(a.id, gid, d.comments[gid])`. ok → delete the draft and error → rerender → focus
  "Edit comment" (or "+ Add comment" when the text was emptied). `comment-long` → `d.commentErrors[gid] = 'comment-long'` →
  rerender, focus the field, error under it (`field--error`, `aria-invalid`).
- `cancel-comment` → delete the draft → focus "+ Add comment" / "Edit comment".
- typing in `#comment-<gid>` (`input` delegate) → `d.comments[gid] = value`, live count (as the note does), no re-render.

**Send gating** (the bar):
- `missingN = docsMissing(a, liveIds).length`. **`sendDisabled = busy ? false : missingN > 0 || (revise && !edited)`.**
- `note` (the disabled CTA's `aria-describedby`): `missingN > 0` → `Add before and pinned photos for ${missingN} item(s).`,
  else the K-01 revise note `Change something to send it again.` The `lead` (money pair / "No changes ·" / fix-a-price) is
  unchanged. The total keeps moving in view (D-126).
- `send(a)`: first save every open comment draft (`T.setFittingComment`). If one fails `comment-long`, set its error, rerender,
  focus that field, and stop. Then the K-01 checks. Then `T.sendPriceChange`. A `photos-missing` result (a race) → rerender +
  toast `Add before and pinned photos first.` (error). `not-fitting` / generic handling unchanged.
- **`isEdited`** (Back's leave modal, revise's Send): K-01's rule **plus** `revise && docsDiffer(a, liveIds)`, or an open comment
  draft that differs from the saved text. Photos and saved comments alone never trigger the leave modal in `new` mode, because they
  are already saved. The leave modal body takes the §B copy.

**Hero note** → §B "t-adjust hero note". Title, eyebrow, revise banner unchanged.

**Add-item sheet.** Type step: `optionRow({ …, lead: garmentIcon(type, { size: 'row' }) })` (32 px, lines up with the
existing 32 px lead column). The service step is unchanged, so icons appear on the type step only.

**FLOWS** (in `FLOWS_t_adjust`, `js/fixtures/m4.js`; reuse `PC_*` helpers; strings from `FITTING_COMMENTS` / `FITTING_LIMITS`):
- `t-adjust` ◆ (amend): expect `has` + `'Before photos', 'Pinned photos', 'Add at least one before photo', 'Add before and pinned
  photos for 2 items'`, `sel: '[data-act="send"][disabled]'` (was `:not([disabled])`), keep the rest. Note: "At the fitting: every
  item as booked, no photos yet, so Send is off and says why".
- `t-adjust--docs` · (new): `S.driveTo('fitting', { docs: 'full' })` → `{ has: ['2 of 4', 'Your comment', FITTING_COMMENTS.g2,
  'No changes'], not: ['Add at least one', 'Add before and pinned photos'], sel: '[data-act="send"]:not([disabled])' }`.
- `t-adjust--photos-missing` · (new): fitting; `addFittingPhoto(g1, before)`, `(g1, pinned)`, `(g2, pinned)` → `{ has: ['Add at
  least one before photo', 'Add before and pinned photos for 1 item'], not: 'Add at least one pinned photo', sel:
  '[data-garment="g2"] [data-missing-msg="before"]' }`.
- `t-adjust--item-docs` · (new): `S.driveTo('fitting', { docs: 'min' })` + the `PC_itemAdded` draft (with `seq` from
  `nextItemId`) → `{ has: ['New item', 'Pants / Jeans', 'Add before and pinned photos for 1 item'], sel: '[data-garment="n1"]
  [data-missing-msg="pinned"]' }`. Proves a new item needs photos.
- `t-adjust--docs-max` · (new): fitting, 4 Before + 1 Pinned on g2, g1 'min' → `{ has: ['4 of 4', 'Up to 4 before photos'], sel:
  '[data-garment="g2"] [data-kind="before"] [data-act="view-doc"][data-index="3"]' }`. The harness has no "absent selector"
  check, so the missing g2 Before add tile is proven by the "Up to 4" line and the visual baseline.
- `t-adjust--comment` · (new): fitting docs 'min', `state.ui['t-adjust'] = { apptId, mode: 'new', comments: { g2:
  FITTING_COMMENTS.g2 } }` → `{ has: ['Comment for Sarah', `${[...FITTING_COMMENTS.g2].length} / ${FITTING_LIMITS.COMMENT_MAX}`,
  'Save', 'Cancel'], sel: '#comment-g2' }`.
- `t-adjust--comment-masked` · (new): fitting docs 'min', `setFittingComment(g1, FITTING_COMMENTS.masked)` → `{ has: ['phone
  hidden', 'hidden from Sarah'], not: '555-0118' }`.
- `t-adjust--photo-viewer` O (new): fitting docs 'full'; `click: ['[data-garment="g2"] [data-act="view-doc"][data-kind="before"][data-index="0"]']`
  → `{ has: ['Suit Jacket · Before', 'Taken by you', '1 of 2', 'Remove photo', 'Pinned'], sel: '[data-s="docs-viewer"]' }`.
- `t-adjust--revise-docs` · (new): `driveTo('price-change', { priceChange: 'item' })`, then `addFittingPhoto(g2, pinned)`,
  `ui = { apptId, mode: 'revise' }` → `{ has: ['Edit the order you sent', '2 of 4'], sel: '[data-act="send"]:not([disabled])' }`
  (a photo alone makes the revise sendable).
- `t-adjust--error` (amend setup): `S.documentFitting(a.id)` before the draft, or the disabled Send swallows the click and "Enter
  a price" never shows.
- `t-adjust--leave` (amend expect): `has` + `'Your photos and comments are saved'`.
- Every other `t-adjust--*` expect still holds (their Send state is not asserted except ◆ / revise).

### t-job: the documentation on the job (amends K01-spec §C1 t-job)
- **"The work" (`workHtml`)** passes `docs: true` (the comment label is "Your comment"). Through `requestView`, the docs are the
  working docs at `fitting` and the sent / approved snapshot afterwards (`docsFor(a, 'tailor')`). Icons on every garment head
  everywhere `workList` renders (all states, t-request too).
- **fitting** note → §B. `wire` adds `wireGarmentDocs(root, { lookup, by: 'Taken by you' })` (read-only viewer here).
- **waiting / messaged / replied** (`priceBlocks`): `changeList({ garments: pv.garments, docs: a.priceChange.docs,
  commentLabel: 'Your comment' })`, the same snapshot Sarah sees. When `docsDiffer(a, sentIds)` is true, add the §B "unsent" line
  (`.t-small c-600`, under the summary) (D-183).
- **in-progress, ready, returning-\*, courier**: "The work" with docs (approved snapshot).
- **completed**: add **"The work"** (`workList(v, { final: true, estimateLabel: null, docs: true })`) between the payout card and
  the review section (D-179). It is the record of what she did.
- Cancelled / no-show / visit / accepted: icons only (no docs exist).
- **FLOWS** (in `FLOWS_t_job`, `js/fixtures/m4.js`):
  - `t-job--docs` · (new): `S.driveTo('in-progress', { docs: 'full' })` → `{ has: ['The work', 'Before', 'Pinned', 'Your comment',
    FITTING_COMMENTS.g2, FITTING_COMMENTS.g1], sel: '[data-docs="g2"] [role="tab"][aria-selected="true"][data-kind="before"]' }`.
  - `t-job--docs-pinned` · (new): same setup, `click: ['[data-docs="g2"] [data-act="docs-tab"][data-kind="pinned"]']` →
    `{ sel: '[data-docs="g2"] [role="tab"][aria-selected="true"][data-kind="pinned"]' }`.
  - `t-job--fitting-docs` · (new): `S.driveTo('fitting', { docs: 'min' })` → `{ has: ['Fitting', 'Before', 'Pinned', 'Review the
    order'] }` (what Back from t-adjust shows after photographing).
  - `t-job--docs-unsent` · (new): `driveTo('price-change')` + `addFittingPhoto(g1, before)` → `{ has: ['Waiting on Sarah', 'You
    changed photos or comments since you sent the order'] }`.
  - Amend: `t-job--fitting` `has` + `'Take a before and a pinned photo of each'`; `t-job--completed` `has` + `'The work'`.

---

## C2. CLUSTER "Final order": `c-price-change`, `c-booking` (+ the icon pass)

### c-price-change: "Review your final order" with the photos (amends K01-spec §C2)
- `changeList({ garments: pv.garments, docs: a.priceChange.docs, commentLabel: `${first}’s comment` })`. Every live garment shows
  its icon, its rows, then **Before | Pinned** tabs with counts, the thumbnails and the comment. A removed garment shows the dimmed
  icon and no photos. Wire `wireGarmentDocs(root, { lookup: (gid) => ({ type, docs: a.priceChange.docs[gid] }), by: `Taken by
  ${first}` })`.
- Hero body unchanged. One t-small line under the summary, `${first} photographed each item before and after pinning.` (`.t-small
  c-600`), so the tabs are explained once.
- **FLOWS** (in `FLOWS_c_price_change`):
  - `c-price-change--docs` · (new): `S.driveTo('price-change', { docs: 'full' })` → `{ has: ['Before', 'Pinned', 'Amara’s
    comment', FITTING_COMMENTS.g2, 'photographed each item'], sel: '[data-docs="g2"] [data-act="view-doc"]' }`.
  - `c-price-change--docs-pinned` · (new): same + `click: ['[data-docs="g2"] [data-act="docs-tab"][data-kind="pinned"]']` →
    `{ sel: '#docs-g2-pinned:not([hidden])' }`.
  - `c-price-change--photo-viewer` O (new): same + `click: ['[data-docs="g2"] [data-act="view-doc"][data-kind="before"][data-index="1"]']`
    → `{ has: ['Suit Jacket · Before', 'Taken by Amara', '2 of 2'], not: 'Remove photo', sel: '[data-s="docs-viewer"]' }`.
  - `c-price-change--comment-masked` · (new): `driveTo('fitting')` → `documentFitting` + `setFittingComment(g2,
    FITTING_COMMENTS.masked)` → send the unchanged order → `{ has: ['phone hidden', 'Phone numbers and emails in this comment are
    hidden'], not: '555-0118' }`.
  - `c-price-change--item-added` (amend): `has` + the n1 docs (`'[data-docs="n1"]'` via `sel`). Proves a new item arrives with
    photos.

### c-booking: "Your order" keeps the photos
- `orderSection(a)` passes `docs: a.priceChange?.docs ?? null, commentLabel: `${first}’s comment``, and `wire` adds
  `wireGarmentDocs` (read-only, "Taken by Amara"). Shown wherever `orderSection` renders today (in-progress, returning-\*,
  completed with a review). `fitting` / `price-change` show nothing new.
- **FLOWS** (in `FLOWS_c_booking`, `js/fixtures/m3.js` / `m4.js` wherever the M4 c-booking entries live):
  `c-booking--docs` · (new): `S.driveTo('in-progress', { docs: 'full' })` → `{ has: ['Your order', 'Before', 'Pinned', 'Amara’s
  comment', FITTING_COMMENTS.g2], sel: '[data-docs="g1"]' }`.

### Icon pass (no layout work, the components do it)
`c-pay` "Your order", `c-ready` "Your order" and `t-request` "The work" get icons through `changeList` / `workList`. **No docs**
on `c-ready` (the pay step stays focused) or `c-pay` (none exist yet). `c-job` swaps to `garmentIcon` (identical pixels).
**Not changed** (D-181): `c-tailor`'s estimate rows ("Suit Pant · Hem pants", a price list, not a garment card), count-only lines
("2 items · 3 services"), `c-request`, `c-orders`, thread rows.

---

## D. INTEGRATION (Integrator)

1. **Every caller that sends the order at the fitting must document first** (the model now fails `photos-missing`). `grep -rn
   sendPriceChange js scripts/v5` (v4 folders excepted) gives the full list. Each needs real `addFittingPhoto` calls before the send:
   - `js/fixtures/common.js` `driveTo` (§A3, every target past `fitting`, recipe lines) and `completeJob` (used by
     `earningsTo('paid')` and any multi-job seed).
   - `js/fixtures/m3.js` `c-bookings--ready` setup: `S.documentFitting(b.id)` between `S.T.startFitting(b.id)` and
     `S.T.sendPriceChange(b.id, b.lines)`.
   - `js/fixtures/m4.js` `c-ready--refund` setup: `S.documentFitting(a.id, { lines: CR_SC.priceBelowDeposit.lines })` before
     its `sendPriceChange`.
   - `js/fixtures/m4.js` `t-adjust--error` setup: `S.documentFitting(a.id)` (§C1). Any other t-adjust flow that clicks
     `[data-act="send"]` (today only `--error`).
   - `scripts/v5/model-test.mjs`: the four OK-path sites (§A5).
   - `scripts/v5/journeys.mjs` J6 and J6b (item 3). These click the real buttons.
   - Indirect consumers through `driveTo` (all FLOWS past `fitting`, journeys J7, J8, J11, `earningsTo`, `askAmara` chains) are
     covered by `driveTo` / `completeJob`. No change needed, but their baselines move where docs render (§E).
2. **`js/flows.js`** `toolkit()` adds `documentFitting` (import from `./fixtures/common.js`).
3. **`scripts/v5/journeys.mjs`** (header comment: J6 "… with before / pinned photos and a comment", J6b "… photos required"):
   Add a helper `press(sel)` = `page.evaluate((s) => document.querySelector('#screen ' + s)?.click(), sel)` + `settle`. Use it for
   the bar's Send after typing, because the pinned Test-flows trigger appears on the first keystroke and covers the bar (see J9).
   - **J6** (after the new item is added, before Send): at `t-adjust` has `Add before and pinned photos for 3 items` → for `g1`, `g2`,
     `n1`: `click('[data-garment="<id>"] [data-act="add-doc"][data-kind="before"]')` and `…[data-kind="pinned"]` → at `t-adjust` has
     `1 of 4`, not `Add before and pinned photos for` → open the g1 Before photo (`[data-garment="g1"]
     [data-act="view-doc"][data-kind="before"]`) → at `t-adjust` (overlay text) has `Suit Pant · Before`, `Remove photo` → `click('[data-act="doc-remove"]')` → at `t-adjust` has `Add at least one before photo`, `Add before and pinned
     photos for 1 item` (Send off again) → re-add the g1 Before photo → `click('[data-garment="g2"] [data-act="add-comment"]')` →
     `page.fill('#comment-g2', FITTING_COMMENTS.g2)` → `click('[data-garment="g2"] [data-act="save-comment"]')` → at `t-adjust` has
     `Your comment`, `FITTING_COMMENTS.g2` → remove `g2:jacket-sides` (as today) → `press('[data-act="send"]')` → tailor t-job has
     the K-01 strings + `Before`, `Pinned`, `Your comment`, `FITTING_COMMENTS.g2` · flip → c-price-change has the K-01 strings +
     `Before`, `Pinned`, `Amara’s comment`, `FITTING_COMMENTS.g2`, `photographed each item` → `click('[data-docs="n1"]
     [data-act="docs-tab"][data-kind="pinned"]')` (the new item's Pinned tab works on Sarah's side) → approve → c-booking has the
     K-01 strings + `Amara’s comment`, `FITTING_COMMENTS.g2` · flip → t-job has `Your comment`, `FITTING_COMMENTS.g2`.
   - **J6b** (no changes still needs approval, and photos are required): at `t-adjust` has `Edit the job`, `No changes`, `Add before
     and pinned photos for 2 items` → `press('[data-act="send"]')` → still at `t-adjust` (disabled: nothing happens) → photograph
     `g1` and `g2` (4 clicks) → `press('[data-act="send"]')` → the K-01 remainder unchanged.
   - Import `FITTING_COMMENTS` from `../../js/fixtures/common.js`.
4. **`docs/v5/SCREENS.md`** (then `node scripts/v5/lib/gen-inventory.mjs`), all new keys tagged **M4** (K-02 is a follow-up, like
   K-01):
   - `t-adjust` purpose + " · Before / Pinned photos (required) and a comment per item (K-02)"; states add `t-adjust--docs` · ·
     `t-adjust--photos-missing` · · `t-adjust--item-docs` · · `t-adjust--docs-max` · · `t-adjust--comment` · ·
     `t-adjust--comment-masked` · · `t-adjust--photo-viewer` O · `t-adjust--revise-docs` ·. ◆ note → "(no photos yet, Send off)".
   - `t-job`: `t-job--docs` · · `t-job--docs-pinned` · · `t-job--fitting-docs` · · `t-job--docs-unsent` ·.
   - `c-price-change` purpose + " · with the tailor's Before / Pinned photos and comments (K-02)"; states `c-price-change--docs` · ·
     `--docs-pinned` · · `--photo-viewer` O · `--comment-masked` ·.
   - `c-booking`: `c-booking--docs` ·.
5. **`docs/v5/CONTEXT.md`**: a "K-02 additions" section with `FITTING_LIMITS` / `DOC_KINDS` / `DOC_LABEL`; `a.docs` /
   `a.docSeq` / `priceChange.docs`; the four transitions and their errors; `photos-missing` in `sendPriceChange`'s order; selectors
   `docsOf docsFor docsMissing docsDiffer nextItemId`; `requestView` `garments[i].docs`; components `garmentIcon docPhoto
   docsEditor garmentDocs openDocsViewer wireGarmentDocs`, `changeList({ docs, commentLabel })`, `workList({ docs,
   commentLabel })`; icons `ICON_HANGER ICON_PIN`; fixtures `FITTING_COMMENTS documentFitting driveTo({ docs })`, toolkit
   `S.documentFitting`.
6. `npm run check -- --accept-new` (new keys), then re-accept only §E's intended list (`npm run visual -- --accept <key>`), then
   `npm run check` green. Figma: the D-119 frames for t-adjust / c-price-change and the t-job / c-booking frames are stale after
   K-02. Re-sync them in the next Figma pass (garment card with icon + docs rows, Before | Pinned tabs, viewer).

## E. Baselines that will change (re-accept these, nothing else)

- **New:** `t-adjust--docs`, `t-adjust--photos-missing`, `t-adjust--item-docs`, `t-adjust--docs-max`, `t-adjust--comment`,
  `t-adjust--comment-masked`, `t-adjust--photo-viewer`, `t-adjust--revise-docs`, `t-job--docs`, `t-job--docs-pinned`,
  `t-job--fitting-docs`, `t-job--docs-unsent`, `c-price-change--docs`, `c-price-change--docs-pinned`,
  `c-price-change--photo-viewer`, `c-price-change--comment-masked`, `c-booking--docs`.
- **Changed (intended):**
  - `sys-components` (K-02 gallery section + icons in the changeList blocks).
  - **t-adjust, all 11** (icons, docs rows, missing lines, disabled Send + note, hero note, add-item sheet icons, leave copy):
    `t-adjust`, `--edited`, `--item-added`, `--remove-item`, `--add-item`, `--add-item-service`, `--max-items`, `--error`, `--add`,
    `--revise`, `--leave`.
  - **t-job, every key except `t-job--empty`** (icons in "The work"; docs from the fitting on; fitting note; completed gains "The
    work"): `t-job`, `--accepted`, `--visit`, `--rescheduled`, `--cant-make-it`, `--cant-make-it-done`, `--no-show`,
    `--no-show-done`, `--cancelled`, `--cancelled-late`, `--fitting`, `--waiting`, `--waiting-unchanged`, `--messaged`,
    `--replied`, `--approved`, `--in-progress`, `--mark-ready`, `--ready`, `--returning-pickup`, `--returning-dropoff`,
    `--courier`, `--completed`, `--completed-paid`, `--completed-failed`.
  - **t-request, every key that shows "The work"** (icons): `t-request`, `--soon`, `--rush`, `--shop`, `--retried`, `--accepting`,
    `--decline`, `--declining`, `--declined`, `--expired`, `--expired-final`, `--suggested`, `--suggested-passed`, `--withdraw`.
    (`--none` must not move.)
  - **c-price-change, all 7** (icons + docs): `c-price-change`, `--item-added`, `--item-removed`, `--removed`, `--repriced`,
    `--messaged`, `--unchanged`.
  - **c-booking** with "Your order": `--in-progress`, `--returning-pickup`, `--returning-dropoff`, `--returning-courier`,
    `--completed`.
  - **c-pay, all 8** and **c-ready, all 9** (icons in "Your order"; overlay keys move only where the order shows behind the
    sheet, so accept what the diff names and nothing else in these two screens).
- **Must NOT change** (if they move, it is a bug): every `c-job*` (the helper swap is pixel-identical), `c-tailor*`, `c-request*`,
  `c-complete`, `c-review*`, `c-bookings*`, `t-home*`, `c-booking` / `--confirmed` / `--fitting` / `--cancel*` / `--cancelled*` /
  `--cant-make-it` / `--no-show` / `--reschedule`, `t-request--none`, `t-job--empty`, every M1 / M2 / M5 baseline (threads,
  earnings, payouts, accounts, system), `sys-index`.
