/* ============================================================
   Text parity — every visible Figma text node must appear in the
   rendered screen (Phase R / npm run check step 2).

   One REST call pulls every screen's node subtree; each subtree is
   walked in document order collecting visible TEXT node strings.
   Each screen is then rendered (same server/browser setup as
   diff.mjs) and its text harvested as .screen innerText plus input
   values/placeholders (04b's card field and M1's composer are real
   inputs whose placeholder copy is Figma text).

   Comparison is by normalised occurrence count, not strict sequence:
   Figma frames put the absolutely-positioned chrome (Status Bar /
   Top Nav) LAST in document order while the DOM renders it first, so
   sequence equality would fail structurally on every screen. Each
   Figma string must occur in the screen's text at least as many
   times as it occurs in the frame.

   ALLOW lists the documented deliberate divergences (CLAUDE.md
   "Known Figma inconsistencies") — Figma strings the build
   intentionally renders differently.

   Usage: FIGMA_TOKEN=… node scripts/text-parity.mjs [ids…]
   Exit 1 if any screen is missing frame text.
   ============================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'node:http';
import { chromium } from 'playwright';
import { readToken } from './lib/figma-token.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/* ---------- deliberate divergences (see CLAUDE.md) ---------- */
// UX-LOOP R1-U-02: 02's seeded cards are $120 Hem + $80 Sleeve in the
// frame AND the build, so the "$20 Deposit" CTA is honest — the old
// STALE_DEPOSIT allowance (02 + its four sheet backdrops) is gone.
// UX-LOOP round 6 (Kevin): the six older frames that wrote the deposit
// spaced ("- $20") and 03/Tailoring's Appt row "7:00PM" were synced to
// "-$20" / "7:00 PM" in Figma — their SPACED_DEPOSIT / Appt ALLOWs are
// gone (03/Tailoring, 03/Summary, 04, 06, 03.3 and 06.1 backdrops).
// 05A / 05B (and 05.1's 07B backdrop) now carry the dated CTA and the
// "Switch to …" secondary in the frame as in the build — those ALLOWs
// are gone too; 05.1/Dated keeps its inherited entry until that
// backdrop is confirmed synced.
/* ---------- UX-LOOP round 7 — R7 money model — Figma sync pending ----------
   Kevin's money model v2 (UX-LOOP.md round 7 ledger): no deposit, no
   10%, no Taily fee; a tiered Concierge fee held at booking and
   charged on acceptance; the tailor sees only "Your payout". Round 7
   is code-first — every frame money string below is what the FRAMES
   still draw and the build no longer renders. One dedicated money sync
   applies the ledger to Figma; these entries go with it. */
const R7_02_CTA = ['Request Tailor · $20 Deposit (10%)'];                                   // 02 + its sheet backdrops → "Hold $25 Visitation Fee"
const R7_REQUESTED = [];   // R8: frames synced to the money model — kept empty for history
const R7_BOOKED = [];   // R8: frames synced to the money model — kept empty for history   // 03/Confirmed · Reminder · Cancelled + backdrops → Alterations (est.) / Concierge fee — charged / Total
const R7_FINAL = [];   // R8: frames synced to the money model — kept empty for history   // 03/Tailoring (+ 03.3 backdrop) → Alterations / Concierge fee — paid / Total / Due at handoff
const R7_REVIEW = [];   // R8: frames synced to the money model — kept empty for history   // 04 Default / Modified / Removed (+ their due amount)
const R7_RECEIPT = [];   // R8: frames synced to the money model — kept empty for history   // 06 / 03/Summary (+ 06.1 backdrop) → Alterations / Concierge fee — paid 7/7/26 / Delivery / Total / Paid at delivery
const R7_DELIVERY = [];   // R8: frames synced to the money model — kept empty for history                           // 05B (+ 05.1 backdrops) → Alterations / Delivery / Due at delivery
/* tailor side (coordinated with the tailor implementer): payout = 100%
   of the alteration prices, no Subtotal / Taily Fee rows */
const R7_T_PAYOUT = [];   // R8: frames synced to the money model — kept empty for history
const R7_T_REQUEST = [];   // R8: frames synced to the money model — kept empty for history

/* Round 14: Kevin's Tailor Summary Card master edit (the ✓ after the name + the three
   verification badges) bled into the tailor frames' Sarah cards — a customer is not a
   verified tailor; raised in UX-LOOP.md, built without them. */
const R14_SARAH_BADGES = [];   // round 15: the tailor frames draw Kevin's User Summary (✓ New Customer + badges) — built

/* ---------- UX-LOOP round 16 (Kevin): Concierge fee · delivery only · the calendar ----------
   Frame strings the build renders differently — raised in UX-LOOP.md, ALLOW'd
   until the frames / fixtures are synced:
   · the Visit Details address row: the round-16 frames append the zip
     ("◉ 88 Leonard Street, 10013"); the code prints the seed's place without it
   · the popup backdrops (03.1 / 03.2 / 03.3 booking / 03.4 / 04.1) draw
     03/Confirmed in its LOCKED state ("Concierge fee - Paid 7/7/26") with the
     round-15 Total caption; the live 03/Confirmed reads "Due Today" /
     "Alterations are paid at delivery."
   · ended visits (Cancelled / Expired / Tailor-cancelled / No-show / Unconfirmed):
     the frames keep the est. rows + Total (+ caption); the code drops the Total
     (R7-U-04) and every row on a request that never booked
   · receipts: the frames date "Paid at delivery 7/23/26"; the code prints the
     fulfilment date
   · APP (fixtures, not synced yet — the tailor click-through fails on them too):
     the T01 fixture's request card prints $225 (frame $200) and a live 12-hour
     timer (frame "EXPIRES IN 1H 24M"); the T07 fixture still prints the pickup
     copy where the frame has the round-16 courier line */
const R16_ADDRESS = ['◉ 88 Leonard Street, 10013'];
const R16_LOCKED_BACKDROP = [...R16_ADDRESS, 'Concierge fee - Paid 7/7/26', 'Alterations are paid at pickup or delivery.'];
const R16_ENDED_ROWS = [...R16_ADDRESS, '$250', 'Total', 'Alterations are paid at delivery.'];
const R16_RECEIPT = [...R16_ADDRESS, 'Paid at delivery 7/23/26'];
/* the 06.1 frames' backdrop is the OLD 06 (Back chevron, Need-by row, three cards) — the code's 06 lost its Back / pill in round 16 */
const R16_REVIEW_BACKDROP = [...R16_RECEIPT, '‹', '▤ Need by: Fri, Jul 17', 'Suit Jacket', 'Sleeve / Adjust Length', 'Before', 'Pinned', '$80', '$360', '$410'];   // the code's 06.1 backdrop is not the $360 / $410 final order (raised)
const R16_T01_TIMER = ['EXPIRES IN 1H 24M'];

const ALLOW = {
  /* round 15: the 01a frame's selected tile writes "3 Shirts/Blouses" (no spaces around the slash — raised); the code pluralises GARMENT_TYPES' "Shirts / Blouses" */
  '01a-home-selected': ['Shirts/Blouses', 'vt'],   // round 16: a stray "vt" text node in the frame (raised)
  // Phase R3 (Kevin): 03's request card reads the live order; the
  // frame's requested-time fixture is stale (the address and estimate
  // lines match since UX-LOOP R1 — Home Visit fiction, $200 seed).
  '03-status-requested': ['Thu, Jul 9 · 9:30 AM', ...R7_REQUESTED],
  // UX-003: R1's rows quote the actual appointment; the frame keeps
  // the "Thursday's 7:00 PM" fixture.
  '03.1-reschedule-popup': ['Thursday’s 7:00 PM with Marco is cancelled', ...R7_BOOKED, 'Your $20 deposit is refunded.', ...R16_LOCKED_BACKDROP],
  // UX-LOOP round 3: the sibling frames inherit their base's documented
  // divergence — 03/New Time keeps 03/Requested's stale requested-time
  // fixture, 05.1/Dated draws 07B underneath.
  '03-status-new-time': ['Thu, Jul 9 · 9:30 AM', ...R7_REQUESTED],
  /* round 16: the 05.1 popup's backdrop frame writes the generic balance line; the code prints the amount */
  '05.1-confirm-delivery': ['Please schedule your delivery below. The balance of your order will be charged upon delivery.'],
  /* ---- R7 money model — Figma sync pending (customer) ---- */
  '02-appointment-details': R7_02_CTA,
  '02.1-date-time-sheet': R7_02_CTA,
  '02.2-address-sheet': R7_02_CTA,
  '02.3-payment-sheet': [...R7_02_CTA, 'Your card is saved now — the deposit is only charged when your tailor confirms.'],
  '02.4-add-card-sheet': [...R7_02_CTA, 'Saved securely — charged only when your tailor confirms the appointment.'],
  '03-status-confirmed': [...R7_BOOKED, ...R16_ADDRESS],
  '03-status-confirmed-locked': R16_ADDRESS,
  /* round 16: the Reminder frame's callout writes a comma where the code writes an em dash ("non-refundable — no-shows included") — raised */
  '03-status-reminder': [...R7_BOOKED, ...R16_ADDRESS, 'Confirming makes your $50 Concierge fee non-refundable, no-shows included. Cancel before confirming and it’s refunded in full.'],
  '03-status-reminder-locked': R16_ADDRESS,
  '03.2-appointment-confirmed': [...R7_BOOKED, ...R16_LOCKED_BACKDROP],
  '04.1-request-changes': [...R7_BOOKED, ...R16_LOCKED_BACKDROP],
  '03.3-photo-viewer-booking': R16_LOCKED_BACKDROP,
  '03.4-tailor-details': R16_LOCKED_BACKDROP,
  '03-status-cancelled': [...R7_BOOKED, 'Your $20 deposit will be returned to Visa •••• 4242. Please rebook whenever you’re ready.', ...R16_ENDED_ROWS, 'Concierge fee - Refunded'],
  '03-status-tailor-cancelled': [...R7_BOOKED, 'Your $20 deposit is refunded to Visa •••• 4242. We can find you another tailor.', ...R16_ENDED_ROWS],
  '03-status-no-show': [...R7_BOOKED, 'Marco marked the Sun, Jul 12 · 7:00 PM visit as a no-show, so your $20 deposit was kept.', ...R16_ENDED_ROWS],
  '03-status-unconfirmed': R16_ENDED_ROWS,
  /* round 16: the Expired frame draws the booked rows + a refunded fee and its own body; the code's expired request shows no rows */
  '03-status-expired': [...R16_ENDED_ROWS, 'No tailor accepted in time. Nothing was charged and the hold on your card is released.', '$200', 'Alterations (est.)', 'Price is finalized at the appointment.', '$50', 'Concierge fee - Refunded'],
  '03-status-tailoring': [...R7_FINAL, ...R16_ADDRESS],
  '03.3-photo-viewer': [...R7_FINAL, ...R16_ADDRESS],
  '04-review-approve': [...R7_REVIEW, '$180', ...R16_ADDRESS],
  '04-review-approve-modified': [...R7_REVIEW, '$340', ...R16_ADDRESS],
  '04-review-approve-removed': [...R7_REVIEW, '$260', ...R16_ADDRESS],
  '04-review-approve-retiered': R16_ADDRESS,
  '06-journey-complete': [...R7_RECEIPT, ...R16_RECEIPT],
  '03-status-summary': [...R7_RECEIPT, ...R16_RECEIPT],
  '06.1-leave-review': [...R7_RECEIPT, ...R16_REVIEW_BACKDROP],
  '06.1-leave-review-submitted': R16_REVIEW_BACKDROP,
  /* ---- R7 money model — Figma sync pending (tailor) ---- */
  /* Round 10 (Sep 13 2026): Kevin rebuilt the tailor Active Job Card master's
     items label + date slots ('2 Suit Jackets', 'DUE', '9/2' defaults bleed
     through where instance overrides were lost) and added a 'Past Jobs' /
     'Decline' to the T01 frames — untracked edits, raised in UX-LOOP.md,
     ALLOW'd until Kevin says what T01 should show. */
  't01-home': ['$180', '2 Suit Jackets', 'DUE', '9/2', 'APPT', '8/29', '$102', ...R16_T01_TIMER],
  't01-home-closed': ['$180', '2 Suit Jackets', 'DUE', '9/2', ...R16_T01_TIMER, '$200'],   // APP: the fixture's request card still prints $225
  't02-appointment-request': [...R14_SARAH_BADGES, ...R7_T_REQUEST, 'Accept Request · $180'],
  /* Round 11: the sibling frames append "· 1.2 mi" ("·1.2" on two) to the address row where the T02 base does not — raised in UX-LOOP.md; the build follows the base */
  't02-accepted': [...R14_SARAH_BADGES, ...R7_T_REQUEST, '◉ 88 Leonard Street, 4B · 1.2 mi'],
  't02-expired': [...R14_SARAH_BADGES, ...R7_T_REQUEST, '◉ 88 Leonard Street, 4B ·1.2 mi'],
  't03-upcoming-visit': [...R14_SARAH_BADGES, '$180', ...R7_T_PAYOUT, '◉ 88 Leonard Street, 4B ·1.2 mi'],
  't03.1-cant-make-it': [...R14_SARAH_BADGES, '$180', ...R7_T_PAYOUT, 'The job closes, Sarah is notified and her $20 deposit is refunded.'],
  't03b-by-you': ['Sarah’s been notified and her $20 deposit is refunded. Your Sun, Jul 12 · 7:00 PM slot is open again.'],
  't03b-no-show': ['The job is closed and the slot is open again. Her $20 deposit stays with you.'],
  't04-appointment-details': [...R14_SARAH_BADGES, '$324', ...R7_T_PAYOUT],
  't05-confirm-final-pricing': ['$324', ...R7_T_PAYOUT],
  /* round 15: the T06 frame's first two cards draw the master's "$120" and a visible ✕ on the Appt_View variant (raised; the code's view cards have no close) */
  't06-appointment-status': ['$324', ...R7_T_PAYOUT, '$120', '✕', 'Hem / Adjust Length'],
  't07-job-ready': ['Sarah will pick up her items. Payment will be processed upon pickup.', 'Sarah scheduled delivery for Thu, Jul 23 · 5:00 PM. A Taily courier will collect the items — your payout is released on handoff.'],   // APP: the T07 fixture still prints the pickup copy
  't08-job-complete': ['Order total', 'Taily fee', '−$36', '$324'],
};

/* ---------- token (scripts/lib/figma-token.mjs, shared with figma-find.mjs) ---------- */
const token = readToken();
if (!token) {
  console.error('FIGMA_TOKEN is not set (env or .env at the repo root) — text parity needs the Figma API.');
  process.exit(1);
}

const cfg = JSON.parse(readFileSync(resolve(ROOT, 'scripts/screens.json'), 'utf8'));
const wanted = process.argv.slice(2).filter((a) => !a.startsWith('-'));
const entries = Object.entries(cfg.screens).filter(([id]) => !wanted.length || wanted.includes(id));

/* ---------- Figma text ---------- */
const norm = (s) => s.replace(/\s+/g, ' ').trim();

function collectText(node, out) {
  if (node.visible === false) return;
  if (node.type === 'TEXT' && node.characters) {
    const t = norm(node.characters);
    if (t) out.push(t);
  }
  for (const c of node.children ?? []) collectText(c, out);
}

const ids = entries.map(([, nodeId]) => nodeId).join(',');
const res = await fetch(
  `https://api.figma.com/v1/files/${cfg.fileKey}/nodes?ids=${encodeURIComponent(ids)}`,
  { headers: { 'X-Figma-Token': token } },
);
if (!res.ok) {
  console.error(`Figma API ${res.status}: ${await res.text()}`);
  process.exit(1);
}
const doc = await res.json();

const figmaText = {};
for (const [id, nodeId] of entries) {
  const tree = doc.nodes?.[nodeId]?.document;
  if (!tree) {
    console.error(`${id}: node ${nodeId} not in API response`);
    process.exit(1);
  }
  const out = [];
  collectText(tree, out);
  figmaText[id] = out;
}

/* ---------- rendered text (server + browser like diff.mjs) ---------- */
const MIME = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp',
};
const server = createServer((req, res2) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = resolve(ROOT, '.' + (p === '/' ? '/index.html' : p));
  if (!f.startsWith(ROOT) || !existsSync(f)) { res2.writeHead(404).end(); return; }
  res2.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream' });
  res2.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });

let failures = 0;
for (const [id] of entries) {
  await page.goto(`${origin}/index.html?screen=${encodeURIComponent(id)}`, { waitUntil: 'load' });
  await page.waitForTimeout(150);
  const domText = norm(await page.evaluate(() => {
    const scr = document.querySelector('.screen');
    const inputs = [...scr.querySelectorAll('input, textarea')].map((i) => `${i.value} ${i.placeholder}`).join(' ');
    return `${scr.innerText} ${inputs}`;
  }));

  const count = (hay, needle) => {
    let n = 0;
    for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + 1)) n++;
    return n;
  };

  const want = new Map();
  for (const t of figmaText[id]) {
    if ((ALLOW[id] ?? []).includes(t)) continue;
    want.set(t, (want.get(t) ?? 0) + 1);
  }
  const missing = [];
  for (const [t, n] of want) {
    const have = count(domText, t);
    if (have < n) missing.push(`"${t}" (frame ×${n}, rendered ×${have})`);
  }

  if (missing.length) {
    failures++;
    console.log(`FAIL  ${id}`);
    for (const m of missing.slice(0, 8)) console.log(`        missing ${m}`);
    if (missing.length > 8) console.log(`        …and ${missing.length - 8} more`);
  } else {
    console.log(`PASS  ${id.padEnd(26)} ${figmaText[id].length} frame text nodes present`);
  }
}

await browser.close();
server.close();
console.log(failures ? `\n${failures} screen(s) missing frame text` : '\nText parity: all screens carry their frame text.');
process.exit(failures ? 1 : 0);
