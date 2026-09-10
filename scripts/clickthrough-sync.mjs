/* ============================================================
   Cross-persona synchronization click-through — UX-LOOP round 2
   (UX-LOOP.md → End state → item 3).

   ONE appointment, TWO personas: every transition is driven by a click
   on one side and then read back on the OTHER side — screen id, the
   shared appointment's status (via state.js's canonicalStatus) and the
   visible facts (amounts, item counts, dates, names) read from the DOM.

   The shared appointment is the booking each run makes on 02 (the
   `mine` entry that is not the Jul 12 seed, wherever it lives now —
   terminal entries move to state.past, R2-U-07). The seed stays
   present unless a run says "solo" (it is dropped so the booked
   request is the only shared appointment).

   Runs (each on a fresh page):
     A   book fresh → tailor accepts → chat both ways → pre-visit →
         visit edit (+service, +garment) → send → customer approves →
         tailor marks ready (T07 waits) → customer schedules PICKUP
         (windows from handoffWindows) → tailor marks picked up →
         receipt / summary / bookings / review
     B   same to ready, then the customer chooses DELIVERY → tailor
         "Mark Delivered" → receipt carries the $20 delivery row
     C   decline: tailor T02 → T03A → reason → customer 09 Declined
         card → 03/Cancelled "couldn’t take" → Send to Another Tailor
     D   (solo) customer withdraws BEFORE acceptance → T01 Withdrawn row
     E   (solo) customer cancels AFTER acceptance → T01 Cancelled card →
         T03B
     E2  the same with the seed present — TWO bookings coexist on 01/09
         and T01; cancelling one leaves the other untouched
     F   suggest another time: T03A "Schedule conflict" → wheel → T01
         proposed card ↔ customer 03/Requested new-times hero → Keep
         Looking → Withdraw → Accept New Time → both sides on the new when
     G   expiry: T01 timer-strip tap → Expired row / T02 expired view →
         customer 09 card → 03/Cancelled "Request expired" → Send
         Request Again; then the customer-side "2 hours" tap
     H   tailor cancel (Can’t make it → "I need to cancel") and no-show →
         T03B variants → customer 03/Cancelled variants → Find Another
         Tailor; both under Past on 09
     I   request changes: 04.1 Sounds Good → chat bubble → T06 line +
         Message Sarah, T01 "Sarah has questions" → approval clears it
     J   removal: T04 removes a booked garment → T05 "Removed at the
         visit" → Send → customer 04/Modified lists it; counts follow
   Exit code 1 on any failed assertion or console error.
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
let page = null;
let run = '';
const errors = [];
let passes = 0;
let failures = 0;

/* ---------- reporting ---------- */
function log(ok, desc, detail = '') {
  if (ok) passes++; else failures++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${run}${desc.padEnd(52)} ${detail}`);
}

/* ---------- page / state readers ---------- */
/* Every run starts on a fresh page. The page gets the app's OWN
   state.js / data.js module instances (same URLs → same modules) so the
   status is normalised by canonicalStatus and dates by fmtWhen / fmtDay
   exactly as the screens do. */
async function fresh(label, { solo = false } = {}) {
  if (page) await page.close();
  page = await browser.newPage({ viewport: { width: 390, height: 900 } });
  page.on('pageerror', (e) => errors.push(`[${label}] ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${label}] ${m.text()}`); });
  await page.goto(`${origin}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    window.__sync = await import('/js/state.js');
    window.__data = await import('/js/data.js');
    const norm = (s) => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    const SEED_WHEN = window.__data.SEED_UPCOMING[0].when;
    /* the booking this run made (never the seed), wherever it lives */
    window.__shared = () => {
      const s = window.Taily.state;
      return [...s.upcoming, ...s.past].find((x) => x?.mine && x.when !== SEED_WHEN) ?? s.lastCancelled ?? null;
    };
    window.__seed = () => {
      const s = window.Taily.state;
      return [...s.upcoming, ...s.past].find((x) => x?.mine && x.when === SEED_WHEN) ?? null;
    };
    window.__q = {
      text: (sel) => { const el = document.querySelector(sel); return el ? norm(el.textContent) : null; },
      texts: (sel) => [...document.querySelectorAll(sel)].map((e) => norm(e.textContent)),
      count: (sel) => document.querySelectorAll(sel).length,
      body: () => norm(document.body.textContent),
      fees: () => [...document.querySelectorAll('.fee-row__price')].map((e) => norm(e.textContent)).join(' '),
      feeDescs: () => [...document.querySelectorAll('.fee-row__desc')].map((e) => norm(e.textContent)),
      toast: () => norm(document.querySelector('.toast')?.textContent),
      /* the 09 lists: cards under Current / Past with pill, meta, text */
      bookings: () => {
        const kids = [...document.querySelectorAll('[data-s="09-bookings"] > *')];
        const h1s = kids.filter((e) => e.tagName === 'H1');
        const pastStart = kids.indexOf(h1s[1]);
        const info = (els) => els.filter((e) => e.classList.contains('appt-card')).map((e) => ({
          pill: norm(e.querySelector('.pill span:last-child')?.textContent),
          meta: norm(e.querySelector('.appt-card__meta')?.textContent),
          text: norm(e.textContent),
        }));
        return { sections: h1s.map((e) => norm(e.textContent)), current: info(kids.slice(0, pastStart)), past: info(kids.slice(pastStart)) };
      },
      /* T01's job cards: pill, payout, right slot, meta, badge */
      jobCards: () => [...document.querySelectorAll('.job-card')].map((e) => ({
        pill: norm(e.querySelector('.pill span:last-child')?.textContent),
        payout: e.querySelector('.job-card__payout') ? norm(e.querySelector('.job-card__payout').textContent) : null,
        right: norm(e.querySelector('.job-card__bottom > span:last-child')?.textContent),
        meta: norm(e.querySelector('.job-card__meta')?.textContent),
        badge: `${norm(e.querySelector('.appt-card__month')?.textContent)} ${norm(e.querySelector('.appt-card__day')?.textContent)}`,
        text: norm(e.textContent),
      })),
    };
  });
  if (solo) {
    await page.evaluate(() => {
      const s = window.Taily.state;
      s.upcoming = s.upcoming.filter((a) => !a.mine);
      window.Taily.render('01-home', { replace: true });
    });
    await page.waitForTimeout(200);
  }
  const sameState = await page.evaluate(() => window.__sync.state === window.Taily.state);
  run = `${label}  `;
  console.log(`\n── run ${label}${solo ? ' (solo: seed fixture dropped, one shared appointment)' : ''} ${'─'.repeat(20)}`);
  log(sameState, 'page boots with the app’s own state module');
}

const q = (fn, arg) => page.evaluate(([f, a]) => window.__q[f](a), [fn, arg]);
const screenId = () => page.evaluate(() => document.getElementById('screen').dataset.screen);
const persona = () => page.evaluate(() => window.Taily.state.persona);
/** The shared appointment (this run's booking), as a plain object. */
const shared = () => page.evaluate(() => { const a = window.__shared(); return a ? JSON.parse(JSON.stringify(a)) : null; });
/** The Jul 12 seed (null on solo runs). */
const seed = () => page.evaluate(() => { const a = window.__seed(); return a ? JSON.parse(JSON.stringify(a)) : null; });
const status = () => page.evaluate(() => { const a = window.__shared(); return a ? window.__sync.canonicalStatus(a.status) : '(none)'; });
const fmtWhen = (str) => page.evaluate((v) => window.__data.fmtWhen(v), str);
const fmtDay = (str) => page.evaluate((v) => window.__data.fmtDay(v), str);
const mdy = (str) => page.evaluate((v) => window.__data.mdy(v), str);
const shiftDay = (str, n) => page.evaluate(([v, k]) => window.__data.shiftDay(v, k), [str, n]);
const render = async (id) => { await page.evaluate((i) => window.Taily.render(i), id); await page.waitForTimeout(250); };
/** "the shared appointment is state.past[0] and state.lastCancelled" */
const terminalPlacement = () => page.evaluate(() => {
  const s = window.Taily.state; const a = window.__shared();
  return { inPast: s.past[0] === a, notUpcoming: !s.upcoming.includes(a), stash: s.lastCancelled === a, status: a?.status, by: a?.cancelledBy, reason: a?.reason, wasRequested: a?.wasRequested };
});

/* ---------- assertions ---------- */
async function assertAt(desc, expScreen, expStatus, expPersona) {
  await page.waitForTimeout(320);
  const s = await screenId(); const st = await status(); const p = await persona();
  const okS = s === expScreen;
  const okT = expStatus === undefined || st === expStatus;
  const okP = expPersona === undefined || p === expPersona;
  log(okS && okT && okP, desc, `screen=${s}${okS ? '' : ` (want ${expScreen})`}  status=${st}${okT ? '' : ` (want ${expStatus})`}  persona=${p}${okP ? '' : ` (want ${expPersona})`}`);
}
async function assertOverlay(desc, expDataS) {
  await page.waitForTimeout(500);
  const s = await page.evaluate(() => document.querySelector('.screen-sheet--overlay:not(.is-closing)')?.dataset.s ?? '(none)');
  const want = expDataS ?? '(none)';
  log(s === want, desc, `overlay=${s}${s === want ? '' : ` (want ${want})`}`);
}
function assertEq(desc, got, want) {
  const ok = got === want;
  log(ok, desc, `"${got}"${ok ? '' : ` (want "${want}")`}`);
}
async function assertText(desc, sel, want) { assertEq(desc, await q('text', sel), want); }
function assertIncludes(desc, got, want) {
  const ok = String(got ?? '').includes(want);
  log(ok, desc, ok ? `contains "${want}"` : `"${String(got).slice(0, 160)}" lacks "${want}"`);
}
async function assertTrue(desc, fn, detail = '', arg = undefined) {
  const ok = await page.evaluate(fn, arg);
  log(!!ok, desc, detail);
}

/* ---------- drivers ---------- */
/** Persona toggle: the pinned control shows after the first pointer
    input (R1-T-17) — nudge the mouse first, then click. */
async function flip() {
  await page.mouse.move(120, 300);
  await page.mouse.move(140, 320);
  await page.click('#persona-toggle');
  await page.waitForTimeout(300);
}
const clickCardButton = (label) => page.evaluate((l) => {
  [...document.querySelectorAll('.appt-card .cta-small')].find((b) => b.textContent.trim() === l)?.click();
}, label);
/** Open the 09 card whose pill / meta match (Past cards have no buttons;
    the card's name span is a safe click target). */
async function openBookingsCard(desc, { pill, meta }) {
  await render('09-bookings');
  const found = await page.evaluate(([p, m]) => {
    const norm = (s) => String(s ?? '').replace(/ /g, ' ').replace(/\s+/g, ' ').trim();
    const card = [...document.querySelectorAll('.appt-card')].find((e) =>
      (!p || norm(e.querySelector('.pill span:last-child')?.textContent) === p) && (!m || norm(e.querySelector('.appt-card__meta')?.textContent) === m));
    card?.querySelector('.appt-card__name')?.click();
    return !!card;
  }, [pill ?? null, meta ?? null]);
  log(found, desc, `pill=${pill ?? '*'} meta=${meta ?? '*'}`);
}

/** 01 → 02 → time / need-by wheels → Request Tailor → Apple Pay → 03/Requested.
    Suit Jacket ($120 Hem) + Pants / Jeans ($120 Hem) = $240 · deposit $24.
    The need-by is rolled TWO days past the requested time so markReady's
    readyAt (the day before need-by) and need-by give two handoff window
    days (handoffWindows, R2-U-02). */
async function bookAsCustomer({ deep = false } = {}) {
  await assertAt('[C] boot as customer', '01-home', undefined, 'user');
  await page.click('[data-tile="Suit Jacket"]');
  await page.click('[data-tile="Pants / Jeans"]');
  await page.click('[data-act="start-booking"]');
  await assertAt('[C] Start Booking → 02', '02-appointment-details');
  await page.click('[data-act="time"]');
  await assertOverlay('[C]   …requested-time sheet', '02.1-date-time-sheet');
  await page.click('[data-act="sheet-confirm"]');
  await page.waitForTimeout(400);
  await page.click('[data-act="needby"]');
  await assertOverlay('[C]   …need-by sheet', '02.1-date-time-sheet');
  /* R1-U-11: the need-by wheel opens ON the requested date — roll two days */
  await page.evaluate(() => {
    const col = document.querySelector('.screen-sheet--overlay .wheel__col--scroll');
    col.scrollTop = 40 * (Number(col.dataset.sel) + 2);
  });
  await page.waitForTimeout(300);
  await page.click('[data-act="sheet-confirm"]');
  await page.waitForTimeout(400);
  await assertOverlay('[C]   …need-by sheet closed', null);
  await assertTrue('[C] need-by after the appointment (no error pill)', () => !document.querySelector('.filter-pill--error'));
  const appt = await page.evaluate(() => ({ ...window.Taily.state.appt }));
  if (deep) {
    assertEq('[C] 02 requested-time pill = state.appt.when', await q('text', '[data-act="time"]'), appt.when);
    assertEq('[C] 02 need-by pill = state.appt.needBy', await q('text', '[data-act="needby"]'), appt.needBy);
    await assertText('[C] 02 CTA quotes the $24 deposit', '[data-act="request"]', 'Request Tailor · $24 Deposit (10%)');
  }
  await page.click('[data-act="request"]');
  await assertOverlay('[C]   …payment sheet', '02.3-payment-sheet');
  await page.click('.method-row');                       // Apple Pay
  await assertAt('[C] Apple Pay → request sent', '03-status-requested', 'searching', 'user');
  const a = await shared();
  log(a?.mine === true && a.status === 'searching' && a.when === appt.when && a.needBy === appt.needBy,
    '[S] shared appointment created (mine, searching, dates)', `when=${a?.when} needBy=${a?.needBy}`);
  assertEq('[S] need-by is two days after the requested time', await fmtDay(a?.needBy), await shiftDay(a?.when, 2));
  assertEq('[S] booked order = 2 garments · $240 · $24 deposit', `${a?.garments?.length}/${a?.totals?.subtotal}/${a?.totals?.deposit}/${a?.count}`, '2/240/24/2');
  if (deep) {
    const rows = await q('texts', '.meta-row span:last-child');
    assertEq('[C] 03/Requested address · visit row', rows[0], '88 Leonard St, 4B — Home Visit');
    assertEq('[C] 03/Requested requested-time row', rows[1], a.when);
    assertEq('[C] 03/Requested items · estimate · hold row', rows[2], '2 items · $240.00+ est. · $24 deposit held');
    await assertText('[C] 03/Requested hero', '.status-hero__title', 'Finding your tailor…');
  }
  return a;
}

/** From 02 seeded by a re-request CTA (Send Request Again / Send to
    Another Tailor / Find Another Tailor): Request Tailor → Apple Pay. */
async function rebookFrom02(desc) {
  await assertAt(`[C] ${desc} → 02 seeded`, '02-appointment-details', undefined, 'user');
  assertEq('[C] 02 carries the same 2 garments', await q('count', '.garment-card'), 2);
  await assertTrue('[C] 02 need-by still valid (no error pill)', () => !document.querySelector('.filter-pill--error'));
  await page.click('[data-act="request"]');
  await assertOverlay('[C]   …payment sheet', '02.3-payment-sheet');
  await page.click('.method-row');
  await assertAt('[C] Apple Pay → request sent again', '03-status-requested', 'searching', 'user');
  const a = await shared();
  log(a?.status === 'searching' && a.garments?.length === 2 && a.totals?.subtotal === 240, '[S] new shared request (searching, same $240 order)', `when=${a?.when} subtotal=${a?.totals?.subtotal}`);
  return a;
}

/** Flip → T01 (request + the seed's Confirmed job when present) → T02 →
    Accept → T03. */
async function tailorAccepts(a, { deep = false } = {}) {
  const when = await fmtWhen(a.when); const needBy = await fmtDay(a.needBy);
  const hasSeed = !!(await seed());
  await flip();
  await assertAt('[T] View as Tailor', 't01-home', 'searching', 'tailor');
  assertEq('[T] T01 shows exactly one New Request card', await q('count', '.req-card'), 1);
  await assertText('[T] T01 request payout = $240 − 10 % (not the $180 fixture)', '.req-card__name b', '$216');
  if (hasSeed) {
    /* R2-T-01: the seed's accepted visit is a JOB, not a phantom request */
    const jobs = await q('jobCards');
    log(jobs.some((j) => j.text.includes('Sarah Chen') && j.pill === 'Confirmed' && j.payout === '$180'), '[T] T01 lists the seed’s Confirmed job beside the request', jobs.map((j) => `${j.pill}/${j.payout}`).join(', '));
  } else {
    assertEq('[T] T01 no active Sarah job while searching (filler only)', await q('count', '.job-card'), 1);
  }
  if (deep) {
    assertEq('[T] T01 request lines = the booked garments', (await q('texts', '.req-card__items li')).join(' | '),
      'Suit Jacket - Hem / Adjust Length - $120 | Pants / Jeans - Hem / Adjust Length - $120');
    await assertText('[T] T01 request meta = when · need by', '.req-card__meta span:first-child', `▤ ${when} · Need by ${needBy}`);
    await assertText('[T] T01 request customer', '.req-card__name span:last-child', 'Sarah Chen');
  }
  await page.click('.req-card [data-act="view-details"]');
  await assertAt('[T] View Details → T02', 't02-appointment-request', 'searching');
  await assertText('[T] T02 header = booked payout', '.t-header .t-title', '$216 | New Request');
  if (deep) {
    assertEq('[T] T02 cards = the 2 booked garments', await q('count', '.garment-card'), 2);
    assertEq('[T] T02 card prices', (await q('texts', '.garment-card__price')).join(' '), '$120 $120');
    assertEq('[T] T02 fee / payout rows', await q('fees'), '$24 $216');
    await assertText('[T] T02 CTA amount', '[data-act="accept"]', 'Accept Request · $216');
    const rows = (await q('texts', '.summary-card__row')).join(' | ');
    assertIncludes('[T] T02 customer rows carry the visit address', rows, '88 Leonard St, 4B');
    assertIncludes('[T] T02 customer rows carry the requested time', rows, when);
    assertIncludes('[T] T02 customer rows carry the need-by', rows, `Need By: ${needBy}`);
  }
  await page.click('[data-act="accept"]');
  await assertAt('[T] Accept → T03', 't03-request-accepted', 'confirmed', 'tailor');
  if (deep) {
    await assertText('[T] T03 hero right after Accept', '.status-hero__title', 'Booking Confirmed!');
    assertEq('[T] T03 fee / payout rows', await q('fees'), '$24 $216');
  }
  const b = await shared();
  log(!!b?.depositOn, '[S] tailorAccepts stamped depositOn', `depositOn=${b?.depositOn}`);
  return b;
}

/** Flip → 01 card Confirmed → 03/Confirmed rows match. */
async function customerSeesConfirmed(a, { deep = false } = {}) {
  const when = await fmtWhen(a.when); const needBy = await fmtDay(a.needBy);
  await flip();
  await assertAt('[C] View as Customer after accept', '01-home', 'confirmed', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Confirmed');
  await assertText('[C] 01 card meta = requested time', '.appt-card__meta', a.when);
  if (deep) {
    await assertText('[C] 01 card tailor', '.appt-card__name', 'Marco Tailor');
    assertIncludes('[C] 01 card items title', await q('text', '.appt-card'), '2 Items Total - Home Visit:');
    assertIncludes('[C] 01 card lists the booked garment', await q('text', '.appt-card'), '1 Suit Jacket - Hem / Adjust Length');
  }
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Confirmed', '03-status-confirmed', 'confirmed');
  if (deep) {
    await assertText('[C] 03/Confirmed pill', '.status-hero .pill span:last-child', 'Confirmed');
    assertEq('[C] 03/Confirmed cards = booked garments', await q('count', '.garment-card'), 2);
    assertEq('[C] 03/Confirmed subtotal / deposit / balance', await q('fees'), '$240 -$24 $216');
    assertIncludes('[C] 03/Confirmed deposit row dated by tailorAccepts', (await q('feeDescs'))[1], `10% Deposit - Paid ${a.depositOn}`);
    const rows = (await q('texts', '.summary-card__row')).join(' | ');
    assertIncludes('[C] 03/Confirmed rows: address', rows, '88 Leonard St, 4B');
    assertIncludes('[C] 03/Confirmed rows: when (same grammar as T02)', rows, when);
    assertIncludes('[C] 03/Confirmed rows: need-by', rows, `Need by: ${needBy}`);
  }
}

/** Flip → T01 (request card gone, job card present) → T03 pre-visit. */
async function tailorOpensPreVisit(a, { deep = false } = {}) {
  const when = await fmtWhen(a.when);
  await flip();
  await assertAt('[T] tailor home (confirmed)', 't01-home', 'confirmed', 'tailor');
  await assertTrue('[T] T01 request card gone after accept', () => !document.querySelector('.req-card'));
  const jobs = await q('jobCards');
  log(jobs[0]?.pill === 'Confirmed' && jobs[0].payout === '$216' && jobs[0].text.includes('Sarah Chen'), '[T] T01 job card = the accepted booking ($216 · Confirmed)', `first=${jobs[0]?.pill}/${jobs[0]?.payout}`);
  if (deep) {
    assertEq('[T] T01 job right slot = item count', jobs[0]?.right, '2 items');
    assertEq('[T] T01 job meta = time - address', jobs[0]?.meta, `${when.split(' · ')[1]} - 88 Leonard St, 4B`);
  }
  await page.click('[data-act="open-job"]');
  await assertAt('[T] job card → T03 pre-visit', 't03-request-accepted', 'confirmed');
  await assertText('[T] T03 pre-visit header', '.t-header .t-title', 'Upcoming visit');
  if (deep) {
    assertIncludes('[T] T03 pre-visit sub = when at address · visit', await q('text', '.t-header .t-body'), `${when} at 88 Leonard St, 4B · Home visit`);
  }
}

/** Flip → T01 job card → T03 pre-visit → Start → T04 (+Sleeve on card 1,
    + a Suit Jacket) → T05 → Send → T06 awaiting-approval. */
async function tailorVisitAndSend(a, { deep = false } = {}) {
  await tailorOpensPreVisit(a, { deep });
  await page.click('[data-act="start"]');
  await assertAt('[T] Start Appointment → T04', 't04-appointment-details', 'confirmed');
  assertEq('[T] T04 starts from the booked order (2 cards)', await q('count', '.garment-card'), 2);
  assertEq('[T] T04 fee / payout rows follow the booking', await q('fees'), '$24 $216');
  /* + Sleeve ($80) on card 1 via the additional-service selector */
  await page.click('[data-sel="add"][data-gi="0"]');
  await page.click('.selector--open .selector__option[data-option="Sleeve"]');
  await page.waitForTimeout(250);
  assertEq('[T] T04 added service recomputes fee / payout ($320)', await q('fees'), '$32 $288');
  assertEq('[T] T04 card 1 price moved to $200', (await q('texts', '.garment-card__price'))[0], '$200');
  /* + Additional Garment (Suit Jacket · Sleeve $80) */
  await page.click('[data-act="add-garment"]');
  await page.waitForTimeout(250);
  assertEq('[T] T04 added garment → 3 cards', await q('count', '.garment-card'), 3);
  assertEq('[T] T04 fee / payout rows recompute ($400)', await q('fees'), '$40 $360');
  await page.click('[data-act="continue"]');
  await assertAt('[T] Continue → T05', 't05-confirm-final-pricing', 'confirmed');
  if (deep) {
    assertEq('[T] T05 marks the added service + added garment', `${await q('count', '.garment-card__service--info')}/${await q('count', '.garment-card--info')}`, '2/1');
    assertEq('[T] T05 card prices', (await q('texts', '.garment-card__price')).join(' '), '$200 $120 $80');
    assertEq('[T] T05 fee / payout rows', await q('fees'), '$40 $360');
    assertEq('[T] T05 lists no removals', await q('count', '.t-removed__row'), 0);
  }
  await page.click('[data-act="send"]');
  await assertAt('[T] Send → T06 awaiting approval', 't06-appointment-status', 'awaiting-approval', 'tailor');
  const b = await shared();
  log(b?.garments?.length === 3 && b.totals?.subtotal === 400 && b.totals?.total === 400 && b.totals?.deposit === 24 && b.booked?.length === 2 && !!b.revisedAt,
    '[S] Send wrote the final order (3 garments · $400 · deposit $24 · booked kept)', `garments=${b?.garments?.length} subtotal=${b?.totals?.subtotal} deposit=${b?.totals?.deposit} booked=${b?.booked?.length} revisedAt=${b?.revisedAt}`);
  if (deep) {
    assertIncludes('[T] T06 status line', await q('text', '.t-header .t-body'), 'Waiting for Sarah to approve');
    await assertText('[T] T06 job payout = final − 10 %', '.job-card__payout', '$360');
    await assertText('[T] T06 job pill', '.job-card .pill span:last-child', 'Awaiting Customer');
    await assertText('[T] T06 job right slot', '.job-card__bottom > span:last-child', '3 items');
    assertEq('[T] T06 cards = the sent order', await q('count', '.garment-card'), 3);
    assertEq('[T] T06 card prices', (await q('texts', '.garment-card__price')).join(' '), '$200 $120 $80');
    assertEq('[T] T06 fee / payout rows', await q('fees'), '$40 $360');
    await assertText('[T] T06 primary CTA', '.t-actions .cta', 'Mark Ready');
  }
  return b;
}

/** Flip → 01 card → 03/Tailoring awaiting → 04/Modified (returns there). */
async function customerOpensReview(a, { deep = false } = {}) {
  const when = await fmtWhen(a.when); const needBy = await fmtDay(a.needBy);
  await flip();
  await assertAt('[C] View as Customer (awaiting approval)', '01-home', 'awaiting-approval', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Awaiting Approval');
  if (deep) {
    await assertText('[C] 01 card meta = est. ready (need-by)', '.appt-card__meta', `Est. Ready Date: ${needBy}`);
    assertIncludes('[C] 01 card items title follows the SENT order (3 items)', await q('text', '.appt-card'), '3 Items Total - Home Visit:');
  }
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Tailoring (awaiting)', '03-status-tailoring', 'awaiting-approval');
  if (deep) {
    await assertText('[C] 03/Tailoring awaiting hero', '.status-hero__title', 'Approve your final order.');
    await assertText('[C] 03/Tailoring awaiting pill', '.status-hero .pill span:last-child', 'Awaiting Approval');
    assertEq('[C] 03/Tailoring cards = the sent order', await q('count', '.garment-card'), 3);
    assertEq('[C] 03/Tailoring card prices (same as T06)', (await q('texts', '.garment-card__price')).join(' '), '$200 $120 $80');
    assertEq('[C] 03/Tailoring subtotal / deposit / due', await q('fees'), '$400 -$24 $376');
    await assertTrue('[C] 03/Tailoring shows the View final order row', () => !!document.querySelector('.link-row[data-act="review-order"]'));
    const rows = (await q('texts', '.summary-card__row')).join(' | ');
    assertIncludes('[C] 03/Tailoring rows: appt', rows, `Appt: ${when}`);
    assertIncludes('[C] 03/Tailoring rows: need-by', rows, `Need by: ${needBy}`);
  }
  await page.click('.cta-bar [data-act="review-order"]');
  await assertAt('[C] Review Final Order → 04/Modified', '04-review-approve-modified', 'awaiting-approval');
  if (deep) {
    assertEq('[C] 04/Modified cards = the sent order', await q('count', '.garment-card'), 3);
    assertEq('[C] 04/Modified marks (services / garments / fee rows)', `${await q('count', '.garment-card__service--info')}/${await q('count', '.garment-card--info')}/${await q('count', '.fee-row--info')}`, '2/1/3');
    assertEq('[C] 04/Modified card prices', (await q('texts', '.garment-card__price')).join(' '), '$200 $120 $80');
    assertEq('[C] 04/Modified subtotal / deposit / due', await q('fees'), '$400 -$24 $376');
    assertIncludes('[C] 04/Modified deposit row dated', (await q('feeDescs'))[1], `10% Deposit - Paid ${a.depositOn}`);
    await assertText('[C] 04/Modified tailor name in the sub', '.heading .t-body', 'Marco measured and pinned at your appointment. Review the final details and pricing before tailoring starts.');
    assertEq('[C] 04/Modified lists no removals', await q('count', '.removed-row'), 0);
  }
}

/** …and approves: 04/Modified → Approve → 03/Tailoring (tailoring). */
async function customerApproves(a, { deep = false } = {}) {
  await customerOpensReview(a, { deep });
  await page.click('[data-act="approve"]');
  await assertAt('[C] Approve → 03/Tailoring (tailoring)', '03-status-tailoring', 'tailoring', 'user');
  const b = await shared();
  log(!!b?.approvedAt && b.totals?.subtotal === 400, '[S] approveOrder stamped approvedAt, order untouched', `approvedAt=${b?.approvedAt}`);
  if (deep) {
    await assertText('[C] 03/Tailoring pill', '.status-hero .pill span:last-child', 'Tailoring');
    await assertText('[C] 03/Tailoring hero', '.status-hero__title', 'Tailoring in Progress.');
  }
  return b;
}

/** Flip → T01 → T06 (Tailoring) → Mark Ready → T07 (waiting, R2-T-07). */
async function tailorMarksReady({ deep = false } = {}) {
  await flip();
  await assertAt('[T] tailor home (tailoring)', 't01-home', 'tailoring', 'tailor');
  await assertText('[T] T01 job pill', '.job-card .pill span:last-child', 'Tailoring');
  await page.click('[data-act="open-job"]');
  await assertAt('[T] job card → T06', 't06-appointment-status', 'tailoring');
  if (deep) {
    assertIncludes('[T] T06 status line after approval', await q('text', '.t-header .t-body'), 'Sarah approved the final order');
    await assertText('[T] T06 job pill', '.job-card .pill span:last-child', 'Tailoring');
    await assertText('[T] T06 primary CTA', '.t-actions .cta', 'Mark Ready');
  }
  await page.click('[data-act="ready"]');
  await assertAt('[T] Mark Ready → T07', 't07-job-ready', 'ready-for-pickup', 'tailor');
  const b = await shared();
  log(!!b?.readyAt, '[S] markReady stamped readyAt', `readyAt=${b?.readyAt}`);
  /* R2-T-07: T07 waits until Sarah chooses; Mark Picked Up is only a demo */
  assertIncludes('[T] T07 waits for Sarah’s handoff choice', await q('text', '.t-status .t-body'), 'hasn’t chosen pickup or delivery yet');
  const rows = await q('texts', '.t-detail-row__value');
  assertEq('[T] T07 When / Where before she chose', `${rows[0]} | ${rows[1]}`, 'Not scheduled yet | —');
  await assertText('[T] T07 primary CTA while waiting', '.t-actions .cta', 'Message Sarah');
  if (deep) {
    assertEq('[T] T07 items = final order', rows[2], '3 items');
    await render('t06-appointment-status');
    assertIncludes('[T] T06 ready line waits for Sarah', await q('text', '.t-header .t-body'), 'waiting for Sarah to schedule the handoff');
  }
  return b;
}

/** The handoff window days for the shared appointment (05A/05B draw
    exactly these — data.js handoffWindows) and the labels the LAST
    day's last chip yields on every screen. */
async function handoffPick() {
  const wins = await page.evaluate(() => window.__data.handoffWindows(window.__shared()));
  const a = await shared();
  log(wins.length === 2 && (await fmtDay(wins[0].date)) === (await fmtDay(a.readyAt)) && (await fmtDay(wins[1].date)) === (await fmtDay(a.needBy)),
    '[S] handoffWindows: two days, readyAt → need-by', `${wins.map((w) => w.date).join(' / ')} (readyAt=${a.readyAt}, needBy=${a.needBy})`);
  const wi = wins.length - 1; const ci = 2;
  const w = wins[wi];
  return {
    wi, ci,
    chip: `${w.abbr} ${w.chips[ci]}`,                       // CTA copy (undated)
    dated: `${await fmtDay(w.date)} · ${w.chips[ci]}`,      // stored window label
    day: await fmtDay(w.date),                              // "Fri, Sept 11"
    mdy: await mdy(w.date),                                 // "9/11/26"
    date: w.date,                                           // "Sept 11"
  };
}

/* ============================================================
   Run A — happy path with PICKUP
   ============================================================ */
await fresh('A');
{
  const a = await bookAsCustomer({ deep: true });
  const b = await tailorAccepts(a, { deep: true });
  await customerSeesConfirmed(b, { deep: true });

  /* ---- chat both ways (item 8): customer → tailor, tailor → customer ---- */
  await page.click('[data-act="message"]');
  await assertAt('[C] 03/Confirmed Message Tailor → 10', '10-messages', 'confirmed', 'user');
  await assertText('[C] chat header names the tailor', '.chat-head__names span', 'Marco Tailor');
  assertIncludes('[C] chat header subline = appointment', await q('text', '.chat-head__names .t-small'), `${await fmtWhen(a.when)} · Home Visit`);
  await assertTrue('[C] greeting reads Hi Kevin on the customer side', () => document.querySelector('.bubble').textContent.startsWith('Hi Kevin'));
  await page.fill('.composer__input', 'Buzzer is 4B — call if it acts up');
  await page.click('.composer__send');
  await page.waitForTimeout(200);
  await assertTrue('[C] Kevin’s message sits on his own side', () => { const b = [...document.querySelectorAll('.bubble')].pop(); return b.textContent === 'Buzzer is 4B — call if it acts up' && b.classList.contains('bubble--me'); });
  await page.waitForTimeout(1300);
  await flip();
  await assertAt('[T] View as Tailor (chat check)', 't01-home', 'confirmed', 'tailor');
  await page.click('[data-act="open-job"]');
  await page.click('[data-act="message"]');
  await assertAt('[T] T03 Message Sarah → 10', '10-messages', 'confirmed', 'tailor');
  await assertText('[T] chat header names the customer', '.chat-head__names span', 'Sarah Chen');
  await assertTrue('[T] greeting reads Hi Sarah on the tailor side', () => document.querySelector('.bubble').textContent.startsWith('Hi Sarah'));
  await assertTrue('[T] Kevin’s message arrives as a THEM bubble for Marco', () => { const b = [...document.querySelectorAll('.bubble')].find((x) => x.textContent === 'Buzzer is 4B — call if it acts up'); return !!b && !b.classList.contains('bubble--me'); });
  await page.fill('.composer__input', 'Running 5 min late');
  await page.click('.composer__send');
  await page.waitForTimeout(200);
  await assertTrue('[T] Marco’s message sits on his own side', () => { const b = [...document.querySelectorAll('.bubble')].pop(); return b.textContent === 'Running 5 min late' && b.classList.contains('bubble--me'); });
  await page.waitForTimeout(1300);
  await flip();
  await assertAt('[C] View as Customer (chat check)', '01-home', 'confirmed', 'user');
  await clickCardButton('Message');
  await assertAt('[C] 01 card Message → 10', '10-messages', 'confirmed', 'user');
  await assertTrue('[C] Marco’s message arrives as a THEM bubble for Kevin', () => { const b = [...document.querySelectorAll('.bubble')].find((x) => x.textContent === 'Running 5 min late'); return !!b && !b.classList.contains('bubble--me'); });
  await assertTrue('[C] one thread: both messages in order on the customer side', () => { const t = [...document.querySelectorAll('.bubble')].map((x) => x.textContent); return t.indexOf('Buzzer is 4B — call if it acts up') < t.indexOf('Running 5 min late'); });

  /* ---- pre-visit → visit → send → approve → ready ---- */
  const c = await tailorVisitAndSend(b, { deep: true });
  const d = await customerApproves(c, { deep: true });
  const e = await tailorMarksReady({ deep: true });

  /* ---- customer: ready card → 05 → 05a → 05.1 → Done ---- */
  await flip();
  await assertAt('[C] View as Customer (ready)', '01-home', 'ready-for-pickup', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Ready');
  await assertText('[C] 01 card meta = Ready since readyAt', '.appt-card__meta', `Ready since: ${e.readyAt}`);
  await assertText('[C] 01 card CTA', '.appt-card .cta-small', 'Schedule Pickup / Delivery');
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Tailoring (ready)', '03-status-tailoring', 'ready-for-pickup');
  await assertText('[C] 03/Tailoring ready hero', '.status-hero__title', 'Your items are ready.');
  await assertText('[C] 03/Tailoring ready pill', '.status-hero .pill span:last-child', 'Ready');
  await assertText('[C] 03/Tailoring ready CTA', '.cta-bar .cta', 'Schedule Pickup / Delivery');
  await page.click('[data-act="schedule"]');
  await assertAt('[C] Schedule → 05', '05-items-ready', 'ready-for-pickup');
  await page.click('[data-opt="pickup"]');
  await page.waitForTimeout(250);
  await page.click('[data-act="continue"]');
  await assertAt('[C] Pickup → 05a', '05a-pickup-window', 'ready-for-pickup');
  assertIncludes('[C] 05a due at pickup = $400 − $24', await q('text', '.due-card__amount'), '$376');
  const w = await handoffPick();
  assertEq('[C] 05a draws the two handoff days (3 chips each)', await q('count', '[data-win]'), 6);
  await page.click(`[data-win="${w.wi}"][data-chip="${w.ci}"]`);
  await page.waitForTimeout(250);
  await assertText('[C] 05a CTA follows the chip', '[data-act="confirm"]', `Confirm Pickup · ${w.chip}`);
  await page.click('[data-act="confirm"]');
  await assertOverlay('[C]   …05.1 window confirmed', '05.1-window-confirmed');
  await assertText('[C] 05.1 title', '.screen-sheet--overlay .modal__title', 'Pickup confirmed.');
  assertEq('[C] 05.1 When / Where / Items', (await q('texts', '.screen-sheet--overlay .detail-row__value')).join(' | '), `${w.dated} | 1025 Broadway | 3 items · pressed & bagged`);
  {
    const f = await shared();
    log(f?.fulfilment?.method === 'pickup' && f.fulfilment.window === w.dated && f.fulfilment.date === w.date, '[S] chooseFulfilment recorded the dated pickup window', JSON.stringify(f?.fulfilment));
  }
  await page.click('[data-act="window-done"]');
  await assertAt('[C] Done → Home (still ready)', '01-home', 'ready-for-pickup', 'user');
  await assertTrue('[C] page scrolls after 05.1 Done (R2-U-01)', () => document.documentElement.style.overflow !== 'hidden');
  await assertText('[C] 01 card meta = scheduled window', '.appt-card__meta', `Pickup: ${w.dated}`);
  await assertText('[C] 01 card CTA flips to Change', '.appt-card .cta-small', 'Change Pickup / Delivery');
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Tailoring (scheduled)', '03-status-tailoring', 'ready-for-pickup');
  await assertText('[C] 03/Tailoring scheduled hero', '.status-hero__title', `Pickup · ${w.dated}`);
  assertIncludes('[C] 03/Tailoring body waits on the tailor', await q('text', '.status-hero__body'), 'Marco will confirm the handoff');

  /* ---- tailor: T07 follows the pickup choice → Mark Picked Up ---- */
  await flip();
  await assertAt('[T] View as Tailor (scheduled)', 't01-home', 'ready-for-pickup', 'tailor');
  await assertText('[T] T01 job pill', '.job-card .pill span:last-child', 'Ready for Pickup');
  await page.click('[data-act="open-job"]');
  await assertAt('[T] job card → T07', 't07-job-ready', 'ready-for-pickup');
  assertIncludes('[T] T07 body follows the customer’s choice', await q('text', '.t-status .t-body'), 'Sarah chose pickup at your shop.');
  assertEq('[T] T07 When / Where / Items', (await q('texts', '.t-detail-row__value')).join(' | '), `${w.dated} | 1025 Broadway | 3 items`);
  await assertText('[T] T07 CTA', '.t-actions .cta', 'Mark Picked Up');
  await render('t06-appointment-status');
  assertIncludes('[T] T06 status line names the handoff window', await q('text', '.t-header .t-body'), `Ready — handoff ${w.dated}.`);
  await assertText('[T] T06 ready CTA', '.t-actions .cta', 'View Handoff Details');
  await page.click('[data-act="handoff"]');
  await assertAt('[T] View Handoff Details → T07', 't07-job-ready', 'ready-for-pickup');
  await page.click('[data-act="picked-up"]');
  await assertAt('[T] Mark Picked Up → T08', 't08-job-complete', 'delivered', 'tailor');
  {
    const f = await shared();
    assertEq('[S] deliver stamped deliveredAt from the window day', f?.deliveredAt, w.day);
  }
  assertEq('[T] T08 order total / fee / payout', (await q('texts', '.price-row__value')).join(' '), '$400 −$40 $360');
  await page.click('[data-act="home"]');
  await assertAt('[T] Back to Home (job complete)', 't01-home', 'delivered');
  await assertText('[T] T01 job pill', '.job-card .pill span:last-child', 'Completed');

  /* ---- customer: receipt / summary / bookings / review ---- */
  await flip();
  await assertAt('[C] View as Customer (delivered)', '01-home', 'delivered', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Completed');
  await assertText('[C] 01 card meta = handoff', '.appt-card__meta', `Picked up: ${w.day}`);
  await assertText('[C] 01 card CTA', '.appt-card .cta-small', 'Leave Review');
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Summary', '03-status-summary', 'delivered');
  assertEq('[C] 03/Summary Items Received = deliveredAt', (await q('texts', '.status-hero__row span'))[1], w.day);
  assertEq('[C] 03/Summary cards = final order', await q('count', '.garment-card'), 3);
  assertEq('[C] 03/Summary rows (pickup: no delivery row)', await q('fees'), '$400 -$24 $376');
  assertEq('[C] 03/Summary total row is the pickup one, dated by the window', (await q('feeDescs'))[2], `Total - Paid at pickup ${w.mdy}`);
  await render('06-journey-complete');
  await assertAt('[C] 06 receipt', '06-journey-complete', 'delivered');
  assertEq('[C] 06 receipt rows agree with 03/Summary', await q('fees'), '$400 -$24 $376');
  assertEq('[C] 06 receipt descs agree with 03/Summary', (await q('feeDescs')).join(' | '), `Subtotal - Confirmed ${await mdy(a.when)} | 10% Deposit - Paid ${e.depositOn} | Total - Paid at pickup ${w.mdy}`);
  await page.click('[data-act="review"]');
  await assertOverlay('[C]   …06.1 review sheet', '06.1-leave-review');
  await assertText('[C] 06.1 sub = tailor · items · handoff day', '.review-sheet__sub', `Marco Tailor · 3 items · ${w.day}`);
  await page.click('[data-star="4"]');
  await page.fill('[data-review]', 'Great fit — thank you Marco');
  await page.click('[data-act="confirm-review"]');
  await page.waitForTimeout(400);
  await assertOverlay('[C]   …review sheet gone', null);
  {
    const f = await shared();
    log(f?.review?.rating === 4 && f.review.text === 'Great fit — thank you Marco', '[S] review stored on the shared appointment', JSON.stringify(f?.review));
  }
  await render('09-bookings');
  const cards = await q('bookings');
  log(cards.sections.join('|') === 'Current Bookings|Past Bookings' && !cards.current.some((c) => c.pill === 'Completed'),
    '[C] 09 partitions: no Completed card under Current', `current=${cards.current.map((c) => c.pill).join(',')}`);
  const past = cards.past.find((c) => c.meta === `Picked up: ${w.day}`);
  log(!!past && past.pill === 'Completed', '[C] 09 lists the delivered order under Past with its handoff', `past=${cards.past.map((c) => `${c.pill}/${c.meta}`).join(', ')}`);
  assertIncludes('[C] 09 Past card items title = final order (3)', past?.text, '3 Items Total - Home Visit:');
}

/* ============================================================
   Run B — DELIVERY handoff
   ============================================================ */
await fresh('B');
{
  const a = await bookAsCustomer();
  const b = await tailorAccepts(a);
  await customerSeesConfirmed(b);
  const c = await tailorVisitAndSend(b);
  await customerApproves(c);
  await tailorMarksReady();
  await flip();
  await assertAt('[C] View as Customer (ready)', '01-home', 'ready-for-pickup', 'user');
  await clickCardButton('Schedule Pickup / Delivery');
  await assertAt('[C] card CTA → 05', '05-items-ready', 'ready-for-pickup');
  await page.click('[data-opt="delivery"]');
  await page.waitForTimeout(250);
  await page.click('[data-act="continue"]');
  await assertAt('[C] Delivery → 05b', '05b-delivery-options', 'ready-for-pickup');
  await assertText('[C] 05b delivers to the customer’s address', '[data-addr-full]', '88 Leonard St, 4B — New York, NY 10013');
  assertEq('[C] 05b balance / delivery / charged', (await q('texts', '.info-row span:last-child')).join(' '), '$376 $20 $396');
  const w = await handoffPick();
  assertEq('[C] 05b draws the two handoff days (3 chips each)', await q('count', '[data-win]'), 6);
  await page.click(`[data-win="${w.wi}"][data-chip="${w.ci}"]`);
  await page.waitForTimeout(250);
  await assertText('[C] 05b CTA follows the chip', '[data-act="confirm"]', `Confirm Delivery · ${w.chip}`);
  await page.click('[data-act="confirm"]');
  await assertOverlay('[C]   …05.1 window confirmed', '05.1-window-confirmed');
  await assertText('[C] 05.1 title', '.screen-sheet--overlay .modal__title', 'Delivery confirmed.');
  assertEq('[C] 05.1 When / Where / Items', (await q('texts', '.screen-sheet--overlay .detail-row__value')).join(' | '), `${w.dated} | 88 Leonard St, 4B | 3 items · pressed & bagged`);
  {
    const f = await shared();
    log(f?.fulfilment?.method === 'delivery' && f.fulfilment.window === w.dated && f.fulfilment.date === w.date, '[S] chooseFulfilment recorded the dated delivery window', JSON.stringify(f?.fulfilment));
  }
  await page.click('[data-act="window-done"]');
  await assertAt('[C] Done → Home (still ready)', '01-home', 'ready-for-pickup', 'user');
  await assertText('[C] 01 card meta = scheduled delivery', '.appt-card__meta', `Delivery: ${w.dated}`);
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Tailoring (scheduled)', '03-status-tailoring', 'ready-for-pickup');
  await assertText('[C] 03/Tailoring scheduled hero', '.status-hero__title', `Delivery · ${w.dated}`);

  await flip();
  await assertAt('[T] View as Tailor (delivery scheduled)', 't01-home', 'ready-for-pickup', 'tailor');
  await assertText('[T] T01 job pill reads the delivery vocabulary', '.job-card .pill span:last-child', 'Ready for Delivery');
  await page.click('[data-act="open-job"]');
  await assertAt('[T] job card → T07', 't07-job-ready', 'ready-for-pickup');
  assertIncludes('[T] T07 body says delivery to the customer’s address', await q('text', '.t-status .t-body'), 'Sarah chose delivery to 88 Leonard St, 4B.');
  assertEq('[T] T07 When / Where / Items', (await q('texts', '.t-detail-row__value')).join(' | '), `${w.dated} | 88 Leonard St, 4B | 3 items`);
  await assertText('[T] T07 CTA', '.t-actions .cta', 'Mark Delivered');
  await render('t06-appointment-status');
  assertIncludes('[T] T06 status line names the delivery window', await q('text', '.t-header .t-body'), `Ready — handoff ${w.dated}.`);
  await render('10-messages');
  assertEq('[T] chat subline dates the handoff by the chosen window', await q('text', '.chat-head__names .t-small'), `Ready for delivery · ${w.day}`);
  await render('t07-job-ready');
  await page.click('[data-act="picked-up"]');
  await assertAt('[T] Mark Delivered → T08', 't08-job-complete', 'delivered', 'tailor');
  assertEq('[T] T08 order total / fee / payout', (await q('texts', '.price-row__value')).join(' '), '$400 −$40 $360');

  await flip();
  await assertAt('[C] View as Customer (delivered)', '01-home', 'delivered', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Completed');
  await assertText('[C] 01 card meta = handoff', '.appt-card__meta', `Delivered: ${w.day}`);
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Summary', '03-status-summary', 'delivered');
  assertEq('[C] 03/Summary rows (delivery: +$20)', await q('fees'), '$400 -$24 $20 $396');
  assertEq('[C] 03/Summary delivery + total rows', (await q('feeDescs')).slice(2).join(' | '), `Delivery - Paid ${w.mdy} | Total - Paid ${w.mdy}`);
  await render('06-journey-complete');
  assertEq('[C] 06 receipt rows agree with 03/Summary', await q('fees'), '$400 -$24 $20 $396');
  assertEq('[C] 06 receipt delivery + total rows', (await q('feeDescs')).slice(2).join(' | '), `Delivery - Paid ${w.mdy} | Total - Paid ${w.mdy}`);
  await render('09-bookings');
  const pastMetas = (await q('bookings')).past.map((c) => c.meta);
  log(pastMetas.includes(`Delivered: ${w.day}`), '[C] 09 lists the delivered order under Past', `past=${pastMetas.join(', ')}`);
}

/* ============================================================
   Run C — tailor DECLINES
   ============================================================ */
await fresh('C');
{
  const a = await bookAsCustomer();
  await flip();
  await assertAt('[T] View as Tailor', 't01-home', 'searching', 'tailor');
  await page.click('.req-card [data-act="view-details"]');
  await assertAt('[T] View Details → T02', 't02-appointment-request', 'searching');
  await page.click('[data-act="decline"]');
  await assertAt('[T] Decline → T03A', 't03a-decline-request', 'searching');
  await assertTrue('[T] T03A: no reason pre-selected live', () => !document.querySelector('.radio-row--selected'));
  await page.click('[data-reason="1"]');
  await assertText('[T] T03A: a non-conflict reason keeps Decline Request', '[data-act="decline"]', 'Decline Request');
  await page.click('[data-act="decline"]');
  await assertAt('[T] Decline Request → T01 (declined)', 't01-home', 'declined', 'tailor');
  {
    const jobs = await q('jobCards');
    log(!(await q('count', '.req-card')) && jobs.length === 2 && !jobs.some((j) => j.text.includes('Declined')) && jobs.some((j) => j.pill === 'Confirmed' && j.payout === '$180'),
      '[T] T01: no request card, no Declined row; the seed job stays', `jobs=${jobs.map((j) => `${j.pill}/${j.payout}`).join(', ')}`);
    const t = await terminalPlacement();
    log(t.status === 'declined' && t.by === 'tailor' && t.reason === 'declined' && t.wasRequested && t.inPast && t.notUpcoming && t.stash, '[S] declined: moved to past[0], lastCancelled, nothing charged', JSON.stringify(t));
  }
  await flip();
  await assertAt('[C] View as Customer (declined)', '01-home', 'declined', 'user');
  await assertText('[C] 01 keeps the seed’s Confirmed card (declined is not upcoming)', '.appt-card .pill span:last-child', 'Confirmed');
  await openBookingsCard('[C] 09 Past lists the Declined card', { pill: 'Declined', meta: a.when });
  await assertAt('[C] Declined card → 03/Cancelled', '03-status-cancelled', 'declined');
  await assertText('[C] 03/Cancelled declined title', '.status-hero__title', 'Marco couldn’t take this request');
  await assertText('[C] 03/Cancelled pill', '.status-hero .pill span:last-child', 'Declined');
  assertIncludes('[C] 03/Cancelled: nothing charged', await q('body'), 'Nothing was charged');
  assertEq('[C] 03/Cancelled: no Paid / Balance rows for a declined request', await q('count', '.fee-row'), 0);
  assertEq('[C] 03/Cancelled keeps the requested garments', await q('count', '.garment-card'), a.garments.length);
  await assertText('[C] 03/Cancelled primary CTA', '[data-act="rerequest"]', 'Send to Another Tailor');
  await page.click('[data-act="rerequest"]');
  await assertAt('[C] Send to Another Tailor → 02 seeded', '02-appointment-details', 'declined', 'user');
  assertEq('[C] 02 carries the declined request’s garments', await q('count', '.garment-card'), 2);
}

/* ============================================================
   Run D — customer WITHDRAWS BEFORE acceptance (solo)
   ============================================================ */
await fresh('D', { solo: true });
{
  const a = await bookAsCustomer();
  await page.click('[data-act="cancel"]');
  await assertOverlay('[C]   …03.1 cancel popup', '03.1-reschedule-popup');
  await assertText('[C] 03.1 cancel wording', '.screen-sheet--overlay .modal__title', 'Before you cancel');
  assertIncludes('[C] 03.1 says the hold is released', await q('text', '.screen-sheet--overlay .modal'), 'Nothing was charged — the hold on your card is released');
  await page.click('[data-act="confirm-reschedule"]');
  await assertAt('[C] Cancel Request → 03/Cancelled', '03-status-cancelled', 'cancelled', 'user');
  await assertTrue('[C] page scrolls after the 03.1 confirm (R2-U-01)', () => document.documentElement.style.overflow !== 'hidden');
  await assertText('[C] 03/Cancelled pill', '.status-hero .pill span:last-child', 'Cancelled');
  assertIncludes('[C] 03/Cancelled: nothing charged', await q('body'), 'Nothing was charged');
  assertEq('[C] 03/Cancelled: no fee rows', await q('count', '.fee-row'), 0);
  {
    const t = await terminalPlacement();
    const f = await shared();
    log(!(await page.evaluate(() => window.Taily.state.upcoming.some((x) => x.mine))) && t.status === 'cancelled' && t.by === 'customer' && t.wasRequested && t.inPast && t.stash && f.totals?.subtotal === a.totals.subtotal,
      '[S] request withdrawn: past[0] + lastCancelled (wasRequested)', JSON.stringify(t));
  }
  await flip();
  await assertAt('[T] View as Tailor after the withdrawal', 't01-home', 'cancelled', 'tailor');
  await assertTrue('[T] T01 shows no request', () => !document.querySelector('.req-card'));
  assertIncludes('[T] T01 says No new requests', await q('body'), 'No new requests.');
  {
    const jobs = await q('jobCards');
    const row = jobs.find((j) => j.pill === 'Withdrawn');
    log(!!row && row.right === 'No action needed' && row.payout === null, '[T] T01 Withdrawn row · No action needed, no payout (R2-T-06)', `jobs=${jobs.map((j) => `${j.pill}/${j.payout}`).join(', ')}`);
  }
  await page.click('.job-card:has-text("Withdrawn")');
  await assertAt('[T] Withdrawn row → T03B', 't03b-job-cancelled', 'cancelled');
  await assertText('[T] T03B withdrawn title', '.status-hero__title', 'Request withdrawn.');
  assertIncludes('[T] T03B withdrawn body names the slot', await q('text', '.status-hero__body'), `Sarah withdrew her ${await fmtWhen(a.when)} request before you accepted.`);
}

/* ============================================================
   Run E — customer CANCELS AFTER acceptance (solo)
   ============================================================ */
await fresh('E', { solo: true });
{
  const a = await bookAsCustomer();
  const b = await tailorAccepts(a);
  await customerSeesConfirmed(b);
  await page.click('[data-act="reschedule"]');
  await assertOverlay('[C]   …03.1 reschedule popup', '03.1-reschedule-popup');
  await assertText('[C] 03.1 reschedule wording', '.screen-sheet--overlay .modal__title', 'Before you reschedule');
  assertIncludes('[C] 03.1 quotes the real deposit', await q('text', '.screen-sheet--overlay .modal'), 'Your $24 deposit is refunded.');
  assertIncludes('[C] 03.1 quotes the real appointment', await q('text', '.screen-sheet--overlay .modal'), `${await fmtWhen(a.when)} with Marco is cancelled`);
  await page.click('[data-act="confirm-reschedule"]');
  await assertAt('[C] confirm → 03/Cancelled', '03-status-cancelled', 'cancelled', 'user');
  await assertText('[C] 03/Cancelled pill', '.status-hero .pill span:last-child', 'Cancelled');
  await assertText('[C] 03/Cancelled customer title', '.status-hero__title', 'Appointment Cancelled');
  assertEq('[C] 03/Cancelled keeps the confirmed order rows', await q('fees'), '$240 -$24 $216');
  assertIncludes('[C] 03/Cancelled refund names the real pay method', await q('body'), 'Your $24 deposit will be returned to Apple Pay');
  {
    const t = await terminalPlacement();
    log(t.status === 'cancelled' && t.by === 'customer' && t.reason === 'customer' && !t.wasRequested && t.inPast && t.stash, '[S] confirmed visit cancelled: past[0] + lastCancelled', JSON.stringify(t));
  }
  await flip();
  await assertAt('[T] View as Tailor after the cancel', 't01-home', 'cancelled', 'tailor');
  await assertTrue('[T] T01: no request card', () => !document.querySelector('.req-card'));
  {
    /* closed rows render after the Leo Von filler (R2-T-05/06) */
    const row = (await q('jobCards')).find((j) => j.text.includes('Sarah Chen'));
    assertEq('[T] T01 Sarah job pill', row?.pill, 'Cancelled');
    assertEq('[T] T01 Sarah job right slot', row?.right, 'Slot reopened');
    assertEq('[T] T01 Sarah job payout (the cancelled booking)', row?.payout, '$216');
  }
  await page.click('[data-act="open-job"]');
  await assertAt('[T] Cancelled card → T03B', 't03b-job-cancelled', 'cancelled');
  await assertText('[T] T03B hero', '.status-hero__title', 'Job Cancelled.');
  assertIncludes('[T] T03B names the live slot (not tonight)', await q('text', '.status-hero__body'), `your ${await fmtWhen(a.when)} slot is open on your calendar again`);
  await page.click('[data-act="home"]');
  await assertAt('[T] Back to Home', 't01-home', 'cancelled');
}

/* ============================================================
   Run E2 — TWO bookings coexist (the seed present): the fresh booking
   and the Jul 12 seed on 01 / 09 and T01; cancelling one leaves the
   other untouched (R2-T-01 / R2-U-06 / R2-S-03).
   ============================================================ */
await fresh('E2');
{
  const seedBefore = await seed();
  const a = await bookAsCustomer();
  const b = await tailorAccepts(a);        // asserts the request AND the seed's job on T01
  await render('t01-home');
  {
    const jobs = await q('jobCards').then((j) => j.filter((x) => x.text.includes('Sarah Chen')));
    log(jobs.length === 2 && jobs.every((j) => j.pill === 'Confirmed') && jobs.map((j) => j.payout).sort().join(',') === '$180,$216', '[T] T01 after Accept: two Confirmed Sarah jobs ($216 fresh + $180 seed)', jobs.map((j) => `${j.pill}/${j.payout}`).join(', '));
  }
  await customerSeesConfirmed(b);
  await render('09-bookings');
  {
    const cards = await q('bookings');
    const confirmed = cards.current.filter((c) => c.pill === 'Confirmed');
    log(confirmed.length === 2 && confirmed.some((c) => c.meta === a.when) && confirmed.some((c) => c.meta === seedBefore.when), '[C] 09 Current lists both Confirmed bookings (fresh + seed)', `current=${cards.current.map((c) => `${c.pill}/${c.meta}`).join(', ')}`);
  }
  await render('01-home');
  await page.click('.appt-card');
  await assertAt('[C] 01 card (the fresh booking) → 03/Confirmed', '03-status-confirmed', 'confirmed');
  await page.click('[data-act="reschedule"]');
  await assertOverlay('[C]   …03.1 reschedule popup', '03.1-reschedule-popup');
  await page.click('[data-act="confirm-reschedule"]');
  await assertAt('[C] confirm → 03/Cancelled', '03-status-cancelled', 'cancelled', 'user');
  {
    const t = await terminalPlacement();
    const s = await seed();
    log(t.status === 'cancelled' && t.inPast && t.stash, '[S] the fresh booking is the cancelled stash', JSON.stringify(t));
    log(s?.status === seedBefore.status && s.when === seedBefore.when && !s.cancelledAt, '[S] the seed is untouched by the cancel', `seed=${s?.status}/${s?.when}`);
  }
  await render('01-home');
  await assertText('[C] 01 card is now the seed (Confirmed)', '.appt-card .pill span:last-child', 'Confirmed');
  await assertText('[C] 01 card meta = the seed’s date', '.appt-card__meta', seedBefore.when);
  {
    await render('09-bookings');
    const cards = await q('bookings');
    log(cards.current.filter((c) => c.pill === 'Confirmed').length === 1 && cards.current.some((c) => c.meta === seedBefore.when) && cards.past.some((c) => c.pill === 'Cancelled' && c.meta === a.when),
      '[C] 09: seed still Current, the cancelled booking under Past', `current=${cards.current.map((c) => c.pill).join(',')} past=${cards.past.map((c) => `${c.pill}/${c.meta}`).join(', ')}`);
  }
  await flip();
  await assertAt('[T] View as Tailor after the cancel (seed present)', 't01-home', 'cancelled', 'tailor');
  {
    const jobs = await q('jobCards');
    log(jobs.some((j) => j.pill === 'Cancelled' && j.payout === '$216' && j.right === 'Slot reopened'), '[T] T01 shows the cancelled $216 booking · Slot reopened', `jobs=${jobs.map((j) => `${j.pill}/${j.payout}`).join(', ')} req=${await q('count', '.req-card')}`);
    log(jobs.some((j) => j.pill === 'Confirmed' && j.payout === '$180'), '[T] T01 keeps the seed’s Confirmed job', '');
  }
  await page.click('.job-card:has-text("Slot reopened")');
  await assertAt('[T] Cancelled row → T03B', 't03b-job-cancelled', 'cancelled');
  assertIncludes('[T] T03B names the fresh slot, not tonight', await q('text', '.status-hero__body'), `your ${await fmtWhen(a.when)} slot is open on your calendar again`);
}

/* ============================================================
   Run F — SUGGEST ANOTHER TIME (R2-U-03 / R2-T-04)
   ============================================================ */
/** From T01: the request card's Decline → T03A → "Schedule conflict" →
    Suggest Another Time → wheel (next day) → confirm → T01 proposed card. */
async function tailorProposes(label) {
  await page.click('.req-card [data-act="decline"]');
  await assertAt(`[T] ${label}: request card Decline → T03A`, 't03a-decline-request', 'searching', 'tailor');
  await page.click('[data-reason="0"]');
  await assertText(`[T] ${label}: Schedule conflict → Suggest Another Time`, '[data-act="decline"]', 'Suggest Another Time');
  await page.click('[data-act="decline"]');
  await page.waitForTimeout(500);
  await assertText(`[T] ${label}: the time wheel opens, titled for a proposal`, '.screen-sheet--overlay .sheet__title', 'Suggest another time');
  await page.evaluate(() => { document.querySelector('.screen-sheet--overlay .wheel__col--scroll').scrollTop += 40; });
  await page.waitForTimeout(300);
  await page.click('.screen-sheet--overlay [data-act="set-time"]');
  await assertAt(`[T] ${label}: confirm → T01 (still searching)`, 't01-home', 'searching', 'tailor');
  await assertOverlay(`[T]   …${label}: wheel closed`, null);
  const a = await shared();
  const p = a?.proposed?.when;
  log(!!p && a.proposed.by === 'tailor' && a.status === 'searching' && p !== a.when && a.tailor?.expiresAt > Date.now() + 80 * 60000, `[S] ${label}: a.proposed set by the tailor, status unchanged, timer restarted`, `proposed=${p} when=${a?.when}`);
  const when = await fmtWhen(p);
  await assertText(`[T] ${label}: T01 card reads Time proposed … waiting for Sarah`, '.req-card__proposed', `Time proposed · ${when} — waiting for Sarah`);
  await assertTrue(`[T] ${label}: T01 card offers Withdraw, no Decline`, () => !!document.querySelector('.req-card [data-act="withdraw"]') && !document.querySelector('.req-card [data-act="decline"]'));
  return { a, proposed: p, when };
}

await fresh('F');
{
  const a = await bookAsCustomer();
  await flip();
  await assertAt('[T] View as Tailor', 't01-home', 'searching', 'tailor');
  const p1 = await tailorProposes('proposal 1');
  await page.click('.req-card [data-act="view-details"]');
  await assertAt('[T] View Details on the proposed request → T02', 't02-appointment-request', 'searching');
  assertIncludes('[T] T02 notes the pending proposal', await q('text', '[data-s="t02-appointment-request"] > p.t-body'), `You proposed ${p1.when} — waiting for Sarah.`);
  await assertText('[T] T02 still offers Accept (Sarah’s original time)', '[data-act="accept"]', 'Accept Request · $216');

  /* customer: card "New time proposed" → Review Time → new-times hero → Keep Looking */
  await flip();
  await assertAt('[C] View as Customer (time proposed)', '01-home', 'searching', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Requested');
  await assertText('[C] 01 card meta = New time proposed', '.appt-card__meta', `New time proposed: ${p1.when}`);
  await assertText('[C] 01 card CTA', '.appt-card .cta-small', 'Review Time');
  await clickCardButton('Review Time');
  await assertAt('[C] Review Time → 03/Requested', '03-status-requested', 'searching');
  await assertTrue('[C] 03/Requested uses the new-times hero', () => !!document.querySelector('.status-hero--new-times'));
  await assertText('[C] 03/Requested proposed hero', '.status-hero__title', 'Marco proposed a new time');
  assertEq('[C] 03/Requested proposed body', await q('text', '.status-hero__body'), `Your ${await fmtWhen(a.when)} slot isn’t free. Marco can do ${p1.when}.`);
  assertEq('[C] 03/Requested CTAs', (await q('texts', '[data-s="03-status-requested"] .cta')).join(' | '), 'Accept New Time | Keep Looking');
  await page.click('[data-act="keep-looking"]');
  await assertAt('[C] Keep Looking → still searching', '03-status-requested', 'searching', 'user');
  await assertText('[C] 03/Requested hero back to searching', '.status-hero__title', 'Finding your tailor…');
  {
    const f = await shared();
    log(f?.proposed == null && f.proposalDeclined === p1.proposed && f.when === a.when, '[S] declineProposedTime: proposal cleared, remembered, when unchanged', `proposalDeclined=${f?.proposalDeclined} when=${f?.when}`);
  }
  await render('01-home');
  await assertText('[C] 01 card meta back to the requested time', '.appt-card__meta', `Appt Date: ${a.when}`);
  assertEq('[C] 01 card has no Review Time', await q('count', '.appt-card .cta-small'), 0);

  /* tailor: "Sarah kept her original time" → propose again → Withdraw */
  await flip();
  await assertAt('[T] View as Tailor (proposal declined)', 't01-home', 'searching', 'tailor');
  assertIncludes('[T] T01 card says Sarah kept her original time', await q('text', '.req-card__note'), 'Sarah kept her original time');
  await assertTrue('[T] T01 card back to Decline (no proposed line)', () => !!document.querySelector('.req-card [data-act="decline"]') && !document.querySelector('.req-card__proposed'));
  await tailorProposes('proposal 2');
  await page.click('.req-card [data-act="withdraw"]');
  await assertAt('[T] Withdraw → T01', 't01-home', 'searching', 'tailor');
  assertEq('[T] Withdraw toast', await q('toast'), 'Proposal withdrawn — Sarah keeps her original time');
  await assertTrue('[T] T01 card back to Decline + Sarah kept her original time', () => !!document.querySelector('.req-card [data-act="decline"]') && !document.querySelector('.req-card__proposed') && /Sarah kept her original time/.test(document.querySelector('.req-card')?.textContent ?? ''));
  {
    const f = await shared();
    log(f?.proposed == null && f.status === 'searching', '[S] withdraw = declineProposedTime, still searching', `proposed=${f?.proposed}`);
  }
  await flip();
  await assertAt('[C] View as Customer (withdrawn)', '01-home', 'searching', 'user');
  await assertText('[C] 01 card meta = requested time (no proposal)', '.appt-card__meta', `Appt Date: ${a.when}`);
  assertEq('[C] 01 card has no Review Time', await q('count', '.appt-card .cta-small'), 0);

  /* propose a third time → the customer accepts → both sides on the new when */
  await flip();
  const p3 = await tailorProposes('proposal 3');
  await flip();
  await assertAt('[C] View as Customer (third proposal)', '01-home', 'searching', 'user');
  await assertText('[C] 01 card meta', '.appt-card__meta', `New time proposed: ${p3.when}`);
  await clickCardButton('Review Time');
  await assertAt('[C] Review Time → 03/Requested', '03-status-requested', 'searching');
  await page.click('[data-act="accept-time"]');
  await assertAt('[C] Accept New Time → 03/Confirmed', '03-status-confirmed', 'confirmed', 'user');
  const f = await shared();
  log(f?.when === p3.proposed && f.proposed == null && !!f.depositOn, '[S] acceptProposedTime: when = the proposal, confirmed, deposit charged', `when=${f?.when} depositOn=${f?.depositOn}`);
  const badge = await page.evaluate((w) => { const p = window.__data.parseWhen(w); return `${p.mon.slice(0, 3).toUpperCase()} ${p.day}`; }, f.when);
  await assertText('[C] 03/Confirmed pill', '.status-hero .pill span:last-child', 'Confirmed');
  assertIncludes('[C] 03/Confirmed rows carry the NEW time', (await q('texts', '.summary-card__row')).join(' | '), p3.when);
  await render('01-home');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Confirmed');
  await assertText('[C] 01 card meta = the new when', '.appt-card__meta', f.when);
  assertEq('[C] 01 card badge follows the new day', `${await q('text', '.appt-card__month')} ${await q('text', '.appt-card__day')}`, badge);

  await flip();
  await assertAt('[T] View as Tailor (time accepted)', 't01-home', 'confirmed', 'tailor');
  await assertTrue('[T] T01 request card gone', () => !document.querySelector('.req-card'));
  {
    const jobs = await q('jobCards');
    const j = jobs[0];
    log(j?.pill === 'Confirmed' && j.payout === '$216' && j.meta === `${p3.when.split(' · ')[1]} - 88 Leonard St, 4B` && j.badge === badge, '[T] T01 job card carries the new date / time', `first=${JSON.stringify(j)}`);
  }
  await page.click('[data-act="open-job"]');
  await assertAt('[T] job card → T03 pre-visit', 't03-request-accepted', 'confirmed');
  assertIncludes('[T] T03 pre-visit sub = the new when', await q('text', '.t-header .t-body'), `${p3.when} at 88 Leonard St, 4B`);
  await render('t02-appointment-request');
  await assertText('[T] T02 for the accepted job reads Accepted', '.t-actions .cta', 'Accepted');
}

/* ============================================================
   Run G — REQUEST EXPIRY (R2-U-04 / R2-T-03): the tailor-side timer
   strip, then the customer-side "2 hours" line.
   ============================================================ */
await fresh('G');
{
  const a = await bookAsCustomer();
  const when = await fmtWhen(a.when);
  await flip();
  await assertAt('[T] View as Tailor', 't01-home', 'searching', 'tailor');
  await page.click('.req-card [data-act="time-passes"]');
  await assertAt('[T] timer strip (time passes) → stays on T01', 't01-home', 'expired', 'tailor');
  assertEq('[T] toast: Sarah’s request expired', await q('toast'), 'Sarah’s request expired');
  {
    const jobs = await q('jobCards');
    const row = jobs.find((j) => j.pill === 'Expired');
    log(!(await q('count', '.req-card')) && !!row && row.right === 'No action needed' && row.payout === null && row.meta === `Request lapsed · ${when}`, '[T] T01: request card gone, Expired row · No action needed, no payout', `jobs=${jobs.map((j) => `${j.pill}/${j.payout}`).join(', ')}`);
    const t = await terminalPlacement();
    log(t.status === 'expired' && t.by === 'none' && t.reason === 'expired' && t.wasRequested && t.inPast && t.notUpcoming && t.stash, '[S] expireAppointment: past[0] + lastCancelled (cancelledBy none)', JSON.stringify(t));
  }
  await page.click('.job-card:has-text("Expired")');
  await assertAt('[T] Expired row → T02 expired view', 't02-appointment-request', 'expired');
  await assertText('[T] T02 expired header', '.t-header .t-title', '$216 | Request Expired');
  await assertTrue('[T] T02 expired: no Accept / Decline', () => !document.querySelector('[data-act="accept"]') && !document.querySelector('[data-act="decline"]'));
  assertIncludes('[T] T02 expired note', await q('body'), 'This request lapsed before you responded.');
  await page.click('[data-act="home"]');
  await assertAt('[T] Back to Home', 't01-home', 'expired');

  await flip();
  await assertAt('[C] View as Customer (expired)', '01-home', 'expired', 'user');
  await assertText('[C] 01 keeps the seed’s Confirmed card (expired is not upcoming)', '.appt-card .pill span:last-child', 'Confirmed');
  await openBookingsCard('[C] 09 Past lists the Expired card', { pill: 'Expired', meta: 'Request expired · no tailor accepted' });
  await assertAt('[C] Expired card → 03/Cancelled', '03-status-cancelled', 'expired');
  await assertText('[C] 03/Cancelled expired title', '.status-hero__title', 'Request expired');
  await assertText('[C] 03/Cancelled pill', '.status-hero .pill span:last-child', 'Expired');
  assertIncludes('[C] 03/Cancelled expired body', await q('text', '.status-hero__body'), 'No tailor accepted in time. Nothing was charged');
  assertEq('[C] 03/Cancelled: no fee rows', await q('count', '.fee-row'), 0);
  await assertText('[C] 03/Cancelled primary CTA', '[data-act="rerequest"]', 'Send Request Again');
  await page.click('[data-act="rerequest"]');
  const b = await rebookFrom02('Send Request Again');
  log(b.when === a.when, '[S] the re-request keeps the requested time', `when=${b.when}`);

  /* customer-side demo: the "2 hours" line = time passes */
  await page.click('[data-act="expire"]');
  await assertAt('[C] "2 hours" line tap → 03/Cancelled', '03-status-cancelled', 'expired', 'user');
  await assertTrue('[C] page scrolls after the expiry redirect', () => document.documentElement.style.overflow !== 'hidden');
  await assertText('[C] 03/Cancelled expired title', '.status-hero__title', 'Request expired');
  {
    const t = await terminalPlacement();
    log(t.status === 'expired' && t.inPast && t.stash, '[S] second request expired from the customer side', JSON.stringify(t));
  }
  await render('09-bookings');
  {
    const cards = await q('bookings');
    log(cards.past.filter((c) => c.pill === 'Expired').length === 2 && !cards.current.some((c) => c.pill === 'Requested'), '[C] 09: both expired requests under Past, none Current', `current=${cards.current.map((c) => c.pill).join(',')} past=${cards.past.map((c) => c.pill).join(',')}`);
  }
  await flip();
  await assertAt('[T] View as Tailor (both expired)', 't01-home', 'expired', 'tailor');
  {
    const jobs = await q('jobCards');
    log(!(await q('count', '.req-card')) && jobs.filter((j) => j.pill === 'Expired').length === 2 && jobs.some((j) => j.pill === 'Confirmed' && j.payout === '$180'), '[T] T01: no request, two Expired rows, the seed job untouched', `jobs=${jobs.map((j) => `${j.pill}/${j.payout}`).join(', ')}`);
  }
}

/* ============================================================
   Run H — TAILOR CANCELS a confirmed visit, then a NO-SHOW
   (R2-U-05 / R2-T-05)
   ============================================================ */
/** From T03 pre-visit: Can’t make it → modal → reason → Confirm → T03B. */
async function tailorCantMakeIt(reason) {
  await assertTrue('[T] T03 pre-visit offers Can’t make it', () => !!document.querySelector('[data-act="cant-make-it"]'));
  await page.click('[data-act="cant-make-it"]');
  await assertOverlay('[T]   …Can’t make it modal', 't03.1-cant-make-it');
  await page.click('[data-act="confirm-cancel"]');
  await assertOverlay('[T]   …confirm without a reason keeps the modal', 't03.1-cant-make-it');
  await page.click(`[data-reason="${reason}"]`);
  await page.click('[data-act="confirm-cancel"]');
  await assertAt(`[T] ${reason} → T03B`, 't03b-job-cancelled', 'cancelled', 'tailor');
  await assertOverlay('[T]   …modal closed', null);
}

await fresh('H');
{
  const a = await bookAsCustomer();
  const b = await tailorAccepts(a);
  await customerSeesConfirmed(b);
  await tailorOpensPreVisit(b);
  await tailorCantMakeIt('cant-make-it');
  await assertText('[T] T03B cancelled-by-you title', '.status-hero__title', 'You cancelled this job.');
  assertIncludes('[T] T03B body: hold released + the slot', await q('text', '.status-hero__body'), `her hold is released. Your ${await fmtWhen(a.when)} slot is open again.`);
  {
    const t = await terminalPlacement();
    log(t.status === 'cancelled' && t.by === 'tailor' && t.reason === 'cant-make-it' && !t.wasRequested && t.inPast && t.notUpcoming && t.stash, '[S] tailorCancels(cant-make-it): past[0] + lastCancelled', JSON.stringify(t));
  }
  await page.click('[data-act="home"]');
  await assertAt('[T] Back to Home', 't01-home', 'cancelled');
  {
    const jobs = await q('jobCards');
    log(jobs.some((j) => j.pill === 'Cancelled' && j.right === 'Cancelled · by you' && j.payout === '$216'), '[T] T01 row reads Cancelled · by you', `jobs=${jobs.map((j) => `${j.pill}/${j.right}`).join(', ')}`);
  }
  await flip();
  await assertAt('[C] View as Customer (tailor cancelled)', '01-home', 'cancelled', 'user');
  await assertText('[C] 01 keeps the seed’s Confirmed card (cancelled is not upcoming)', '.appt-card .pill span:last-child', 'Confirmed');
  await openBookingsCard('[C] 09 Past card reads Cancelled by Marco', { pill: 'Cancelled', meta: 'Cancelled by Marco' });
  await assertAt('[C] card → 03/Cancelled', '03-status-cancelled', 'cancelled');
  await assertText('[C] 03/Cancelled tailor-cancelled title', '.status-hero__title', 'Marco had to cancel');
  await assertText('[C] 03/Cancelled pill', '.status-hero .pill span:last-child', 'Cancelled');
  assertIncludes('[C] 03/Cancelled body: nothing charged', await q('text', '.status-hero__body'), 'Nothing was charged — the hold on your card is released');
  assertEq('[C] 03/Cancelled: no fee rows (hold released)', await q('count', '.fee-row'), 0);
  assertEq('[C] 03/Cancelled: no refund card', await q('count', '.prepare-card'), 0);
  await assertText('[C] 03/Cancelled primary CTA', '[data-act="rerequest"]', 'Find Another Tailor');
  await page.click('[data-act="rerequest"]');
  const c = await rebookFrom02('Find Another Tailor');

  /* no-show on the re-booked visit */
  const d = await tailorAccepts(c);
  await customerSeesConfirmed(d);
  await tailorOpensPreVisit(d);
  await tailorCantMakeIt('no-show');
  await assertText('[T] T03B no-show title', '.status-hero__title', 'Sarah didn’t show.');
  assertIncludes('[T] T03B no-show body', await q('text', '.status-hero__body'), 'Nothing was charged.');
  {
    const t = await terminalPlacement();
    log(t.status === 'cancelled' && t.by === 'tailor' && t.reason === 'no-show' && t.inPast && t.stash, '[S] tailorCancels(no-show): past[0] + lastCancelled', JSON.stringify(t));
  }
  await page.click('[data-act="calendar"]');
  await assertAt('[T] View Calendar → T01', 't01-home', 'cancelled');
  {
    const jobs = await q('jobCards');
    log(jobs.some((j) => j.pill === 'Cancelled' && j.right === 'No-show') && jobs.some((j) => j.right === 'Cancelled · by you'), '[T] T01 rows: No-show and Cancelled · by you', `jobs=${jobs.map((j) => `${j.pill}/${j.right}`).join(', ')}`);
  }
  await flip();
  await assertAt('[C] View as Customer (no-show)', '01-home', 'cancelled', 'user');
  await render('09-bookings');
  {
    const cards = await q('bookings');
    log(cards.past.some((x) => x.pill === 'Cancelled' && x.meta === 'Missed appointment') && cards.past.some((x) => x.pill === 'Cancelled' && x.meta === 'Cancelled by Marco'), '[C] 09 Past: Missed appointment + Cancelled by Marco', `past=${cards.past.map((x) => `${x.pill}/${x.meta}`).join(', ')}`);
  }
  await openBookingsCard('[C] 09 Missed appointment card', { pill: 'Cancelled', meta: 'Missed appointment' });
  await assertAt('[C] card → 03/Cancelled', '03-status-cancelled', 'cancelled');
  await assertText('[C] 03/Cancelled no-show title', '.status-hero__title', `We missed you at ${await fmtWhen(c.when)}`);
  assertIncludes('[C] 03/Cancelled no-show body', await q('text', '.status-hero__body'), 'Marco marked this visit as a no-show. Nothing was charged.');
  assertEq('[C] 03/Cancelled: no fee rows', await q('count', '.fee-row'), 0);
  await assertText('[C] 03/Cancelled primary CTA', '[data-act="rerequest"]', 'Find Another Tailor');
}

/* ============================================================
   Run I — REQUEST CHANGES (R2-T-09): 04.1 Sounds Good → chat → tailor
   sees it → approval clears it
   ============================================================ */
await fresh('I');
{
  const BUBBLE = 'Can we talk about the changes before I approve?';
  const a = await bookAsCustomer();
  const b = await tailorAccepts(a);
  await customerSeesConfirmed(b);
  const c = await tailorVisitAndSend(b);
  await customerOpensReview(c);
  await page.click('[data-act="changes"]');
  await assertOverlay('[C]   …04.1 Request Changes popup', '04.1-request-changes');
  await page.click('[data-act="sounds-good"]');
  await assertAt('[C] Sounds Good → chat', '10-messages', 'awaiting-approval', 'user');
  await assertOverlay('[C]   …popup closed', null);
  await assertTrue('[C] the canned bubble is Kevin’s last message', (B) => { const b = [...document.querySelectorAll('.bubble')].pop(); return b?.textContent === B && b.classList.contains('bubble--me'); }, '', BUBBLE);
  {
    const f = await shared();
    log(!!f?.changesRequestedAt && f.status === 'awaiting-approval' && !f.pendingChatSeed, '[S] requestChanges stamped changesRequestedAt, status unchanged', `changesRequestedAt=${f?.changesRequestedAt}`);
  }
  await flip();
  await assertAt('[T] View as Tailor (changes requested)', 't01-home', 'awaiting-approval', 'tailor');
  {
    const j = (await q('jobCards'))[0];
    log(j?.pill === 'Awaiting Customer' && j.right === 'Sarah has questions', '[T] T01 job card reads Sarah has questions', `first=${j?.pill}/${j?.right}`);
  }
  await page.click('[data-act="open-job"]');
  await assertAt('[T] job card → T06', 't06-appointment-status', 'awaiting-approval');
  assertIncludes('[T] T06 line: Sarah wants to talk the order over', await q('text', '.t-header .t-body'), 'Sarah wants to talk the order over before approving');
  assertEq('[T] T06 CTAs lead with Message Sarah', (await q('texts', '.t-actions .cta')).join(' | '), 'Message Sarah | Mark Ready | Back to Appointments');
  await assertText('[T] T06 job right slot', '.job-card__bottom > span:last-child', 'Sarah has questions');
  await page.click('[data-act="message"]');
  await assertAt('[T] Message Sarah → 10', '10-messages', 'awaiting-approval', 'tailor');
  await assertTrue('[T] Sarah’s canned bubble reads as THEM for Marco', (B) => { const b = [...document.querySelectorAll('.bubble')].find((x) => x.textContent === B); return !!b && !b.classList.contains('bubble--me'); }, '', BUBBLE);
  assertEq('[T] chat pill uses the tailor vocabulary', await q('text', '.chat-head .pill'), 'Awaiting Customer');
  await page.fill('.composer__input', 'Sure — the sleeve was too long once pinned');
  await page.click('.composer__send');
  await page.waitForTimeout(200);

  /* the customer approves → the trace clears on the tailor side */
  await flip();
  await assertAt('[C] View as Customer', '01-home', 'awaiting-approval', 'user');
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Tailoring (awaiting)', '03-status-tailoring', 'awaiting-approval');
  await page.click('.cta-bar [data-act="review-order"]');
  await assertAt('[C] Review Final Order → 04/Modified', '04-review-approve-modified', 'awaiting-approval');
  await page.click('[data-act="approve"]');
  await assertAt('[C] Approve → 03/Tailoring (tailoring)', '03-status-tailoring', 'tailoring', 'user');
  {
    const f = await shared();
    log(f?.changesRequestedAt === undefined && !!f?.approvedAt, '[S] approveOrder cleared changesRequestedAt', `changesRequestedAt=${f?.changesRequestedAt} approvedAt=${f?.approvedAt}`);
  }
  await flip();
  await assertAt('[T] View as Tailor (approved)', 't01-home', 'tailoring', 'tailor');
  {
    const j = (await q('jobCards'))[0];
    log(j?.pill === 'Tailoring' && j.right === '3 items', '[T] T01 job card back to the item count', `first=${j?.pill}/${j?.right}`);
  }
  await page.click('[data-act="open-job"]');
  await assertAt('[T] job card → T06', 't06-appointment-status', 'tailoring');
  assertIncludes('[T] T06 line: Sarah approved', await q('text', '.t-header .t-body'), 'Sarah approved the final order');
  assertEq('[T] T06 CTAs back to Mark Ready', (await q('texts', '.t-actions .cta')).join(' | '), 'Mark Ready | Back to Appointments');
  await render('10-messages');
  await assertTrue('[T] the thread keeps both messages', (B) => { const t = [...document.querySelectorAll('.bubble')].map((x) => x.textContent); return t.includes(B) && t.includes('Sure — the sleeve was too long once pinned'); }, '', BUBBLE);
}

/* ============================================================
   Run J — REMOVAL at the visit (R2-T-08): T04 drops a booked garment
   → T05 lists it → Send → the customer's 04/Modified lists it
   ============================================================ */
await fresh('J');
{
  const a = await bookAsCustomer();
  const b = await tailorAccepts(a);
  await customerSeesConfirmed(b);
  await tailorOpensPreVisit(b);
  await page.click('[data-act="start"]');
  await assertAt('[T] Start Appointment → T04', 't04-appointment-details', 'confirmed');
  assertEq('[T] T04 starts from the booked order (2 cards)', await q('count', '.garment-card'), 2);
  await page.click('[data-act="remove-garment"][data-gi="1"]');
  await page.waitForTimeout(250);
  assertEq('[T] T04 removed the Pants / Jeans → 1 card', await q('count', '.garment-card'), 1);
  assertEq('[T] T04 fee / payout recompute ($120)', await q('fees'), '$12 $108');
  await page.click('[data-act="continue"]');
  await assertAt('[T] Continue → T05', 't05-confirm-final-pricing', 'confirmed');
  assertEq('[T] T05 cards = the survivor', await q('count', '.garment-card'), 1);
  assertEq('[T] T05 survivor is not marked added (matched by id)', await q('count', '.garment-card--info'), 0);
  await assertText('[T] T05 lists the removal', '.t-removed__row span', 'Removed at the visit — Pants / Jeans · Hem / Adjust Length');
  await assertText('[T] T05 removal price struck', '.t-removed__row s', '$120');
  assertEq('[T] T05 fee / payout rows', await q('fees'), '$12 $108');
  await page.click('[data-act="send"]');
  await assertAt('[T] Send → T06 awaiting approval', 't06-appointment-status', 'awaiting-approval', 'tailor');
  {
    const f = await shared();
    log(f?.removed?.length === 1 && f.removed[0].type === 'Pants / Jeans' && f.removed[0].amount === 120 && f.garments.length === 1 && f.count === 1 && f.totals?.subtotal === 120 && f.totals.deposit === 24 && f.booked?.length === 2,
      '[S] Send wrote a.removed + the 1-garment order (deposit kept, booked kept)', `removed=${JSON.stringify(f?.removed)} garments=${f?.garments?.length} count=${f?.count} subtotal=${f?.totals?.subtotal}`);
  }
  await assertText('[T] T06 job right slot follows the final order', '.job-card__bottom > span:last-child', '1 Suit Jacket');
  await assertText('[T] T06 job payout', '.job-card__payout', '$108');

  await flip();
  await assertAt('[C] View as Customer (awaiting approval)', '01-home', 'awaiting-approval', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Awaiting Approval');
  assertIncludes('[C] 01 card items title follows the final order (1 item)', await q('text', '.appt-card'), '1 Item Total - Home Visit:');
  await assertTrue('[C] 01 card no longer lists the Pants / Jeans', () => !document.querySelector('.appt-card').textContent.includes('Pants / Jeans'));
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Tailoring (awaiting)', '03-status-tailoring', 'awaiting-approval');
  assertEq('[C] 03/Tailoring cards = the sent order', await q('count', '.garment-card'), 1);
  assertEq('[C] 03/Tailoring subtotal / deposit / due', await q('fees'), '$120 -$24 $96');
  await page.click('.cta-bar [data-act="review-order"]');
  await assertAt('[C] Review Final Order → 04/Modified (a removal is a modification)', '04-review-approve-modified', 'awaiting-approval');
  assertEq('[C] 04/Modified cards = the survivor', await q('count', '.garment-card'), 1);
  assertEq('[C] 04/Modified lists one removal', await q('count', '.removed-row'), 1);
  await assertText('[C] 04/Modified removal line', '.removed-row span', 'Removed at the visit — Pants / Jeans · Hem / Adjust Length');
  await assertText('[C] 04/Modified removal price struck', '.removed-row s', '$120');
  assertEq('[C] 04/Modified subtotal / deposit / due', await q('fees'), '$120 -$24 $96');
  assertEq('[C] 04/Modified fee rows marked as changed', await q('count', '.fee-row--info'), 3);
  await page.click('[data-act="approve"]');
  await assertAt('[C] Approve → 03/Tailoring (tailoring)', '03-status-tailoring', 'tailoring', 'user');
  await render('09-bookings');
  {
    const cards = await q('bookings');
    const c = cards.current.find((x) => x.pill === 'Tailoring');
    log(!!c && c.text.includes('1 Item Total - Home Visit:'), '[C] 09 card count follows the final order', `card=${c?.text.slice(0, 80)}`);
  }
  await flip();
  await assertAt('[T] View as Tailor (tailoring)', 't01-home', 'tailoring', 'tailor');
  {
    const j = (await q('jobCards'))[0];
    log(j?.pill === 'Tailoring' && j.right === '1 Suit Jacket' && j.payout === '$108', '[T] T01 job card follows the 1-garment order', `first=${j?.pill}/${j?.right}/${j?.payout}`);
  }
}

/* ---------- summary ---------- */
console.log(errors.length ? `\nCONSOLE ERRORS:\n  ${errors.join('\n  ')}` : '\nno console errors');
if (errors.length) failures++;
await browser.close();
server.close();
console.log(`\n${passes + failures} assertions · ${passes} passed · ${failures} failed`);
console.log(failures ? `\n${failures} FAILURE(S)` : '\nALL ASSERTIONS PASS');
process.exit(failures ? 1 : 0);
