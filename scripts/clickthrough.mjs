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

await assertAt('boot', '01-home', 'confirmed');
await page.click('[data-tile="Suit Jacket"]');
await page.click('[data-act="start-booking"]');
await assertAt('Start Booking', '02-appointment-details', 'confirmed');
await page.click('[data-act="time"]');
await assertAt('Requested-time pill', '02a-date-time-sheet');
await page.click('[data-act="sheet-confirm"]');
await page.waitForTimeout(400);
await assertAt('sheet ✓ returns', '02-appointment-details');
await page.click('[data-act="request"]');
await assertAt('Request Tailor', '04a-payment-sheet');
await page.click('.method-row');                      // Apple Pay → request sent
await assertAt('Pay (request sent)', '03-finding-tailor', 'searching');
await page.click('[data-act="map"]');                 // demo: tailor accepts
await assertAt('tailor accepts', '04c-appointment-confirmed', 'confirmed');
await page.evaluate(() => window.Taily.render('05-appointment-reminder'));
await assertAt('reminder fires (confirmed)', '05-appointment-reminder', 'confirmed');
await page.click('[data-act="confirm"]');             // appointment happens
await assertAt('appointment done', '06-order-status', 'awaiting-approval');
await page.click('.timeline');
await assertAt('open final order', '06a-review-approve', 'awaiting-approval');
await page.click('[data-act="approve"]');
await assertAt('approve order', '07-items-ready', 'ready-for-pickup');
await page.click('[data-opt="pickup"]');
await page.click('[data-act="continue"]');
await assertAt('continue to pickup', '07a-pickup-window', 'ready-for-pickup');
await page.click('[data-act="confirm"]');
await assertAt('confirm pickup', '08-journey-complete', 'delivered');

// Bookings seeds
await page.evaluate(() => { window.Taily.state && window.Taily.render('09-bookings'); });
await page.waitForTimeout(300);
const cards = await page.evaluate(() => ({
  count: document.querySelectorAll('.appt-card').length,
  names: [...document.querySelectorAll('.appt-card__name')].map((e) => e.textContent),
  sections: [...document.querySelectorAll('[data-s="09-bookings"] h1')].map((e) => e.textContent),
}));
const seedsOk = cards.sections.join('|') === 'Current Bookings|Past Bookings' && cards.count >= 4;
if (!seedsOk) failures++;
console.log(`${seedsOk ? 'PASS' : 'FAIL'}  bookings shows seeded cards          ${cards.count} cards, sections=${cards.sections.join(' / ')}`);

console.log(errors.length ? `CONSOLE ERRORS:\n  ${errors.join('\n  ')}` : 'no console errors');
if (errors.length) failures++;
await browser.close();
server.close();
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL ASSERTIONS PASS');
process.exit(failures ? 1 : 0);
