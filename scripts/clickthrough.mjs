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
await page.click('[data-act="time"]');
await assertAt('Requested-time pill (stays on 02)', '02-appointment-details');
await assertOverlay('  …time sheet overlays', '02.1-date-time-sheet');
await page.click('[data-act="sheet-confirm"]');
await page.waitForTimeout(400);
await assertAt('sheet ✓ returns', '02-appointment-details');
await assertOverlay('  …overlay gone', null);
// UX-LOOP R1-U-11: the requested time is now today, the fiction's
// Jul 17 need-by lies before it → the pill errors and the request is
// inert until the need-by wheel (which opens on the requested date)
// is moved one day on.
const needByError = () => page.evaluate(() => !!document.querySelector('.filter-pill--error'));
console.log(`${await needByError() ? 'PASS' : 'FAIL'}  need-by before appointment errors`);
if (!await needByError()) failures++;
await page.click('[data-act="request"]');
await assertAt('Request Tailor, invalid need-by', '02-appointment-details');
await assertOverlay('  …no payment sheet', null);
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
await page.click('[data-act="map"]');                 // demo: tailor accepts
await assertAt('tailor accepts', '03-status-confirmed', 'confirmed');
// UX-LOOP R1-U-01: the tailor card is the demo "day before" → reminder
await page.click('.summary-card');
await assertAt('reminder fires (confirmed)', '03-status-reminder', 'confirmed');
// Phase R2: Reschedule / Cancel opens the R1 popup; Go Back dismisses
await page.click('[data-act="reschedule"]');
await assertOverlay('  …R1 popup overlays', '03.1-reschedule-popup');
await page.click('[data-act="go-back"]');
await page.waitForTimeout(400);
await assertOverlay('  …popup gone', null);
// Phase R4: Confirm Appointment opens the 05C popup; its Confirm makes
// the appointment happen.
await page.click('[data-act="confirm"]');
await assertOverlay('  …05C popup overlays', '03.2-appointment-confirmed');
await page.click('[data-act="confirm-appt"]');        // appointment happens
await page.waitForTimeout(400);
// Phase R0: 06 - Order Status was deleted; 04D (Appointment Status)
// takes its place, and tapping the order opens the modified review (06B).
await assertAt('appointment done', '03-status-tailoring', 'awaiting-approval');
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
await page.click('[data-act="review"]');
await assertAt('open final order', '04-review-approve-modified', 'awaiting-approval');
// Phase R2: Request Changes opens the RC1 popup; Sounds Good dismisses
await page.click('[data-act="changes"]');
await assertOverlay('  …RC1 popup overlays', '04.1-request-changes');
await page.click('[data-act="sounds-good"]');
await page.waitForTimeout(400);
await assertOverlay('  …popup gone', null);
// Phase R4/R5: approving lands back on 04D as 'tailoring'. Tapping the
// order simulates the TAILOR finishing (markReady) — the user stays on
// 04D (card flips to Ready) and reaches 07 only via the appointment
// card's Schedule Pickup / Delivery.
await page.click('[data-act="approve"]');
await assertAt('approve order', '03-status-tailoring', 'tailoring');
await page.click('[data-act="review"]');
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
// Phase R6: confirming opens 07C; the order stays ready until the
// TAILOR confirms the handoff (demo: tap the order on 04D) → 08.
await page.click('[data-act="confirm"]');
await assertOverlay('  …07C window confirmed', '05.1-window-confirmed');
await page.click('[data-act="window-done"]');
await page.waitForTimeout(400);
await assertAt('window scheduled (still ready)', '01-home', 'ready-for-pickup');
await page.click('.appt-card');
await assertAt('scheduled card opens status', '03-status-tailoring', 'ready-for-pickup');
await page.click('[data-act="review"]');
await assertAt('tailor confirms handoff', '06-journey-complete', 'delivered');
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

console.log(errors.length ? `CONSOLE ERRORS:\n  ${errors.join('\n  ')}` : 'no console errors');
if (errors.length) failures++;
await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL ASSERTIONS PASS');
process.exit(failures ? 1 : 0);
