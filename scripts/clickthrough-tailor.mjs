/* ============================================================
   Tailor click-through — Phase T, extended in UX-LOOP round 1.
   Drives Marco's path on the SAME appointment the user books:
     T01 → T02 (accept) → T03 → T01 → T03 pre-visit (Start Appointment)
     → T04 (edit the draft: +service, +garment → $360) → T05 (send
     writes the final order) → T06 (mark ready) → T07 (waiting for
     Sarah's handoff choice; demo pickup) → T08,
   asserting screen id + state status; the decline branch (no default
   reason, T01 → T03A → declined); the customer-cancellation branch
   (03.1 popup → T01 Cancelled card → T03B); chat authorship across
   personas; T07 following a delivery choice; and one cross-persona
   check: user books on 02 → tailor accepts on T02 → user's card is
   Confirmed and opens 03/Confirmed.
   UX-LOOP round 2: two bookings coexist on T01 (R2-T-01); browser back
   after Accept (R2-T-11); expiry via the timer-strip demo (R2-T-03);
   suggest another time → proposed card → customer accepts / keeps
   looking (R2-T-04); can't-make-it and no-show → T03B variants
   (R2-T-05); withdrawn request → T03B / Withdrawn row (R2-T-06);
   removal marks (R2-T-08); Request Changes line (R2-T-09); chat pill
   vocabulary (R2-T-10).
   UX-LOOP round 3: proposals bounded by the need-by (R3-T-01);
   Withdraw is Marco's own act + T02 while proposed + a lapsed proposal
   (R3-T-02); T01's New Requests / Active Jobs / Done today partition
   and the request-card item count (R3-T-03); payout date + order id per
   job (R3-T-04); the Can't-make-it modal's consequence line, confirm
   label and no-show gate (R3-T-05); Calendar tab / View Calendar
   priority (R3-T-06).
   UX-LOOP round 6: T02's visit-type / distance row + Subtotal; T03A's
   Other note (a.declineNote) + the t03a-other fixture; the canned Taily
   Support chat from T04; the fee policy on the tailor side (no-show and
   a < 12 h customer cancel keep the deposit — T03.1 line, T03B copy);
   T01's Done today Clear + re-show.
   UX-LOOP round 7 (Kevin's money model v2): no commission — the payout
   is 100% of the alteration prices, prominent on T01/T02 before Accept
   ($200 | New Request / Your payout $200 / Accept Request · $200),
   stamped on a.tailor.acceptedPayout and unchanged after Accept; T05
   states the scope change before Send ("Payout $200 → $360 (+$160)");
   T06 / T08 read the final payout ($360); the refund lines follow
   `feeLocked` without ever naming the fee's amount; and a DOM sweep
   proves no tailor screen prints the customer's total, the visitation
   fee, delivery, a Taily fee or a deposit. Exit code 1 on any failed
   assertion.
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
/* the job the tailor is acting on: the tapped one (state.tailorUi.current),
   else the first `mine` entry still upcoming, else the latest closed one */
const status = () => page.evaluate(() => { const s = window.Taily.state; return (s.tailorUi?.current ?? s.upcoming.find((a) => a.mine) ?? s.lastCancelled)?.status ?? '(none)'; });
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

/* R7: the tailor NEVER sees the customer's pricing — a grep-style sweep
   of the rendered screen (overlays included) for the customer-side money
   vocabulary. "delivery" alone is allowed (the handoff method); a
   delivery FEE / amount is not. */
const CUSTOMER_MONEY = [/Visitation/, /visitation fee/i, /\$\d[\d.]* delivery/i, /delivery fee/i, /Delivery \$/, /\bTotal\b/, /Subtotal/, /fee \(10%\)/i, /Taily [Ff]ee/, /deposit/i, /Order total/, /−\$/, /Payment will be processed/];
async function assertClean(desc) {
  const hits = await page.evaluate((srcs) => {
    const txt = document.getElementById('screen')?.innerText ?? '';
    return srcs.filter((s) => new RegExp(s.slice(1, s.lastIndexOf('/')), s.slice(s.lastIndexOf('/') + 1)).test(txt));
  }, CUSTOMER_MONEY.map(String));
  const ok = hits.length === 0;
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc.padEnd(38)} no customer pricing on screen${ok ? '' : ` (found ${hits.join(' ')})`}`);
}
/* the one money row under an order: "$200 Your payout" (R7) */
const feeRows = () => [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ');

/* ---------- happy path ---------- */
await open('t01-home');
await assertAt('boot as tailor', 't01-home', 'confirmed', 'tailor');
await assertTrue('request card + Sarah job on T01', () => !!document.querySelector('.req-card') && document.querySelectorAll('.job-card').length === 2);
await assertText('timer reads the fixture', '[data-timer]', 'EXPIRES IN 1H 24M');
await assertTrue('R7: T01 request card leads with the $200 payout (no fee)', () => document.querySelector('.req-card__name b').textContent === '$200' && !/\$180/.test(document.body.textContent));
await assertClean('R7: T01');
await page.click('[data-act="view-details"]');
await assertAt('View Details', 't02-appointment-request', 'confirmed');
await assertText('T02 header is the booked payout', '.t-header .t-title', '$200 | New Request');
await assertTrue('T02 lists the two booked cards', () => document.querySelectorAll('.garment-card').length === 2);
/* R7: the payout is prominent BEFORE accepting — one money row, the CTA names it, no fee / subtotal row */
await assertTrue('R7: T02 one money row "$200 Your payout"', () => [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ') === '$200 Your payout');
await assertText('R7: T02 CTA names the payout', '[data-act="accept"]', 'Accept Request · $200');
await assertClean('R7: T02 before Accept');
await page.click('[data-act="accept"]');
await assertAt('Accept Request', 't03-request-accepted', 'confirmed');
await assertText('T03 reads Booking Confirmed right after Accept', '.status-hero__title', 'Booking Confirmed!');
await assertText('T03 avatar is Sarah', '.summary-card .avatar', 'SC');
await assertTrue('R7: Accept stamped a.tailor.acceptedPayout = 200; T03 reads Your payout $200', () => { const a = window.Taily.state.upcoming.find((x) => x.mine); return a.tailor.acceptedPayout === 200 && [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ') === '$200 Your payout'; });
await assertClean('R7: T03 after Accept');
await page.click('[data-act="home"]');
await assertAt('Back to Home', 't01-home', 'confirmed');
await assertTrue('request card gone after accept', () => !document.querySelector('.req-card'));
await assertTrue('Sarah card reads 2 Suit Jackets · $200 (unchanged after Accept)', () => document.querySelector('.job-card').textContent.includes('2 Suit Jackets') && document.querySelector('.job-card__payout').textContent === '$200' && document.querySelector('.job-card__paylabel').textContent === 'Payout');
await page.click('[data-act="open-job"]');
await assertAt('open confirmed job → pre-visit T03', 't03-request-accepted', 'confirmed');
await assertText('pre-visit header', '.t-header .t-title', 'Upcoming visit');
await assertTrue('pre-visit sub carries the live date + address', () => /Sun, Jul 12 · 7:00 PM at 88 Leonard St, 4B · Home visit/.test(document.querySelector('.t-header .t-body').textContent));
await page.click('[data-act="start"]');
await assertAt('Start Appointment', 't04-appointment-details', 'confirmed');
await assertTrue('T04 starts from the BOOKED order', () => document.querySelectorAll('.garment-card').length === 2);
await assertTrue('T04 payout row follows the booking ($200, no fee row)', () => [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ') === '$200 Your payout');
await assertClean('R7: T04');
/* edit the draft: + Sleeve on card 1, + a third jacket → the $360 fiction */
await page.click('[data-sel="add"][data-gi="0"]');
await page.click('.selector--open .selector__option[data-option="Sleeve"]');
await page.waitForTimeout(200);
await assertTrue('added service recomputes the payout row ($280)', () => [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent).join(' ') === '$280');
await page.click('[data-act="add-garment"]');
await page.waitForTimeout(200);
await assertTrue('added garment → 3 cards, payout $360', () => document.querySelectorAll('.garment-card').length === 3 && [...document.querySelectorAll('.fee-row__price')].map((e) => e.textContent).join(' ') === '$360');
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
/* R7: the scope changed at the visit — the payout change is stated BEFORE Send, above the CTA */
await assertText('R7-T-03: T05 header sub carries the draft payout above the fold', '.t-header .t-body', 'Reviewed with Sarah at the visit · Payout $360');
await assertTrue('R7: T05 reads Your payout $360 and "Payout $200 → $360 (+$160)" before Send', () => [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ') === '$360 Your payout' && document.querySelector('[data-payout-change]')?.textContent === 'Payout $200 → $360 (+$160)' && document.querySelector('.t-actions').firstElementChild.hasAttribute('data-payout-change'));
await assertTrue('R7: the accepted payout is still $200 until Send', () => window.Taily.state.upcoming.find((x) => x.mine).tailor.acceptedPayout === 200);
await assertClean('R7: T05');
await page.click('[data-act="send"]');
await assertAt('Send to Sarah for Approval', 't06-appointment-status', 'awaiting-approval');
await assertTrue('Send wrote the final order into the appointment (R7 totals: alterations 360, no deposit)', () => { const a = window.Taily.state.upcoming.find((x) => x.mine); return a.garments.length === 3 && a.totals.alterations === 360 && a.totals.deposit == null && a.garments[0].addedJobs?.[0] === 'Sleeve' && a.garments[2].added === true && a.booked.length === 2; });
await assertTrue('R7: Send moved the accepted payout to $360', () => window.Taily.state.upcoming.find((x) => x.mine).tailor.acceptedPayout === 360);
await assertText('R7: T06 awaiting line names the payout', '.t-header .t-body', 'Sarah is reviewing the updated order — payout $360 once approved.');
await assertText('R7-T-01: T06 job card caption reads Payout · pending while Sarah approves', '.job-card__paylabel', 'Payout · pending');
await assertTrue('T06 job card reads $360 · 3 Suit Jackets; one money row', () => document.querySelector('.job-card__payout').textContent === '$360' && document.querySelector('.job-card').textContent.includes('3 Suit Jackets') && [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ') === '$360 Your payout');
await assertClean('R7: T06');
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
await assertTrue('R7: T07 order summary ends in $360 Your payout', () => [...document.querySelectorAll('.order-summary .fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ') === '$360 Your payout');
await assertClean('R7: T07 (summary open)');
await render('t06-appointment-status');
await assertText('T06 ready CTA', '.t-actions .cta', 'View Handoff Details');
await page.click('[data-act="handoff"]');
await assertAt('View Handoff Details', 't07-job-ready', 'ready-for-pickup');
/* R2-T-07: Sarah has not scheduled — T07 waits; Mark Picked Up is the recorded demo */
await assertTrue('T07 waits for Sarah’s handoff choice', () => /hasn’t chosen pickup or delivery yet/.test(document.body.textContent) && document.body.textContent.includes('Not scheduled yet') && document.querySelector('.t-actions .cta').textContent === 'Message Sarah');
await page.click('[data-act="picked-up"]');
await assertAt('Mark Picked Up (demo: Sarah chose pickup now)', 't08-job-complete', 'delivered');
await assertTrue('demo recorded a pickup window on the job', () => { const a = window.Taily.state.upcoming.find((x) => x.mine); return a.fulfilment?.method === 'pickup' && /·/.test(a.fulfilment.window); });
await assertTrue('R7: T08 payout summary = items → Your payout $360 (no order total / fee)', () => {
  const rows = [...document.querySelectorAll('.t-detail-card .price-row')].map((r) => `${r.firstElementChild.textContent}=${r.querySelector('.price-row__value').textContent}`);
  return rows.length === 4 && /^Suit Jacket · Hem \/ Adjust Length, Sleeve.*=\$200$/.test(rows[0]) && rows[1] === 'Suit Jacket · Sleeve / Adjust Length=$80' && rows[2] === 'Suit Jacket · Sleeve / Adjust Length=$80' && rows[3] === 'Your payout=$360' && document.querySelector('.price-row--total').textContent.includes('$360') && !document.body.textContent.includes('$324') && document.body.textContent.includes('Arrives in your account');
});
await assertClean('R7: T08');
await render('t06-appointment-status');
await assertText('T06 delivered CTA', '.t-actions .cta', 'View Payout');
await page.click('[data-act="payout"]');
await assertAt('View Payout', 't08-job-complete', 'delivered');
await page.click('[data-act="home"]');
await assertAt('Back to Home (job complete)', 't01-home', 'delivered');
/* R3-T-03: the completed job moves under "Done today" (payout kept); Active Jobs holds only Leo */
await assertTrue('T01: completed seed under Done today with its payout; Active Jobs = Leo only', () => {
  const sections = [...document.querySelectorAll('.t-section-row')].map((e) => e.textContent.trim());
  const c = document.querySelector('.t-done .job-card');
  const active = [...document.querySelectorAll('.t-actions:not(.t-done)')].find((b) => b.querySelector('.job-card'));
  return sections.some((s) => s.startsWith('Done today')) && c && c.textContent.includes('Completed') && c.querySelector('.job-card__payout')?.textContent === '$360' && !c.classList.contains('job-card--closed') && active && active.querySelectorAll('.job-card').length === 1 && active.textContent.includes('Leo Von');
});
await render('01-home');
await page.click('.appt-card');
/* R3-U-03 (user side): the completed entry's Home card opens its status
   (03/Tailoring's delivered hero) — 03/Summary before round 3 */
await page.waitForTimeout(300);
{
  const s = await screenId(), p = await persona();
  const ok = /^03-status-(summary|tailoring)$/.test(s) && p === 'user';
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${'user card opens the completed order'.padEnd(38)} screen=${s}  persona=${p}`);
}
/* R3-T-06: the Calendar tab prefers a confirmed visit over the completed seed */
await render('01-home');
await bookFresh();
await assertAt('customer books a fresh job after the seed completed', '03-status-requested', undefined, 'user');
await page.click('#persona-toggle');
await page.click('.req-card[data-req="0"] [data-act="view-details"]');
await page.click('[data-act="accept"]');
await assertAt('tailor accepts the fresh job', 't03-request-accepted', 'confirmed', 'tailor');
await page.click('.top-nav [data-nav="t-calendar"]');
await assertAt('Calendar tab → the confirmed visit, not the completed seed', 't03-request-accepted', 'confirmed');
await assertTrue('…and it is the fresh visit (not Jul 12)', () => document.querySelector('.t-header .t-title').textContent === 'Upcoming visit' && !/Jul 12/.test(document.querySelector('.t-header .t-body').textContent));

/* ---------- T07 follows a delivery choice (R1-T-11) ---------- */
await open('t06-appointment-status');
await page.evaluate(() => { const a = window.Taily.state.upcoming.find((x) => x.mine); a.status = 'ready-for-pickup'; a.fulfilment = { method: 'delivery', window: 'Fri 4-6PM · Jul 17' }; });
await render('t07-job-ready');
await assertTrue('T07 reads the delivery choice', () => document.body.textContent.includes('delivery to 88 Leonard St, 4B') && document.body.textContent.includes('Fri 4-6PM · Jul 17'));
await assertText('T07 CTA follows delivery', '.t-actions .cta', 'Mark Delivered');
await assertTrue('R7: T07 delivery handoff speaks of the payout, never a delivery fee or Sarah’s payment', () => /Your payout is released on handoff\./.test(document.querySelector('.t-status .t-body').textContent));
await assertClean('R7: T07 (delivery)');

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
/* R6: 03.1's confirm is reschedule = cancel + resubmit — the customer lands on 02 with the visit cancelled */
await assertAt('user cancels the confirmed visit', '02-appointment-details', 'cancelled', 'user');
await page.click('#persona-toggle');
await assertAt('View as Tailor after the cancel', 't01-home', 'cancelled', 'tailor');
await assertTrue('T01: no request card, Sarah reads Cancelled · Slot reopened', () => { const cards = [...document.querySelectorAll('.job-card')]; const c = cards.find((x) => x.textContent.includes('Sarah Chen')); return !document.querySelector('.req-card') && cards.length === 2 && c && c.textContent.includes('Cancelled') && c.textContent.includes('Slot reopened'); });
await page.click('[data-act="open-job"]');
await assertAt('cancelled card opens T03B', 't03b-job-cancelled', 'cancelled');
await assertTrue('T03B (seed) keeps the tonight fiction', () => document.body.textContent.includes('tonight’s 7:00 PM slot'));
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
await assertTrue('new request shows on T01 at the booked payout ($120 = 100% of the $120 Hem)', () => !!document.querySelector('.req-card') && document.querySelector('.req-card__name b').textContent === '$120');
await page.click('[data-act="view-details"]');
await assertText('T02 header follows the booking', '.t-header .t-title', '$120 | New Request');
await assertText('R7: T02 CTA follows the booking', '[data-act="accept"]', 'Accept Request · $120');
await assertTrue('T02 lists the one booked card', () => document.querySelectorAll('.garment-card').length === 1);
await page.click('[data-act="accept"]');
await assertAt('tailor accepts the new request', 't03-request-accepted', 'confirmed');
await page.click('#persona-toggle');
await assertAt('View as Customer', '01-home', 'confirmed', 'user');
await assertTrue('user card reads Confirmed', () => document.querySelector('.appt-card .pill')?.textContent.trim() === 'Confirmed');
await page.click('.appt-card');
await assertAt('user card opens 03/Confirmed', '03-status-confirmed', 'confirmed');

/* ============================================================
   UX-LOOP round 2 — the list model and the three new branches
   ============================================================ */

/* helpers: book a fresh Suit Jacket request as the customer (02 → 03/Requested) */
async function bookFresh() {
  await page.click('[data-tile="Suit Jacket"]');
  await page.click('[data-act="start-booking"]');
  await page.click('[data-act="time"]');
  await page.waitForTimeout(400);
  await page.click('[data-act="sheet-confirm"]');
  await page.waitForTimeout(400);
  await page.click('[data-act="needby"]');
  await page.waitForTimeout(400);
  await page.evaluate(() => { document.querySelector('.wheel__col--scroll').scrollTop += 40; });
  await page.waitForTimeout(300);
  await page.click('[data-act="sheet-confirm"]');
  await page.waitForTimeout(400);
  await page.click('[data-act="request"]');
  await page.waitForTimeout(400);
  await page.click('.method-row');
  await page.waitForTimeout(300);
}
/* assert on Sarah's FRESH job or the SEED (the Jul 12 fiction), wherever it lives now */
const SEED_WHEN = 'Sunday Jul 12, 7PM';
async function assertJob(desc, which, fn) {
  const ok = await page.evaluate(({ which, src, SEED_WHEN }) => {
    const s = window.Taily.state;
    const all = [...s.upcoming, ...s.past];
    const a = which === 'fresh' ? all.find((x) => x.mine && x.when !== SEED_WHEN) : all.find((x) => x.mine && x.when === SEED_WHEN);
    return !!new Function('a', 's', `return (${src})(a, s)`)(a, s);
  }, { which, src: fn.toString(), SEED_WHEN });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc}`);
}

/* ---------- R2-T-01: two bookings coexist on T01; the tapped card wins ---------- */
await open('01-home');
await bookFresh();
await assertAt('customer books a second job', '03-status-requested', 'searching', 'user');
await page.click('#persona-toggle');
await assertAt('T01 with two mine bookings', 't01-home', 'searching', 'tailor');
await assertTrue('T01 lists the fresh request AND the seed’s confirmed job (no phantom seed request)', () => document.querySelectorAll('.req-card').length === 1 && document.querySelector('.req-card__name b').textContent === '$120' && [...document.querySelectorAll('.job-card')].some((c) => c.textContent.includes('Sarah Chen') && c.textContent.includes('Confirmed')));
await assertTrue('the request card carries its own timer', () => document.querySelectorAll('[data-timer]').length === 1);
await assertTrue('R3-T-03: live request card reads $120 · 1 item', () => document.querySelector('.req-card__name b').textContent === '$120' && document.querySelector('.req-card__count')?.textContent === '· 1 item');
await page.click('.req-card[data-req="0"] [data-act="view-details"]');
await assertAt('View Details on the fresh request', 't02-appointment-request', 'searching');
await assertText('T02 renders the tapped job ($120)', '.t-header .t-title', '$120 | New Request');
await page.click('[data-act="back"]');
await page.click('[data-act="open-job"]');
await assertAt('the seed job card still opens its pre-visit T03', 't03-request-accepted', 'confirmed');
await assertTrue('T03 renders the seed (Jul 12)', () => /Sun, Jul 12/.test(document.querySelector('.t-header .t-body').textContent));
await page.click('.top-nav [data-nav="t-calendar"]');
await assertAt('Calendar tab → the soonest open job (seed)', 't03-request-accepted', 'confirmed');

/* ---------- R2-T-11: browser back after Accept never re-offers Accept ---------- */
await render('t01-home');
await page.click('.req-card[data-req="0"] [data-act="view-details"]');
await page.click('[data-act="accept"]');
await assertAt('Accept the fresh request', 't03-request-accepted', 'confirmed');
await assertJob('R7: the fresh job’s accepted payout is $120', 'fresh', (a) => a.tailor.acceptedPayout === 120);
await page.goBack();
await assertAt('browser back after Accept lands on T01, not T02', 't01-home', 'confirmed');
await page.click('[data-act="open-job"][data-job="0"]');
await render('t02-appointment-request');
await assertText('T02 for an accepted job reads Accepted', '.t-actions .cta', 'Accepted');
await assertTrue('…with no Decline', () => !document.querySelector('[data-act="decline"]'));
await page.click('[data-act="accept"]');
await assertAt('inert Accepted stays on T02', 't02-appointment-request', 'confirmed');
await assertTrue('…and toasts Already accepted', () => document.querySelector('.toast')?.textContent === 'Already accepted');

/* ---------- R2-T-08: removing a booked garment at the visit ---------- */
await render('t01-home');
await page.click('[data-act="open-job"][data-job="0"]');
await assertAt('open the fresh confirmed job', 't03-request-accepted', 'confirmed');
await page.click('[data-act="start"]');
await page.click('[data-act="add-garment"]');
await page.waitForTimeout(200);
await page.click('[data-act="remove-garment"][data-gi="0"]');
await page.waitForTimeout(200);
await assertTrue('booked garment removed, added one kept', () => document.querySelectorAll('.garment-card').length === 1);
await page.click('[data-act="continue"]');
await assertAt('T05 after a removal', 't05-confirm-final-pricing', 'confirmed');
await assertTrue('T05 marks the survivor as added (by id, not index)', () => document.querySelectorAll('.garment-card--info').length === 1);
await assertTrue('T05 lists the removed booked garment', () => /Removed at the visit — Suit Jacket · Hem \/ Adjust Length/.test(document.querySelector('.t-removed')?.textContent ?? '') && !!document.querySelector('.t-removed s'));
await assertTrue('R7: a lowered scope reads "Payout $120 → $80 (−$40)" before Send', () => document.querySelector('[data-payout-change]')?.textContent === 'Payout $120 → $80 (−$40)' && document.querySelector('.fee-row__price').textContent === '$80');
await page.click('[data-act="send"]');
await assertAt('Send after a removal', 't06-appointment-status', 'awaiting-approval');
await assertJob('a.removed carries the dropped Hem; item summary refreshed', 'fresh', (a) => a.removed?.length === 1 && a.removed[0].jobs[0] === 'Hem / Adjust Length' && a.garments.length === 1 && a.count === 1);
await assertJob('R7: accepted payout follows the sent order ($80)', 'fresh', (a) => a.tailor.acceptedPayout === 80);

/* ---------- R2-T-09: Request Changes leaves a trace ---------- */
await render('04-review-approve-modified');
await assertAt('customer reviews the modified order', '04-review-approve-modified', 'awaiting-approval', 'user');
await page.click('[data-act="changes"]');
await page.waitForTimeout(400);
await page.click('[data-act="sounds-good"]');
await page.waitForTimeout(500);
await assertJob('changesRequestedAt stamped', 'fresh', (a) => !!a.changesRequestedAt);
await render('t06-appointment-status');
await assertTrue('T06 says Sarah wants to talk it over; Message Sarah leads', () => /talk the order over/.test(document.querySelector('.t-header .t-body').textContent) && document.querySelector('.t-actions .cta').textContent === 'Message Sarah');
await render('t01-home');
await assertTrue('T01 card reads Sarah has questions', () => [...document.querySelectorAll('.job-card')].some((c) => c.textContent.includes('Sarah has questions')));
await render('10-messages');
await assertTrue('tailor chat pill uses the tailor vocabulary', () => document.querySelector('.chat-head .pill')?.textContent.trim() === 'Awaiting Customer');
await page.click('[data-act="back"]');

/* ---------- R2-T-02: the customer browsing a past booking never redirects a tailor transition ---------- */
await render('09-bookings');
await page.evaluate(() => { window.Taily.state.currentAppt = { list: 'past', index: window.Taily.state.past.length - 1 }; });
await render('t06-appointment-status');
await page.click('[data-act="ready"]');
await assertAt('Mark Ready acts on the tailor’s job, not the customer’s currentAppt', 't07-job-ready', 'ready-for-pickup');
await assertJob('approval cleared the changes stamp', 'fresh', (a) => !a.changesRequestedAt && a.status === 'ready-for-pickup');
await assertTrue('T07 waits for the handoff choice', () => document.body.textContent.includes('Not scheduled yet'));
await render('t06-appointment-status');
await assertTrue('T06 ready line waits for Sarah', () => /waiting for Sarah to schedule the handoff/.test(document.querySelector('.t-header .t-body').textContent));

/* ---------- R2-T-10: delivery vocabulary ---------- */
await page.evaluate(() => { const a = window.Taily.state.upcoming.find((x) => x.mine && x.when !== 'Sunday Jul 12, 7PM'); a.fulfilment = { method: 'delivery', window: 'Thu, Jul 16 · 9–11 AM', date: 'Jul 16' }; });
await render('t01-home');
await assertTrue('T01 pill reads Ready for Delivery', () => [...document.querySelectorAll('.job-card')].some((c) => c.textContent.includes('Ready for Delivery')));
await render('10-messages');
await assertTrue('chat subline dates the handoff by the chosen window', () => document.querySelector('.chat-head__names .t-small').textContent === 'Ready for delivery · Thu, Jul 16');
await assertTrue('chat pill reads Ready for Delivery', () => document.querySelector('.chat-head .pill')?.textContent.trim() === 'Ready for Delivery');

/* ---------- R3-T-04: payout date + order id are the job's own ---------- */
await page.evaluate(() => { const a = window.Taily.state.upcoming.find((x) => x.mine && x.when !== 'Sunday Jul 12, 7PM'); a.fulfilment = null; });
await render('t07-job-ready');
await page.click('[data-act="picked-up"]');
await assertAt('fresh job handed off (demo pickup)', 't08-job-complete', 'delivered');
await assertTrue('T08 dates the payout from the handoff (+4 → weekday, not Jul 20) and reads TLY-2026-4418', async () => {
  const D = await import('/js/data.js');
  const a = window.Taily.state.upcoming.find((x) => x.mine && x.when !== 'Sunday Jul 12, 7PM');
  const note = document.querySelector('.payout-summary__note').textContent;
  const d = D.parseWhen(note.split('· ').pop())?.date; const h = D.parseWhen(a.deliveredAt)?.date;
  const diff = d && h ? Math.round((d - h) / 864e5) : -1;
  return !/Jul 20/.test(note) && diff >= 4 && diff <= 6 && ![0, 6].includes(d.getDay()) && document.querySelector('.payout-summary__title').textContent.includes('TLY-2026-4418') && a.orderId === 'TLY-2026-4418';
});
await render('t06-appointment-status');
await assertTrue('T06 delivered line carries the same payout date', async () => {
  const D = await import('/js/data.js');
  const a = window.Taily.state.upcoming.find((x) => x.mine && x.when !== 'Sunday Jul 12, 7PM');
  return document.querySelector('.t-header .t-body').textContent === `Completed · payout $80 on ${D.payoutDate(a)}.` && !/Jul 20/.test(D.payoutDate(a));
});

/* ---------- R2-T-03: expiry (timer-strip demo) ---------- */
await open('01-home');
await bookFresh();
await page.click('#persona-toggle');
await assertAt('fresh request on T01', 't01-home', 'searching', 'tailor');
/* R3-T-02c: a proposal still out when the request lapses is kept on the record */
await page.evaluate(async () => { const S = await import('/js/state.js'); const a = window.Taily.state.upcoming.find((x) => x.mine && x.when !== 'Sunday Jul 12, 7PM'); S.proposeTime(a, a.when); });
await render('t01-home');
await page.click('.req-card[data-req="0"] [data-act="time-passes"]');
await assertAt('time passes → stays on T01', 't01-home');
await assertTrue('toast: Sarah’s request expired', () => document.querySelector('.toast')?.textContent === 'Sarah’s request expired');
await assertTrue('request card gone; Expired row under Active Jobs, no payout', () => { const c = [...document.querySelectorAll('.job-card')].find((x) => x.textContent.includes('Expired')); return document.querySelectorAll('.req-card').length === 0 && c && c.textContent.includes('No action needed') && !c.querySelector('.job-card__payout'); });
await assertJob('expired job moved to past', 'fresh', (a, s) => a.status === 'expired' && s.past.includes(a) && !s.upcoming.includes(a));
await assertJob('a.lapsedProposal stashed, a.proposed cleared', 'fresh', (a) => !!a.lapsedProposal?.when && a.proposed == null);
await assertTrue('Expired row under Done today says the proposal went unanswered', () => { const c = document.querySelector('.t-done .job-card--closed'); return c && c.textContent.includes('Request lapsed — your proposal went unanswered') && c.textContent.includes('Expired'); });
await page.click('.job-card:has-text("Expired")');
await assertAt('Expired row opens T02', 't02-appointment-request', 'expired');
await assertTrue('T02 for an expired job offers no Accept / Decline', () => !document.querySelector('[data-act="accept"]') && !document.querySelector('[data-act="decline"]') && /Request Expired/.test(document.querySelector('.t-header .t-title').textContent));
/* R7-T-02: the lapsed money is "Payout offered", muted; the header keeps the amount */
await assertTrue('R7-T-02: T02 expired money row = muted "Payout offered", header keeps $120 | Request Expired', () => { const r = document.querySelector('.fee-row'); return r.classList.contains('fee-row--muted') && `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}` === '$120 Payout offered' && document.querySelector('.t-header .t-title').textContent === '$120 | Request Expired' && getComputedStyle(r.querySelector('.fee-row__price')).color === 'rgb(133, 124, 111)'; });
await page.click('#persona-toggle');
await assertAt('customer home survives an expired job', '01-home', undefined, 'user');
await assertJob('…and the expired job is still expired', 'fresh', (a) => a.status === 'expired');

/* ---------- R2-T-04: suggest another time ---------- */
await open('01-home');
await bookFresh();
await page.click('#persona-toggle');
await page.click('.req-card[data-req="0"] [data-act="decline"]');
await assertAt('Decline from the fresh request', 't03a-decline-request', 'searching');
await page.click('[data-reason="0"]');
await assertText('Schedule conflict → Suggest Another Time', '[data-act="decline"]', 'Suggest Another Time');
await page.click('[data-act="decline"]');
await page.waitForTimeout(500);
await assertTrue('the time wheel opens, titled for a proposal', () => document.querySelector('.screen-sheet--overlay .sheet__title')?.textContent === 'Suggest another time');
/* R3-T-01: the wheel stops at Sarah's need-by (the visit day + the next day here); the substrate refuses anything later */
await assertTrue('proposal days bounded by the need-by; a later day is refused', async () => {
  const D = await import('/js/data.js'); const S = await import('/js/state.js');
  const a = window.Taily.state.upcoming.find((x) => x.mine && x.when !== 'Sunday Jul 12, 7PM');
  const days = D.proposalDays(a);
  const late = `${D.shiftDay(a.needBy, 3).replace(/^\w+, /, '')}, 10:00 AM`;
  return days.length === 2 && S.proposeTime(a, late) === false && a.proposed == null;
});
await page.evaluate(() => { document.querySelector('.screen-sheet--overlay .wheel__col--scroll').scrollTop += 40; });
await page.waitForTimeout(300);
await page.click('.screen-sheet--overlay [data-act="set-time"]');
await assertAt('proposal lands on T01', 't01-home', 'searching');
await assertJob('a.proposed set by the tailor; timer restarted', 'fresh', (a) => a.proposed?.by === 'tailor' && !!a.proposed.when && a.tailor.expiresAt > Date.now() + 80 * 60000);
await assertTrue('request card reads Time proposed … waiting for Sarah + Withdraw, no Decline', () => { const c = document.querySelector('.req-card[data-req="0"]'); return /Time proposed · .* — waiting for Sarah/.test(c.textContent) && !!c.querySelector('[data-act="withdraw"]') && !c.querySelector('[data-act="decline"]'); });
await page.click('.req-card[data-req="0"] [data-act="withdraw"]');
await assertAt('Withdraw the proposal', 't01-home', 'searching');
await assertTrue('R3-T-02a: card returns with Decline and says You withdrew your proposed time', () => { const c = document.querySelector('.req-card[data-req="0"]'); return !!c.querySelector('[data-act="decline"]') && c.textContent.includes('You withdrew your proposed time') && !c.textContent.includes('Sarah kept') && document.querySelector('.toast')?.textContent === 'Proposal withdrawn'; });
await assertJob('proposalDeclined records the tailor', 'fresh', (a) => a.proposalDeclined?.by === 'tailor' && !!a.proposalDeclined.when);
/* propose again, then the customer accepts */
await page.click('.req-card[data-req="0"] [data-act="decline"]');
await page.click('[data-reason="0"]');
await page.click('[data-act="decline"]');
await page.waitForTimeout(500);
await page.click('.screen-sheet--overlay [data-act="set-time"]');
await assertAt('second proposal', 't01-home', 'searching');
/* R3-T-02b: T02 while the proposal is out — Withdraw Proposal leads, no Accept */
await page.click('.req-card[data-req="0"] [data-act="view-details"]');
await assertAt('T02 while a proposal is pending', 't02-appointment-request', 'searching');
await assertTrue('T02 offers Withdraw Proposal + Decline and no Accept', () => { const c = [...document.querySelectorAll('.t-actions .cta')].map((e) => e.textContent); return c[0] === 'Withdraw Proposal' && c[1] === 'Decline' && !document.querySelector('[data-act="accept"]') && /You proposed .* — waiting for Sarah/.test(document.body.textContent); });
await render('t01-home');
const proposedWhen = await page.evaluate(() => window.Taily.state.upcoming.find((a) => a.mine && a.when !== 'Sunday Jul 12, 7PM').proposed.when);
await page.evaluate(async () => { const S = await import('/js/state.js'); const a = window.Taily.state.upcoming.find((x) => x.mine && x.when !== 'Sunday Jul 12, 7PM'); S.acceptProposedTime(a.proposed.when, a); });
await render('t01-home');
await assertAt('Sarah accepts the proposed time', 't01-home', 'confirmed');
await page.evaluate((w) => { window.__when = w; }, proposedWhen);
await assertJob('a.when is the proposed time; proposal cleared', 'fresh', (a) => a.when === window.__when && a.proposed == null);
await assertTrue('request card became the job card', () => document.querySelectorAll('.req-card').length === 0 && [...document.querySelectorAll('.job-card')].filter((c) => c.textContent.includes('Sarah Chen') && c.textContent.includes('Confirmed')).length === 2);

/* ---------- R2-T-05: can't make it / no-show → T03B ---------- */
/* R3-T-05: push the fresh visit a day ahead — a no-show can't be marked before the visit */
await page.evaluate(async () => { const D = await import('/js/data.js'); const a = window.Taily.state.upcoming.find((x) => x.mine && x.when !== 'Sunday Jul 12, 7PM'); const day = (n) => D.shiftDay(a.when, n).replace(/^\w+, /, ''); a.needBy = `${day(2)}, 9:30 AM`; a.when = `${day(1)}, 9:30 AM`; });
await render('t01-home');
await page.click('[data-act="open-job"][data-job="0"]');
await assertAt('open the freshly confirmed job', 't03-request-accepted', 'confirmed');
await assertTrue('pre-visit view offers Can’t make it', () => !!document.querySelector('[data-act="cant-make-it"]'));
await page.click('[data-act="cant-make-it"]');
await page.waitForTimeout(400);
await assertTrue('modal: no consequence yet, Confirm unnamed, no-show gated on the visit time', () => document.querySelector('[data-consequence]').hidden && document.querySelector('[data-reason="no-show"]').disabled && /Available after/.test(document.querySelector('[data-reason="no-show"]').textContent) && document.querySelector('[data-act="confirm-cancel"]').textContent === 'Confirm');
await page.click('[data-act="confirm-cancel"]');
await assertAt('confirm without a reason stays put', 't03-request-accepted', 'confirmed');
await page.click('[data-reason="cant-make-it"]');
await assertTrue('modal states the consequence (R7 rule-literal: job + slot, nothing about Sarah’s fee) and names the action', () => document.querySelector('[data-consequence]').textContent === 'The job closes, Sarah is notified and your slot reopens.' && !document.querySelector('[data-consequence]').hidden && document.querySelector('[data-act="confirm-cancel"]').textContent === 'Cancel Job');
await assertClean('R7: T03.1 modal');
await page.click('[data-act="confirm-cancel"]');
await assertAt('I need to cancel → T03B', 't03b-job-cancelled', 'cancelled');
await assertTrue('T03B reads You cancelled this job + Sarah’s been notified + the live slot (no fee)', () => document.querySelector('.status-hero__title').textContent === 'You cancelled this job.' && /^Sarah’s been notified\. Your .* slot is open again\.$/.test(document.querySelector('.status-hero__body').textContent) && !/hold|\$|fee/i.test(document.querySelector('.status-hero__body').textContent));
await assertClean('R7: T03B (by you)');
await assertJob('tailor cancel stamped and moved to past', 'fresh', (a, s) => a.status === 'cancelled' && a.cancelledBy === 'tailor' && a.reason === 'cant-make-it' && s.past.includes(a));
/* R3-T-06: T03B's View Calendar behaves like the Calendar tab (the seed is still confirmed) */
await page.click('[data-act="calendar"]');
await assertAt('View Calendar → the soonest job on the calendar (seed pre-visit)', 't03-request-accepted', 'confirmed');
await assertTrue('…the seed’s Jul 12 visit', () => /Jul 12/.test(document.querySelector('.t-header .t-body').textContent));
await render('t01-home');
await assertTrue('T01: Cancelled · by you sits under Done today, muted, no payout; Active Jobs has no closed rows', () => { const c = document.querySelector('.t-done .job-card--closed'); return c && c.textContent.includes('Cancelled · by you') && !c.querySelector('.job-card__payout') && !document.querySelector('.t-actions:not(.t-done) .job-card--closed'); });
await page.click('#persona-toggle');
await assertAt('customer sees the tailor cancellation', '01-home', undefined, 'user');
await assertJob('…the fresh job is the cancelled one', 'fresh', (a) => a.status === 'cancelled' && a.cancelledBy === 'tailor');
/* no-show on the seed */
await open('t01-home');
await page.click('[data-act="view-details"]');
await page.click('[data-act="accept"]');
await page.click('[data-act="home"]');
await page.click('[data-act="open-job"]');
await page.click('[data-act="cant-make-it"]');
await page.waitForTimeout(400);
await page.click('[data-reason="no-show"]');
/* R7 (rule-literal): the no-show line never mentions Sarah's fee, locked or not */
await assertTrue('R3-T-05 / R7: no-show available on the seed (Jul 12 counts as today), consequence = job + notice only, Mark No-show', () => !document.querySelector('[data-reason="no-show"]').disabled && document.querySelector('[data-consequence]').textContent === 'The job closes and Sarah is notified.' && document.querySelector('[data-act="confirm-cancel"]').textContent === 'Mark No-show');
await assertClean('R7: T03.1 modal (no-show)');
await page.click('[data-act="confirm-cancel"]');
await assertAt('Sarah didn’t show → T03B', 't03b-job-cancelled', 'cancelled');
await assertTrue('T03B no-show copy (R7 rule-literal: nothing about the fee)', () => document.querySelector('.status-hero__title').textContent === 'Sarah didn’t show.' && document.querySelector('.status-hero__body').textContent === 'The job is closed and the slot is open again.');
await assertClean('R7: T03B (no-show)');
await page.click('[data-act="calendar"]');
await assertTrue('T01 row reads No-show', () => [...document.querySelectorAll('.job-card')].some((c) => c.textContent.includes('No-show')));

/* ---------- R2-T-06: a withdrawn request is not a closed job ---------- */
await open('01-home');
await bookFresh();
await page.click('[data-act="cancel"]');
await page.waitForTimeout(400);
await page.click('[data-act="confirm-reschedule"]');
await assertAt('customer withdraws the fresh request', '03-status-cancelled', undefined, 'user');
await assertJob('withdrawn: cancelled + wasRequested', 'fresh', (a) => a.status === 'cancelled' && a.wasRequested === true);
await page.click('#persona-toggle');
await assertTrue('T01 row reads Withdrawn · No action needed, no payout', () => { const c = [...document.querySelectorAll('.job-card')].find((x) => x.textContent.includes('Withdrawn')); return c && c.textContent.includes('No action needed') && !c.querySelector('.job-card__payout'); });
await page.click('.job-card:has-text("Withdrawn")');
await assertAt('Withdrawn row opens T03B', 't03b-job-cancelled', 'cancelled');
await assertTrue('T03B reads Request withdrawn', () => document.querySelector('.status-hero__title').textContent === 'Request withdrawn.' && /withdrew her .* request before you accepted\. Nothing to do\./.test(document.querySelector('.status-hero__body').textContent));
/* a confirmed non-seed cancel names its own slot */
await open('01-home');
await bookFresh();
await page.click('#persona-toggle');
await page.click('.req-card[data-req="0"] [data-act="view-details"]');
await page.click('[data-act="accept"]');
await page.click('#persona-toggle');
await page.click('.appt-card');
await page.click('[data-act="reschedule"]');
await page.waitForTimeout(400);
await page.click('[data-act="confirm-reschedule"]');
await assertAt('customer cancels the confirmed fresh visit', '02-appointment-details', undefined, 'user');   // R6: reschedule lands on 02
await page.click('#persona-toggle');
await page.click('.job-card:has-text("Slot reopened")');
await assertAt('Cancelled row opens T03B', 't03b-job-cancelled', 'cancelled');
await assertTrue('T03B names the live slot, not tonight', () => /your .* slot is open on your calendar again/.test(document.querySelector('.status-hero__body').textContent) && !/tonight/.test(document.querySelector('.status-hero__body').textContent));

/* ---------- R4-T-01 / R4-T-04: the need-by HOUR cap and the no-slot line ---------- */
/* a same-day need-by: visit 9:30 AM, need-by 11:00 AM the same day → one wheel day, hours 9 / 10 AM only */
await open('01-home');
await bookFresh();
await page.evaluate(() => { const a = window.Taily.state.upcoming.find((x) => x.mine && x.status === 'searching'); a.needBy = `${a.when.split(',')[0]}, 11:00 AM`; });
await page.click('#persona-toggle');
await assertAt('View as Tailor (same-day need-by)', 't01-home', 'searching', 'tailor');
await page.click('.req-card[data-req="0"] [data-act="decline"]');
await page.click('[data-reason="0"]');
await assertText('Schedule conflict still offers Suggest Another Time (a slot before 11 AM exists)', '[data-act="decline"]', 'Suggest Another Time');
await assertTrue('no-slot line hidden while a slot fits', () => document.querySelector('[data-no-slot]').hidden);
await page.click('[data-act="decline"]');
await page.waitForTimeout(500);
await assertTrue('R4-T-01: the wheel offers one day and only the hours before the need-by time', () => {
  const cols = [...document.querySelectorAll('.screen-sheet--overlay .wheel__col--scroll')];
  const read = (c) => [...c.querySelectorAll('.wheel__row')].map((e) => e.textContent.trim());
  return read(cols[0]).length === 1 && read(cols[1]).join('|') === '9 AM|10 AM' && read(cols[2]).length === 4;
});
await assertTrue('  …CTA quotes a capped slot', () => /at 10:00 AM$/.test(document.querySelector('.screen-sheet--overlay [data-act="set-time"]').textContent));
await page.click('.screen-sheet--overlay [data-act="set-time"]');
await assertAt('same-day proposal lands on T01', 't01-home', 'searching');
await assertJob('a.proposed is on the visit day, before the need-by time', 'fresh', (a) => a.proposed?.when === `${a.when.split(',')[0]}, 10:00 AM`);
/* the substrate refuses a same-day slot at / after the need-by time, from T03A's own wheel path */
await assertTrue('proposeTime refuses 11:00 AM / 2:00 PM on the need-by day, accepts 9:00 AM', async () => {
  const S = await import('/js/state.js');
  const a = window.Taily.state.upcoming.find((x) => x.mine && x.status === 'searching');
  const md = a.when.split(',')[0];
  const keep = a.proposed;
  const r = [S.proposeTime(a, `${md}, 11:00 AM`), S.proposeTime(a, `${md}, 2:00 PM`), S.proposeTime(a, `${md}, 9:00 AM`)];
  a.proposed = keep;
  return r[0] === false && r[1] === false && r[2] === true;
});
/* R4-T-04: nothing before the need-by fits (visit 7 AM, need-by 8 AM — studio hours start at 9) → the no-slot line, Decline Request stays primary */
await page.click('.req-card[data-req="0"] [data-act="withdraw"]');
await assertAt('Withdraw the same-day proposal', 't01-home', 'searching');
await page.evaluate(() => { const a = window.Taily.state.upcoming.find((x) => x.mine && x.status === 'searching'); const md = a.when.split(',')[0]; a.when = `${md}, 7:00 AM`; a.needBy = `${md}, 8:00 AM`; });
await render('t01-home');
await page.click('.req-card[data-req="0"] [data-act="decline"]');
await assertAt('Decline on the no-slot request', 't03a-decline-request', 'searching');
await assertTrue('proposalDays() is empty for this request', async () => { const D = await import('/js/data.js'); const a = window.Taily.state.upcoming.find((x) => x.mine && x.status === 'searching'); return D.proposalDays(a).length === 0; });
await page.click('[data-reason="0"]');
await assertText('R4-T-04: Schedule conflict keeps Decline Request when no slot fits', '[data-act="decline"]', 'Decline Request');
await assertTrue('  …the no-slot line shows and names the need-by', () => { const l = document.querySelector('[data-no-slot]'); return !l.hidden && /^Sarah needs these by \w{3}, \w{3,4} \d{1,2} — no later slot to offer$/.test(l.textContent.trim()); });
await page.click('[data-act="decline"]');
await assertAt('Decline Request → T01', 't01-home', 'declined');
await assertJob('the request is declined', 'fresh', (a) => a.status === 'declined');

/* ---------- R4-T-03: a stale T05 / T06 for a job that closed meanwhile ---------- */
await open('01-home');
await bookFresh();
await page.click('#persona-toggle');
await page.click('[data-act="view-details"]');
await page.click('[data-act="accept"]');
await assertAt('accept the fresh request', 't03-request-accepted', 'confirmed');
/* the pre-visit view (Start Appointment) is the job card's T03, not the just-accepted one */
await render('t01-home');
await page.evaluate(() => [...document.querySelectorAll('[data-act="open-job"]')].find((c) => c.textContent.includes('Confirmed') && !c.textContent.includes('JUL'))?.click());
await assertAt('open the fresh job → T03 pre-visit', 't03-request-accepted', 'confirmed');
await page.click('[data-act="start"]');
await assertAt('Start Appointment → T04', 't04-appointment-details', 'confirmed');
await page.click('[data-act="continue"]');
await assertAt('Continue → T05', 't05-confirm-final-pricing', 'confirmed');
/* Sarah cancels the confirmed visit meanwhile (the substrate, as her 03.1 would) */
await page.evaluate(async () => { const S = await import('/js/state.js'); const a = window.Taily.state.upcoming.find((x) => x.mine && x.status === 'confirmed' && x.when !== 'Sunday Jul 12, 7PM'); S.cancelAppointment(a); });
await page.click('[data-act="send"]');
await page.waitForTimeout(300);
await assertTrue('R4-T-03: Send on a closed job says it is off the calendar (not "already sent")', () => document.querySelector('.toast')?.textContent === 'This job is no longer on your calendar');
await assertAt('  …and leaves the editor for T01', 't01-home', 'cancelled');
await assertTrue('  …T01 replaced the stale editor (back does not return to T05)', () => { window.Taily.back(); return document.getElementById('screen').dataset.screen !== 't05-confirm-final-pricing'; });
await assertJob('nothing was written to the cancelled job', 'fresh', (a) => a.status === 'cancelled' && !a.revisedAt);
/* R5-T-01/02: T06 / T04 / T05 for a closed job redirect on render (no
   editor is drawn, so there is no Mark Ready to click) */
for (const id of ['t06-appointment-status', 't04-appointment-details', 't05-confirm-final-pricing']) {
  await render(id);
  await page.waitForTimeout(300);
  await assertTrue(`R5-T-01/02: ${id} for a closed job says it is off the calendar`, () => document.querySelector('.toast')?.textContent === 'This job is no longer on your calendar');
  await assertAt('  …and lands on T01 without drawing the screen', 't01-home', 'cancelled');
}

/* ============================================================
   UX-LOOP round 6 — Kevin's decisions (tailor side)
   ============================================================ */

/* ---------- R6 / R7: T02 rows — visit type + distance; ONE money row, the payout (seed fixture, then a fresh live job) ---------- */
await open('t02-appointment-request');
await assertTrue('R6: T02 fixture first row reads the frame copy', () => [...document.querySelectorAll('.summary-card__row')][0]?.textContent.replace(/ /g, ' ').trim() === '◉  88 Leonard Street, 4B · Home visit · 1.2 mi');
await assertTrue('R7: T02 fixture money = "$200 Your payout" only (no Subtotal, no Taily Fee)', () => [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ') === '$200 Your payout');
await assertText('R7: T02 fixture CTA', '[data-act="accept"]', 'Accept Request · $200');
for (const id of ['t02-accepted', 't02-expired']) {
  await open(id);
  const wantRow = id === 't02-expired' ? '$200 Payout offered' : '$200 Your payout';   // R7-T-02: the Expired sibling's row is the muted "Payout offered"
  await page.evaluate(([w, m]) => { window.__wantRow = w; window.__wantMuted = m; }, [wantRow, id === 't02-expired']);
  await assertTrue(`R6: ${id} fixture carries the same rows`, () => [...document.querySelectorAll('.summary-card__row')][0]?.textContent.replace(/ /g, ' ').trim() === '◉  88 Leonard Street, 4B · Home visit · 1.2 mi' && [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ') === window.__wantRow && (!window.__wantMuted || document.querySelector('.fee-row').classList.contains('fee-row--muted')));
}
await open('01-home');
await bookFresh();
await page.click('#persona-toggle');
await page.click('.req-card[data-req="0"] [data-act="view-details"]');
await assertAt('R6: T02 for the fresh live request', 't02-appointment-request', 'searching');
await assertTrue('R6: live first row = live address · visit type · 1.2 mi', () => [...document.querySelectorAll('.summary-card__row')][0]?.textContent.replace(/ /g, ' ').trim() === '◉  88 Leonard St, 4B · Home visit · 1.2 mi');
await assertTrue('R7: live money row from the $120 booking = "$120 Your payout"', () => [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | ') === '$120 Your payout');
await render('t03-request-accepted');
await assertTrue('R6 / R7: T03 rows are unchanged (no visit type on the shared card); one money row', () => !/Home visit · 1\.2 mi/.test(document.querySelector('.summary-card').textContent) && !document.body.textContent.includes('Subtotal') && document.querySelectorAll('.fee-row').length === 1);

/* ---------- R6: T03A "Other" reveals a note; Decline stores a.declineNote ---------- */
await render('t01-home');
await page.click('.req-card[data-req="0"] [data-act="decline"]');
await assertAt('R6: Decline the fresh request', 't03a-decline-request', 'searching');
await assertTrue('R6: note hidden until Other is chosen', () => document.querySelector('[data-act="decline-note"]').hidden);
await page.click('[data-reason="4"]');
await assertTrue('R6: Other reveals the textarea with its placeholder', () => { const t = document.querySelector('[data-act="decline-note"]'); return !t.hidden && t.placeholder === 'Tell us more (optional)' && document.querySelector('[data-act="decline"]').textContent === 'Decline Request'; });
await page.click('[data-reason="1"]');
await assertTrue('R6: another reason hides it again', () => document.querySelector('[data-act="decline-note"]').hidden);
await page.click('[data-reason="4"]');
await page.fill('[data-act="decline-note"]', 'Booked solid this week');
await page.click('[data-act="decline"]');
await assertAt('R6: Decline with Other → T01', 't01-home', 'declined');
await assertJob('R6: a.declineNote stored on the declined job', 'fresh', (a) => a.status === 'declined' && a.declineNote === 'Booked solid this week');
/* the fixture route module (js/screens/t03a-other.js) is registered by app.js's SCREEN_MODULES — skip until it is */
await open('t03a-other');
if (await page.evaluate(() => window.Taily.registered().includes('t03a-other'))) {
  await assertTrue('R6: t03a-other fixture draws Other selected + the note field', () => document.querySelector('[data-reason="4"]').classList.contains('radio-row--selected') && !document.querySelector('[data-act="decline-note"]').hidden && document.querySelector('[data-act="decline-note"]').placeholder === 'Tell us more (optional)');
} else {
  console.log('SKIP  R6: t03a-other is not in app.js SCREEN_MODULES yet (orchestrator registers it)');
}
await open('t03a-decline-request');
await assertTrue('R6: the base T03A fixture keeps the first row + no note field', () => document.querySelector('[data-reason="0"]').classList.contains('radio-row--selected') && document.querySelector('[data-act="decline-note"]').hidden);

/* ---------- R6: canned Taily Support chat from T04 ---------- */
await open('t01-home');
await page.click('[data-act="view-details"]');
await page.click('[data-act="accept"]');
await page.click('[data-act="home"]');
await page.click('[data-act="open-job"]');
await page.click('[data-act="start"]');
await assertAt('R6: at the visit (T04)', 't04-appointment-details', 'confirmed');
await page.click('[data-act="support"]');
await assertAt('R6: Contact Taily Support → 10-messages', '10-messages', 'confirmed', 'tailor');
await assertTrue('R6: support head — TS / Taily Support / Usually replies in 10 min / no pill', () => document.querySelector('.body').dataset.thread === 'support' && document.querySelector('.chat-head__avatar').textContent === 'TS' && document.querySelector('.chat-head__names span').textContent === 'Taily Support' && document.querySelector('.chat-head__names .t-small').textContent === 'Usually replies in 10 min' && !document.querySelector('.chat-head .pill'));
await assertTrue('R6: one seed bubble from Support, on their side', () => { const b = [...document.querySelectorAll('.bubble')]; return b.length === 1 && b[0].textContent === 'Hi Marco — Taily Support here. How can we help with this visit?' && !b[0].classList.contains('bubble--me'); });
await page.fill('.composer__input', 'Sarah’s buzzer is broken');
await page.keyboard.press('Enter');
await page.waitForTimeout(200);
await assertTrue('R6: Marco’s message sits on his side', () => { const b = [...document.querySelectorAll('.bubble')]; return b.length === 2 && b[1].classList.contains('bubble--me'); });
await page.waitForTimeout(1300);
await assertTrue('R6: canned support reply lands', () => { const b = [...document.querySelectorAll('.bubble')]; return b.length === 3 && b[2].textContent === 'Thanks, we’re on it. A specialist will reply within 10 minutes.' && !b[2].classList.contains('bubble--me'); });
await assertTrue('R6: thread stored on state.chats.support with absolute authors; the job thread untouched', () => { const c = window.Taily.state.chats; return c.support.map((m) => m.who).join(',') === 'support,tailor,support' && !c['Marco Tailor']; });
await page.click('[data-act="back"]');
await assertAt('R6: back returns to T04', 't04-appointment-details', 'confirmed');
await page.click('[data-act="back"]');
await page.click('[data-act="message"]');
await assertAt('R6: Message Sarah after the support chat', '10-messages', 'confirmed', 'tailor');
await assertTrue('R6: …opens Sarah’s thread, not support', () => !document.querySelector('.body').dataset.thread && document.querySelector('.chat-head__avatar').textContent === 'SC' && document.querySelector('.chat-head__names span').textContent === 'Sarah Chen' && !!document.querySelector('.chat-head .pill'));
await open('10-messages');
await assertTrue('R6: the ?screen=10-messages deep link is unchanged (customer, Marco’s thread)', () => window.Taily.state.persona === 'user' && document.querySelector('.chat-head__names span').textContent === 'Marco Tailor' && document.querySelector('.chat-head__avatar').textContent === 'MT');

/* ---------- R7: refund policy on the tailor side — the fee is Taily's; the tailor only learns whether it is refunded or kept, never its amount ---------- */
async function bookAndAccept() {
  await open('01-home');
  await bookFresh();
  await page.click('#persona-toggle');
  await page.click('.req-card[data-req="0"] [data-act="view-details"]');
  await page.click('[data-act="accept"]');
  await assertAt('R7: fresh job accepted', 't03-request-accepted', 'confirmed');
}
/* re-date the fresh confirmed job `hoursAhead` from now (the prototype's
   "Sept 10, 9:00 PM" grammar) and let Sarah cancel it through the substrate */
async function cancelFreshIn(hoursAhead) {
  await page.evaluate(async (hours) => {
    const D = await import('/js/data.js'); const S = await import('/js/state.js');
    const a = window.Taily.state.upcoming.find((x) => x.mine && x.status === 'confirmed' && x.when !== 'Sunday Jul 12, 7PM');
    const d = new Date(Date.now() + hours * 3600e3);
    const md = D.shiftDay(d.toDateString(), 0).replace(/^\w+, /, '');
    const h12 = ((d.getHours() + 11) % 12) + 1;
    a.when = `${md}, ${h12}:00 ${d.getHours() >= 12 ? 'PM' : 'AM'}`;
    a.needBy = `${D.shiftDay(d.toDateString(), 1).replace(/^\w+, /, '')}, 11:59 PM`;
    window.__r7 = S.cancelAppointment(a);
  }, hoursAhead);
}
/* Sarah confirms the visit on her 24-hour prompt (substrate: confirmAppointment → feeLocked) */
async function confirmFresh() {
  const ok = await page.evaluate(async () => {
    const S = await import('/js/state.js');
    const a = window.Taily.state.upcoming.find((x) => x.mine && x.status === 'confirmed' && x.when !== 'Sunday Jul 12, 7PM');
    if (typeof S.confirmAppointment === 'function') S.confirmAppointment(a);
    else { console.warn('confirmAppointment() not available yet — stamping feeLocked for the tailor-side check'); a.feeLocked = true; a.confirmedAt = 'now'; }
    return a.feeLocked === true;
  });
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  R7: Sarah confirms the visit (feeLocked)`);
}
/* a customer cancel, confirmed or not: T03B never mentions the fee */
await bookAndAccept();
await cancelFreshIn(2);
await assertJob('R7: an unconfirmed customer cancel is refunded (feeLocked unset, refund > 0)', 'fresh', (a) => a.status === 'cancelled' && !a.feeLocked && a.refund > 0 && a.depositKept == null);
await render('t01-home');
await page.click('.job-card:has-text("Slot reopened")');
await assertAt('R7: Cancelled row opens T03B', 't03b-job-cancelled', 'cancelled');
await assertTrue('R7: T03B says nothing about the fee on a customer cancel', () => /slot is open on your calendar again\.$/.test(document.querySelector('.status-hero__body').textContent) && !/fee|deposit|\$/.test(document.querySelector('.status-hero__body').textContent));
await assertClean('R7: T03B (customer cancel)');
await bookAndAccept();
await confirmFresh();
await cancelFreshIn(2);
await assertJob('R7: a confirmed customer cancel keeps the fee (refund 0) — nothing of it reaches the tailor', 'fresh', (a) => a.status === 'cancelled' && a.feeLocked === true && a.refund === 0);
await render('t01-home');
await page.click('.job-card:has-text("Slot reopened")');
await assertAt('R7: Cancelled row opens T03B (confirmed cancel)', 't03b-job-cancelled', 'cancelled');
await assertTrue('R7: T03B still says nothing about the fee', () => !/fee|deposit|\$/.test(document.querySelector('.status-hero__body').textContent));
/* no-show BEFORE Sarah confirmed → her fee is refunded */
async function openFreshPastVisit() {
  await page.evaluate(() => { const a = window.Taily.state.upcoming.find((x) => x.mine && x.status === 'confirmed' && x.when !== 'Sunday Jul 12, 7PM'); a.when = 'Jul 11, 9:30 AM'; a.needBy = 'Jul 17, 3:00 PM'; });
  await render('t01-home');
  await page.evaluate(() => [...document.querySelectorAll('[data-act="open-job"]')].find((c) => c.textContent.includes('Confirmed') && c.textContent.includes('9:30 AM'))?.click());
  await assertAt('R7: open the (past-dated) fresh visit', 't03-request-accepted', 'confirmed');
  await page.click('[data-act="cant-make-it"]');
  await page.waitForTimeout(400);
}
await bookAndAccept();
await openFreshPastVisit();
await page.click('[data-reason="cant-make-it"]');
await assertTrue('R7: cancel consequence — job + slot, nothing about the fee', () => document.querySelector('[data-consequence]').textContent === 'The job closes, Sarah is notified and your slot reopens.');
await page.click('[data-reason="no-show"]');
await assertTrue('R7: no-show consequence before confirmation — job + notice only', () => document.querySelector('[data-consequence]').textContent === 'The job closes and Sarah is notified.');
await assertClean('R7: T03.1 (no-show, unconfirmed)');
await page.click('[data-act="confirm-cancel"]');
await assertAt('R7: Mark No-show → T03B', 't03b-job-cancelled', 'cancelled');
await assertTrue('R7: T03B no-show (unconfirmed) says nothing about the fee', () => document.querySelector('.status-hero__body').textContent === 'The job is closed and the slot is open again.');
await assertClean('R7: T03B (no-show, unconfirmed)');
await assertJob('R7: unconfirmed no-show → refund > 0 (the substrate still refunds Sarah)', 'fresh', (a) => a.reason === 'no-show' && !a.feeLocked && a.refund > 0);
/* no-show AFTER Sarah confirmed → the substrate keeps her fee with Taily; Marco's copy is identical */
await bookAndAccept();
await confirmFresh();
await openFreshPastVisit();
await page.click('[data-reason="no-show"]');
await assertTrue('R7: no-show consequence after confirmation — the same line, no fee', () => document.querySelector('[data-consequence]').textContent === 'The job closes and Sarah is notified.');
await assertClean('R7: T03.1 (no-show, confirmed)');
await page.click('[data-act="confirm-cancel"]');
await assertAt('R7: Mark No-show (confirmed) → T03B', 't03b-job-cancelled', 'cancelled');
await assertTrue('R7: T03B no-show (confirmed) — the same body, no fee', () => document.querySelector('.status-hero__body').textContent === 'The job is closed and the slot is open again.');
await assertJob('R7: confirmed no-show → fee kept (refund 0) on Sarah’s record only', 'fresh', (a) => a.reason === 'no-show' && a.feeLocked === true && a.refund === 0);
await assertClean('R7: T03B (no-show, confirmed)');

/* ---------- R6: "Done today" Clear — hides the closed rows; a later closure re-shows them ---------- */
await render('t01-home');
await assertTrue('R6: Done today shows closed rows + the Clear link', () => { const row = [...document.querySelectorAll('.t-section-row')].find((e) => e.textContent.includes('Done today')); return !!row && row.querySelector('[data-act="clear-done"]')?.textContent === 'Clear' && document.querySelectorAll('.t-done .job-card--closed').length >= 1; });
await page.click('[data-act="clear-done"]');
await assertAt('R6: Clear stays on T01', 't01-home');
await assertTrue('R6: closed rows hidden, flag set, no section left (nothing completed)', () => window.Taily.state.tailorUi.clearedClosed === true && !document.querySelector('.t-done') && ![...document.querySelectorAll('.t-section-row')].some((e) => e.textContent.includes('Done today')));
await render('t02-appointment-request');
await render('t01-home');
await assertTrue('R6: …and stays hidden across renders', () => !document.querySelector('.t-done'));
/* Sarah withdraws a new request → a new terminal transition re-shows the section */
await page.click('#persona-toggle');
await bookFresh();
await page.evaluate(async () => { const S = await import('/js/state.js'); const a = window.Taily.state.upcoming.find((x) => x.mine && x.status === 'searching'); S.cancelAppointment(a); });
await page.click('#persona-toggle');
await assertAt('R6: back on T01 after a new closure', 't01-home', undefined, 'tailor');
await assertTrue('R6: the closed rows re-show (all of them) with Clear again; flag dropped', () => window.Taily.state.tailorUi.clearedClosed === false && document.querySelectorAll('.t-done .job-card--closed').length >= 2 && [...document.querySelectorAll('.t-done .job-card')].some((c) => c.textContent.includes('Withdrawn')) && !!document.querySelector('[data-act="clear-done"]'));
await open('t01-home-closed');
await assertTrue('R6: the T01 / Closed Rows fixture draws the Clear link', () => document.querySelector('[data-act="clear-done"]')?.textContent === 'Clear');

/* ---------- R7: every tailor fixture deep link — payout numbers + the customer-pricing sweep ---------- */
const FIXTURE_PAYOUT = {
  't01-home': ['$200'], 't02-appointment-request': ['$200 | New Request', '$200 Your payout', 'Accept Request · $200'], 't02-accepted': ['$200 | Accepted'], 't02-expired': ['$200 | Request Expired', '$200 Payout offered'],
  't03-request-accepted': ['$200 Your payout'], 't03-upcoming-visit': ['$200 Your payout'], 't03.1-cant-make-it': ['The job closes, Sarah is notified and your slot reopens.'],
  't04-appointment-details': ['$360 Your payout'], 't05-confirm-final-pricing': ['$360 Your payout', 'Payout $200 → $360 (+$160)'], 't05-removed': ['$280 Your payout', 'Payout $200 → $280 (+$80)'],
  't06-appointment-status': ['$360 Your payout'], 't06-questions': ['$360 Your payout'], 't07-job-ready': ['$360 Your payout', 'Your payout is released on handoff.'], 't07-waiting': ['$360 Your payout'],
  't08-job-complete': ['PAYOUT SUMMARY', 'TLY-2026-4417', 'Your payout', '$360', 'Arrives in your account · Mon, Jul 20'],
  't03b-job-cancelled': [], 't03b-by-you': ['Sarah’s been notified. Your Sun, Jul 12 · 7:00 PM slot is open again.'], 't03b-no-show': ['The job is closed and the slot is open again.'],
  't03b-withdrawn': [], 't03a-decline-request': [], 't03a-suggest-time': [], 't03a-other': [], 't01-home-closed': [], 't10-messages': [],
};
for (const [id, wants] of Object.entries(FIXTURE_PAYOUT)) {
  await open(id);
  if (!(await page.evaluate((i) => window.Taily.registered().includes(i), id))) { console.log(`SKIP  ${id} is not registered`); continue; }
  {
    const missing = await page.evaluate((w) => { const rows = [...document.querySelectorAll('.fee-row')].map((r) => `${r.querySelector('.fee-row__price').textContent} ${r.querySelector('.fee-row__desc').textContent}`).join(' | '); const txt = `${document.getElementById('screen').innerText}\n${rows}`; const old = /\$180|\$324|\$36\b|\$28\b|\$252/.exec(txt)?.[0]; return [...w.filter((s) => !txt.includes(s)), ...(old ? [`old money ${old}`] : [])]; }, wants);
    const ok = missing.length === 0;
    if (!ok) failures++;
    console.log(`${ok ? 'PASS' : 'FAIL'}  R7: ${id} fixture reads ${wants.length ? wants.join(' / ') : 'no money'}${ok ? '' : ` (missing: ${missing.join('; ')})`}`);
  }
  await assertClean(`R7: ${id} fixture`);
}

console.log(errors.length ? `CONSOLE ERRORS:\n  ${errors.join('\n  ')}` : 'no console errors');
if (errors.length) failures++;
await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL ASSERTIONS PASS');
process.exit(failures ? 1 : 0);
