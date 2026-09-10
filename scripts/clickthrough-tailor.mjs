/* ============================================================
   Tailor click-through — Phase T.
   Drives Marco's path on the SAME appointment the user books:
     T01 → T02 (accept) → T03 → T04 → T05 (send) → T06 (mark ready)
     → T07 (picked up) → T08, asserting screen id + state status;
   the decline branch (T01 → T03A → declined); and one cross-persona
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
const status = () => page.evaluate(() => window.Taily.state.upcoming[0]?.status ?? '(none)');
const persona = () => page.evaluate(() => window.Taily.state.persona);

async function assertAt(desc, expScreen, expStatus, expPersona) {
  await page.waitForTimeout(300);
  const s = await screenId(), st = await status(), p = await persona();
  const okS = s === expScreen;
  const okT = expStatus === undefined || st === expStatus;
  const okP = expPersona === undefined || p === expPersona;
  if (!okS || !okT || !okP) failures++;
  console.log(`${okS && okT && okP ? 'PASS' : 'FAIL'}  ${desc.padEnd(34)} screen=${s}${okS ? '' : ` (want ${expScreen})`}  status=${st}${okT ? '' : ` (want ${expStatus})`}${expPersona ? `  persona=${p}` : ''}`);
}
async function assertTrue(desc, fn) {
  const ok = await page.evaluate(fn);
  if (!ok) failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc}`);
}
const open = async (id) => { await page.goto(`${origin}/index.html?screen=${id}`, { waitUntil: 'load' }); await page.waitForTimeout(300); };

/* ---------- happy path ---------- */
await open('t01-home');
await assertAt('boot as tailor', 't01-home', 'confirmed', 'tailor');
await assertTrue('request card + Sarah job on T01', () => !!document.querySelector('.req-card') && document.querySelectorAll('.job-card').length === 2);
await page.click('[data-act="view-details"]');
await assertAt('View Details', 't02-appointment-request', 'confirmed');
await page.click('[data-act="accept"]');
await assertAt('Accept Request', 't03-request-accepted', 'confirmed');
await page.click('[data-act="home"]');
await assertAt('Back to Home', 't01-home', 'confirmed');
await assertTrue('request card gone after accept', () => !document.querySelector('.req-card'));
await page.click('[data-act="open-job"]');
await assertAt('open confirmed job', 't04-appointment-details', 'confirmed');
await page.click('[data-act="continue"]');
await assertAt('Continue', 't05-confirm-final-pricing', 'confirmed');
await page.click('[data-act="send"]');
await assertAt('Send to Sarah for Approval', 't06-appointment-status', 'awaiting-approval');
/* the user approves on 04/Modified */
await page.evaluate(() => window.Taily.render('04-review-approve-modified'));
await assertAt('  …user sees the modified order', '04-review-approve-modified', 'awaiting-approval', 'user');
await page.click('[data-act="approve"]');
await assertAt('  …user approves', '03-status-tailoring', 'tailoring');
await page.evaluate(() => window.Taily.render('t06-appointment-status'));
await assertAt('back to Marco', 't06-appointment-status', 'tailoring', 'tailor');
await page.click('[data-act="ready"]');
await assertAt('Mark Ready', 't07-job-ready', 'ready-for-pickup');
await page.click('[data-act="order-summary"]');
await assertTrue('order summary expands', () => !document.querySelector('.order-summary').hidden);
await page.click('[data-act="picked-up"]');
await assertAt('Mark Picked Up', 't08-job-complete', 'delivered');
await page.click('[data-act="home"]');
await assertAt('Back to Home (job complete)', 't01-home', 'delivered');
await page.evaluate(() => window.Taily.render('01-home'));
await page.click('.appt-card');
await assertAt('user card opens summary', '03-status-summary', 'delivered', 'user');

/* ---------- messages from the tailor side ---------- */
await open('t03-request-accepted');
await page.click('[data-act="message"]');
await assertAt('Message Sarah', '10-messages', 'confirmed', 'tailor');
await assertTrue('thread shows Sarah in the header', () => document.querySelector('.chat-head__names span').textContent === 'Sarah Chen');
await page.click('[data-act="back"]');
await assertAt('chat back returns', 't03-request-accepted', 'confirmed', 'tailor');

/* ---------- decline branch ---------- */
await open('t01-home');
await page.click('[data-act="decline"]');
await assertAt('Decline (from T01)', 't03a-decline-request', 'confirmed');
await page.click('[data-reason="3"]');
await assertTrue('reason selects', () => document.querySelector('[data-reason="3"]').classList.contains('radio-row--selected'));
await page.click('[data-act="decline"]');
await assertAt('Decline Request', 't01-home', 'declined');
await assertTrue('declined job leaves T01 empty', () => !document.querySelector('.req-card') && document.querySelectorAll('.job-card').length === 1);

/* ---------- cross-persona: user books → tailor accepts → user sees it ---------- */
await open('01-home');
await assertAt('boot as customer', '01-home', 'confirmed', 'user');
await page.click('[data-tile="Suit Jacket"]');
await page.click('[data-act="start-booking"]');
await page.click('[data-act="time"]');
await page.waitForTimeout(400);
await page.click('[data-act="sheet-confirm"]');
await page.waitForTimeout(400);
await page.click('[data-act="request"]');
await page.waitForTimeout(400);
await page.click('.method-row');
await assertAt('user requests a tailor', '03-status-requested', 'searching', 'user');
await page.click('#persona-toggle');
await assertAt('View as Tailor', 't01-home', 'searching', 'tailor');
await assertTrue('new request shows on T01', () => !!document.querySelector('.req-card'));
await page.click('[data-act="view-details"]');
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
