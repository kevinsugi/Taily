/* ============================================================
   Behaviour click-through — Phase 5 step 4.
   Drives Home → 02 → 02a → 03 → 04c → 06 → 06a → 07 → 07a → 08,
   asserting the screen id AND the state machine's status at every
   step, then checks Bookings shows the seeded cards.

   UI clicks drive every user-side edge; the two tailor-side events
   (accepting the request, finishing the appointment) fire through
   the same exported transitions the demo affordances use.
   Exit code 1 on any failed assertion.
   ============================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const ROOT = resolve(new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const server = createServer((req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const f = resolve(ROOT, '.' + (p === '/' ? '/index.html' : p));
  if (!f.startsWith(ROOT) || !existsSync(f)) { res.writeHead(404).end(); return; }
  res.writeHead(200, { 'Content-Type': MIME[extname(f)] ?? 'application/octet-stream' });
  res.end(readFileSync(f));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

await page.goto(`${origin}/index.html`, { waitUntil: 'load' });
await page.waitForTimeout(300);

let failures = 0;
const screenId = () => page.evaluate(() => document.getElementById('screen').dataset.screen);
const status = () => page.evaluate(() => window.Taily.state.upcoming[0]?.status ?? '(none)');
/* the appointment being viewed (terminal entries move to state.past, R2-U-07) */
const curStatus = () => page.evaluate(() => { const s = window.Taily.state; const c = s.currentAppt; return s[c.list]?.[c.index]?.status ?? '(none)'; });
const heroTitle = () => page.evaluate(() => document.querySelector('.status-hero__title')?.textContent.replace(/\s+/g, ' ').trim() ?? '(none)');

function check(desc, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc.padEnd(34)} ${detail}`);
}

/* UX-LOOP R2-U-01: a modal confirm that navigates must leave the page
   scrollable — the overlay's freeze is lifted with it. */
async function assertScrolls(desc) {
  await page.waitForTimeout(350);
  const ov = await page.evaluate(() => document.documentElement.style.overflow);
  check(desc, ov !== 'hidden', `overflow="${ov}"`);
}

async function assertAt(desc, expScreen, expStatus) {
  await page.waitForTimeout(350);
  const s = await screenId(), st = await status();
  const okS = s === expScreen;
  const okT = expStatus === undefined || st === expStatus;
  if (!okS || !okT) failures++;
  console.log(`${okS && okT ? 'PASS' : 'FAIL'}  ${desc.padEnd(34)} screen=${s}${okS ? '' : ` (want ${expScreen})`}  status=${st}${okT ? '' : ` (want ${expStatus})`}`);
}

/* Sheets are in-place overlays since the motion round: the route never
   changes, an overlay with the sheet's data-s mounts over the live
   screen and unmounts on confirm/cancel. */
async function assertOverlay(desc, expDataS) {
  await page.waitForTimeout(500);
  const s = await page.evaluate(() =>
    document.querySelector('.screen-sheet--overlay:not(.is-closing)')?.dataset.s ?? '(none)');
  const ok = s === (expDataS ?? '(none)');
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc.padEnd(34)} overlay=${s}${ok ? '' : ` (want ${expDataS ?? 'none'})`}`);
}

await assertAt('boot', '01-home', 'confirmed');
// UX-LOOP R1-U-12: nothing selected → Start Booking stays on Home
await page.click('[data-act="start-booking"]');
await assertAt('Start Booking, no selection (stays)', '01-home', 'confirmed');
await page.click('[data-tile="Suit Jacket"]');
await page.click('[data-act="start-booking"]');
await assertAt('Start Booking', '02-appointment-details', 'confirmed');
// UX-LOOP R1-U-16: the browser's back / forward step the prototype
await page.goBack();
await assertAt('browser back → Home', '01-home', 'confirmed');
await page.goForward();
await assertAt('browser forward → 02', '02-appointment-details', 'confirmed');
// UX-LOOP R2-U-09: the camera "+" tile adds a placeholder photo; ✕ removes it
const photoTiles = () => page.evaluate(() => document.querySelectorAll('.photo-tile--photo').length);
const before = await photoTiles();
await page.click('.photo-tile--add');
await page.waitForTimeout(300);
check('photo "+" tile adds a photo', await photoTiles() === before + 1, `${before} → ${await photoTiles()}`);
await page.click('.photo-tile__cancel');
await page.waitForTimeout(300);
check('photo ✕ removes it', await photoTiles() === before, `now ${await photoTiles()}`);
// UX-LOOP round 9 (Kevin): both pills open as "Select Time"; the request
// is inert (pill error + toast) until the requested time AND the need-by
// are picked.
const pillState = (act) => page.evaluate((a) => {
  const box = document.querySelector(`[data-act="${a}"]`); const pill = box?.closest('.filter-pill');
  return { value: box?.firstChild?.nodeValue?.trim(), error: !!pill?.classList.contains('filter-pill--error'), help: pill?.querySelector('[data-pill-help]')?.textContent.trim() ?? '' };
}, act);
{
  const t = await pillState('time'); const n = await pillState('needby');
  check('02 pills default to Select Time (round 9)', t.value === 'Select Time' && n.value === 'Select Time' && !t.error && !n.error, JSON.stringify({ t, n }));
}
await page.click('[data-act="request"]');
await assertAt('Request Tailor, no time yet (stays on 02)', '02-appointment-details');
await assertOverlay('  …no payment sheet', null);
{
  const t = await pillState('time');
  const toastText = await page.evaluate(() => document.querySelector('.toast')?.textContent.trim());
  check('  …requested-time pill errors + toast "Select a requested time"', t.error && t.help === 'Select a requested time' && toastText === 'Select a requested time', JSON.stringify({ t, toastText }));
}
await page.click('[data-act="time"]');
await assertAt('Requested-time pill (stays on 02)', '02-appointment-details');
await assertOverlay('  …time sheet overlays', '02.1-date-time-sheet');
await page.click('[data-act="sheet-confirm"]');
await page.waitForTimeout(400);
await assertAt('sheet ✓ returns', '02-appointment-details');
await assertOverlay('  …overlay gone', null);
{
  const t = await pillState('time');
  check('  …time picked: pill reads the wheel value, error gone', /^[A-Z][a-z]{2,4} \d{1,2}, \d{1,2}:\d{2} (AM|PM)$/.test(t.value ?? '') && !t.error, JSON.stringify(t));
}
// UX-LOOP R1-U-11 / round 9: no need-by yet → the request stays inert
// until the need-by wheel (which opens on the requested date) is moved
// one day on.
const needByError = () => page.evaluate(() => !!document.querySelector('.filter-pill--error'));
await page.click('[data-act="request"]');
await assertAt('Request Tailor, no need-by yet', '02-appointment-details');
await assertOverlay('  …no payment sheet', null);
{
  const n = await pillState('needby');
  check('  …need-by pill errors "Select a need-by time"', n.error && n.help === 'Select a need-by time' && n.value === 'Select Time', JSON.stringify(n));
}
await page.click('[data-act="needby"]');
await assertOverlay('  …need-by sheet overlays', '02.1-date-time-sheet');
await page.evaluate(() => {
  const col = document.querySelector('.screen-sheet--overlay .wheel__col--scroll');
  col.scrollTop = 40 * (Number(col.dataset.sel) + 1);
});
await page.waitForTimeout(300);
await page.click('[data-act="sheet-confirm"]');
await page.waitForTimeout(400);
console.log(`${!await needByError() ? 'PASS' : 'FAIL'}  need-by after appointment clears`);
if (await needByError()) failures++;
await page.click('[data-act="request"]');
await assertAt('Request Tailor (stays on 02)', '02-appointment-details');
await assertOverlay('  …payment sheet overlays', '02.3-payment-sheet');
// UX-LOOP R1-U-21: ✕ on the card sheet returns to the payment sheet
await page.click('.method-row:nth-of-type(3)');
await assertOverlay('  …Credit Card → card sheet', '02.4-add-card-sheet');
await page.click('.screen-sheet--overlay .sheet-scrim');   // dismiss (scrim / Escape)
await page.waitForTimeout(700);
await assertOverlay('  …dismiss reopens payment sheet', '02.3-payment-sheet');
await page.click('.method-row');                      // Apple Pay → request sent
await assertAt('Pay (request sent)', '03-status-requested', 'searching');
// UX-LOOP round 6 (Kevin): no tailor name before one accepts — the
// request card leads with ✂ + "Matching you with a tailor", the
// 2-hour acceptance line is in the frame
{
  const r = await page.evaluate(() => ({
    a: (({ name, initials, tailorId, matching }) => ({ name, initials, tailorId, matching }))(window.Taily.state.upcoming[0]),
    name: document.querySelector('.request-card__name')?.textContent.trim(),
    avatar: document.querySelector('.request-card .avatar')?.textContent.trim(),
    line: document.querySelector('[data-act="expire"]')?.textContent.trim(),
    hasMarco: /Marco/.test(document.querySelector('[data-s="03-status-requested"] .info-card')?.textContent ?? ''),
  }));
  const document_hasMarco = r.hasMarco;
  check('requestTailor leaves the tailor unnamed', r.a.name === null && r.a.initials === null && r.a.tailorId === null && r.a.matching === true, JSON.stringify(r.a));
  /* R6: the frame's request card has no name row — the customer sees NO tailor name before matching */
  check('03/Requested card shows no tailor name before matching', r.name === undefined && !document_hasMarco, `name="${r.name}"`);
  check('03/Requested shows the 2-hour line', r.line === 'Tailors have up to 2 hours to accept your request.', `"${r.line}"`);
}
// UX-LOOP R3-U-01: the appointment owns the garments now — Home has no
// selection left over and Start Booking cannot start a duplicate
await page.evaluate(() => window.Taily.render('01-home'));
await page.waitForTimeout(200);
{
  const home = await page.evaluate(() => ({
    heading: document.querySelector('[data-s="01-home"] h1')?.textContent.trim(),
    badges: [...document.querySelectorAll('[data-tile] .garment-tile__qty, [data-tile] [data-minus]')].length,
    garments: window.Taily.state.garments.length,
    selected: Object.values(window.Taily.state.ui?.homeSelection ?? {}).filter((q) => q > 0).length,
  }));
  check('Home after Request Tailor: no selection', home.heading === 'What Are We Tailoring?' && home.garments === 0 && home.selected === 0, JSON.stringify(home));
  // R6: the Requested card is nameless — "Matching you with a tailor",
  // meta "Requested: …", no Message CTA while matching
  const card = await page.evaluate(() => ({
    name: document.querySelector('.appt-card__name')?.textContent.trim(),
    meta: document.querySelector('.appt-card__meta')?.textContent.trim(),
    ctas: [...document.querySelectorAll('.appt-card .cta-small')].map((b) => b.textContent.trim()),
  }));
  check('01 Requested card = Matching you with a tailor', card.name === 'Matching you with a tailor' && /^Requested: \w{3}, \w{3,4} \d{1,2} · /.test(card.meta ?? '') && card.ctas.length === 0, JSON.stringify(card));
}
await page.click('[data-act="start-booking"]');
await assertAt('  …Start Booking stays (no duplicate)', '01-home', 'searching');
await page.evaluate(() => window.Taily.render('03-status-requested'));
await page.waitForTimeout(200);
// R3-U-01: the request card reads the appointment (03 grammar), not the form
// R7: "… · $25 visitation fee held" — the fee is HELD until a tailor accepts
{
  const rows = await page.evaluate(() => [...document.querySelectorAll('.meta-row span:last-child')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  const a = await page.evaluate(() => { const x = window.Taily.state.upcoming[0]; return { alt: x.totals.alterations, fee: x.totals.visitFee, n: x.count, held: x.feeHeld, chargedOn: x.feeChargedOn ?? null, hasDeposit: 'deposit' in x.totals }; });
  check('03/Requested rows read the appointment', rows[0] === '88 Leonard St, 4B — Home Visit' && /^\w{3}, \w{3,4} \d{1,2} · \d{1,2}:\d{2} [AP]M$/.test(rows[1]) && rows[2] === `${a.n} item · $${a.alt}.00+ est. · $${a.fee} visitation fee held`, rows.join(' | '));
  check('requestTailor holds the $25 fee (1 item), nothing charged', a.fee === 25 && a.held === true && a.chargedOn === null && !a.hasDeposit, JSON.stringify(a));
  const cancelLine = await page.evaluate(() => document.querySelector('[data-act="cancel"]')?.textContent.trim());
  check('03/Requested cancel line: nothing has been charged', cancelLine === 'Cancel request — nothing has been charged', `"${cancelLine}"`);
}
await page.click('[data-act="map"]');                 // demo: tailor accepts
await assertAt('tailor accepts', '03-status-confirmed', 'confirmed');
// R7: acceptance CHARGES the held fee (feeChargedOn dates the rows)
{
  const r = await page.evaluate(() => { const x = window.Taily.state.upcoming[0]; return { held: x.feeHeld, chargedOn: x.feeChargedOn ?? null, locked: !!x.feeLocked, fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()), note: document.querySelector('.fee-note')?.textContent.trim() }; });
  check('tailorAccepts charges the fee (feeChargedOn, hold released)', r.held === false && /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(r.chargedOn ?? '') && !r.locked, JSON.stringify({ held: r.held, chargedOn: r.chargedOn }));
  check('03/Confirmed rows: Alterations (est.) / Visitation fee — charged / Total', r.fees === '$120 $25 $145' && r.descs[0] === 'Alterations (est.)' && r.descs[1] === `Visitation fee — charged ${r.chargedOn}` && r.descs[2] === 'Total', `${r.fees} | ${r.descs.join(' | ')}`);
  check('03/Confirmed note: alterations paid at handoff', r.note === 'Alterations are paid at pickup or delivery.', `"${r.note}"`);
}
// R6: acceptance names Marco everywhere
{
  const r = await page.evaluate(() => ({
    a: (({ name, initials, tailorId, matching }) => ({ name, initials, tailorId, matching }))(window.Taily.state.upcoming[0]),
    card: document.querySelector('.summary-card__name')?.textContent.trim(),
    avatar: document.querySelector('.summary-card .avatar')?.textContent.trim(),
  }));
  check('tailorAccepts names Marco (MT · marco)', r.a.name === 'Marco Tailor' && r.a.initials === 'MT' && r.a.tailorId === 'marco' && r.a.matching === false, JSON.stringify(r.a));
  check('03/Confirmed card reads Marco Tailor', r.card === 'Marco Tailor' && r.avatar === 'MT', `card="${r.card}" avatar="${r.avatar}"`);
}
// UX-LOOP R1-U-01: the tailor card is the demo "day before" → reminder
await page.click('.summary-card');
await assertAt('reminder fires (confirmed)', '03-status-reminder', 'confirmed');
// R7: the reminder IS the confirmation prompt — R7-U-01: the "Before you
// confirm" callout heads the actions block (a prepare-card, body-size
// ink copy, ! glyph) right above Confirm; the pill is the plain
// Confirmed until confirmed
{
  const r = await page.evaluate(() => {
    const w = document.querySelector('[data-fee-warning]');
    const cs = w && getComputedStyle(w.querySelector('[data-fee-warning-body]'));
    return { title: [...(w?.querySelector('.fee-callout__title')?.children ?? [])].map((c) => c.textContent.trim()).join(' '), body: w?.querySelector('[data-fee-warning-body]')?.textContent.trim(), inActions: !!w?.closest('.actions'), beforeConfirm: w?.nextElementSibling?.matches('[data-act="confirm"]'), card: w?.classList.contains('prepare-card'), size: cs?.fontSize, ink: cs?.color, pill: document.querySelector('.status-hero .pill span:last-child')?.textContent.trim() };
  });
  check('03/Reminder "Before you confirm" callout before Confirm (R7-U-01)', r.title === '! Before you confirm' && r.body === 'Confirming makes your $25 visitation fee non-refundable — no-shows included. Cancel before confirming and it’s refunded in full.' && r.inActions && r.beforeConfirm && r.card && r.pill === 'Confirmed', JSON.stringify(r));
  check('  …body-size ink copy, not fine print', r.size === '16px' && r.ink === 'rgb(28, 27, 24)', `${r.size} ${r.ink}`);
}
// Phase R2: Reschedule / Cancel opens the R1 popup; Go Back dismisses
await page.click('[data-act="reschedule"]');
await assertOverlay('  …R1 popup overlays', '03.1-reschedule-popup');
{
  const rows = await page.evaluate(() => [...document.querySelectorAll('.screen-sheet--overlay .modal__row')].map((e) => [...e.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join(' ')));
  check('03.1 row before confirming: fee refunded', rows[1] === '✓ Your $25 visitation fee is refunded', rows[1]);
}
await page.click('[data-act="go-back"]');
await page.waitForTimeout(400);
await assertOverlay('  …popup gone', null);
// Phase R4: Confirm Appointment opens the 05C popup; its Confirm makes
// the appointment happen.
await page.click('[data-act="confirm"]');
await assertOverlay('  …05C popup overlays', '03.2-appointment-confirmed');
// R7-U-01: the tap that locks the fee says so — a ! row between the frame's two
{
  const rows = await page.evaluate(() => [...document.querySelectorAll('.screen-sheet--overlay .modal__row')].map((e) => [...e.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join(' ')));
  check('03.2 row 2: fee now non-refundable (R7-U-01)', rows.length === 3 && rows[1] === '! Your $25 visitation fee is now non-refundable.' && /^✓ Marco will message/.test(rows[0]) && /^! Please prepare/.test(rows[2]), rows.join(' | '));
}
await page.click('[data-act="confirm-appt"]');        // appointment happens
await page.waitForTimeout(400);
// Phase R0: 06 - Order Status was deleted; 04D (Appointment Status)
// takes its place, and tapping the order opens the modified review (06B).
await assertAt('appointment done', '03-status-tailoring', 'awaiting-approval');
await assertScrolls('page scrolls after 03.2 confirm');
// R7: 03.2's Confirm ran confirmAppointment() first — the fee is locked
{
  const r = await page.evaluate(() => { const x = window.Taily.state.upcoming[0]; return { locked: x.feeLocked, at: x.confirmedAt ?? null, fee: x.totals.visitFee, charged: x.totals.visitFeeCharged, added: x.totals.visitFeeAdded, alt: x.totals.alterations, total: x.totals.total, items: x.totals.items }; });
  check('confirmAppointment locked the fee (confirmedAt, feeLocked)', r.locked === true && !!r.at, JSON.stringify({ locked: r.locked, at: r.at }));
  check('final order (2 items) keeps the $25 tier: $280 + $25 = $305', r.items === 2 && r.alt === 280 && r.fee === 25 && r.charged === 25 && r.added === 0 && r.total === 305, JSON.stringify(r));
  const rows = await page.evaluate(() => ({ fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | ') }));
  check('03/Tailoring rows: Alterations / Visitation fee — paid / Total / Due at handoff', rows.fees === '$280 $25 $305 $280' && rows.descs === 'Alterations | Visitation fee — paid | Total | Due at handoff', `${rows.fees} | ${rows.descs}`);
}
// UX-LOOP R4-U-01: 03/Reminder and 03/Tailoring REPLACED the screens they
// superseded — two browser backs after the visit never show the stale
// "Appointment Confirmed" / reminder with a live Reschedule / Cancel
{
  const seen = [];
  for (let i = 0; i < 2; i++) { await page.goBack(); await page.waitForTimeout(400); seen.push(await screenId()); }
  check('two backs after 03.2 never show 03/Confirmed or 03/Reminder', !seen.some((s) => s === '03-status-confirmed' || s === '03-status-reminder'), seen.join(' ← '));
  check('  …no Reschedule / Cancel on the way', !(await page.evaluate(() => !!document.querySelector('[data-act="reschedule"]'))));
  // …and the family guard: 03/Confirmed / 03/Reminder re-entered for an
  // appointment that already happened redirect to 03/Tailoring
  await page.evaluate(() => window.Taily.render('03-status-confirmed'));
  await assertAt('03/Confirmed for a post-visit entry → 03/Tailoring', '03-status-tailoring', 'awaiting-approval');
  await page.evaluate(() => window.Taily.render('03-status-reminder'));
  await assertAt('03/Reminder for a post-visit entry → 03/Tailoring', '03-status-tailoring', 'awaiting-approval');
  // …and the substrate refuses to cancel a measured order (03.1 toasts and closes)
  const r = await page.evaluate(async () => {
    const S = await import('/js/state.js'); const P = await import('/js/screens/03.1-reschedule-popup.js');
    const a = S.apptEntry(); const res = S.cancelAppointment(a);
    P.openReschedulePopup();
    await new Promise((r) => setTimeout(r, 300));
    document.querySelector('[data-act="confirm-reschedule"]')?.click();
    await new Promise((r) => setTimeout(r, 400));
    return { res, status: a.status, inPast: S.state.past.includes(a), toast: document.querySelector('.toast')?.textContent ?? '', overlay: !!document.querySelector('.screen-sheet--overlay:not(.is-closing)') };
  });
  check('cancelAppointment() refuses a post-visit order', r.res === null && r.status === 'awaiting-approval' && !r.inPast, `res=${r.res} status=${r.status}`);
  check('  …03.1 confirm toasts and closes instead', r.toast === 'This order can’t be cancelled here — message Marco' && !r.overlay, `toast="${r.toast}" overlay=${r.overlay}`);
  await assertAt('  …still on 03/Tailoring', '03-status-tailoring', 'awaiting-approval');
}
// UX-LOOP R2-U-08: the card follows the final order once revised
const cardCount = await page.evaluate(() => { window.Taily.render('01-home'); return document.querySelector('.card-list__title')?.textContent ?? ''; });
check('card count follows the final order', /^2 Items Total/.test(cardCount), `"${cardCount}"`);
await page.evaluate(() => window.Taily.render('03-status-tailoring'));
await page.waitForTimeout(200);
// Phase R2: tapping a Before/Pinned photo opens the PV3 viewer
await page.click('.photo-row');
await assertOverlay('  …PV3 viewer overlays', '03.3-photo-viewer');
await page.click('[data-act="pv-close"]');
await page.waitForTimeout(400);
await assertOverlay('  …viewer gone', null);
// UX-LOOP R1-U-04: the hero's primary CTA reviews the order too
await page.click('[data-act="review-order"]');
await assertAt('Review Final Order CTA', '04-review-approve-modified', 'awaiting-approval');
await page.goBack();
await assertAt('browser back → status', '03-status-tailoring', 'awaiting-approval');
await page.click('[data-act="review"] .fee-row');
await assertAt('open final order', '04-review-approve-modified', 'awaiting-approval');
// R7: 04 prices the final order — no deposit, the fee already paid
{
  const rows = await page.evaluate(() => ({ fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), info: document.querySelectorAll('.fee-row--info').length, text: document.querySelector('[data-s]')?.textContent ?? '' }));
  check('04/Modified rows: $280 / $25 paid / $305 / due $280', rows.fees === '$280 $25 $305 $280' && rows.descs === 'Alterations | Visitation fee — paid | Total | Due at handoff' && rows.info === 3, `${rows.fees} | ${rows.descs} info=${rows.info}`);
  check('04 never says deposit / 10% / Taily fee / Balance', !/deposit|10%|Taily fee|Balance/i.test(rows.text));
}
// Phase R2: Request Changes opens the RC1 popup. UX-LOOP R2-T-09: Sounds
// Good stamps changesRequestedAt and opens the chat with a canned bubble.
await page.click('[data-act="changes"]');
await assertOverlay('  …RC1 popup overlays', '04.1-request-changes');
await page.click('[data-act="sounds-good"]');
await page.waitForTimeout(400);
await assertOverlay('  …popup gone', null);
await assertAt('Sounds Good → chat', '10-messages', 'awaiting-approval');
const changes = await page.evaluate(() => ({
  stamped: !!window.Taily.state.upcoming[0]?.changesRequestedAt,
  bubble: [...document.querySelectorAll('.bubble')].some((b) => /talk about the changes/.test(b.textContent)),
}));
check('changes requested + bubble', changes.stamped && changes.bubble, JSON.stringify(changes));
await page.goBack();
await assertAt('browser back → review', '04-review-approve-modified', 'awaiting-approval');
// Phase R4/R5: approving lands back on 04D as 'tailoring'. Tapping the
// order simulates the TAILOR finishing (markReady) — the user stays on
// 04D (card flips to Ready) and reaches 07 only via the appointment
// card's Schedule Pickup / Delivery.
await page.click('[data-act="approve"]');
await assertAt('approve order', '03-status-tailoring', 'tailoring');
check('approval clears the change request', !(await page.evaluate(() => window.Taily.state.upcoming[0]?.changesRequestedAt)));
// UX-LOOP R2-U-11: the LIVE tailoring state leads with Message Marco
const tailoringCtas = await page.evaluate(() => [...document.querySelectorAll('.cta-bar .cta')].map((b) => b.textContent.trim()));
check('tailoring CTA bar (live)', tailoringCtas[0] === 'Message Marco' && tailoringCtas[1] === 'View All Appointments', tailoringCtas.join(' | '));
await page.click('[data-act="review"] .fee-row');
await assertAt('tailor marks ready', '03-status-tailoring', 'ready-for-pickup');
await page.evaluate(() => window.Taily.render('01-home'));
await page.waitForTimeout(200);
await page.evaluate(() => {
  [...document.querySelectorAll('.appt-card .cta-small')]
    .find((b) => b.textContent.trim() === 'Schedule Pickup / Delivery')?.click();
});
await assertAt('schedule pickup/delivery', '05-items-ready', 'ready-for-pickup');
await page.click('[data-opt="pickup"]');
await page.click('[data-act="continue"]');
await assertAt('continue to pickup', '05a-pickup-window', 'ready-for-pickup');
// R7: due at pickup = the alterations (the fee was charged on acceptance)
{
  const due = await page.evaluate(() => document.querySelector('.due-card__amount')?.textContent.trim());
  check('05a due at pickup = $280 (alterations only)', /^\$280 · /.test(due ?? ''), `"${due}"`);
}
// UX-LOOP round 6 (Kevin, UX-008): the CTA carries the DATED window and
// the secondary switches between pickup and delivery
{
  const ctas = () => page.evaluate(() => ({ confirm: document.querySelector('[data-act="confirm"]')?.textContent.trim(), other: document.querySelector('[data-act="select"]')?.textContent.trim() }));
  const DATED = /^Confirm (Pickup|Delivery) · \w{3}, \w{3,4} \d{1,2} · .+$/;
  let c = await ctas();
  check('05A CTA = Confirm Pickup · <dated window>', DATED.test(c.confirm ?? '') && /^Confirm Pickup/.test(c.confirm) && c.other === 'Switch to Delivery', JSON.stringify(c));
  await page.click('[data-act="select"]');
  await assertAt('Switch to Delivery → 05B', '05b-delivery-options', 'ready-for-pickup');
  c = await ctas();
  check('05B CTA = Confirm Delivery · <dated window>', DATED.test(c.confirm ?? '') && /^Confirm Delivery/.test(c.confirm) && c.other === 'Switch to Pickup', JSON.stringify(c));
  // R7: Alterations / Delivery / Due at delivery ($280 + $20)
  const rows = await page.evaluate(() => [...document.querySelectorAll('.info-row')].map((e) => [...e.children].map((c) => c.textContent.trim()).join(' ')).join(' | '));
  check('05B rows: Alterations $280 | Delivery $20 | Due at delivery $300', rows === 'Alterations $280 | Delivery $20 | Due at delivery $300', rows);
  await page.click('[data-act="select"]');
  await assertAt('Switch to Pickup → 05A', '05a-pickup-window', 'ready-for-pickup');
}
// Phase R6: confirming opens 07C; the order stays ready until the
// TAILOR confirms the handoff (demo: tap the order on 04D) → 08.
await page.click('[data-act="confirm"]');
await assertOverlay('  …07C window confirmed', '05.1-window-confirmed');
await page.click('[data-act="window-done"]');
await page.waitForTimeout(400);
await assertAt('window scheduled (still ready)', '01-home', 'ready-for-pickup');
await assertScrolls('page scrolls after 05.1 Done');
// UX-LOOP R2-U-02: the stored window carries its date (card meta / hero)
const windowMeta = await page.evaluate(() => document.querySelector('.appt-card__meta')?.textContent.trim() ?? '');
check('window label carries its date', /^Pickup: \w{3}, \w{3,4} \d{1,2} · /.test(windowMeta), `"${windowMeta}"`);
await page.click('.appt-card');
await assertAt('scheduled card opens status', '03-status-tailoring', 'ready-for-pickup');
await page.click('[data-act="review"] .fee-row');
await assertAt('tailor confirms handoff', '06-journey-complete', 'delivered');
// R7 receipt: Alterations / Visitation fee — paid <date> / Total / Paid at pickup <date>
{
  const r = await page.evaluate(() => { const x = window.Taily.state.upcoming[0]; return { fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()), chargedOn: x.feeChargedOn, delivery: x.totals.delivery, total: x.totals.total }; });
  check('06 receipt rows (pickup): $280 / $25 / $305 / $280 paid', r.fees === '$280 $25 $305 $280' && r.delivery === 0 && r.total === 305, `${r.fees} delivery=${r.delivery} total=${r.total}`);
  check('06 receipt descs', r.descs[0] === 'Alterations' && r.descs[1] === `Visitation fee — paid ${r.chargedOn}` && r.descs[2] === 'Total' && /^Paid at pickup \d{1,2}\/\d{1,2}\/\d{2}$/.test(r.descs[3] ?? ''), r.descs.join(' | '));
  await page.evaluate(() => window.Taily.render('03-status-summary'));
  await page.waitForTimeout(200);
  const s = await page.evaluate(() => ({ fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | ') }));
  check('03/Summary receipt agrees with 06', s.fees === r.fees && s.descs === r.descs.join(' | '), `${s.fees} | ${s.descs}`);
  await page.evaluate(() => window.Taily.render('06-journey-complete'));
  await page.waitForTimeout(200);
}
// Phase R6: Leave a Review opens the 08C sheet; stars select, confirm closes.
await page.click('[data-act="review"]');
await assertOverlay('  …08C review sheet', '06.1-leave-review');
await page.click('[data-star="5"]');
await page.click('[data-act="confirm-review"]');
await page.waitForTimeout(400);
await assertOverlay('  …review sheet gone', null);
// UX-LOOP R1-U-14: the review is stored; a second tap only toasts
await page.click('[data-act="review"]');
await assertOverlay('  …second review toasts, no sheet', null);
const review = await page.evaluate(() => window.Taily.state.upcoming[0]?.review?.rating);
if (review !== 5) failures++;
console.log(`${review === 5 ? 'PASS' : 'FAIL'}  review stored on the appointment     rating=${review}`);

// UX-LOOP R3-U-03/04: with nothing live, Home falls back to the delivered
// order under "Recent Appointment" and its Leave Review is real (09's
// handler, once per appointment). The seed is parked for the probe.
{
  await page.evaluate(() => { const s = window.Taily.state; window.__parked = s.upcoming.filter((a) => a.status !== 'delivered'); s.upcoming = s.upcoming.filter((a) => a.status === 'delivered'); window.Taily.render('01-home'); });
  await page.waitForTimeout(200);
  const home = await page.evaluate(() => ({ heading: document.querySelector('.upcoming-header .t-section')?.textContent.trim(), pill: document.querySelector('.appt-card .pill span:last-child')?.textContent.trim(), ctas: [...document.querySelectorAll('.appt-card .cta-small')].map((b) => b.textContent.trim()) }));
  check('Home falls back to the delivered order', home.heading === 'Recent Appointment' && home.pill === 'Completed' && home.ctas.join() === 'Leave Review', JSON.stringify(home));
  await page.evaluate(() => [...document.querySelectorAll('.appt-card .cta-small')].find((b) => b.textContent.trim() === 'Leave Review')?.click());
  await page.waitForTimeout(300);
  const toastTxt = await page.evaluate(() => document.querySelector('.toast')?.textContent.trim() ?? '');
  check('01 Leave Review guards a stored review', toastTxt === 'You already reviewed Marco', `toast="${toastTxt}"`);
  await assertOverlay('  …no sheet for a reviewed order', null);
  await page.evaluate(() => { delete window.Taily.state.upcoming[0].review; window.Taily.render('01-home'); });
  await page.waitForTimeout(200);
  await page.evaluate(() => [...document.querySelectorAll('.appt-card .cta-small')].find((b) => b.textContent.trim() === 'Leave Review')?.click());
  await assertOverlay('01 Leave Review opens 06.1', '06.1-leave-review');
  await page.click('[data-star="4"]');
  await page.click('[data-act="confirm-review"]');
  await page.waitForTimeout(400);
  await assertOverlay('  …review sheet gone', null);
  check('  …review stored from 01', (await page.evaluate(() => window.Taily.state.upcoming[0]?.review?.rating)) === 4);
  await page.evaluate(() => { const s = window.Taily.state; s.upcoming = [...window.__parked, ...s.upcoming]; s.upcoming[0].review = { rating: 5, text: '' }; });
  // put the delivered order back at the front (list order = newest first) so the seeds follow
  await page.evaluate(() => { const s = window.Taily.state; const d = s.upcoming.find((a) => a.status === 'delivered'); s.upcoming = [d, ...s.upcoming.filter((a) => a !== d)]; });
}

// Bookings: seeds + the delivered order under Past (R1-U-13)
await page.evaluate(() => { window.Taily.state && window.Taily.render('09-bookings'); });
await page.waitForTimeout(300);
const cards = await page.evaluate(() => {
  const kids = [...document.querySelectorAll('[data-s="09-bookings"] > *')];
  const h1s = kids.filter((e) => e.tagName === 'H1');
  const pastStart = kids.indexOf(h1s[1]);
  const pills = (els) => els.filter((e) => e.classList.contains('appt-card')).map((e) => e.querySelector('.pill span:last-child')?.textContent);
  return {
    count: document.querySelectorAll('.appt-card').length,
    sections: h1s.map((e) => e.textContent),
    current: pills(kids.slice(0, pastStart)),
    past: pills(kids.slice(pastStart)),
  };
});
/* the delivered booking sits under Past (with the two seeds); the seed
   Marco (still confirmed) and James stay current */
const seedsOk = cards.sections.join('|') === 'Current Bookings|Past Bookings'
  && !cards.current.includes('Completed') && cards.past.length === 3 && cards.past.every((p) => p === 'Completed');
if (!seedsOk) failures++;
console.log(`${seedsOk ? 'PASS' : 'FAIL'}  bookings partitions by status        current=${cards.current.join(',')} past=${cards.past.join(',')}`);

/* ============================================================
   UX-LOOP round 2 — the frameless branches (R2-U-03/04/05/07) and the
   03.1 confirm's scroll (R2-U-01). Each starts a fresh request from
   Home (the previous booking's selection is still on the tiles).
   ============================================================ */
async function rebook(desc) {
  await page.evaluate(() => window.Taily.render('01-home'));
  await page.waitForTimeout(200);
  const picked = await page.evaluate(() => Object.values(window.Taily.state.ui?.homeSelection ?? {}).some((q) => q > 0));
  if (!picked) await page.click('[data-tile="Suit Jacket"]');
  await page.click('[data-act="start-booking"]');
  await assertAt(`${desc}: Start Booking`, '02-appointment-details');
  await page.click('[data-act="request"]');
  await assertOverlay('  …payment sheet overlays', '02.3-payment-sheet');
  await page.click('.method-row');                    // Apple Pay
  await assertAt(`${desc}: request sent`, '03-status-requested', 'searching');
}

// R2-U-04: the "2 hours" line = time passes → the request expires
await rebook('expiry');
await page.click('[data-act="expire"]');
await assertAt('expiry demo → 03/Cancelled', '03-status-cancelled');
check('  …expired variant', await heroTitle() === 'Request expired' && await curStatus() === 'expired', `title="${await heroTitle()}" status=${await curStatus()}`);
await assertScrolls('  …page scrolls');
await page.click('[data-act="rerequest"]');
await assertAt('Send Request Again → 02', '02-appointment-details');
check('  …garments seeded', (await page.evaluate(() => document.querySelectorAll('.garment-card').length)) >= 1);

// R2-U-03: the tailor proposes another time (demo: hero pill)
await page.click('[data-act="request"]');
await assertOverlay('  …payment sheet overlays', '02.3-payment-sheet');
await page.click('.method-row');
await assertAt('re-request sent', '03-status-requested', 'searching');
await page.click('.status-hero .pill');
await page.waitForTimeout(300);
check('proposed-time hero', /proposed a new time$/.test(await heroTitle()), `"${await heroTitle()}"`);
const cardMeta = await page.evaluate(() => { window.Taily.render('01-home'); return { meta: document.querySelector('.appt-card__meta')?.textContent.trim(), ctas: [...document.querySelectorAll('.appt-card .cta-small')].map((b) => b.textContent.trim()) }; });
check('  …card "New time proposed"', /^New time proposed: /.test(cardMeta.meta ?? '') && cardMeta.ctas.join() === 'Review Time', JSON.stringify(cardMeta));
await page.evaluate(() => [...document.querySelectorAll('.appt-card .cta-small')].find((b) => b.textContent.trim() === 'Review Time')?.click());
await assertAt('Review Time → 03/Requested', '03-status-requested', 'searching');
await page.click('[data-act="keep-looking"]');
await assertAt('Keep Looking (still searching)', '03-status-requested', 'searching');
check('  …normal hero back', await heroTitle() === 'Finding your tailor…' && !(await page.evaluate(() => window.Taily.state.upcoming[0]?.proposed)), `"${await heroTitle()}"`);
await page.click('.status-hero .pill');
await page.waitForTimeout(300);
// UX-LOOP R4-U-03: the demo proposes on the need-by day here (need-by = the
// next day, 9:30 AM), so it respects the hour cap — 9:00 AM, not 11:00 AM
const demoProposal = await page.evaluate(async () => {
  const D = await import('/js/data.js'); const a = window.Taily.state.upcoming[0];
  return { when: a.proposed?.when ?? '', needBy: a.needBy, before: !!a.proposed && D.parseWhen(a.proposed.when).date < D.parseWhen(a.needBy).date, sameDay: D.fmtDay(a.proposed?.when) === D.fmtDay(a.needBy) };
});
check('  …demo proposal on the need-by day is before the need-by time', demoProposal.sameDay && demoProposal.before && /9:00 AM$/.test(demoProposal.when), `${demoProposal.when} (need-by ${demoProposal.needBy})`);
await page.click('[data-act="accept-time"]');
await assertAt('Accept New Time → 03/Confirmed', '03-status-confirmed', 'confirmed');
check('  …when is the proposed time', (await page.evaluate(() => window.Taily.state.upcoming[0]?.when ?? '')) === demoProposal.when, await page.evaluate(() => window.Taily.state.upcoming[0]?.when));

/* ============================================================
   UX-LOOP round 6 (Kevin): "reschedule" = cancel + resubmit the same
   job for a new tailor. Round 7 (money model v2): the visitation fee
   is refunded in full until the customer confirms the visit on the
   24-hour prompt (confirmAppointment → feeLocked); after that it is
   kept. 03.1's confirm lands on 02 pre-filled (replace + toast);
   Request Tailor creates a fresh matching request.
   ============================================================ */
const pinVisit = (opts) => page.evaluate(async ([d, h]) => {
  const a = window.Taily.state.upcoming[0]; const D = await import('/js/data.js');
  const time = a.when.match(/\d{1,2}:\d{2} [AP]M$/)?.[0] ?? '9:30 AM';
  if (d != null) a.when = `${D.shiftDay(a.when, d).replace(/^\w+, /, '')}, ${time}`;
  else {
    const t = new Date(Date.now() + h * 3600e3);
    const h12 = ((t.getHours() + 11) % 12) + 1;
    a.when = `${D.fmtDay(t.toDateString()).replace(/^\w+, /, '')}, ${h12}:${String(t.getMinutes()).padStart(2, '0')} ${t.getHours() >= 12 ? 'PM' : 'AM'}`;
  }
  a.needBy = D.shiftDay(a.when, 2);
  return { when: a.when, needBy: a.needBy, visit: a.visit, orderId: a.orderId, fee: a.totals.visitFee };
}, [opts.days ?? null, opts.hours ?? null]);
/* "✕ Your … is cancelled" — glyph + text, one space between */
const popupRows = () => page.evaluate(() => [...document.querySelectorAll('.screen-sheet--overlay .modal__row')].map((e) => [...e.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join(' ')));
const RESCHEDULE_TOAST = 'Appointment cancelled — send the same job to find a new tailor';

// before confirming the visit: refunded
const far = await pinVisit({ days: 5 });
await page.evaluate(() => window.Taily.render('03-status-confirmed', { replace: true }));
await page.waitForTimeout(200);
await page.click('[data-act="reschedule"]');
await assertOverlay('  …R1 popup overlays (visit 5 days out)', '03.1-reschedule-popup');
{
  const rows = await popupRows();
  const farWhen = await page.evaluate(async (w) => (await import('/js/data.js')).fmtWhen(w), far.when);
  check('03.1 rows: cancelled / fee refunded / kept-for-new-tailor', rows[0] === `✕ Your ${farWhen} with Marco is cancelled`
    && rows[1] === `✓ Your $${far.fee} visitation fee is refunded` && rows[2] === '↻ Your items and time are kept — we’ll find you a new tailor', rows.join(' | '));
}
// R2-U-01: the 03.1 confirm closes its overlay before navigating
await page.click('[data-act="confirm-reschedule"]');
await assertAt('03.1 confirm → 02 (reschedule = cancel + resubmit)', '02-appointment-details');
await assertScrolls('page scrolls after 03.1 confirm');
{
  const r = await page.evaluate(() => ({
    toast: document.querySelector('.toast')?.textContent.trim(),
    when: document.querySelector('[data-act="time"]')?.firstChild?.nodeValue?.trim(),
    needBy: document.querySelector('[data-act="needby"]')?.firstChild?.nodeValue?.trim(),
    where: window.Taily.state.appt.where,
    garments: document.querySelectorAll('.garment-card').length,
    past: (({ status, refund, feeKept, cancelledBy }) => ({ status, refund, feeKept, cancelledBy }))(window.Taily.state.past[0]),
    stash: window.Taily.state.lastCancelled === window.Taily.state.past[0],
  }));
  check('  …toast', r.toast === RESCHEDULE_TOAST, `"${r.toast}"`);
  /* round 9: the pills read the copied dates in the pill grammar (fmtPill — "Sept 19" for a day-only need-by) */
  const farPill = await page.evaluate(async (f) => { const D = await import('/js/data.js'); return { when: D.fmtPill(f.when), needBy: D.fmtPill(f.needBy) }; }, { when: far.when, needBy: far.needBy });
  check('  …02 pre-filled (time / need-by / visit / items)', r.when === farPill.when && r.needBy === farPill.needBy && r.where === far.visit && r.garments >= 1, JSON.stringify({ when: r.when, needBy: r.needBy, want: farPill, where: r.where, garments: r.garments }));
  check('  …cancelled before confirming: refund = fee, not kept', r.past.status === 'cancelled' && r.past.cancelledBy === 'customer' && r.past.refund === far.fee && r.past.feeKept === false && r.stash, JSON.stringify(r.past));
}
await page.goBack();
await page.waitForTimeout(400);
check('  …next back not swallowed', (await screenId()) !== '02-appointment-details', `screen=${await screenId()}`);
// UX-LOOP R3-U-05: 02 REPLACED 03/Confirmed — back lands on Home / Bookings,
// never on a "Confirmed" ghost with a live Reschedule
check('  …back lands on Home / Bookings, no Confirmed ghost', ['01-home', '09-bookings'].includes(await screenId()), `screen=${await screenId()}`);
// …and a status screen re-entered for an ended appointment redirects to 03/Cancelled
await page.evaluate(() => window.Taily.render('03-status-confirmed'));
await page.waitForTimeout(300);
await assertAt('03/Confirmed for a cancelled entry → 03/Cancelled', '03-status-cancelled');
check('  …no live Reschedule on the way', !(await page.evaluate(() => !!document.querySelector('[data-act="reschedule"]'))));
{
  const r = await page.evaluate(() => ({ title: document.querySelector('.status-hero__title')?.textContent.trim(), body: document.querySelector('.status-hero__body')?.textContent.trim(), desc: document.querySelectorAll('.fee-row__desc')[1]?.textContent.trim(), card: document.querySelector('.summary-card__name')?.textContent.trim() }));
  check('  …03/Cancelled: refunded body + Refunded row', r.title === 'Appointment Cancelled' && r.body === `Your $${far.fee} visitation fee is refunded to Apple Pay.` && /^Visitation fee — Refunded \d{1,2}\/\d{1,2}\/\d{2}$/.test(r.desc ?? '') && r.card === 'Marco Tailor', JSON.stringify(r));
}
// …the same job goes out again as a NEW matching request (no name until accept)
await page.evaluate(() => window.Taily.render('02-appointment-details'));
await page.waitForTimeout(200);
await page.click('[data-act="request"]');
await assertOverlay('  …payment sheet overlays', '02.3-payment-sheet');
await page.click('.method-row');
await assertAt('rescheduled job re-requested', '03-status-requested', 'searching');
{
  const r = await page.evaluate(() => { const a = window.Taily.state.upcoming[0]; return { orderId: a.orderId, when: a.when, needBy: a.needBy, name: a.name, matching: a.matching, card: document.querySelector('.request-card__name')?.textContent.trim() }; });
  const farPill = await page.evaluate(async (f) => { const D = await import('/js/data.js'); return { when: D.fmtPill(f.when), needBy: D.fmtPill(f.needBy) }; }, { when: far.when, needBy: far.needBy });
  check('  …new order id, same time / need-by, no tailor yet', r.orderId !== far.orderId && r.when === farPill.when && r.needBy === farPill.needBy && r.name === null && r.matching === true && r.card === undefined, JSON.stringify({ ...r, want: farPill }));
}
await page.click('[data-act="map"]');                 // demo: a tailor accepts
await assertAt('  …accepted → 03/Confirmed', '03-status-confirmed', 'confirmed');
check('  …Marco named on acceptance', (await page.evaluate(() => window.Taily.state.upcoming[0].name)) === 'Marco Tailor');
// after confirming the visit (the 24-hour prompt): kept
const near = await pinVisit({ days: 1 });
{
  const r = await page.evaluate(async () => { const S = await import('/js/state.js'); const a = window.Taily.state.upcoming[0]; const ok = S.confirmAppointment(a); return { ok, locked: a.feeLocked, at: a.confirmedAt ?? null, again: S.confirmAppointment(a) }; });
  check('confirmAppointment on a confirmed visit: feeLocked + confirmedAt', r.ok === true && r.locked === true && !!r.at, JSON.stringify(r));
}
await page.evaluate(() => window.Taily.render('03-status-confirmed', { replace: true }));
await page.waitForTimeout(200);
{
  const pill = await page.evaluate(() => document.querySelector('.status-hero .pill span:last-child')?.textContent.trim());
  check('03/Confirmed pill once confirmed: Confirmed · fee non-refundable', pill === 'Confirmed · fee non-refundable', `"${pill}"`);
  await page.evaluate(() => window.Taily.render('03-status-reminder', { replace: true }));
  await page.waitForTimeout(200);
  const r = await page.evaluate(() => ({ pill: document.querySelector('.status-hero .pill span:last-child')?.textContent.trim(), warn: document.querySelector('[data-fee-warning]') ? 1 : 0 }));
  check('03/Reminder once confirmed: same pill, no non-refundable line', r.pill === 'Confirmed · fee non-refundable' && r.warn === 0, JSON.stringify(r));
}
await page.click('[data-act="reschedule"]');
await assertOverlay('  …R1 popup overlays (visit confirmed)', '03.1-reschedule-popup');
{
  const rows = await popupRows();
  check('03.1 row after confirming: fee non-refundable', rows[1] === `✕ Your $${near.fee} visitation fee is non-refundable (you confirmed the visit)`, rows[1]);
}
await page.click('[data-act="confirm-reschedule"]');
await assertAt('03.1 confirm (confirmed visit) → 02', '02-appointment-details');
{
  const r = await page.evaluate(() => (({ status, refund, feeKept }) => ({ status, refund, feeKept }))(window.Taily.state.past[0]));
  check('  …cancelled after confirming: refund 0, fee kept', r.status === 'cancelled' && r.refund === 0 && r.feeKept === true, JSON.stringify(r));
}
await page.evaluate(() => window.Taily.render('03-status-confirmed'));
await assertAt('03/Confirmed for the kept-fee entry → 03/Cancelled', '03-status-cancelled');
{
  const r = await page.evaluate(() => ({ body: document.querySelector('.status-hero__body')?.textContent.trim(), desc: document.querySelectorAll('.fee-row__desc')[1]?.textContent.trim(), fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), refundCard: document.querySelectorAll('.prepare-card').length }));
  // R7-U-04: no Total row on a visit that ended — Alterations (est.) + the fee row with its outcome
  check('  …03/Cancelled: kept body + Kept row, no Total (R7-U-04)', r.body === `Your $${near.fee} visitation fee was kept — you had confirmed the visit.` && r.desc === 'Visitation fee — Kept' && r.fees === '$120 $25' && r.refundCard === 0, JSON.stringify(r));
}

// the copied-over job is not resubmitted again — clear the form
await page.evaluate(() => { const s = window.Taily.state; s.garments = []; s.ui.homeSelection = {}; });
// R3-U-03: today's outcome shows on Home once, above the live card
await page.evaluate(() => window.Taily.render('01-home'));
await page.waitForTimeout(200);
{
  const cards = await page.evaluate(() => [...document.querySelectorAll('[data-s="01-home"] .appt-card')].map((e) => e.querySelector('.pill span:last-child')?.textContent.trim()));
  check('Home shows today’s Cancelled outcome above the live card', cards[0] === 'Cancelled' && cards.length === 2, cards.join(','));
  await page.click('[data-s="01-home"] .appt-card');
  await assertAt('  …outcome card → 03/Cancelled', '03-status-cancelled');
  await page.evaluate(() => window.Taily.render('01-home'));
  await page.waitForTimeout(200);
  const after = await page.evaluate(() => [...document.querySelectorAll('[data-s="01-home"] .appt-card')].map((e) => e.querySelector('.pill span:last-child')?.textContent.trim()));
  check('  …seen once — gone on the next visit', after.length === 1 && after[0] !== 'Cancelled', after.join(','));
}

/* ---- R7: unconfirmed 12 hours before the visit → Taily auto-cancels, fee refunded ---- */
await page.evaluate(() => { const s = window.Taily.state; s.garments = []; s.ui.homeSelection = {}; });
await rebook('unconfirmed');
await page.click('[data-act="map"]');                 // a tailor accepts → fee charged
await assertAt('  …accepted → 03/Confirmed', '03-status-confirmed', 'confirmed');
await page.click('.summary-card');                    // the day before arrives
await assertAt('  …reminder (unconfirmed)', '03-status-reminder', 'confirmed');
await page.click('.status-hero__title');              // DEMO: 12 hours pass without confirming
await assertAt('reminder title tap → auto-cancel → 03/Cancelled', '03-status-cancelled');
{
  const r = await page.evaluate(() => ({
    title: document.querySelector('.status-hero__title')?.textContent.trim(),
    body: document.querySelector('.status-hero__body')?.textContent.trim(),
    desc: document.querySelectorAll('.fee-row__desc')[1]?.textContent.trim(),
    cta: document.querySelector('[data-act="rerequest"]')?.textContent.trim(),
    past: (({ status, cancelledBy, reason, refund, feeKept, wasRequested }) => ({ status, cancelledBy, reason, refund, feeKept, wasRequested }))(window.Taily.state.past[0]),
    stash: window.Taily.state.lastCancelled === window.Taily.state.past[0],
  }));
  check('autoCancelUnconfirmed: cancelled · none · unconfirmed · full refund', r.past.status === 'cancelled' && r.past.cancelledBy === 'none' && r.past.reason === 'unconfirmed' && r.past.refund === 25 && r.past.feeKept === false && r.past.wasRequested === false && r.stash, JSON.stringify(r.past));
  check('  …03/Cancelled unconfirmed body + Refunded row + Send Request Again', r.title === 'Appointment Cancelled' && r.body === 'We didn’t hear back before the visit, so it was cancelled. Your $25 visitation fee is refunded to Apple Pay.' && /^Visitation fee — Refunded /.test(r.desc ?? '') && r.cta === 'Send Request Again', JSON.stringify({ title: r.title, body: r.body, desc: r.desc, cta: r.cta }));
  await assertScrolls('  …page scrolls');
  await page.evaluate(() => window.Taily.render('01-home'));
  await page.waitForTimeout(200);
  const meta = await page.evaluate(() => document.querySelector('[data-s="01-home"] .appt-card__meta')?.textContent.trim());
  check('  …01 outcome card meta: Cancelled · visit not confirmed', meta === 'Cancelled · visit not confirmed', `"${meta}"`);
  await page.evaluate(() => window.Taily.render('09-bookings'));
  await page.waitForTimeout(200);
  const auto = await page.evaluate(() => [...document.querySelectorAll('.appt-card')].some((c) => c.querySelector('.appt-card__meta')?.textContent.trim() === 'Cancelled · visit not confirmed' && c.querySelector('.pill span:last-child')?.textContent.trim() === 'Cancelled'));
  check('  …09 lists it under Past as Cancelled', auto);
}

/* ---- R7: the fee tiers on 02 (live count from the form) ---- */
await page.evaluate(() => { const s = window.Taily.state; s.garments = []; s.ui.homeSelection = {}; });
{
  const on02 = async (garments) => {
    await page.evaluate((g) => { window.Taily.state.garments = g; window.Taily.render('02-appointment-details'); }, garments);
    await page.waitForTimeout(200);
    /* round 9: the card is garment-card shaped — price column + content column; `card` joins them */
    return page.evaluate(() => ({ card: `${document.querySelector('.fee-card__price')?.textContent.trim()} | ${document.querySelector('.fee-card__line')?.textContent.trim()}`, est: document.querySelector('.fee-card__est')?.textContent.trim() ?? null, note: document.querySelector('.fee-card__note')?.textContent.trim() ?? null, order: [...document.querySelector('.fee-card__content').children].map((e) => e.className.split(' ').pop()).join(','), cols: [...document.querySelector('.fee-card').children].map((e) => e.className).join(','), cta: document.querySelector('[data-act="request"]')?.textContent.trim() }));
  };
  const g = (n, qty = 1) => Array.from({ length: n }, () => ({ type: 'Shirt / Blouse', jobs: ['Hem / Adjust Length'], qty, photos: 0 }));
  let r = await on02(g(2));
  check('02 fee card 2 items → $25, no note, CTA Reserve Appt · $25 (round 9)', r.card === '$25 | Visitation fee · 2 items' && r.note === null && r.cta === 'Reserve Appt · $25', JSON.stringify(r));
  check('  …garment-card layout: price column left, content right (round 9)', r.cols === 'fee-card__chip,fee-card__content', r.cols);
  // R7-U-03: the second line sums the form's alterations before the hold
  check('02 fee card line 2: Alterations est. $240 · paid at pickup or delivery (R7-U-03)', r.est === 'Alterations est. $240 · paid at pickup or delivery' && r.order === 'fee-card__line,fee-card__est', `"${r.est}" ${r.order}`);
  r = await on02(g(4));
  check('02 fee card 4 items → still $25', r.card === '$25 | Visitation fee · 4 items' && r.note === null, JSON.stringify(r));
  r = await on02(g(5));
  check('02 fee card 5 items → $50 + note, CTA Reserve Appt · $50', r.card === '$50 | Visitation fee · 5 items' && r.note === 'Helps cover transportation for larger appointments.' && r.cta === 'Reserve Appt · $50', JSON.stringify(r));
  r = await on02(g(3, 2));   // 3 garments × qty 2 = 6 items (qty-aware)
  check('02 fee card counts quantities (3 × 2 = 6 → $50)', r.card === '$50 | Visitation fee · 6 items' && r.cta === 'Reserve Appt · $50', JSON.stringify(r));
  r = await on02(g(10));
  check('02 fee card 10 items → $50', r.card === '$50 | Visitation fee · 10 items', JSON.stringify(r));
  r = await on02(g(11));
  check('02 fee card 11 items → $100 + note, CTA Reserve Appt · $100', r.card === '$100 | Visitation fee · 11 items' && r.note === 'Helps cover transportation for larger appointments.' && r.cta === 'Reserve Appt · $100', JSON.stringify(r));
  check('  …line 2 follows the live sum, tier note stays third (R7-U-03)', r.est === 'Alterations est. $1320 · paid at pickup or delivery' && r.order === 'fee-card__line,fee-card__est,fee-card__note', `"${r.est}" ${r.order}`);
  // the payment sheet quotes the same fee
  await page.click('[data-act="request"]');
  await assertOverlay('  …payment sheet overlays', '02.3-payment-sheet');
  const sub = await page.evaluate(() => document.querySelector('.screen-sheet--overlay .sheet__sub')?.textContent.trim());
  check('02.3 sub: Hold your $100 visitation fee — charged when a tailor accepts…', sub === 'Hold your $100 visitation fee — charged when a tailor accepts. Alterations are paid at pickup or delivery.', `"${sub}"`);
  await page.click('.method-row');                    // Apple Pay
  await assertAt('  …11-item request sent', '03-status-requested', 'searching');
  const row = await page.evaluate(() => [...document.querySelectorAll('.meta-row span:last-child')].map((e) => e.textContent.replace(/\s+/g, ' ').trim())[2]);
  check('03/Requested holds $100 for 11 items', row === '11 items · $1320.00+ est. · $100 visitation fee held', `"${row}"`);
  const held = await page.evaluate(() => { const a = window.Taily.state.upcoming[0]; return { fee: a.totals.visitFee, charged: a.totals.visitFeeCharged, total: a.totals.total, held: a.feeHeld }; });
  check('  …appointment totals: $1320 + $100 = $1420, held', held.fee === 100 && held.charged === 100 && held.total === 1420 && held.held === true, JSON.stringify(held));
  // withdraw it (nothing charged) so the next probes start clean
  await page.click('[data-act="cancel"]');
  await assertOverlay('  …R1 popup (cancel mode)', '03.1-reschedule-popup');
  await page.click('[data-act="confirm-reschedule"]');
  await assertAt('  …withdrawn → 03/Cancelled', '03-status-cancelled');
  const w = await page.evaluate(() => ({ refund: window.Taily.state.past[0].refund, kept: window.Taily.state.past[0].feeKept, rows: document.querySelectorAll('.fee-row').length, body: document.body.textContent.includes('Nothing was charged') }));
  check('  …withdrawn request: hold released ($100 back), no fee rows', w.refund === 100 && w.kept === false && w.rows === 0 && w.body, JSON.stringify(w));
  await page.evaluate(() => { const s = window.Taily.state; s.garments = []; s.ui.homeSelection = {}; });
}

/* ---- R7: the fitting re-tiers the fee (4 booked → 5 final) — the
   customer sees "Additional visitation fee" on 04, owes it at handoff,
   and the receipts carry it ---- */
{
  const r = await page.evaluate(async () => {
    const S = await import('/js/state.js'); const D = await import('/js/data.js');
    const s = window.Taily.state;
    s.garments = Array.from({ length: 4 }, () => ({ type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], qty: 1, photos: 0 }));
    s.appt.when = D.shiftDay(new Date().toDateString(), 3).replace(/^\w+, /, '') + ', 10:00 AM';
    s.appt.needBy = D.shiftDay(s.appt.when, 3);
    const a = S.requestTailor();
    const booked = { fee: a.totals.visitFee, items: a.totals.items, total: a.totals.total };
    S.tailorAccepts(a); S.confirmAppointment(a); S.draftFinalOrder(a); S.completeAppointment(a);
    return { booked, final: { fee: a.totals.visitFee, charged: a.totals.visitFeeCharged, added: a.totals.visitFeeAdded, items: a.totals.items, alt: a.totals.alterations, total: a.totals.total }, status: a.status };
  });
  check('4 booked items hold $25 ($320 + $25 = $345)', r.booked.fee === 25 && r.booked.items === 4 && r.booked.total === 345, JSON.stringify(r.booked));
  check('the fitting adds a 5th item (+Hem, +jacket) → $50 tier: charged $25, added $25', r.final.items === 5 && r.final.charged === 25 && r.final.fee === 50 && r.final.added === 25 && r.final.alt === 520 && r.final.total === 570 && r.status === 'awaiting-approval', JSON.stringify(r.final));
  await page.evaluate(() => window.Taily.render('04-review-approve-modified'));
  await page.waitForTimeout(200);
  const rows = await page.evaluate(() => ({ fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), info: document.querySelectorAll('.fee-row--info').length }));
  // R7-U-02: the added row says why, and a fee-note under the rows explains the re-tier (04 + 03/Tailoring; receipts keep the short label)
  const TIER_NOTE = 'Your order grew to 5 items, so the visitation fee is now $50. The extra $25 is charged with your alterations at handoff.';
  check('04/Modified re-tiered: $520 / $25 paid / +$25 Additional visitation fee — 5 items now, $50 tier / $570 / due $545', rows.fees === '$520 $25 $25 $570 $545' && rows.descs === 'Alterations | Visitation fee — paid | Additional visitation fee — 5 items now, $50 tier | Total | Due at handoff' && rows.info === 4, `${rows.fees} | ${rows.descs} info=${rows.info}`);
  {
    const n = await page.evaluate(() => document.querySelector('[data-fee-tier-note]')?.textContent.trim());
    check('04/Modified fee-note explains the re-tier (R7-U-02)', n === TIER_NOTE, `"${n}"`);
    await page.evaluate(() => window.Taily.render('03-status-tailoring'));
    await page.waitForTimeout(200);
    const t = await page.evaluate(() => ({ descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), note: document.querySelector('[data-fee-tier-note]')?.textContent.trim() }));
    check('03/Tailoring (awaiting) carries the same caption + fee-note (R7-U-02)', t.descs === 'Alterations | Visitation fee — paid | Additional visitation fee — 5 items now, $50 tier | Total | Due at handoff' && t.note === TIER_NOTE, `${t.descs} | "${t.note}"`);
  }
  await page.evaluate(async () => { const S = await import('/js/state.js'); const a = window.Taily.state.upcoming[0]; S.approveOrder(a); S.markReady(a); window.Taily.render('05a-pickup-window'); });
  await page.waitForTimeout(200);
  const due = await page.evaluate(() => document.querySelector('.due-card__amount')?.textContent.trim());
  check('05a due at pickup = $545 (alterations + the added fee)', /^\$545 · /.test(due ?? ''), `"${due}"`);
  await page.evaluate(() => window.Taily.render('05b-delivery-options'));
  await page.waitForTimeout(200);
  const b = await page.evaluate(() => [...document.querySelectorAll('.info-row')].map((e) => [...e.children].map((c) => c.textContent.trim()).join(' ')).join(' | '));
  check('05b rows keep the short label: Alterations $520 | Additional visitation fee $25 | Delivery $20 | Due at delivery $565', b === 'Alterations $520 | Additional visitation fee $25 | Delivery $20 | Due at delivery $565', b);
  const rc = await page.evaluate(async () => {
    const S = await import('/js/state.js'); const a = window.Taily.state.upcoming[0];
    S.chooseFulfilment('delivery', 'Fri, Jul 17 · 4–6 PM', 'Jul 17', a); S.deliver(a);
    window.Taily.render('06-journey-complete');
    await new Promise((r) => setTimeout(r, 200));
    return { delivery: a.totals.delivery, total: a.totals.total, fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), chargedOn: a.feeChargedOn };
  });
  check('chooseFulfilment(delivery) adds $20 to the totals ($590)', rc.delivery === 20 && rc.total === 590, JSON.stringify({ delivery: rc.delivery, total: rc.total }));
  check('06 receipt (delivery, re-tiered) keeps the short label: $520 / $25 / $25 / $20 / $590 / paid $565', rc.fees === '$520 $25 $25 $20 $590 $565' && rc.descs === `Alterations | Visitation fee — paid ${rc.chargedOn} | Additional visitation fee | Delivery | Total | Paid at delivery 7/17/26` && !(await page.evaluate(() => !!document.querySelector('[data-fee-tier-note]'))), `${rc.fees} | ${rc.descs}`);
  // park it under Past so the later probes read the seeds as before
  await page.evaluate(() => { const s = window.Taily.state; const d = s.upcoming.shift(); s.upcoming.push(d); s.garments = []; s.ui.homeSelection = {}; });
}

// UX-LOOP R3-U-01: a second, unsent booking must not rewrite a live request card
await rebook('second-form');
{
  const before = await page.evaluate(() => [...document.querySelectorAll('.meta-row span:last-child')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  await page.evaluate(() => window.Taily.render('01-home'));
  await page.waitForTimeout(200);
  await page.click('[data-tile="Suit Pant"]');
  await page.click('[data-tile="Shirt / Blouse"]');
  await page.click('[data-act="start-booking"]');
  await assertAt('second booking form (unsent)', '02-appointment-details', 'searching');
  await page.evaluate(() => window.Taily.render('09-bookings'));
  await page.waitForTimeout(200);
  await page.evaluate(() => [...document.querySelectorAll('.appt-card')].find((c) => c.querySelector('.pill span:last-child')?.textContent === 'Requested')?.querySelector('.appt-card__name')?.click());
  await assertAt('Requested card → 03/Requested', '03-status-requested', 'searching');
  const after = await page.evaluate(() => [...document.querySelectorAll('.meta-row span:last-child')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  check('03/Requested rows unchanged by the second form', after.join('|') === before.join('|'), `${after.join(' | ')}`);
  // clear the probe's form, then withdraw the live request so the decline run starts clean
  await page.evaluate(() => { const s = window.Taily.state; s.garments = []; s.ui.homeSelection = {}; });
  await page.click('[data-act="cancel"]');
  await assertOverlay('  …R1 popup (cancel mode)', '03.1-reschedule-popup');
  await page.click('[data-act="confirm-reschedule"]');
  await assertAt('  …withdrawn → 03/Cancelled', '03-status-cancelled');
  await page.evaluate(() => { const s = window.Taily.state; s.garments = []; s.ui.homeSelection = {}; });
}

// R2-U-07: terminal entries list under Past with their own card
await page.evaluate(() => window.Taily.render('09-bookings'));
await page.waitForTimeout(300);
const pastPills = await page.evaluate(() => {
  const kids = [...document.querySelectorAll('[data-s="09-bookings"] > *')];
  const h1s = kids.filter((e) => e.tagName === 'H1');
  return kids.slice(kids.indexOf(h1s[1])).filter((e) => e.classList.contains('appt-card')).map((e) => e.querySelector('.pill span:last-child')?.textContent);
});
check('09 lists cancelled + expired under Past', pastPills.includes('Cancelled') && pastPills.includes('Expired'), pastPills.join(','));

// R2-U-07: a declined request → 03/Cancelled "couldn’t take" → Send to Another Tailor
await rebook('decline');
await page.evaluate(async () => { const m = await import('/js/state.js'); m.declineAppointment(m.state.upcoming[0]); });
await page.evaluate(() => window.Taily.render('09-bookings'));
await page.waitForTimeout(300);
await page.evaluate(() => [...document.querySelectorAll('.appt-card')].find((c) => c.querySelector('.pill span:last-child')?.textContent === 'Declined')?.querySelector('.appt-card__name')?.click());
await assertAt('declined card → 03/Cancelled', '03-status-cancelled');
check('  …declined variant', /couldn’t take this request$/.test(await heroTitle()) && await curStatus() === 'declined', `title="${await heroTitle()}"`);
const declinedCta = await page.evaluate(() => document.querySelector('[data-act="rerequest"]')?.textContent.trim());
check('  …Send to Another Tailor', declinedCta === 'Send to Another Tailor', `"${declinedCta}"`);
await page.click('[data-act="rerequest"]');
await assertAt('Send to Another Tailor → 02', '02-appointment-details');

/* ---------- UX-LOOP round 8: cold deep links for the money-sync sibling frames ----------
   Each fixture route renders its round-7 live-only state on a cold load
   (before any navigation), and the base deep links render as before —
   the routes exist ahead of their scripts/screens.json entries. */
const R8_COLD = {
  '03-status-reminder-locked': { pill: 'Confirmed · fee non-refundable', title: 'Please Confirm Tomorrow’s Appointment', callout: false, fees: '$200 Alterations (est.) | $25 Visitation fee — charged 7/7/26 | $225 Total' },
  '03-status-confirmed-locked': { pill: 'Confirmed · fee non-refundable', title: 'Appointment Confirmed', callout: false, fees: '$200 Alterations (est.) | $25 Visitation fee — charged 7/7/26 | $225 Total' },
  '03-status-unconfirmed': { pill: 'Cancelled', title: 'Appointment Cancelled', body: 'We didn’t hear back before the visit, so it was cancelled. Your $25 visitation fee is refunded to Visa •••• 4242.', fees: '$200 Alterations (est.) | $25 Visitation fee — Refunded 7/12/26', cta: 'Send Request Again' },
  '04-review-approve-retiered': { title: 'Approve your final order.', cards: 4, fees: '$600 Alterations | $25 Visitation fee — paid | $25 Additional visitation fee — 5 items now, $50 tier | $650 Total | $625 Due at handoff', note: 'Your order grew to 5 items, so the visitation fee is now $50. The extra $25 is charged with your alterations at handoff.' },
  /* the bases, unchanged */
  '03-status-reminder': { pill: 'Confirmed', callout: true },
  '03-status-confirmed': { pill: 'Confirmed', callout: false },
  '03-status-cancelled': { pill: 'Declined', title: 'Appointment Cancelled', body: null },   // the frame's fixture pill (unchanged since round 3)
  '04-review-approve-modified': { cards: 3, fees: '$360 Alterations | $25 Visitation fee — paid | $385 Total | $360 Due at handoff', note: null },
};
for (const [id, want] of Object.entries(R8_COLD)) {
  await page.goto(`${origin}/index.html?screen=${id}`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  const got = await page.evaluate(() => {
    const q = (s) => document.querySelector(s)?.textContent.replace(/\s+/g, ' ').trim() ?? null;
    return {
      screen: document.getElementById('screen').dataset.screen, registered: !document.querySelector('.screen-missing'),
      pill: q('.status-hero .pill'), title: q('.status-hero__title') ?? q('.heading h1'), body: q('.status-hero__body'),
      callout: !!document.querySelector('[data-fee-warning]'), cards: document.querySelectorAll('.garment-card').length,
      fees: [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | '),
      note: q('[data-fee-tier-note]'), cta: q('[data-act="rerequest"]'),
    };
  });
  const bad = Object.entries(want).filter(([k, v]) => got[k] !== v).map(([k, v]) => `${k}: got ${JSON.stringify(got[k])}, want ${JSON.stringify(v)}`);
  check(`R8 cold deep link ${id}`, got.screen === id && got.registered && bad.length === 0, bad.join('; '));
}

console.log(errors.length ? `CONSOLE ERRORS:\n  ${errors.join('\n  ')}` : 'no console errors');
if (errors.length) failures++;
await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL ASSERTIONS PASS');
process.exit(failures ? 1 : 0);
