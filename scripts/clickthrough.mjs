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
/* every dollar amount comes from scripts/money.mjs (→ js/data.js) */
import { $, fees, SEED, FINAL, RETIERED, LIVE, RUSH, RUSH_LADDER_STEPS, rushCap, CAPTION } from './money.mjs';
const CB = LIVE.customer.booked, CF = LIVE.customer.final;   // the happy path's booked / final order
const RB = LIVE.retier.booked, RF = LIVE.retier.final;       // the re-tier probe's booked / final order

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

/* the caller's file:line for FAIL lines — the first stack frame outside the assertion helpers */
const HELPER_FRAME = /\b(check|assertAt|assertOverlay|assertScrolls|here)\b/;
const ME = import.meta.url.split('/').pop();
function here() {
  for (const f of (new Error().stack ?? '').split('\n').slice(1)) {
    const m = f.match(/([^/\\(]+\.mjs):(\d+):\d+\)?\s*$/);
    if (!m || m[1] !== ME || HELPER_FRAME.test(f.replace(/\(.*$/, ''))) continue;
    return ` (${m[1]}:${m[2]})`;
  }
  return '';
}
function check(desc, ok, detail = '') {
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc.padEnd(34)} ${detail}${ok ? '' : here()}`);
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
  console.log(`${okS && okT ? 'PASS' : 'FAIL'}  ${desc.padEnd(34)} screen=${s}${okS ? '' : ` (want ${expScreen})`}  status=${st}${okT ? '' : ` (want ${expStatus})`}${okS && okT ? '' : here()}`);
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
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc.padEnd(34)} overlay=${s}${ok ? '' : ` (want ${expDataS ?? 'none'})${here()}`}`);
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
// Round 12 (Kevin): no address until the customer enters one — the
// heading reads "Please Enter Address" and Reserve opens the address
// sheet (with a toast) instead of the payment sheet.
{
  const line = await page.evaluate(() => document.querySelector('[data-addr-text]')?.textContent.trim());
  check('02 heading reads "Please Enter Address" until one is entered (round 12)', line === 'Please Enter Address', JSON.stringify(line));
}
await page.click('[data-act="request"]');
await assertAt('Request Tailor, no address yet (stays on 02)', '02-appointment-details');
await assertOverlay('  …address sheet opens instead of payment', '02.2-address-sheet');
{
  const toastText = await page.evaluate(() => document.querySelector('.toast')?.textContent.trim());
  check('  …toast "Enter your address"', toastText === 'Enter your address', JSON.stringify(toastText));
}
await page.fill('.screen-sheet--overlay [name="street"]', '88 Leonard St');
await page.fill('.screen-sheet--overlay [name="unit"]', '4B');
await page.fill('.screen-sheet--overlay [name="zip"]', '10013');
await page.click('[data-act="save-address"]');
await page.waitForTimeout(400);
await assertOverlay('  …address saved, sheet gone', null);
{
  const line = await page.evaluate(() => document.querySelector('[data-addr-text]')?.textContent.trim());
  check('  …heading now reads the entered address', line === '88 Leonard St, New York, NY', JSON.stringify(line));
}
await page.click('[data-act="request"]');
await assertAt('Request Tailor, no time yet (stays on 02)', '02-appointment-details');
await assertOverlay('  …no payment sheet', null);
{
  const t = await pillState('time');
  const toastText = await page.evaluate(() => document.querySelector('.toast')?.textContent.trim());
  check('  …requested-time pill errors + toast "Select a requested time"', t.error && t.help === 'Select a requested time' && toastText === 'Select a requested time', JSON.stringify({ t, toastText }));
}
/* round 16 (Kevin): both pills open the CALENDAR popup (02.1). A day cell
   stores the moment it is tapped; the time row swaps in the picker (12:00 PM
   the moment it opens; hours run 9 AM → 9 PM, minutes 00 / 30); the scrim
   leaves the picker, then closes the popup. */
const CAL = '.screen-sheet--overlay';
const keyOf = (d) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
const dayKey = (offset) => { const d = new Date(); d.setDate(d.getDate() + offset); return keyOf(d); };
/** Tap the day cell for `key` ("YYYY-M-D") in the calendar under `root`, paging months as needed. */
const pickDay = async (key, root = CAL) => {
  const [y, m] = key.split('-').map(Number);
  for (let i = 0; i < 12; i++) {
    const shown = await page.evaluate((r) => document.querySelector(`${r} [data-calendar]`)?.dataset.month ?? '', root);
    const [sy, sm] = shown.split('-').map(Number);
    const diff = (y - sy) * 12 + (m - sm);
    if (!diff) break;
    await page.evaluate(([r, d]) => document.querySelector(`${r} [data-act="${d > 0 ? 'cal-next' : 'cal-prev'}"]`)?.click(), [root, diff]);
    await page.waitForTimeout(150);
  }
  const ok = await page.evaluate(([r, k]) => { const b = document.querySelector(`${r} .cal-cell[data-day="${k}"]`); if (!b || b.disabled) return false; b.click(); return true; }, [root, key]);
  await page.waitForTimeout(250);
  return ok;
};
const selectable = (key, root = CAL) => page.evaluate(([r, k]) => { const b = document.querySelector(`${r} .cal-cell[data-day="${k}"]`); return !!b && !b.disabled; }, [root, key]);
/** Open the time row's picker and settle its three wheels (row indexes). */
const setPickerTime = async (hour, min, period, root = CAL) => {
  await page.evaluate((r) => document.querySelector(`${r} [data-act="cal-time"]`)?.click(), root);
  await page.waitForTimeout(250);
  await page.evaluate(([h, m, p]) => { const cols = [...document.querySelectorAll('[data-time-picker] .wheel__col--scroll')]; [h, m, p].forEach((i, n) => { cols[n].scrollTop = 40 * i; }); }, [hour, min, period]);
  await page.waitForTimeout(450);
};
/** The modal scrim (the picker → the calendar; the calendar → closed). */
const tapScrim = async () => { await page.evaluate(() => document.querySelector('.screen-sheet--overlay [data-act="modal-dismiss"]')?.click()); await page.waitForTimeout(500); };
const apptWhen = () => page.evaluate(() => window.Taily.state.appt.when ?? '');
const VISIT = 3;   // the requested day: today + 3
await page.click('[data-act="time"]');
await assertAt('Requested-time pill (stays on 02)', '02-appointment-details');
await assertOverlay('  …calendar popup overlays (round 16)', '02.1-date-time-sheet');
check('  …the requested-time calendar cannot pick yesterday', !(await selectable(dayKey(-1))));
check('  …day tapped (today + 3) stores the day at once', await pickDay(dayKey(VISIT)) && /^[A-Z][a-z]{2,4} \d{1,2}$/.test(await apptWhen()), await apptWhen());
// a day without a time: the scrim shows the error line once, the popup stays
await tapScrim();
await assertOverlay('  …scrim with no time: the popup stays (error line)', '02.1-date-time-sheet');
check('  …calendar error line', !!(await page.evaluate(() => document.querySelector('.screen-sheet--overlay .calendar__error'))));
await setPickerTime(1, 0, 0);   // 10:00 AM
check('  …picker settled → state.appt.when carries the time', /, 10:00 AM$/.test(await apptWhen()), await apptWhen());
await tapScrim();   // the picker → the calendar
await assertOverlay('  …scrim leaves the picker, popup still open', '02.1-date-time-sheet');
await tapScrim();   // → closed
await assertAt('calendar closed', '02-appointment-details');
await assertOverlay('  …overlay gone', null);
{
  const t = await pillState('time');
  check('  …time picked: pill reads the calendar value, error gone', /^[A-Z][a-z]{2,4} \d{1,2}, \d{1,2}:\d{2} (AM|PM)$/.test(t.value ?? '') && !t.error, JSON.stringify(t));
}
// UX-LOOP R1-U-11 / round 9: no need-by yet → the request stays inert
// until a need-by day is picked (round 16: the need-by calendar's earliest
// day is the day AFTER the visit; a day alone is a valid need-by).
const needByError = () => page.evaluate(() => !!document.querySelector('.filter-pill--error'));
await page.click('[data-act="request"]');
await assertAt('Request Tailor, no need-by yet', '02-appointment-details');
await assertOverlay('  …no payment sheet', null);
{
  const n = await pillState('needby');
  check('  …need-by pill errors "Select a need-by time"', n.error && n.help === 'Select a need-by time' && n.value === 'Select Time', JSON.stringify(n));
}
await page.click('[data-act="needby"]');
await assertOverlay('  …need-by calendar overlays', '02.1-date-time-sheet');
check('  …the visit day itself is not selectable for the need-by', !(await selectable(dayKey(VISIT))) && await selectable(dayKey(VISIT + 1)));
/** Pick a need-by `days` after the visit and close the popup. */
const moveNeedBy = async (days) => { const ok = await pickDay(dayKey(VISIT + days)); await tapScrim(); return ok; };
check('need-by the day after the visit picked', await moveNeedBy(1));
await assertOverlay('  …need-by calendar closed', null);
console.log(`${!await needByError() ? 'PASS' : 'FAIL'}  need-by after appointment clears`);
if (await needByError()) failures++;
// round 16 (Kevin): the rush fee is a LADDER by calendar days between the
// visit and the need-by — +$150 / +$100 / +$50 for 1 / 2 / 3 days, nothing
// from 4 on; the row (captioned) sits after the Concierge fee, in the total,
// paid at handoff; the Reserve CTA still carries only the Concierge fee.
{
  const rows02 = () => page.evaluate(() => ({ descs: [...document.querySelectorAll('[data-garments] .fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), fees: [...document.querySelectorAll('[data-garments] .fee-row__price')].map((e) => e.textContent.trim()).join(' '), captions: [...document.querySelectorAll('[data-garments] .fee-row__caption')].map((e) => e.textContent.trim()), cta: document.querySelector('[data-act="request"]')?.textContent.trim(), needBy: window.Taily.state.appt.needBy }));
  const RUSH_DESCS = 'Alterations (est.) | Concierge fee - Due Today | Rush fee | Total';
  let r = await rows02();
  check(`02 rush: need-by the day after → Rush fee ${$(RUSH)} row, total +${$(RUSH)}, CTA keeps ${$(CB.fee)} (round 16 ladder)`, r.descs === RUSH_DESCS && r.fees === fees(CB.alt, CB.fee, RUSH, CB.alt + CB.fee + RUSH) && r.captions[2] === rushCap(1) && r.cta === `Reserve Appt · ${$(CB.fee)}`, JSON.stringify(r));
  for (const days of [2, 3]) {
    const step = RUSH_LADDER_STEPS[days - 1];
    await page.click('[data-act="needby"]');
    await assertOverlay('  …need-by calendar reopens', '02.1-date-time-sheet');
    await moveNeedBy(days);
    r = await rows02();
    check(`  …${days} days out: Rush fee ${$(step)}, caption "${rushCap(days)}"`, r.descs === RUSH_DESCS && r.fees === fees(CB.alt, CB.fee, step, CB.alt + CB.fee + step) && r.captions[2] === rushCap(days), JSON.stringify(r));
  }
  await page.click('[data-act="needby"]');
  await assertOverlay('  …need-by calendar reopens', '02.1-date-time-sheet');
  await moveNeedBy(4);
  r = await rows02();
  check('  …four days out: no rush row, the three captions', r.descs === 'Alterations (est.) | Concierge fee - Due Today | Total' && r.captions.join('|') === [CAPTION.alterations, CAPTION.visit, CAPTION.handoff].join('|'), JSON.stringify(r));
}
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
    badges: document.querySelectorAll('[data-s="03-status-requested"] .trust-line .trust-badge').length,
  }));
  const document_hasMarco = r.hasMarco; const document_badges = r.badges;
  check('requestTailor leaves the tailor unnamed', r.a.name === null && r.a.initials === null && r.a.tailorId === null && r.a.matching === true, JSON.stringify(r.a));
  /* R6: the frame's request card has no name row — the customer sees NO tailor name before matching */
  check('03/Requested card shows no tailor name before matching', r.name === undefined && !document_hasMarco, `name="${r.name}"`);
  check('03/Requested hero ends in the Taily-verified line + badges (round 14; the demo tap lives on it)', r.line === 'All Taily-verified tailors are:' && document_badges === 3, `"${r.line}" badges=${document_badges}`);
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
// R7: "… · $50 Concierge fee held" — the fee is HELD until a tailor accepts
{
  const rows = await page.evaluate(() => [...document.querySelectorAll('.meta-row span:last-child')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  const a = await page.evaluate(() => { const x = window.Taily.state.upcoming[0]; return { alt: x.totals.alterations, fee: x.totals.visitFee, n: x.count, held: x.feeHeld, chargedOn: x.feeChargedOn ?? null, hasDeposit: 'deposit' in x.totals }; });
  /* round 10 (Kevin): the fee has its own row under the items / estimate */
  check('03/Requested rows read the appointment', rows[0] === '88 Leonard St, 4B — Home Visit' && /^\w{3}, \w{3,4} \d{1,2} · \d{1,2}:\d{2} [AP]M$/.test(rows[1]) && rows[2] === `${a.n} item · $${a.alt}.00+ est.` && rows[3] === `$${a.fee} Concierge fee`, rows.join(' | '));
  check(`requestTailor holds the ${$(CB.fee)} fee (1 item, round 12), nothing charged`, a.fee === CB.fee && a.held === true && a.chargedOn === null && !a.hasDeposit, JSON.stringify(a));
  const cancelLine = await page.evaluate(() => document.querySelector('[data-act="cancel"]')?.textContent.trim());
  check('03/Requested cancel line: nothing has been charged', cancelLine === 'Cancel request — nothing has been charged', `"${cancelLine}"`);
}
await page.click('[data-act="map"]');                 // demo: tailor accepts
await assertAt('tailor accepts', '03-status-confirmed', 'confirmed');
// R7: acceptance CHARGES the held fee (feeChargedOn dates the rows)
{
  const r = await page.evaluate(() => { const x = window.Taily.state.upcoming[0]; return { held: x.feeHeld, chargedOn: x.feeChargedOn ?? null, locked: !!x.feeLocked, fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()), captions: [...document.querySelectorAll('.fee-row__caption')].map((e) => e.textContent.trim()) }; });
  check('tailorAccepts charges the fee (feeChargedOn, hold released)', r.held === false && /^\d{1,2}\/\d{1,2}\/\d{2}$/.test(r.chargedOn ?? '') && !r.locked, JSON.stringify({ held: r.held, chargedOn: r.chargedOn }));
  check('03/Confirmed rows: Alterations (est.) / Concierge fee - Due Today / Total (round 16)', r.fees === fees(CB.alt, CB.fee, CB.total) && r.descs.join(' | ') === 'Alterations (est.) | Concierge fee - Due Today | Total', `${r.fees} | ${r.descs.join(' | ')}`);
  check('03/Confirmed captions: est. / fee / alterations paid at delivery', r.captions.join('|') === [CAPTION.alterations, CAPTION.visit, CAPTION.handoff].join('|'), r.captions.join('|'));
}
// R6: acceptance names Marco everywhere
{
  const r = await page.evaluate(() => ({
    a: (({ name, initials, tailorId, matching }) => ({ name, initials, tailorId, matching }))(window.Taily.state.upcoming[0]),
    card: document.querySelector('.trust-card__name')?.textContent.trim(),
    avatar: document.querySelector('.trust-card__verified')?.textContent.trim(),
  }));
  check('tailorAccepts names Marco (MT · marco)', r.a.name === 'Marco Tailor' && r.a.initials === 'MT' && r.a.tailorId === 'marco' && r.a.matching === false, JSON.stringify(r.a));
  check('03/Confirmed profile card reads Marco Tailor · ✓ Taily-verified (round 14)', r.card === 'Marco Tailor' && r.avatar === '✓ Taily-verified', `card="${r.card}" avatar="${r.avatar}"`);
}
// UX-LOOP R1-U-01: the tailor card is the demo "day before" → reminder
await page.click('.status-hero__title');   // round 14: the demo moved off the tailor card (which opens 03.4)
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
  check('03/Reminder "Before you confirm" callout before Confirm (R7-U-01)', r.title === '! Before you confirm' && r.body === `Confirming makes your ${$(CB.fee)} Concierge fee non-refundable — no-shows included. Cancel before confirming and it’s refunded in full.` && r.inActions && r.beforeConfirm && r.card && r.pill === 'Confirmed', JSON.stringify(r));
  check('  …body-size ink copy, not fine print', r.size === '16px' && r.ink === 'rgb(28, 27, 24)', `${r.size} ${r.ink}`);
}
// Phase R2: Reschedule / Cancel opens the R1 popup; Go Back dismisses
await page.click('[data-act="reschedule"]');
await assertOverlay('  …R1 popup overlays', '03.1-reschedule-popup');
{
  const rows = await page.evaluate(() => [...document.querySelectorAll('.screen-sheet--overlay .modal__row')].map((e) => [...e.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join(' ')));
  check('03.1 row before confirming: fee refunded', rows[1] === `✓ Your ${$(CB.fee)} Concierge fee is refunded`, rows[1]);
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
  check('03.2 row 2: fee now non-refundable (R7-U-01)', rows.length === 3 && rows[1] === `! Your ${$(CB.fee)} Concierge fee is now non-refundable.` && /^✓ Marco will message/.test(rows[0]) && /^! Please prepare/.test(rows[2]), rows.join(' | '));
}
await page.click('[data-act="confirm-appt"]');        // appointment happens
await page.waitForTimeout(400);
// Phase R0: 06 - Order Status was deleted; 04D (Appointment Status)
// takes its place, and tapping the order opens the modified review (06B).
/* round 10 (Kevin): the final order awaits approval → 04 IS the screen */
await assertAt('appointment done → 04/Modified directly', '04-review-approve-modified', 'awaiting-approval');
await assertScrolls('page scrolls after 03.2 confirm');
// R7: 03.2's Confirm ran confirmAppointment() first — the fee is locked
{
  const r = await page.evaluate(() => { const x = window.Taily.state.upcoming[0]; return { locked: x.feeLocked, at: x.confirmedAt ?? null, fee: x.totals.visitFee, charged: x.totals.visitFeeCharged, added: x.totals.visitFeeAdded, alt: x.totals.alterations, total: x.totals.total, items: x.totals.items }; });
  check('confirmAppointment locked the fee (confirmedAt, feeLocked)', r.locked === true && !!r.at, JSON.stringify({ locked: r.locked, at: r.at }));
  check(`final order (2 items) keeps the ${$(CF.fee)} tier: ${$(CF.alt)} + ${$(CF.fee)} = ${$(CF.total)} (round 12)`, r.items === CF.items && r.alt === CF.alt && r.fee === CF.fee && r.charged === CF.charged && r.added === CF.added && r.total === CF.total, JSON.stringify(r));
  const rows = await page.evaluate(() => ({ fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), chargedOn: window.Taily.state.upcoming[0].feeChargedOn }));
  check('03/Tailoring rows: Alterations / Concierge fee - Paid <date> / Total / Due at delivery', rows.fees === fees(CF.alt, CF.fee, CF.total, CF.due) && rows.descs === `Alterations | Concierge fee - Paid ${rows.chargedOn} | Total | Due at delivery`, `${rows.fees} | ${rows.descs}`);
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
  await assertAt('03/Confirmed for a post-visit entry → 04 (awaiting approval)', '04-review-approve-modified', 'awaiting-approval');
  await page.evaluate(() => window.Taily.render('03-status-reminder'));
  await assertAt('03/Reminder for a post-visit entry → 04 (awaiting approval)', '04-review-approve-modified', 'awaiting-approval');
  await page.evaluate(() => window.Taily.render('03-status-tailoring'));
  await assertAt('03/Tailoring for an awaiting-approval entry → 04 (round 10)', '04-review-approve-modified', 'awaiting-approval');
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
  await assertAt('  …still on 04', '04-review-approve-modified', 'awaiting-approval');
}
// UX-LOOP R2-U-08: the card follows the final order once revised
const cardCount = await page.evaluate(() => { window.Taily.render('01-home'); return document.querySelector('.card-list__title')?.textContent ?? ''; });
check('card count follows the final order', /^2 Items Total/.test(cardCount), `"${cardCount}"`);
await page.evaluate(() => window.Taily.render('04-review-approve-modified'));
await page.waitForTimeout(200);
// Phase R2: tapping a Before/Pinned photo opens the PV3 viewer (on 04 too)
await page.click('.photo-row');
await assertOverlay('  …PV3 viewer overlays', '03.3-photo-viewer');
await page.click('[data-act="pv-close"]');
await page.waitForTimeout(400);
await assertOverlay('  …viewer gone', null);
// round 10 (Kevin): one approve screen — no Review Final Order hop, no View All
await assertAt('the approve screen', '04-review-approve-modified', 'awaiting-approval');
{
  const ctas = await page.evaluate(() => [...document.querySelectorAll('.cta-bar .cta')].map((b) => b.textContent.trim()));
  check('04 CTAs: Approve Final Order / Request Changes only (round 10)', ctas.join(' | ') === 'Approve Final Order | Request Changes', ctas.join(' | '));
}
// R7: 04 prices the final order — no deposit, the fee already paid
{
  const rows = await page.evaluate(() => ({ fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), info: document.querySelectorAll('.fee-row--changed').length, text: document.querySelector('[data-s]')?.textContent ?? '', chargedOn: window.Taily.state.upcoming[0].feeChargedOn }));
  check(`04/Modified rows: ${$(CF.alt)} / ${$(CF.fee)} paid / ${$(CF.total)} / due ${$(CF.due)}`, rows.fees === fees(CF.alt, CF.fee, CF.total, CF.due) && rows.descs === `Alterations | Concierge fee - Paid ${rows.chargedOn} | Total | Due at delivery` && rows.info === 3, `${rows.fees} | ${rows.descs} info=${rows.info}`);
  check('04 never says deposit / 10% / Taily fee / Balance', !/deposit|10%|Taily fee|Balance/i.test(rows.text));
}
// Phase R2: Request Changes opens the RC1 popup. Round 12 (Kevin): Sounds
// Good only closes it — new copy, no chat, nothing stamped for the tailor.
await page.click('[data-act="changes"]');
await assertOverlay('  …RC1 popup overlays', '04.1-request-changes');
{
  const body = await page.evaluate(() => document.querySelector('.screen-sheet--overlay .modal__body')?.textContent.trim());
  check('  …04.1 copy (round 12)', body === 'Please work together with Marco to review your order.Tailoring prices are standardized and non-adjustable.', JSON.stringify(body));
}
await page.click('[data-act="sounds-good"]');
await page.waitForTimeout(400);
await assertOverlay('  …popup gone', null);
await assertAt('Sounds Good just closes the popup (round 12)', '04-review-approve-modified', 'awaiting-approval');
check('  …nothing stamped on the appointment', !(await page.evaluate(() => window.Taily.state.upcoming[0]?.changesRequestedAt)));
// Phase R4/R5: approving lands back on 04D as 'tailoring'. Tapping the
// order simulates the TAILOR finishing (markReady) — the user stays on
// 04D (card flips to Ready) and reaches 05 via the appointment card's
// Schedule Delivery (round 16: delivery is the only handoff).
await page.click('[data-act="approve"]');
await assertAt('approve order', '03-status-tailoring', 'tailoring');
// UX-LOOP R2-U-11: the LIVE tailoring state leads with Message Marco
const tailoringCtas = await page.evaluate(() => [...document.querySelectorAll('.cta-bar .cta')].map((b) => b.textContent.trim()));
check('tailoring CTA bar (live): Message Marco only (round 10: no View All)', tailoringCtas.join(' | ') === 'Message Marco', tailoringCtas.join(' | '));
await page.click('[data-act="review"] .fee-row');
await assertAt('tailor marks ready', '03-status-tailoring', 'ready-for-pickup');
{
  const r = await page.evaluate(() => ({ title: document.querySelector('.status-hero__title')?.textContent.trim(), ctas: [...document.querySelectorAll('.cta-bar .cta')].map((b) => b.textContent.trim()) }));
  check('03/Tailoring ready hero: Your items are ready. + Schedule Delivery (round 16)', r.title === 'Your items are ready.' && r.ctas[0] === 'Schedule Delivery', JSON.stringify(r));
}
await page.evaluate(() => window.Taily.render('01-home'));
await page.waitForTimeout(200);
await page.evaluate(() => {
  [...document.querySelectorAll('.appt-card .cta-small')]
    .find((b) => b.textContent.trim() === 'Schedule Delivery')?.click();
});
await assertAt('Schedule Delivery', '05-items-ready', 'ready-for-pickup');
// round 16 (Kevin): 05 is the inline delivery calendar — the month the items
// were ready, the ready day inked "Today", Preferred Time empty, the visit
// address prefilled; Confirm needs a day, then a time.
const READY = await page.evaluate(async () => { const D = await import('/js/data.js'); const a = window.Taily.state.upcoming[0]; const d = D.parseWhen(a.readyAt).date; return { key: `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`, day: D.fmtDay(a.readyAt), mdy: D.mdy(a.readyAt), date: `${d.toLocaleString('en-US', { month: 'short' })} ${d.getDate()}` }; });
{
  const r = await page.evaluate(() => ({ month: document.querySelector('[data-s="05-items-ready"] [data-calendar]')?.dataset.month, today: document.querySelector('[data-s="05-items-ready"] .cal-cell--selected')?.dataset.day, sub: document.querySelector('[data-s="05-items-ready"] .cal-cell--selected .cal-cell__sub')?.textContent.trim(), time: document.querySelector('[data-cal-time] .calendar__value')?.textContent.trim(), address: document.querySelector('[data-cal-address] .calendar__value')?.textContent.trim(), ctas: [...document.querySelectorAll('[data-s="05-items-ready"] .actions .cta')].map((b) => b.textContent.trim()) }));
  check('05 delivery calendar: ready month, ready day = Today, Select Time, the address prefilled, Confirm Delivery / Message Marco', r.month === READY.key.replace(/-\d+$/, '-1') && r.today === READY.key && r.sub === 'Today' && r.time === 'Select Time' && /88 Leonard St/.test(r.address ?? '') && r.ctas.join(' | ') === 'Confirm Delivery | Message Marco', JSON.stringify({ ...r, ready: READY.key }));
}
const toastText = () => page.evaluate(() => document.querySelector('.toast')?.textContent.trim());
await page.click('[data-act="confirm"]');
await assertAt('Confirm with no day: stays on 05', '05-items-ready', 'ready-for-pickup');
check('  …toast asks for a delivery day', await toastText() === 'Please select a delivery day', await toastText());
check('05 delivery day picked (the ready day)', await pickDay(READY.key, '[data-s="05-items-ready"]'));
await page.click('[data-act="confirm"]');
await assertAt('Confirm with no time: stays on 05', '05-items-ready', 'ready-for-pickup');
{
  const err = await page.evaluate(() => document.querySelector('[data-cal-time] .calendar__error')?.textContent.trim());
  check('  …Preferred Time row errors', err === 'Please select a delivery time', JSON.stringify(err));
}
await setPickerTime(8, 0, 1, '[data-s="05-items-ready"]');   // 5:00 PM
await assertOverlay('  …time picker modal', '05-time-picker');
await tapScrim();
await assertOverlay('  …picker closed', null);
check('  …Preferred Time reads 5:00 PM', await page.evaluate(() => document.querySelector('[data-cal-time] .calendar__value')?.textContent.trim()) === '5:00 PM');
const WINDOW = `${READY.day} · 5:00 PM`;
await page.click('[data-act="confirm"]');
await assertOverlay('Confirm Delivery → 05.1 popup', '05.1-confirm-delivery');
{
  const r = await page.evaluate(() => ({ rows: [...document.querySelectorAll('.screen-sheet--overlay .detail-row')].map((e) => [...e.children].map((c) => c.textContent.trim()).join('=')), ctas: [...document.querySelectorAll('.screen-sheet--overlay .cta')].map((b) => b.textContent.trim()) }));
  check('05.1 When / Where / Items + Confirm / Edit Details', r.rows[0] === `When=${WINDOW}` && /^Where=88 Leonard St/.test(r.rows[1] ?? '') && r.rows[2] === `Items=${CF.items} items` && r.ctas.join(' | ') === 'Confirm | Edit Details', JSON.stringify(r));
}
await page.click('.screen-sheet--overlay [data-act="edit-delivery"]');
await page.waitForTimeout(500);
await assertOverlay('  …Edit Details closes the popup', null);
check('  …nothing stored yet', !(await page.evaluate(() => window.Taily.state.upcoming[0].fulfilment)));
await page.click('[data-act="confirm"]');
await assertOverlay('  …Confirm Delivery again → 05.1', '05.1-confirm-delivery');
await page.click('.screen-sheet--overlay [data-act="confirm-delivery"]');
await assertOverlay('05.1 Confirm → 05.2 popup', '05.2-delivery-confirmed');
{
  const r = await page.evaluate(() => { const a = window.Taily.state.upcoming[0]; return { title: document.querySelector('.screen-sheet--overlay .modal__title')?.textContent.trim(), f: a.fulfilment, total: a.totals.total, delivery: a.totals.delivery }; });
  check('05.2 "Delivery confirmed." + chooseFulfilment(delivery, window, date, address); totals unchanged', r.title === 'Delivery confirmed.' && r.f?.method === 'delivery' && r.f.window === WINDOW && r.f.date === READY.date && /88 Leonard St/.test(r.f.address ?? '') && r.total === CF.total && r.delivery === 0, JSON.stringify(r));
}
await page.click('.screen-sheet--overlay [data-act="window-done"]');
await assertAt('Done → 03/Delivery Scheduled (still ready)', '03-status-delivery-scheduled', 'ready-for-pickup');
await assertScrolls('page scrolls after 05.2 Done');
{
  const r = await page.evaluate(() => ({ pill: document.querySelector('.status-hero .pill span:last-child')?.textContent.trim(), title: document.querySelector('.status-hero__title')?.textContent.trim(), block: document.querySelector('.visit-block__title')?.textContent.trim(), rows: [...document.querySelectorAll('.visit-block__row')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()), cards: document.querySelectorAll('.garment-card').length, fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), chargedOn: window.Taily.state.upcoming[0].feeChargedOn }));
  check('03/Delivery Scheduled: Ready pill, Delivery Details (address + window), PostAppt cards, rows', r.pill === 'Ready' && r.title === 'Delivery Scheduled' && r.block === 'Delivery Details' && /88 Leonard St/.test(r.rows[0] ?? '') && (r.rows[1] ?? '').endsWith(WINDOW) && r.cards === CF.items && r.fees === fees(CF.alt, CF.fee, CF.total, CF.due) && r.descs === `Alterations | Concierge fee - Paid ${r.chargedOn} | Total | Due at delivery`, JSON.stringify(r));
}
await page.evaluate(() => window.Taily.render('01-home'));
await page.waitForTimeout(200);
// UX-LOOP R2-U-02: the stored window carries its date (card meta); the card CTA flips to Change Delivery
{
  const r = await page.evaluate(() => ({ meta: document.querySelector('.appt-card__meta')?.textContent.trim() ?? '', cta: document.querySelector('.appt-card .cta-small')?.textContent.trim() }));
  check('01 ready card: Delivery: <dated window> + Change Delivery', r.meta === `Delivery: ${WINDOW}` && r.cta === 'Change Delivery', JSON.stringify(r));
}
await page.click('.appt-card');
await assertAt('scheduled card opens 03/Delivery Scheduled (statusScreen)', '03-status-delivery-scheduled', 'ready-for-pickup');
// the courier hands the items over (deliver) → 06
await page.evaluate(async () => { const S = await import('/js/state.js'); S.deliver(window.Taily.state.upcoming[0]); window.Taily.render('06-journey-complete'); });
await assertAt('delivered → 06', '06-journey-complete', 'delivered');
// receipt (round 16): Alterations / Concierge fee - Paid <date> / Total / Paid at delivery <date>; a Delivered row; no Back, no pill
{
  const r = await page.evaluate(() => { const x = window.Taily.state.upcoming[0]; return { fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()), captions: [...document.querySelectorAll('.fee-row__caption')].map((e) => e.textContent.trim()), chargedOn: x.feeChargedOn, deliveredAt: x.deliveredAt, delivery: x.totals.delivery, total: x.totals.total, rows: [...document.querySelectorAll('.visit-block__row')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()), back: !!document.querySelector('[data-act="back"]'), pill: !!document.querySelector('.status-hero .pill') }; });
  check(`06 receipt rows: ${$(CF.alt)} / ${$(CF.fee)} / ${$(CF.total)} / ${$(CF.due)} paid`, r.fees === fees(CF.alt, CF.fee, CF.total, CF.due) && r.delivery === 0 && r.total === CF.total, `${r.fees} delivery=${r.delivery} total=${r.total}`);
  check('06 receipt descs', r.descs[0] === 'Alterations' && r.descs[1] === `Concierge fee - Paid ${r.chargedOn}` && r.descs[2] === 'Total' && r.descs[3] === `Paid at delivery ${READY.mdy}`, r.descs.join(' | '));
  check('06 receipt captions: final / fee', r.captions.join('|') === [CAPTION.final, CAPTION.visit].join('|'), r.captions.join('|'));
  check('06 visit block: Delivered row = the window; deliveredAt stamped; no Back, no pill', r.deliveredAt === WINDOW && (r.rows[2] ?? '').endsWith(`Delivered: ${WINDOW}`) && !r.back && !r.pill, JSON.stringify({ deliveredAt: r.deliveredAt, rows: r.rows, back: r.back, pill: r.pill }));
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
// Round 12 (Kevin): five stars by default; Confirm turns the sheet into
// "Review Submitted" (check + title), gone after 2 s or on a tap anywhere.
await page.click('[data-act="confirm-review"]');
await page.waitForTimeout(300);
await assertOverlay('  …sheet becomes Review Submitted (round 12)', '06.1-leave-review');
check('  …submitted sheet: check + title, no stars / input / CTA', await page.evaluate(() => !!document.querySelector('[data-submitted]') && document.querySelector('.review-sheet__title')?.textContent === 'Review Submitted' && !!document.querySelector('.review-sheet__check') && !document.querySelector('[data-star]') && !document.querySelector('[data-act="confirm-review"]')));
await page.click('.modal-scrim');   // a tap anywhere dismisses it
await page.waitForTimeout(400);
await assertOverlay('  …review sheet gone (tapped)', null);
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
  await page.waitForTimeout(300);
  await assertOverlay('  …Review Submitted (round 12)', '06.1-leave-review');
  await page.waitForTimeout(2300);   // auto-dismisses after 2 s
  await assertOverlay('  …review sheet gone by itself', null);
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
/* round 15: the happy path books two days out (a next-day need-by is a rush
   now) — pull the need-by to the next day here so the R4-U-03 cap case holds */
await page.evaluate(async () => { const D = await import('/js/data.js'); const a = window.Taily.state.upcoming[0]; a.needBy = `${D.shiftDay(a.when, 1).replace(/^\w+, /, '')}, 9:30 AM`; });
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
   job for a new tailor. Round 7 (money model v2): the Concierge fee
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
  a.needBy = D.shiftDay(a.when, 4);   // round 16: a re-request of this visit must not stamp a rush (2 days = $100)
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
    && rows[1] === `✓ Your $${far.fee} Concierge fee is refunded` && rows[2] === '↻ Your items and time are kept — we’ll find you a new tailor', rows.join(' | '));
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
  check('  …03/Cancelled: refunded body + Refunded row', r.title === 'Appointment Cancelled' && r.body === `Your $${far.fee} Concierge fee is refunded to Apple Pay.` && r.desc === 'Concierge fee - Refunded' && r.card === 'Marco Tailor', JSON.stringify(r));
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
  check('03.1 row after confirming: fee non-refundable', rows[1] === `✕ Your $${near.fee} Concierge fee is non-refundable (you confirmed the visit)`, rows[1]);
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
  check('  …03/Cancelled: kept body + Kept row, no Total (R7-U-04)', r.body === `Your $${near.fee} Concierge fee was kept — you had confirmed the visit.` && r.desc === 'Concierge fee - Kept' && r.fees === fees(CB.alt, CB.fee) && r.refundCard === 0, JSON.stringify(r));
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
await page.click('.status-hero__title');   // round 14: the demo moved off the tailor card (which opens 03.4)                    // the day before arrives
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
  check('autoCancelUnconfirmed: cancelled · none · unconfirmed · full refund', r.past.status === 'cancelled' && r.past.cancelledBy === 'none' && r.past.reason === 'unconfirmed' && r.past.refund === CB.fee && r.past.feeKept === false && r.past.wasRequested === false && r.stash, JSON.stringify(r.past));
  check('  …03/Cancelled unconfirmed body + Refunded row + Send Request Again', r.title === 'Appointment Cancelled' && r.body === `We didn’t hear back before the visit, so it was cancelled. Your ${$(CB.fee)} Concierge fee is refunded to Apple Pay.` && r.desc === 'Concierge fee - Refunded' && r.cta === 'Send Request Again', JSON.stringify({ title: r.title, body: r.body, desc: r.desc, cta: r.cta }));
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
    await page.evaluate(async (g) => { const D = await import('/js/data.js'); const s = window.Taily.state; s.garments = g; if (s.appt?.when) s.appt.needBy = D.shiftDay(s.appt.when, 4); /* round 16: no rush row in the tier probe */ window.Taily.render('02-appointment-details'); }, garments);
    await page.waitForTimeout(200);
    /* round 10 (Kevin): the fee card is gone — the garments card ends in money rows */
    return page.evaluate(() => ({ fees: [...document.querySelectorAll('[data-garments] .fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('[data-garments] .fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), captions: [...document.querySelectorAll('[data-garments] .fee-row__caption')].map((e) => e.textContent.trim()), notes: [...document.querySelectorAll('[data-garments] .fee-note')].map((e) => e.textContent.trim()), cards: document.querySelectorAll('[data-garments] .garment-card--flat').length, cta: document.querySelector('[data-act="request"]')?.textContent.trim() }));
  };
  const g = (n) => Array.from({ length: n }, () => ({ type: 'Shirt / Blouse', jobs: ['Hem / Adjust Length'], photos: 0 }));   // round 12: one card per item
  let r = await on02(g(2));
  /* round 15 (Kevin, 02 frame): the notes under the rows became the rows' captions — every tier, the same three */
  const CAPTIONS = [CAPTION.alterations, CAPTION.visit, CAPTION.handoff].join('|');
  const T = LIVE.tiers;   // n × $120 Hem → the fee tier for n items
  const T2 = T(2), T4 = T(4), T5 = T(5), T6 = T(6), T10 = T(10), T11 = T(11);
  check(`02 money rows, 2 items → ${$(T2.alt)} / ${$(T2.fee)} / ${$(T2.total)}, CTA Reserve Appt · ${$(T2.fee)} (round 12 tiers)`, r.fees === fees(T2.alt, T2.fee, T2.total) && r.descs === 'Alterations (est.) | Concierge fee - Due Today | Total' && r.captions.join('|') === CAPTIONS && r.notes.length === 0 && r.cta === `Reserve Appt · ${$(T2.fee)}`, JSON.stringify(r));
  check('  …the editable cards sit as flat rows inside the garments card (round 10)', r.cards === 2, `cards=${r.cards}`);
  r = await on02(g(4));
  check(`02 rows, 4 items → still ${$(T4.fee)}`, r.fees === fees(T4.alt, T4.fee, T4.total) && r.captions.join('|') === CAPTIONS, JSON.stringify(r));
  r = await on02(g(5));
  check(`02 rows, 5 items → ${$(T5.fee)}, same captions, CTA Reserve Appt · ${$(T5.fee)}`, r.fees === fees(T5.alt, T5.fee, T5.total) && r.captions.join('|') === CAPTIONS && r.notes.length === 0 && r.cta === `Reserve Appt · ${$(T5.fee)}`, JSON.stringify(r));
  r = await on02(g(6));   // round 12: one card per item — six cards, six items
  check(`02 rows, 6 items → ${$(T6.fee)}`, r.fees === fees(T6.alt, T6.fee, T6.total) && r.cta === `Reserve Appt · ${$(T6.fee)}`, JSON.stringify(r));
  r = await on02(g(10));
  check(`02 rows, 10 items → ${$(T10.fee)}`, r.fees === fees(T10.alt, T10.fee, T10.total), JSON.stringify(r));
  r = await on02(g(11));
  check(`02 rows, 11 items → ${$(T11.fee)}, same captions, CTA Reserve Appt · ${$(T11.fee)}`, r.fees === fees(T11.alt, T11.fee, T11.total) && r.captions.join('|') === CAPTIONS && r.notes.length === 0 && r.cta === `Reserve Appt · ${$(T11.fee)}`, JSON.stringify(r));
  // the payment sheet quotes the same fee
  await page.click('[data-act="request"]');
  await assertOverlay('  …payment sheet overlays', '02.3-payment-sheet');
  const sub = await page.evaluate(() => document.querySelector('.screen-sheet--overlay .sheet__sub')?.textContent.trim());
  check(`02.3 sub: Hold your ${$(T11.fee)} Concierge fee — charged when a tailor accepts…`, sub === `Hold your ${$(T11.fee)} Concierge fee — charged when a tailor accepts. Alterations are paid at pickup or delivery.`, `"${sub}"`);
  await page.click('.method-row');                    // Apple Pay
  await assertAt('  …11-item request sent', '03-status-requested', 'searching');
  const rows11 = await page.evaluate(() => [...document.querySelectorAll('.meta-row span:last-child')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  check(`03/Requested holds ${$(T11.fee)} for 11 items (own row, round 10)`, rows11[2] === `11 items · ${$(T11.alt)}.00+ est.` && rows11[3] === `${$(T11.fee)} Concierge fee`, rows11.join(' | '));
  const held = await page.evaluate(() => { const a = window.Taily.state.upcoming[0]; return { fee: a.totals.visitFee, charged: a.totals.visitFeeCharged, total: a.totals.total, held: a.feeHeld }; });
  check(`  …appointment totals: ${$(T11.alt)} + ${$(T11.fee)} = ${$(T11.total)}, held`, held.fee === T11.fee && held.charged === T11.charged && held.total === T11.total && held.held === true, JSON.stringify(held));
  // withdraw it (nothing charged) so the next probes start clean
  await page.click('[data-act="cancel"]');
  await assertOverlay('  …R1 popup (cancel mode)', '03.1-reschedule-popup');
  await page.click('[data-act="confirm-reschedule"]');
  await assertAt('  …withdrawn → 03/Cancelled', '03-status-cancelled');
  const w = await page.evaluate(() => ({ refund: window.Taily.state.past[0].refund, kept: window.Taily.state.past[0].feeKept, rows: document.querySelectorAll('.fee-row').length, body: document.body.textContent.includes('Nothing was charged') }));
  check(`  …withdrawn request: hold released (${$(T11.fee)} back), no fee rows`, w.refund === T11.fee && w.kept === false && w.rows === 0 && w.body, JSON.stringify(w));
  await page.evaluate(() => { const s = window.Taily.state; s.garments = []; s.ui.homeSelection = {}; });
}

/* ---- R7: the fitting re-tiers the fee (4 booked → 5 final) — the
   customer sees "Additional Concierge fee" on 04, owes it at handoff,
   and the receipts carry it ---- */
{
  const r = await page.evaluate(async () => {
    const S = await import('/js/state.js'); const D = await import('/js/data.js');
    const s = window.Taily.state;
    s.garments = Array.from({ length: 4 }, () => ({ type: 'Suit Jacket', jobs: ['Sleeve / Adjust Length'], photos: 0 }));
    s.appt.when = D.shiftDay(new Date().toDateString(), 3).replace(/^\w+, /, '') + ', 10:00 AM';
    s.appt.needBy = D.shiftDay(s.appt.when, 4);   // round 16: 3 days out would be a $50 rush
    const a = S.requestTailor();
    const booked = { fee: a.totals.visitFee, items: a.totals.items, total: a.totals.total };
    S.tailorAccepts(a); S.confirmAppointment(a); S.draftFinalOrder(a); S.completeAppointment(a);
    return { booked, final: { fee: a.totals.visitFee, charged: a.totals.visitFeeCharged, added: a.totals.visitFeeAdded, items: a.totals.items, alt: a.totals.alterations, total: a.totals.total }, status: a.status };
  });
  check(`4 booked items hold ${$(RB.fee)} (${$(RB.alt)} + ${$(RB.fee)} = ${$(RB.total)}, round 12)`, r.booked.fee === RB.fee && r.booked.items === RB.items && r.booked.total === RB.total, JSON.stringify(r.booked));
  check(`the fitting adds a 5th item (+Hem, +jacket) → ${$(RF.fee)} tier: charged ${$(RF.charged)}, added ${$(RF.added)}`, r.final.items === RF.items && r.final.charged === RF.charged && r.final.fee === RF.fee && r.final.added === RF.added && r.final.alt === RF.alt && r.final.total === RF.total && r.status === 'awaiting-approval', JSON.stringify(r.final));
  await page.evaluate(() => window.Taily.render('04-review-approve-modified'));
  await page.waitForTimeout(200);
  const rows = await page.evaluate(() => ({ fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), info: document.querySelectorAll('.fee-row--changed').length }));
  // Round 16 (Kevin): ONE fee row — "Concierge fee (5+ items)" at the new tier, its caption the explanation (no separate note)
  const TIER_NOTE = `Your order grew to 5 items, so the Concierge fee is now ${$(RF.fee)}. The extra ${$(RF.added)} is charged with your alterations at handoff.`;
  const RETIER_DESCS = 'Alterations | Concierge fee (5+ items) | Total | Due at delivery';
  const tierNote = () => page.evaluate(() => [...document.querySelectorAll('.fee-row')].map((r) => r.querySelector('.fee-row__caption')?.textContent.trim() ?? '').find((c) => /^Your order grew/.test(c)) ?? null);
  check(`04/Modified re-tiered: ${$(RF.alt)} / ${$(RF.fee)} Concierge fee (5+ items) (one row, info) / ${$(RF.total)} / due ${$(RF.due)}`, rows.fees === fees(RF.alt, RF.fee, RF.total, RF.due) && rows.descs === RETIER_DESCS && rows.info === 4, `${rows.fees} | ${rows.descs} info=${rows.info}`);
  {
    const n = await tierNote();
    check('04/Modified fee row caption explains the re-tier (round 16)', n === TIER_NOTE && !(await page.evaluate(() => !!document.querySelector('[data-fee-tier-note]'))), `"${n}"`);
    await page.evaluate(() => window.Taily.render('03-status-tailoring'));
    await page.waitForTimeout(200);
    const t = await page.evaluate(() => ({ descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | ') }));
    const tn = await tierNote();
    check('03/Tailoring (awaiting) carries the same row + caption', t.descs === RETIER_DESCS && tn === TIER_NOTE, `${t.descs} | "${tn}"`);
  }
  // round 16: delivery only — the scheduled order keeps the one re-tiered row; the receipt prices it once, no delivery charge
  await page.evaluate(async () => { const S = await import('/js/state.js'); const a = window.Taily.state.upcoming[0]; S.approveOrder(a); S.markReady(a); S.chooseFulfilment('delivery', 'Fri, Jul 17 · 4:00 PM', 'Jul 17', a, '88 Leonard St, 4B, 10013'); window.Taily.render('03-status-delivery-scheduled'); });
  await page.waitForTimeout(200);
  const sched = await page.evaluate(() => ({ fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | ') }));
  check(`03/Delivery Scheduled (re-tiered): ${$(RF.alt)} / ${$(RF.fee)} / ${$(RF.total)} / due ${$(RF.due)} (alterations + the ${$(RF.added)} fee difference)`, sched.fees === fees(RF.alt, RF.fee, RF.total, RF.due) && sched.descs === RETIER_DESCS, `${sched.fees} | ${sched.descs}`);
  const rc = await page.evaluate(async () => {
    const S = await import('/js/state.js'); const a = window.Taily.state.upcoming[0];
    S.deliver(a);
    window.Taily.render('06-journey-complete');
    await new Promise((r) => setTimeout(r, 200));
    return { delivery: a.totals.delivery, total: a.totals.total, fees: [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent.trim()).join(' '), descs: [...document.querySelectorAll('.fee-row__desc')].map((e) => e.textContent.trim()).join(' | '), chargedOn: a.feeChargedOn };
  });
  check(`chooseFulfilment(delivery) leaves the totals alone (${$(RF.total)}, no delivery charge — round 16)`, rc.delivery === 0 && rc.total === RF.total, JSON.stringify({ delivery: rc.delivery, total: rc.total }));
  check(`06 receipt (re-tiered): one fee row at ${$(RF.fee)} — ${$(RF.alt)} / ${$(RF.fee)} / ${$(RF.total)} / paid ${$(RF.due)}`, rc.fees === fees(RF.alt, RF.fee, RF.total, RF.due) && rc.descs === `Alterations | Concierge fee (5+ items) - Paid ${rc.chargedOn} | Total | Paid at delivery 7/17/26` && !(await page.evaluate(() => !!document.querySelector('[data-fee-tier-note]'))), `${rc.fees} | ${rc.descs}`);
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

// round 16 (Kevin): a decline is no longer terminal — the request goes back
// to matching (searching, no tailor, the hold kept), the customer sees
// 03/Requested again, and the next accept assigns the next tailor who has
// not declined.
await rebook('decline');
{
  const r = await page.evaluate(async () => { const m = await import('/js/state.js'); const a = m.state.upcoming[0]; m.declineAppointment(a); return { status: a.status, name: a.name, initials: a.initials, tailorId: a.tailorId, matching: a.matching, feeHeld: a.feeHeld, declinedBy: a.declinedBy, inUpcoming: m.state.upcoming.includes(a), terminal: m.TERMINAL_STATUSES }; });
  check('declineAppointment → back to searching, no tailor, hold kept, declinedBy [marco]', r.status === 'searching' && r.name == null && r.initials == null && r.tailorId == null && r.matching === true && r.feeHeld === true && r.declinedBy?.join() === 'marco' && r.inUpcoming && r.terminal.join() === 'cancelled,expired', JSON.stringify(r));
}
await page.evaluate(() => window.Taily.render('09-bookings'));
await page.waitForTimeout(300);
{
  const pills = await page.evaluate(() => [...document.querySelectorAll('.appt-card .pill span:last-child')].map((e) => e.textContent.trim()));
  check('09: no Declined card — the request lists as Requested', !pills.includes('Declined') && pills.includes('Requested'), pills.join(','));
}
await page.evaluate(() => [...document.querySelectorAll('.appt-card')].find((c) => c.querySelector('.pill span:last-child')?.textContent.trim() === 'Requested')?.querySelector('.appt-card__name')?.click());
await assertAt('requested card → 03/Requested (matching again)', '03-status-requested', 'searching');
{
  const body = await page.evaluate(() => document.querySelector('.status-hero__body')?.textContent.replace(/\s+/g, ' ').trim());
  check('  …03/Requested copy (round 16)', body === 'We’re matching your job with a Taily-verified tailor near you. Most matches happen within the same day, and we’ll notify you as soon as a tailor accepts.', JSON.stringify(body));
}
{
  const r = await page.evaluate(async () => { const m = await import('/js/state.js'); const a = m.state.upcoming[0]; m.tailorAccepts(a); return { name: a.name, tailorId: a.tailorId, status: a.status }; });
  check('  …the next accept assigns Jordan Tailor (Marco declined)', r.name === 'Jordan Tailor' && r.tailorId === 'jordan' && r.status === 'confirmed', JSON.stringify(r));
}

/* ---------- UX-LOOP round 8: cold deep links for the money-sync sibling frames ----------
   Each fixture route renders its round-7 live-only state on a cold load
   (before any navigation), and the base deep links render as before —
   the routes exist ahead of their scripts/screens.json entries. */
const R8_COLD = {
  '03-status-reminder-locked': { pill: 'Confirmed · fee non-refundable', title: 'Please Confirm Tomorrow’s Appointment', callout: false, fees: `${$(SEED.alt)} Alterations (est.) | ${$(SEED.fee)} Concierge fee - Paid 7/7/26 | ${$(SEED.total)} Total` },
  '03-status-confirmed-locked': { pill: 'Confirmed · fee non-refundable', title: 'Appointment Confirmed', callout: false, fees: `${$(SEED.alt)} Alterations (est.) | ${$(SEED.fee)} Concierge fee - Paid 7/7/26 | ${$(SEED.total)} Total` },
  '03-status-unconfirmed': { pill: 'Cancelled', title: 'Appointment Cancelled', body: `We didn’t hear back before the visit, so it was cancelled. Your ${$(SEED.fee)} Concierge fee is refunded to Visa •••• 4242.`, fees: `${$(SEED.alt)} Alterations (est.) | ${$(SEED.fee)} Concierge fee - Refunded`, cta: 'Send Request Again' },
  '04-review-approve-retiered': { title: 'Approve your final order.', cards: 5, fees: `${$(RETIERED.alt)} Alterations | ${$(RETIERED.fee)} Concierge fee (5+ items) | ${$(RETIERED.total)} Total | ${$(RETIERED.due)} Due at delivery`, note: `Your order grew to 5 items, so the Concierge fee is now ${$(RETIERED.fee)}. The extra ${$(RETIERED.added)} is charged with your alterations at handoff.` },
  /* the bases, unchanged */
  '03-status-reminder': { pill: 'Confirmed', callout: true },
  '03-status-confirmed': { pill: 'Confirmed', callout: false },
  '03-status-cancelled': { pill: 'Cancelled', title: 'Appointment Cancelled', body: null },   // round 16: no Declined pill on the customer side (the frame still says Declined — raised)
  '04-review-approve-modified': { cards: 3, fees: `${$(FINAL.alt)} Alterations | ${$(FINAL.fee)} Concierge fee - Paid 7/7/26 | ${$(FINAL.total)} Total | ${$(FINAL.due)} Due at delivery`, note: null },
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
      note: [...document.querySelectorAll('.fee-row')].map((r) => r.querySelector('.fee-row__caption')?.textContent.trim() ?? '').find((c) => /^Your order grew/.test(c)) ?? null, cta: q('[data-act="rerequest"]'),
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
