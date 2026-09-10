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
}
await page.click('[data-act="start-booking"]');
await assertAt('  …Start Booking stays (no duplicate)', '01-home', 'searching');
await page.evaluate(() => window.Taily.render('03-status-requested'));
await page.waitForTimeout(200);
// R3-U-01: the request card reads the appointment (03 grammar), not the form
{
  const rows = await page.evaluate(() => [...document.querySelectorAll('.meta-row span:last-child')].map((e) => e.textContent.replace(/\s+/g, ' ').trim()));
  const a = await page.evaluate(() => { const x = window.Taily.state.upcoming[0]; return { sub: x.totals.subtotal, dep: x.totals.deposit, n: x.count }; });
  check('03/Requested rows read the appointment', rows[0] === '88 Leonard St, 4B — Home Visit' && /^\w{3}, \w{3,4} \d{1,2} · \d{1,2}:\d{2} [AP]M$/.test(rows[1]) && rows[2] === `${a.n} item · $${a.sub}.00+ est. · $${a.dep} deposit held`, rows.join(' | '));
}
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
await assertScrolls('page scrolls after 03.2 confirm');
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
await page.click('[data-act="review"]');
await assertAt('open final order', '04-review-approve-modified', 'awaiting-approval');
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
await assertScrolls('page scrolls after 05.1 Done');
// UX-LOOP R2-U-02: the stored window carries its date (card meta / hero)
const windowMeta = await page.evaluate(() => document.querySelector('.appt-card__meta')?.textContent.trim() ?? '');
check('window label carries its date', /^Pickup: \w{3}, \w{3,4} \d{1,2} · /.test(windowMeta), `"${windowMeta}"`);
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

// R2-U-01: the 03.1 confirm closes its overlay before navigating
await page.click('[data-act="reschedule"]');
await assertOverlay('  …R1 popup overlays', '03.1-reschedule-popup');
await page.click('[data-act="confirm-reschedule"]');
await assertAt('03.1 confirm → 03/Cancelled', '03-status-cancelled');
await assertScrolls('page scrolls after 03.1 confirm');
check('  …customer variant', await heroTitle() === 'Appointment Cancelled' && await curStatus() === 'cancelled', `title="${await heroTitle()}" status=${await curStatus()}`);
await page.goBack();
await page.waitForTimeout(400);
check('  …next back not swallowed', (await screenId()) !== '03-status-cancelled', `screen=${await screenId()}`);
// UX-LOOP R3-U-05: the cancelled status REPLACED 03/Confirmed — back lands on
// Home / Bookings, never on a "Confirmed" ghost with a live Reschedule
check('  …back lands on Home / Bookings, no Confirmed ghost', ['01-home', '09-bookings'].includes(await screenId()), `screen=${await screenId()}`);
// …and a status screen re-entered for an ended appointment redirects to 03/Cancelled
await page.evaluate(() => window.Taily.render('03-status-confirmed'));
await page.waitForTimeout(300);
await assertAt('03/Confirmed for a cancelled entry → 03/Cancelled', '03-status-cancelled');
check('  …no live Reschedule on the way', !(await page.evaluate(() => !!document.querySelector('[data-act="reschedule"]'))));
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

console.log(errors.length ? `CONSOLE ERRORS:\n  ${errors.join('\n  ')}` : 'no console errors');
if (errors.length) failures++;
await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL ASSERTIONS PASS');
process.exit(failures ? 1 : 0);
