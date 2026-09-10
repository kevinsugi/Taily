/* ============================================================
   Tailor click-through — Phase T, extended in UX-LOOP round 1.
   Drives Marco's path on the SAME appointment the user books:
     T01 → T02 (accept) → T03 → T01 → T03 pre-visit (Start Appointment)
     → T04 (edit the draft: +service, +garment → $360) → T05 (send
     writes the final order) → T06 (mark ready) → T07 (picked up) → T08,
   asserting screen id + state status; the decline branch (no default
   reason, T01 → T03A → declined); the customer-cancellation branch
   (03.1 popup → T01 Cancelled card → T03B); chat authorship across
   personas; T07 following a delivery choice; and one cross-persona
   check: user books on 02 → tailor accepts on T02 → user's card is
   Confirmed and opens 03/Confirmed.
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

let failures = 0;
const screenId = () => page.evaluate(() => document.getElementById('screen').dataset.screen);
const status = () => page.evaluate(() => (window.Taily.state.upcoming.find((a) => a.mine) ?? window.Taily.state.lastCancelled)?.status ?? '(none)');
const persona = () => page.evaluate(() => window.Taily.state.persona);
const text = (sel) => page.evaluate((q) => document.querySelector(q)?.textContent.trim() ?? null, sel);

async function assertAt(desc, expScreen, expStatus, expPersona) {
  await page.waitForTimeout(300);
  const s = await screenId(), st = await status(), p = await persona();
  const okS = s === expScreen;
  const okT = expStatus === undefined || st === expStatus;
  const okP = expPersona === undefined || p === expPersona;
  if (!okS || !okT || !okP) failures++;
  console.log(`${okS && okT && okP ? 'PASS' : 'FAIL'}  ${desc.padEnd(38)} screen=${s}${okS ? '' : ` (want ${expScreen})`}  status=${st}${okT ? '' : ` (want ${expStatus})`}${expPersona ? `  persona=${p}` : ''}`);
}
async function assertTrue(desc, fn) {
  const ok = await page.evaluate(fn);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc}`);
}
async function assertText(desc, sel, want) {
  const got = await text(sel);
  const ok = got === want;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc.padEnd(38)} "${got}"${ok ? '' : ` (want "${want}")`}`);
}
const open = async (id) => { await page.goto(`${origin}/index.html?screen=${id}`, { waitUntil: 'load' }); await page.waitForTimeout(300); };
const render = async (id) => { await page.evaluate((i) => window.Taily.render(i), id); await page.waitForTimeout(200); };

/* ---------- happy path ---------- */
await open('t01-home');
await assertAt('boot as tailor', 't01-home', 'confirmed', 'tailor');
await assertTrue('request card + Sarah job on T01', () => !!document.querySelector('.req-card') && document.querySelectorAll('.job-card').length === 2);
await assertText('timer reads the fixture', '[data-timer]', 'EXPIRES IN 1H 24M');
await page.click('[data-act="view-details"]');
await assertAt('View Details', 't02-appointment-request', 'confirmed');
await assertText('T02 header is the booked payout', '.t-header .t-title', '$180 | New Request');
await assertTrue('T02 lists the two booked cards', () => document.querySelectorAll('.garment-card').length === 2);
await page.click('[data-act="accept"]');
await assertAt('Accept Request', 't03-request-accepted', 'confirmed');
await assertText('T03 reads Booking Confirmed right after Accept', '.status-hero__title', 'Booking Confirmed!');
await assertText('T03 avatar is Sarah', '.summary-card .avatar', 'SC');
await page.click('[data-act="home"]');
await assertAt('Back to Home', 't01-home', 'confirmed');
await assertTrue('request card gone after accept', () => !document.querySelector('.req-card'));
await assertTrue('Sarah card reads 2 Suit Jackets · $180', () => document.querySelector('.job-card').textContent.includes('2 Suit Jackets') && document.querySelector('.job-card__payout').textContent === '$180');
await page.click('[data-act="open-job"]');
await assertAt('open confirmed job → pre-visit T03', 't03-request-accepted', 'confirmed');
await assertText('pre-visit header', '.t-header .t-title', 'Upcoming visit');
await assertTrue('pre-visit sub carries the live date + address', () => /Sun, Jul 12 · 7:00 PM at 88 Leonard St, 4B · Home visit/.test(document.querySelector('.t-header .t-body').textContent));
await page.click('[data-act="start"]');
await assertAt('Start Appointment', 't04-appointment-details', 'confirmed');
await assertTrue('T04 starts from the BOOKED order', () => document.querySelectorAll('.garment-card').length === 2);
await assertTrue('T04 fee rows follow the booking', () => [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent).join(' ') === '$20 $180');
/* edit the draft: + Sleeve on card 1, + a third jacket → the $360 fiction */
await page.click('[data-sel="add"][data-gi="0"]');
await page.click('.selector--open .selector__option[data-option="Sleeve"]');
await page.waitForTimeout(200);
await assertTrue('added service recomputes the fee rows', () => [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent).join(' ') === '$28 $252');
await page.click('[data-act="add-garment"]');
await page.waitForTimeout(200);
await assertTrue('added garment → 3 cards, $36 / $324', () => document.querySelectorAll('.garment-card').length === 3 && [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent).join(' ') === '$36 $324');
await page.click('[data-act="add-photo"][data-kind="before"][data-gi="0"]');
await page.waitForTimeout(200);
await assertTrue('photo tile captured on card 1', () => document.querySelector('.garment-card .photo-tiles .photo-tile--photo') !== null);
await page.click('[data-act="comment"][data-gi="0"]');
await page.waitForTimeout(200);
await page.fill('[data-act="note"][data-gi="0"]', 'Take in the waist 1 in');
await page.click('[data-act="continue"]');
await assertAt('Continue', 't05-confirm-final-pricing', 'confirmed');
await assertTrue('T05 paints the added service + garment info', () => document.querySelectorAll('.garment-card__service--info').length >= 2 && document.querySelectorAll('.garment-card--info').length === 1);
await assertTrue('T05 shows the captured note + photo, no ✕', () => document.body.textContent.includes('“Take in the waist 1 in”') && !!document.querySelector('.photo-tile--photo') && !document.querySelector('.garment-card__close'));
await page.click('[data-act="send"]');
await assertAt('Send to Sarah for Approval', 't06-appointment-status', 'awaiting-approval');
await assertTrue('Send wrote the final order into the appointment', () => { const a = window.Taily.state.upcoming.find((x) => x.mine); return a.garments.length === 3 && a.totals.subtotal === 360 && a.totals.total === 360 && a.totals.deposit === 20 && a.garments[0].addedJobs?.[0] === 'Sleeve' && a.garments[2].added === true && a.booked.length === 2; });
await assertTrue('T06 carries the awaiting status line', () => /Waiting for Sarah to approve/.test(document.querySelector('.t-header .t-body')?.textContent ?? ''));
await assertTrue('T06 job card reads $324 · 3 Suit Jackets', () => document.querySelector('.job-card__payout').textContent === '$324' && document.querySelector('.job-card').textContent.includes('3 Suit Jackets'));
await page.click('[data-act="back"]');
await assertAt('T06 chevron goes Home (not the editor)', 't01-home', 'awaiting-approval');
await page.click('[data-act="open-job"]');
await assertAt('job card reopens T06', 't06-appointment-status', 'awaiting-approval');
/* the user approves on 04/Modified */
await render('04-review-approve-modified');
await assertAt('  …user sees the modified order', '04-review-approve-modified', 'awaiting-approval', 'user');
await page.click('[data-act="approve"]');
await assertAt('  …user approves', '03-status-tailoring', 'tailoring');
await render('t06-appointment-status');
await assertAt('back to Marco', 't06-appointment-status', 'tailoring', 'tailor');
await page.click('[data-act="ready"]');
await assertAt('Mark Ready', 't07-job-ready', 'ready-for-pickup');
await assertTrue('T07 items follow the final order', () => document.body.textContent.includes('3 Suit Jackets'));
await page.click('[data-act="order-summary"]');
await assertTrue('order summary expands', () => !document.querySelector('.order-summary').hidden);
await render('t06-appointment-status');
await assertText('T06 ready CTA', '.t-actions .cta', 'View Handoff Details');
await page.click('[data-act="handoff"]');
await assertAt('View Handoff Details', 't07-job-ready', 'ready-for-pickup');
await page.click('[data-act="picked-up"]');
await assertAt('Mark Picked Up', 't08-job-complete', 'delivered');
await assertTrue('T08 payout reads the final order', () => document.body.textContent.includes('$360') && document.body.textContent.includes('$324') && document.body.textContent.includes('Arrives in your account'));
await render('t06-appointment-status');
await assertText('T06 delivered CTA', '.t-actions .cta', 'View Payout');
await page.click('[data-act="payout"]');
await assertAt('View Payout', 't08-job-complete', 'delivered');
await page.click('[data-act="home"]');
await assertAt('Back to Home (job complete)', 't01-home', 'delivered');
await render('01-home');
await page.click('.appt-card');
await assertAt('user card opens summary', '03-status-summary', 'delivered', 'user');

/* ---------- T07 follows a delivery choice (R1-T-11) ---------- */
await open('t06-appointment-status');
await page.evaluate(() => { const a = window.Taily.state.upcoming.find((x) => x.mine); a.status = 'ready-for-pickup'; a.fulfilment = { method: 'delivery', window: 'Fri 4-6PM · Jul 17' }; });
await render('t07-job-ready');
await assertTrue('T07 reads the delivery choice', () => document.body.textContent.includes('delivery to 88 Leonard St, 4B') && document.body.textContent.includes('Fri 4-6PM · Jul 17'));
await assertText('T07 CTA follows delivery', '.t-actions .cta', 'Mark Delivered');

/* ---------- messages: absolute authors across personas (R1-T-04) ---------- */
await open('t03-request-accepted');
await page.click('[data-act="message"]');
await assertAt('Message Sarah', '10-messages', 'confirmed', 'tailor');
await assertTrue('thread shows Sarah in the header', () => document.querySelector('.chat-head__names span').textContent === 'Sarah Chen');
await assertTrue('greeting reads Hi Sarah on the tailor side', () => document.querySelector('.bubble').textContent.startsWith('Hi Sarah'));
await assertTrue('header subline from the appointment', () => document.querySelector('.chat-head__names .t-small').textContent === 'Sun, Jul 12 · 7:00 PM · Home Visit');
await page.fill('.composer__input', 'Running 5 min late');
await page.click('.composer__send');
await page.waitForTimeout(200);
await assertTrue('Marco’s message sits on his own side', () => [...document.querySelectorAll('.bubble')].pop().classList.contains('bubble--me'));
await page.waitForTimeout(1300);
await render('01-home');
await render('10-messages');
await assertAt('same thread as the customer', '10-messages', 'confirmed', 'user');
await assertTrue('greeting reads Hi Kevin on the user side', () => document.querySelector('.bubble').textContent.startsWith('Hi Kevin'));
await assertTrue('Marco’s message is a THEM bubble for Kevin, Sarah’s reply is ME', () => {
  const b = [...document.querySelectorAll('.bubble')];
  const late = b.find((x) => x.textContent === 'Running 5 min late');
  const reply = b[b.length - 1];
  return late && !late.classList.contains('bubble--me') && reply.textContent === 'Got it — thanks!' && reply.classList.contains('bubble--me');
});
await page.click('[data-act="back"]');

/* ---------- decline branch (R1-T-08) ---------- */
await open('t01-home');
await page.click('[data-act="decline"]');
await assertAt('Decline (from T01)', 't03a-decline-request', 'confirmed');
await assertTrue('no reason pre-selected on a live load', () => !document.querySelector('.radio-row--selected'));
await page.click('[data-act="decline"]');
await assertAt('Decline without a reason stays put', 't03a-decline-request', 'confirmed');
await page.click('[data-reason="3"]');
await assertTrue('reason selects', () => document.querySelector('[data-reason="3"]').classList.contains('radio-row--selected'));
await page.click('[data-act="decline"]');
await assertAt('Decline Request', 't01-home', 'declined');
await assertTrue('declined job leaves T01 empty', () => !document.querySelector('.req-card') && document.querySelectorAll('.job-card').length === 1);

/* ---------- customer cancellation → T03B (R1-T-01) ---------- */
await open('03-status-confirmed');
await assertAt('user on 03/Confirmed', '03-status-confirmed', 'confirmed', 'user');
await page.click('[data-act="reschedule"]');
await page.waitForTimeout(400);
await page.click('[data-act="confirm-reschedule"]');
await assertAt('user cancels the confirmed visit', '03-status-cancelled', 'cancelled', 'user');
await page.click('#persona-toggle');
await assertAt('View as Tailor after the cancel', 't01-home', 'cancelled', 'tailor');
await assertTrue('T01: no request card, Sarah reads Cancelled · Slot reopened', () => !document.querySelector('.req-card') && document.querySelectorAll('.job-card').length === 2 && document.querySelector('.job-card').textContent.includes('Cancelled') && document.querySelector('.job-card').textContent.includes('Slot reopened'));
await page.click('[data-act="open-job"]');
await assertAt('cancelled card opens T03B', 't03b-job-cancelled', 'cancelled');
await page.click('[data-act="calendar"]');
await assertAt('View Calendar', 't01-home', 'cancelled');

/* ---------- cross-persona: user books → tailor accepts → user sees it ---------- */
await open('01-home');
await assertAt('boot as customer', '01-home', 'confirmed', 'user');
await page.click('[data-tile="Suit Jacket"]');
await page.click('[data-act="start-booking"]');
await page.click('[data-act="time"]');
await page.waitForTimeout(400);
await page.click('[data-act="sheet-confirm"]');
await page.waitForTimeout(400);
/* R1-U-11: need-by must be strictly after the requested time — the
   need-by wheel opens ON the requested date, so roll the day one row */
await page.click('[data-act="needby"]');
await page.waitForTimeout(400);
await page.evaluate(() => { document.querySelector('.wheel__col--scroll').scrollTop += 40; });
await page.waitForTimeout(300);
await page.click('[data-act="sheet-confirm"]');
await page.waitForTimeout(400);
await page.click('[data-act="request"]');
await page.waitForTimeout(400);
await page.click('.method-row');
await assertAt('user requests a tailor', '03-status-requested', 'searching', 'user');
await page.click('#persona-toggle');
await assertAt('View as Tailor', 't01-home', 'searching', 'tailor');
await assertTrue('new request shows on T01 at the booked payout', () => !!document.querySelector('.req-card') && document.querySelector('.req-card__name b').textContent === '$108');
await page.click('[data-act="view-details"]');
await assertText('T02 header follows the booking', '.t-header .t-title', '$108 | New Request');
await assertTrue('T02 lists the one booked card', () => document.querySelectorAll('.garment-card').length === 1);
await page.click('[data-act="accept"]');
await assertAt('tailor accepts the new request', 't03-request-accepted', 'confirmed');
await page.click('#persona-toggle');
await assertAt('View as Customer', '01-home', 'confirmed', 'user');
await assertTrue('user card reads Confirmed', () => document.querySelector('.appt-card .pill')?.textContent.trim() === 'Confirmed');
await page.click('.appt-card');
await assertAt('user card opens 03/Confirmed', '03-status-confirmed', 'confirmed');

console.log(errors.length ? `CONSOLE ERRORS:\n  ${errors.join('\n  ')}` : 'no console errors');
if (errors.length) failures++;
await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL ASSERTIONS PASS');
process.exit(failures ? 1 : 0);
