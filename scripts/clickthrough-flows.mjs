/* ============================================================
   Flows click-through — the "Test flows" menu (Kevin, Sep 2026).
   Opens the bottom-right menu and clicks EVERY entry of both flows
   through the real UI, asserting for each one:
     · it lands on the entry's screen, as the right persona,
     · an overlay entry has its popup / sheet open,
     · the screen shows the state the entry promises (a text snippet
       from EXPECT below — the proof the transitions ran),
     · no page error, no "nothing to click" warning.
   Then the menu's own behaviour: tabs default to the current persona,
   the jumped-to entry is marked current, Escape / outside-click close
   it, the footer flip switches sides WITHOUT resetting (the updated
   invoice is still awaiting approval on T06), and `?flow=<key>` boots
   straight into a step.
   `node scripts/clickthrough-flows.mjs [--dump]` — --dump prints each
   entry's landing text instead of asserting (for writing EXPECT).
   ============================================================ */

import { readFileSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
import { createServer } from 'node:http';
import { chromium } from 'playwright';

const DUMP = process.argv.includes('--dump');
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
const warnings = [];
page.on('pageerror', (e) => errors.push(e.message));
page.on('console', (m) => {
  if (m.type() === 'error') errors.push(m.text());
  if (m.type() === 'warning' && /flow "/.test(m.text())) warnings.push(m.text());
});

let failures = 0; let passes = 0;
function check(desc, ok, detail = '') {
  if (ok) passes++; else failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${desc.padEnd(58)} ${ok ? '' : detail}`);
}

/* What each entry must show once it lands: a snippet of the visible
   text (screen + any open overlay). Proves the state, not just the id. */
const EXPECT = {
  'c-home': 'Start Booking',
  'c-home-selected': 'Start Booking',
  'c-details': 'Select Time',
  'c-details-ready': 'Jul 17, 3:00 PM',
  'c-time-sheet': 'Set Time',
  'c-address-sheet': 'Save',
  'c-payment-sheet': 'Apple Pay',
  'c-card-sheet': 'Add card',
  'c-requested': 'Finding your tailor',
  'c-new-time': 'proposed a new time',
  'c-cancel-request': 'Cancel',
  'c-confirmed': 'Appointment Confirmed',
  'c-booking-photos': 'Your photos',
  'c-reschedule': 'Reschedule',
  'c-reminder': 'Before you confirm',
  'c-reminder-locked': 'non-refundable',
  'c-confirm-popup': 'non-refundable',
  'c-review-updated': { has: '$385', not: 'Removed at the visit' },
  'c-review-unchanged': { has: '$225', not: '$360' },
  'c-review-removed': 'Removed at the visit',
  'c-review-retiered': 'Additional visitation fee',
  'c-request-changes': 'Sounds Good',
  'c-awaiting': '$360',
  'c-tailoring': 'Tailoring in Progress',
  'c-photo-viewer': 'Pinned',
  'c-ready-home': 'Schedule Pickup',
  'c-items-ready': 'ready',
  'c-pickup': 'Pickup',
  'c-delivery': 'Delivery',
  'c-window-confirmed': 'Done',
  'c-scheduled': 'Fri, Jul 17',
  'c-complete': 'Leave a Review',
  'c-complete-delivery': 'Delivery',
  'c-leave-review': 'Confirm',
  'c-summary': 'Items Received',
  'c-cancel-refund': 'refunded',
  'c-cancel-kept': 'kept',
  'c-withdrawn': 'Cancelled',
  'c-expired': 'expired',
  'c-declined': 'Send to Another Tailor',
  'c-tailor-cancelled': 'had to cancel',
  'c-no-show': 'We missed you',
  'c-unconfirmed': 'didn’t hear back',
  'c-bookings': 'Bookings',
  'c-messages': 'Marco',
  't-home-request': 'New Request',
  't-request': 'No-show protection',
  't-request-expired': 'Expired',
  't-accepted': 'Booking Confirmed!',
  't-decline': 'Decline Request',
  't-suggest-time': 'Suggest Another Time',
  't-decline-other': { sel: 'textarea.t03a__note:not([hidden])' },
  't-home-proposed': 'Time proposed',
  't-home-active': 'Active Jobs',
  't-upcoming': 'Start Appointment',
  't-cant-make-it': 'I need to cancel',
  't-details': 'Contact Taily Support',
  't-final-pricing': '$200 → $360',
  't-final-removed': 'Removed at the visit',
  't-support': 'Taily Support',
  't-status-awaiting': 'Sarah is reviewing the updated order',
  't-status-questions': 'questions',
  't-status-tailoring': 'Mark Ready',
  't-ready-waiting': 'Message Sarah',
  't-ready-pickup': 'Mark Picked Up',
  't-ready-delivery': 'Deliver',
  't-complete': '$360',
  't-cancelled-by-you': 'cancelled',
  't-no-show': 'for the trip',
  't-customer-cancelled': 'cancelled',
  't-withdrawn': 'withdrawn',
  't-home-closed': 'Done today',
  't-messages': 'Sarah',
};

const flows = await (async () => {
  await page.goto(`${origin}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  return page.evaluate(async () => (await import('/js/flows.js')).ALL_FLOWS.map(({ key, persona, screen, click, title }) => ({ key, persona, screen, click: click ?? [], title })));
})();
console.log(`${flows.length} flow entries (${flows.filter((f) => f.persona === 'customer').length} customer, ${flows.filter((f) => f.persona === 'tailor').length} tailor)\n`);

/* reveal the pinned control (hidden until the first input) */
await page.mouse.move(100, 300);
await page.mouse.move(120, 320);
check('menu trigger visible after the first input', await page.isVisible('#flow-trigger'));

const landing = () => page.evaluate(() => {
  const overlay = document.querySelector('.screen-sheet--overlay:not(.is-closing)');
  return {
    screen: document.getElementById('screen').dataset.screen,
    persona: window.Taily.state.persona,
    overlay: overlay?.dataset.s ?? null,
    text: `${document.getElementById('screen').innerText}\n${overlay?.innerText ?? ''}`.replace(/\s+/g, ' '),
    missing: !!document.querySelector('.screen-missing'),
    url: new URL(location.href).searchParams.get('flow'),
  };
});

for (const f of flows) {
  errors.length = 0; warnings.length = 0;
  await page.click('#flow-trigger');
  await page.click(`.flow-menu__tab[data-tab="${f.persona}"]`);
  await page.click(`[data-flow="${f.key}"]`);
  await page.waitForTimeout(350);
  const r = await landing();
  if (DUMP) {
    console.log(`${f.key.padEnd(22)} ${r.screen.padEnd(26)} ${String(r.overlay).padEnd(26)} ${r.persona.padEnd(7)} ${r.text.slice(0, 150)}`);
    continue;
  }
  const want = EXPECT[f.key];
  const problems = [];
  if (r.missing) problems.push('screen missing');
  if (r.screen !== f.screen) problems.push(`screen=${r.screen} (want ${f.screen})`);
  if (r.persona !== (f.persona === 'tailor' ? 'tailor' : 'user')) problems.push(`persona=${r.persona}`);
  if (f.click.length && !r.overlay) problems.push('no overlay open');
  if (!f.click.length && r.overlay) problems.push(`unexpected overlay ${r.overlay}`);
  const spec = typeof want === 'string' ? { has: want } : want;
  if (!spec) problems.push('no EXPECT entry');
  else {
    if (spec.has && !r.text.includes(spec.has)) problems.push(`missing "${spec.has}"`);
    if (spec.not && r.text.includes(spec.not)) problems.push(`should not show "${spec.not}"`);
    if (spec.sel && !(await page.evaluate((q) => { const el = document.querySelector(q); return !!el && el.offsetParent !== null; }, spec.sel))) problems.push(`no visible ${spec.sel}`);
  }
  if (r.url !== f.key) problems.push(`?flow=${r.url}`);
  if (errors.length) problems.push(`errors: ${errors.join(' / ')}`);
  if (warnings.length) problems.push(warnings.join(' / '));
  check(`[${f.persona === 'tailor' ? 'T' : 'C'}] ${f.key} → ${f.title}`, problems.length === 0, problems.join(' · '));
  /* close any overlay the entry opened so the next trigger click is clean */
  if (r.overlay) { await page.keyboard.press('Escape'); await page.waitForTimeout(250); }
}

if (!DUMP) {
  /* ---------- the menu itself ---------- */
  console.log('');
  await page.click('#flow-trigger');
  check('menu opens on the current persona’s tab', await page.evaluate(() =>
    document.querySelector('.flow-menu__tab[aria-selected="true"]')?.dataset.tab === (window.Taily.state.persona === 'tailor' ? 'tailor' : 'customer')));
  await page.click('.flow-menu__tab[data-tab="customer"]');
  await page.click('[data-flow="c-review-updated"]');
  await page.waitForTimeout(350);
  await page.click('#flow-trigger');
  check('the jumped-to entry is marked current', await page.evaluate(() =>
    document.querySelector('.flow-menu__item[aria-current="true"]')?.dataset.flow === 'c-review-updated'));
  await page.keyboard.press('Escape');
  check('Escape closes the menu', await page.evaluate(() => document.getElementById('flow-menu').hidden));
  await page.click('#flow-trigger');
  await page.mouse.click(200, 30);   // the status bar — clear of the panel on a 390 screen
  check('a click outside closes the menu', await page.evaluate(() => document.getElementById('flow-menu').hidden));

  /* the flip keeps the state: the updated invoice is still awaiting approval */
  await page.click('#flow-trigger');
  await page.click('#persona-toggle');
  await page.waitForTimeout(350);
  const flipped = await page.evaluate(() => ({
    screen: document.getElementById('screen').dataset.screen,
    persona: window.Taily.state.persona,
    status: window.Taily.state.upcoming.find((a) => a.mine)?.status,
    alterations: window.Taily.state.upcoming.find((a) => a.mine)?.totals?.alterations,
    trigger: document.querySelector('[data-trigger-who]')?.textContent,
  }));
  check('flip → T01 as the tailor, state kept (awaiting approval, $360)', flipped.screen === 't01-home' && flipped.persona === 'tailor' && flipped.status === 'awaiting-approval' && flipped.alterations === 360 && flipped.trigger === 'Tailor', JSON.stringify(flipped));
  await page.click('[data-act="open-job"]');
  await page.waitForTimeout(350);
  check('  …the job opens T06 awaiting Sarah’s approval', (await landing()).screen === 't06-appointment-status', (await landing()).screen);
  await page.click('#flow-trigger');
  check('  …flip label now reads View as Customer', (await page.textContent('#persona-toggle')).trim() === 'View as Customer');
  await page.click('#persona-toggle');
  await page.waitForTimeout(350);
  const back = await landing();
  check('flip back → 01 Home as the customer', back.screen === '01-home' && back.persona === 'user', JSON.stringify({ s: back.screen, p: back.persona }));

  /* ?flow=<key> boots straight into a step (overlay included) */
  await page.goto(`${origin}/index.html?flow=t-final-pricing`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const booted = await landing();
  check('?flow=t-final-pricing boots into T05 with the payout change', booted.screen === 't05-confirm-final-pricing' && booted.persona === 'tailor' && booted.text.includes('$200 → $360'), `${booted.screen} ${booted.persona}`);
  await page.goto(`${origin}/index.html?flow=c-reschedule`, { waitUntil: 'load' });
  await page.waitForTimeout(500);
  const bootedOverlay = await landing();
  check('?flow=c-reschedule boots into 03/Confirmed with the popup open', bootedOverlay.screen === '03-status-confirmed' && bootedOverlay.overlay === '03.1-reschedule-popup', `${bootedOverlay.screen} ${bootedOverlay.overlay}`);
  /* the diff harness's deep links are untouched: no menu visible without input */
  await page.goto(`${origin}/index.html?screen=04-review-approve-modified`, { waitUntil: 'load' });
  await page.waitForTimeout(400);
  check('?screen= deep link: menu hidden until the first input', !(await page.isVisible('#flow-trigger')));
}

await browser.close();
server.close();
if (!DUMP) {
  console.log(`\n${passes + failures} assertions · ${passes} passed · ${failures} failed`);
  process.exit(failures ? 1 : 0);
}
