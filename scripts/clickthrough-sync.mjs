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
/* R3-U-07c: live cards print the 03 row grammar; R3-U-09: a ready date
   still ahead reads "Ready · pickup from …" */
const cardWhen = (str) => fmtWhen(str);
const readyMeta = (readyAt) => page.evaluate((r) => {
  const p = window.__data.parseWhen(r); const t = new Date(); t.setHours(23, 59, 59, 999);
  return p && p.date > t ? `Ready · pickup from ${window.__data.fmtDay(r)}` : `Ready since: ${r}`;
}, readyAt);
/* R3-U-03: Home's cards in DOM order — today's outcome first, then the live one */
const homeCards = () => page.evaluate(() => [...document.querySelectorAll('[data-s="01-home"] .appt-card')].map((e) => ({
  pill: e.querySelector('.pill span:last-child')?.textContent.replace(/\s+/g, ' ').trim(),
  meta: e.querySelector('.appt-card__meta')?.textContent.replace(/\s+/g, ' ').trim(),
  ctas: [...e.querySelectorAll('.cta-small')].map((b) => b.textContent.trim()),
})));
/** Home after a terminal outcome (R3-U-03): the outcome card sits ABOVE
    the live card (the seed when present), once. */
async function assertHomeOutcome(desc, { pill, meta, live = 'Confirmed' }) {
  const cards = await homeCards();
  const ok = cards[0]?.pill === pill && (meta == null || cards[0].meta === meta) && cards[0].ctas.length === 0
    && (live == null ? cards.length === 1 : cards[1]?.pill === live);
  log(ok, desc, `cards=${cards.map((c) => `${c.pill}/${c.meta}`).join(' | ')}`);
}
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
  /* the flip lives in the Test flows menu's footer since Sep 2026 */
  await page.click('#flow-trigger');
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
    Suit Jacket ($120 Hem) + Pants / Jeans ($120 Hem) = $240 alterations; 2
    items → the $25 visitation fee (R7), held until a tailor accepts.
    The need-by is rolled TWO days past the requested time so markReady's
    readyAt (the day before need-by) and need-by give two handoff window
    days (handoffWindows, R2-U-02). */
async function bookAsCustomer({ deep = false } = {}) {
  await assertAt('[C] boot as customer', '01-home', undefined, 'user');
  await page.click('[data-tile="Suit Jacket"]');
  await page.click('[data-tile="Pants / Jeans"]');
  await page.click('[data-act="start-booking"]');
  await assertAt('[C] Start Booking → 02', '02-appointment-details');
  /* round 9: give each garment a photo (the camera tile, R2-U-09) so 03/Confirmed has tiles to open the viewer from */
  await page.click('.garment-card:nth-of-type(1) .photo-tile--add'); await page.waitForTimeout(250);
  await page.click('.garment-card:nth-of-type(2) .photo-tile--add'); await page.waitForTimeout(250);
  assertEq('[C] 02: one photo on each of the two cards', await q('count', '.photo-tile--photo'), 2);
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
    await assertText('[C] 02 CTA reserves the appointment for the $25 visitation fee (round 9)', '[data-act="request"]', 'Reserve Appt · $25');
    /* round 10 (Kevin): money rows close the garments card; no fee card */
    assertEq('[C] 02 money rows = est. / fee tier for the live count / total (round 10)', await q('fees'), '$240 $25 $265');
    assertEq('[C] 02 row captions (round 10)', (await q('feeDescs')).join(' | '), 'Alterations (est.) | Visitation fee - Due Today | Total');
    assertEq('[C] 02: no tier note on the $25 tier', await q('count', '[data-fee-tier-note]'), 0);
  }
  await page.click('[data-act="request"]');
  await assertOverlay('[C]   …payment sheet', '02.3-payment-sheet');
  await page.click('.method-row');                       // Apple Pay
  await assertAt('[C] Apple Pay → request sent', '03-status-requested', 'searching', 'user');
  const a = await shared();
  log(a?.mine === true && a.status === 'searching' && a.when === appt.when && a.needBy === appt.needBy,
    '[S] shared appointment created (mine, searching, dates)', `when=${a?.when} needBy=${a?.needBy}`);
  assertEq('[S] need-by is two days after the requested time', await fmtDay(a?.needBy), await shiftDay(a?.when, 2));
  assertEq('[S] booked order = 2 garments · $240 alterations · $25 fee · $265 (R7)', `${a?.garments?.length}/${a?.totals?.alterations}/${a?.totals?.visitFee}/${a?.totals?.total}/${a?.count}`, '2/240/25/265/2');
  log(a?.feeHeld === true && !a?.feeChargedOn && !('deposit' in (a?.totals ?? {})), '[S] requestTailor: fee HELD, nothing charged, no deposit field (R7)', `feeHeld=${a?.feeHeld} feeChargedOn=${a?.feeChargedOn}`);
  /* R6 (Kevin): no tailor name before one accepts */
  log(a?.name == null && a?.initials == null && a?.tailorId == null && a?.matching === true, '[S] requestTailor: no tailor yet (name / initials / tailorId null, matching)', `name=${a?.name} matching=${a?.matching}`);
  /* R6: the frame's request card carries no name row — assert the customer sees no tailor name */
  await assertTrue('[C] 03/Requested shows no tailor name before matching (R6)', () => !document.querySelector('.request-card__name') && !/Marco/.test(document.querySelector('[data-s="03-status-requested"] .info-card')?.textContent ?? ''));
  await assertTrue('[C] 03/Requested shows the 2-hour acceptance line', () => document.querySelector('[data-act="expire"]')?.textContent.trim() === 'Tailors have up to 2 hours to accept your request.');
  if (deep) {
    const rows = await q('texts', '.meta-row span:last-child');
    assertEq('[C] 03/Requested address · visit row', rows[0], '88 Leonard St, 4B — Home Visit');
    assertEq('[C] 03/Requested requested-time row (03 grammar)', rows[1], await fmtWhen(a.when));
    /* R3-U-01: the request card reads the APPOINTMENT, the form is spent */
    const form = await page.evaluate(() => ({ garments: window.Taily.state.garments.length, sel: Object.values(window.Taily.state.ui?.homeSelection ?? {}).filter((q) => q > 0).length }));
    log(form.garments === 0 && form.sel === 0, '[S] requestTailor cleared the form + Home selection', JSON.stringify(form));
    assertEq('[C] 03/Requested items · estimate row (R7, split in round 10)', rows[2], '2 items · $240.00+ est.');
    assertEq('[C] 03/Requested visitation-fee row (round 10)', rows[3], '$25 visitation fee');
    await assertText('[C] 03/Requested cancel line: nothing has been charged (R7)', '[data-act="cancel"]', 'Cancel request — nothing has been charged');
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
  log(a?.status === 'searching' && a.garments?.length === 2 && a.totals?.alterations === 240 && a.totals?.visitFee === 25, '[S] new shared request (searching, same $240 order, $25 fee)', `when=${a?.when} alterations=${a?.totals?.alterations}`);
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
  await assertText('[T] T01 request payout = the full $240 (R7: no commission; not the $200 fixture)', '.req-card__name b', '$240');
  if (hasSeed) {
    /* R2-T-01: the seed's accepted visit is a JOB, not a phantom request */
    const jobs = await q('jobCards');
    log(jobs.some((j) => j.text.includes('Sarah Chen') && j.pill === 'Confirmed' && j.payout === '$200'), '[T] T01 lists the seed’s Confirmed job beside the request ($200 payout, R7)', jobs.map((j) => `${j.pill}/${j.payout}`).join(', '));
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
  await assertText('[T] T02 header = booked payout (R7: 100%)', '.t-header .t-title', '$240 | New Request');
  if (deep) {
    assertEq('[T] T02 cards = the 2 booked garments', await q('count', '.garment-card'), 2);
    assertEq('[T] T02 card prices', (await q('texts', '.garment-card__price')).join(' '), '$120 $120');
    /* R7 (Kevin): the one money row is "Your payout $240" — no Subtotal, no Taily Fee */
    /* R7: the payout row; R8: plus the muted No-show protection row ($20 on the $25 tier — never the fee) */
    assertEq('[T] T02 money rows = Your payout + No-show protection (R7/R8)', `${await q('fees')} | ${(await q('feeDescs')).join(',')}`, '$240 $20 | Your payout,No-show protection · paid if Sarah doesn’t show');
    await assertTrue('[T] T02 never prints the customer’s fee / total / a commission (R7)', () => !/Taily Fee|Subtotal|Visitation fee|Deposit|10 ?%/i.test(document.querySelector('.screen').textContent));
    await assertText('[T] T02 CTA amount (R7)', '[data-act="accept"]', 'Accept Request · $240');
    const rows = (await q('texts', '.summary-card__row')).join(' | ');
    assertIncludes('[T] T02 customer rows carry the visit address', rows, '88 Leonard St, 4B');
    assertIncludes('[T] T02 customer rows carry the requested time', rows, when);
    assertIncludes('[T] T02 customer rows carry the need-by', rows, `Need By: ${needBy}`);
  }
  await page.click('[data-act="accept"]');
  await assertAt('[T] Accept → T03', 't03-request-accepted', 'confirmed', 'tailor');
  if (deep) {
    await assertText('[T] T03 hero right after Accept', '.status-hero__title', 'Booking Confirmed!');
    assertEq('[T] T03 payout row (R7)', await q('fees'), '$240');
  }
  const b = await shared();
  log(!!b?.feeChargedOn && b.feeHeld === false && !b.feeLocked, '[S] tailorAccepts CHARGED the held fee (feeChargedOn, not yet locked, R7)', `feeChargedOn=${b?.feeChargedOn} feeHeld=${b?.feeHeld}`);
  log(b?.name === 'Marco Tailor' && b.initials === 'MT' && b.tailorId === 'marco' && b.matching === false, '[S] tailorAccepts named the tailor (Marco · MT · marco, R6)', `name=${b?.name} matching=${b?.matching}`);
  return b;
}

/** Pin the shared visit `days` ahead at the same time, or `hours` from
    now. Need-by follows two days after. (R7: the refund no longer
    depends on the clock — confirmAppointment decides it.) */
async function pinVisit({ days = null, hours = null }) {
  await page.evaluate(([d, h]) => {
    const a = window.__shared(); const D = window.__data;
    const time = a.when.match(/\d{1,2}:\d{2} [AP]M$/)?.[0] ?? '9:30 AM';
    let day;
    if (d != null) day = D.shiftDay(a.when, d).replace(/^\w+, /, '');
    else {
      const t = new Date(Date.now() + h * 3600e3);
      const h12 = ((t.getHours() + 11) % 12) + 1;
      day = D.fmtDay(t.toDateString()).replace(/^\w+, /, '');
      a.when = `${day}, ${h12}:${String(t.getMinutes()).padStart(2, '0')} ${t.getHours() >= 12 ? 'PM' : 'AM'}`;
      a.needBy = D.shiftDay(a.when, 2);
      return;
    }
    a.when = `${day}, ${time}`;
    a.needBy = D.shiftDay(a.when, 2);
  }, [days, hours]);
  return shared();
}
/** The 03.1 rows as rendered ("✕ Your … is cancelled" — glyph + text). */
const popupRows = () => page.evaluate(() => [...document.querySelectorAll('.screen-sheet--overlay .modal__row')].map((e) => [...e.children].map((c) => c.textContent.replace(/\s+/g, ' ').trim()).join(' ')));

/** Flip → 01 card Confirmed → 03/Confirmed rows match. */
async function customerSeesConfirmed(a, { deep = false } = {}) {
  const when = await fmtWhen(a.when); const needBy = await fmtDay(a.needBy);
  await flip();
  await assertAt('[C] View as Customer after accept', '01-home', 'confirmed', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Confirmed');
  await assertText('[C] 01 card meta = requested time (03 grammar)', '.appt-card__meta', await cardWhen(a.when));
  if (deep) {
    await assertText('[C] 01 card tailor', '.appt-card__name', 'Marco Tailor');
    assertIncludes('[C] 01 card items title', await q('text', '.appt-card'), '2 Items Total - Home Visit:');
    assertIncludes('[C] 01 card lists the booked garment', await q('text', '.appt-card'), '1 Suit Jacket - Hem / Adjust Length');
  }
  await page.click('.appt-card');
  await assertAt('[C] card → 03/Confirmed', '03-status-confirmed', 'confirmed');
  /* round 9 (Kevin): the booking cards' photo tiles open the 03.3 viewer in booking mode */
  {
    const tiles = await q('count', '.garment-card--view .photo-tiles--tappable .photo-tile--photo');
    log(tiles === 2, '[C] 03/Confirmed: the two booking cards expose their 2 tappable photo tiles (round 9)', `tiles=${tiles}`);
    await page.click('.garment-card--view .photo-tile--photo');
    await assertOverlay('[C]   …photo viewer overlays (booking mode)', '03.3-photo-viewer');
    const pv = await page.evaluate(() => ({ title: document.querySelector('.screen-sheet--overlay [data-pv-title]')?.textContent.trim(), sub: document.querySelector('.screen-sheet--overlay .photo-viewer__sub')?.textContent.trim(), legend: document.querySelectorAll('.screen-sheet--overlay .photo-viewer__legend').length, thumbs: document.querySelectorAll('.screen-sheet--overlay [data-thumb]').length, active: document.querySelector('.screen-sheet--overlay [data-thumb].is-active')?.dataset.thumb }));
    log(pv.title === 'Suit Jacket — Your photos' && pv.sub === 'Added when you booked' && pv.legend === 0 && pv.thumbs === 1 && pv.active === '0', '[C]   …viewer: garment title, "Added when you booked", no Before/Pinned legend, one thumb per photo, first active', JSON.stringify(pv));
    await page.click('.screen-sheet--overlay [data-act="pv-close"]');
    await page.waitForTimeout(300);
    await assertOverlay('[C]   …viewer closed', null);
    await assertAt('[C]   …still on 03/Confirmed', '03-status-confirmed', 'confirmed');
  }
  if (deep) {
    await assertText('[C] 03/Confirmed pill', '.status-hero .pill span:last-child', 'Confirmed');
    assertEq('[C] 03/Confirmed cards = booked garments', await q('count', '.garment-card'), 2);
    assertEq('[C] 03/Confirmed alterations / fee / total (R7)', await q('fees'), '$240 $25 $265');
    assertEq('[C] 03/Confirmed row captions (R7)', (await q('feeDescs')).join(' | '), `Alterations (est.) | Visitation fee — charged ${a.feeChargedOn} | Total`);
    await assertText('[C] 03/Confirmed note: alterations paid at handoff (R7)', '.fee-note', 'Alterations are paid at pickup or delivery.');
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
  log(jobs[0]?.pill === 'Confirmed' && jobs[0].payout === '$240' && jobs[0].text.includes('Sarah Chen'), '[T] T01 job card = the accepted booking ($240 · Confirmed, R7)', `first=${jobs[0]?.pill}/${jobs[0]?.payout}`);
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
  assertEq('[T] T04 payout row follows the booking (R7)', await q('fees'), '$240');
  /* + Sleeve ($80) on card 1 via the additional-service selector */
  await page.click('[data-sel="add"][data-gi="0"]');
  await page.click('.selector--open .selector__option[data-option="Sleeve"]');
  await page.waitForTimeout(250);
  assertEq('[T] T04 added service recomputes the payout ($320, R7)', await q('fees'), '$320');
  assertEq('[T] T04 card 1 price moved to $200', (await q('texts', '.garment-card__price'))[0], '$200');
  /* + Additional Garment (Suit Jacket · Sleeve $80) */
  await page.click('[data-act="add-garment"]');
  await page.waitForTimeout(250);
  assertEq('[T] T04 added garment → 3 cards', await q('count', '.garment-card'), 3);
  assertEq('[T] T04 payout recomputes ($400, R7)', await q('fees'), '$400');
  await page.click('[data-act="continue"]');
  await assertAt('[T] Continue → T05', 't05-confirm-final-pricing', 'confirmed');
  if (deep) {
    assertEq('[T] T05 marks the added service + added garment', `${await q('count', '.garment-card__service--info')}/${await q('count', '.garment-card--info')}`, '2/1');
    assertEq('[T] T05 card prices', (await q('texts', '.garment-card__price')).join(' '), '$200 $120 $80');
    assertEq('[T] T05 payout row (R7)', await q('fees'), '$400');
    assertIncludes('[T] T05 states the scope change before Send (R7)', await q('text', '[data-payout-change]'), 'Payout $240 → $400 (+$160)');
    await assertText('[T] T05 header sub carries the draft payout (R7-T-03)', '.t-header .t-body', 'Reviewed with Sarah at the visit · Payout $400');
    assertEq('[T] T05 lists no removals', await q('count', '.t-removed__row'), 0);
  }
  await page.click('[data-act="send"]');
  await assertAt('[T] Send → T06 awaiting approval', 't06-appointment-status', 'awaiting-approval', 'tailor');
  const b = await shared();
  log(b?.garments?.length === 3 && b.totals?.alterations === 400 && b.totals?.visitFee === 25 && b.totals?.visitFeeCharged === 25 && b.totals?.visitFeeAdded === 0 && b.totals?.total === 425 && b.booked?.length === 2 && !!b.revisedAt,
    '[S] Send wrote the final order (3 garments · $400 · fee still $25 · $425 · booked kept, R7)', `garments=${b?.garments?.length} alterations=${b?.totals?.alterations} fee=${b?.totals?.visitFee}+${b?.totals?.visitFeeAdded} total=${b?.totals?.total} booked=${b?.booked?.length} revisedAt=${b?.revisedAt}`);
  if (deep) {
    /* R7: the tailor side names the payout in this line ("Sarah is reviewing the updated order — payout $400 once approved.") */
    await assertTrue('[T] T06 status line (awaiting approval, R7 payout wording accepted)', () => /Waiting for Sarah to approve|Sarah is reviewing the updated order/.test(document.querySelector('.t-header .t-body')?.textContent ?? ''));
    await assertText('[T] T06 job payout = the final $400 (R7)', '.job-card__payout', '$400');
    await assertText('[T] T06 job caption = Payout · pending while Sarah approves (R7-T-01)', '.job-card__paylabel', 'Payout · pending');
    await assertText('[T] T06 job pill', '.job-card .pill span:last-child', 'Awaiting Customer');
    await assertText('[T] T06 job right slot', '.job-card__bottom > span:last-child', '3 items');
    assertEq('[T] T06 cards = the sent order', await q('count', '.garment-card'), 3);
    assertEq('[T] T06 card prices', (await q('texts', '.garment-card__price')).join(' '), '$200 $120 $80');
    assertEq('[T] T06 payout row (R7)', await q('fees'), '$400');
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
  /* round 10 (Kevin): the card opens the approve screen directly — no 03/Tailoring hop */
  await assertAt('[C] card → 04/Modified directly (round 10)', '04-review-approve-modified', 'awaiting-approval');
  if (deep) {
    await assertText('[C] 04 heading', '.heading .t-title', 'Approve your final order.');
    assertEq('[C] 04 CTAs: Approve / Request Changes only (round 10)', (await q('texts', '.cta-bar .cta')).join(' | '), 'Approve Final Order | Request Changes');
    void when; void needBy;
  }
  if (deep) {
    assertEq('[C] 04/Modified cards = the sent order', await q('count', '.garment-card'), 3);
    assertEq('[C] 04/Modified marks (services / garments / fee rows)', `${await q('count', '.garment-card__service--info')}/${await q('count', '.garment-card--info')}/${await q('count', '.fee-row--info')}`, '2/1/3');
    assertEq('[C] 04/Modified card prices', (await q('texts', '.garment-card__price')).join(' '), '$200 $120 $80');
    assertEq('[C] 04/Modified alterations / fee / total / due (R7)', await q('fees'), '$400 $25 $425 $400');
    assertEq('[C] 04/Modified captions (R7)', (await q('feeDescs')).join(' | '), 'Alterations | Visitation fee — paid | Total | Due at handoff');
    await assertTrue('[C] 04 never says deposit / 10% / Taily fee / Balance (R7)', () => !/deposit|10 ?%|Taily fee|Balance/i.test(document.querySelector('.screen').textContent));
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
  log(!!b?.approvedAt && b.totals?.alterations === 400 && b.totals?.total === 425, '[S] approveOrder stamped approvedAt, order untouched', `approvedAt=${b?.approvedAt}`);
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
  await assertText('[C] 01 card meta = ready (since / pickup from)', '.appt-card__meta', await readyMeta(e.readyAt));
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
  assertIncludes('[C] 05a due at pickup = the $400 alterations (fee already charged, R7)', await q('text', '.due-card__amount'), '$400 ·');
  const w = await handoffPick();
  assertEq('[C] 05a draws the two handoff days (3 chips each)', await q('count', '[data-win]'), 6);
  await page.click(`[data-win="${w.wi}"][data-chip="${w.ci}"]`);
  await page.waitForTimeout(250);
  /* R6 (Kevin): the CTA carries the DATED window; the secondary switches */
  await assertText('[C] 05a CTA follows the chip, dated (R6)', '[data-act="confirm"]', `Confirm Pickup · ${w.dated}`);
  await assertText('[C] 05a secondary = Switch to Delivery (R6 / UX-008)', '[data-act="select"]', 'Switch to Delivery');
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
  assertEq('[T] T08 payout summary: items → Your payout $400 (R7)', (await q('texts', '.price-row__value')).join(' '), '$200 $120 $80 $400');
  await assertTrue('[T] T08 has no Order total / Taily fee rows (R7)', () => !/Order total|Taily fee|−\$/.test(document.querySelector('.screen').textContent));
  await page.click('[data-act="home"]');
  await assertAt('[T] Back to Home (job complete)', 't01-home', 'delivered');
  {
    const jobs = await q('jobCards');
    log(jobs.some((j) => j.pill === 'Completed' && j.text.includes('Sarah Chen')), '[T] T01 lists the job as Completed (Done today, R3-T-03)', `jobs=${jobs.map((j) => `${j.pill}/${j.payout}`).join(', ')}`);
  }

  /* ---- customer: receipt / summary / bookings / review ---- */
  await flip();
  await assertAt('[C] View as Customer (delivered)', '01-home', 'delivered', 'user');
  await assertText('[C] 01 shows the seed’s live card, not the delivered order (R3-U-03)', '.appt-card .pill span:last-child', 'Confirmed');
  await render('09-bookings');
  await assertTrue('[C] 09 Completed card = handoff meta + Leave Review', (m) => { const c = [...document.querySelectorAll('.appt-card')].find((e) => e.querySelector('.appt-card__meta')?.textContent.trim() === m); return !!c && [...c.querySelectorAll('.cta-small')].map((b) => b.textContent.trim()).join() === 'Leave Review'; }, '', `Picked up: ${w.day}`);
  await openBookingsCard('[C] 09 Past lists the delivered order', { pill: 'Completed', meta: `Picked up: ${w.day}` });
  await assertAt('[C] card → 03/Summary', '03-status-summary', 'delivered');
  assertEq('[C] 03/Summary Items Received = deliveredAt', (await q('texts', '.status-hero__row span'))[1], w.day);
  assertEq('[C] 03/Summary cards = final order', await q('count', '.garment-card'), 3);
  assertEq('[C] 03/Summary rows (pickup: no delivery row, R7)', await q('fees'), '$400 $25 $425 $400');
  assertEq('[C] 03/Summary last row is the pickup one, dated by the window (R7)', (await q('feeDescs'))[3], `Paid at pickup ${w.mdy}`);
  await render('06-journey-complete');
  await assertAt('[C] 06 receipt', '06-journey-complete', 'delivered');
  assertEq('[C] 06 receipt rows agree with 03/Summary (R7)', await q('fees'), '$400 $25 $425 $400');
  assertEq('[C] 06 receipt descs agree with 03/Summary (R7)', (await q('feeDescs')).join(' | '), `Alterations | Visitation fee — paid ${e.feeChargedOn} | Total | Paid at pickup ${w.mdy}`);
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
  assertEq('[C] 05b alterations / delivery / due at delivery (R7)', (await q('texts', '.info-row span:last-child')).join(' '), '$400 $20 $420');
  assertEq('[C] 05b captions (R7)', (await q('texts', '.info-row span:first-child')).join(' | '), 'Alterations | Delivery | Due at delivery');
  const w = await handoffPick();
  assertEq('[C] 05b draws the two handoff days (3 chips each)', await q('count', '[data-win]'), 6);
  await page.click(`[data-win="${w.wi}"][data-chip="${w.ci}"]`);
  await page.waitForTimeout(250);
  await assertText('[C] 05b CTA follows the chip, dated (R6)', '[data-act="confirm"]', `Confirm Delivery · ${w.dated}`);
  await assertText('[C] 05b secondary = Switch to Pickup (R6 / UX-008)', '[data-act="select"]', 'Switch to Pickup');
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
  assertEq('[T] T08 payout summary: items → Your payout $400 (R7)', (await q('texts', '.price-row__value')).join(' '), '$200 $120 $80 $400');
  {
    const f = await shared();
    log(f?.totals?.delivery === 20 && f.totals.total === 445, '[S] chooseFulfilment(delivery) added the $20 to the totals ($445, R7)', `delivery=${f?.totals?.delivery} total=${f?.totals?.total}`);
  }

  await flip();
  await assertAt('[C] View as Customer (delivered)', '01-home', 'delivered', 'user');
  await assertText('[C] 01 shows the seed’s live card, not the delivered order (R3-U-03)', '.appt-card .pill span:last-child', 'Confirmed');
  await openBookingsCard('[C] 09 Past lists the delivered order', { pill: 'Completed', meta: `Delivered: ${w.day}` });
  await assertAt('[C] card → 03/Summary', '03-status-summary', 'delivered');
  assertEq('[C] 03/Summary rows (delivery: +$20, R7)', await q('fees'), '$400 $25 $20 $445 $420');
  assertEq('[C] 03/Summary delivery / total / paid rows (R7)', (await q('feeDescs')).slice(2).join(' | '), `Delivery | Total | Paid at delivery ${w.mdy}`);
  await render('06-journey-complete');
  assertEq('[C] 06 receipt rows agree with 03/Summary (R7)', await q('fees'), '$400 $25 $20 $445 $420');
  assertEq('[C] 06 receipt delivery / total / paid rows (R7)', (await q('feeDescs')).slice(2).join(' | '), `Delivery | Total | Paid at delivery ${w.mdy}`);
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
    log(!(await q('count', '.req-card')) && jobs.length === 2 && !jobs.some((j) => j.text.includes('Declined')) && jobs.some((j) => j.pill === 'Confirmed' && j.payout === '$200'),
      '[T] T01: no request card, no Declined row; the seed job stays', `jobs=${jobs.map((j) => `${j.pill}/${j.payout}`).join(', ')}`);
    const t = await terminalPlacement();
    log(t.status === 'declined' && t.by === 'tailor' && t.reason === 'declined' && t.wasRequested && t.inPast && t.notUpcoming && t.stash, '[S] declined: moved to past[0], lastCancelled, nothing charged', JSON.stringify(t));
    const f = await shared();
    log(f?.refund === 25 && f.feeKept === false, '[S] declined: the $25 hold is released (refund 25, not kept, R7)', `refund=${f?.refund} feeKept=${f?.feeKept}`);
  }
  await flip();
  await assertAt('[C] View as Customer (declined)', '01-home', 'declined', 'user');
  await assertHomeOutcome('[C] 01 shows the Declined outcome above the seed’s Confirmed card (R3-U-03)', { pill: 'Declined', meta: 'Declined by a tailor' });
  await page.click('[data-s="01-home"] .appt-card');
  await assertAt('[C] outcome card → 03/Cancelled', '03-status-cancelled', 'declined');
  await render('01-home');
  {
    const cards = await homeCards();
    log(cards.length === 1 && cards[0].pill === 'Confirmed', '[C] the outcome card is shown once — Home is back to the seed', `cards=${cards.map((c) => c.pill).join(',')}`);
  }
  await openBookingsCard('[C] 09 Past lists the Declined card', { pill: 'Declined', meta: 'Declined by a tailor' });
  await assertAt('[C] Declined card → 03/Cancelled', '03-status-cancelled', 'declined');
  /* R6: no tailor name before one accepts — a decline stays anonymous */
  await assertText('[C] 03/Cancelled declined title (no tailor named, R6)', '.status-hero__title', 'A tailor couldn’t take this request');
  await assertText('[C] 03/Cancelled card: no tailor matched', '.summary-card__name', 'No tailor matched');
  await assertText('[C] 03/Cancelled card avatar = ✂', '.summary-card .avatar', '✂');
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
    log(!(await page.evaluate(() => window.Taily.state.upcoming.some((x) => x.mine))) && t.status === 'cancelled' && t.by === 'customer' && t.wasRequested && t.inPast && t.stash && f.totals?.alterations === a.totals.alterations && f.refund === 25 && f.feeKept === false,
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
  await page.click('[data-act="go-back"]');
  await page.waitForTimeout(400);
  /* ---- R7: BEFORE confirming the visit → the fee is refunded ---- */
  const far = await pinVisit({ days: 5 });
  await render('03-status-confirmed');
  await page.click('[data-act="reschedule"]');
  await assertOverlay('[C]   …03.1 reschedule popup (visit 5 days out)', '03.1-reschedule-popup');
  {
    const rows = await popupRows();
    assertEq('[C] 03.1 row 1: the visit with Marco is cancelled', rows[0], `✕ Your ${await fmtWhen(far.when)} with Marco is cancelled`);
    assertEq('[C] 03.1 row 2: fee refunded before confirming (R7)', rows[1], '✓ Your $25 visitation fee is refunded');
    assertEq('[C] 03.1 row 3: items and time kept — new tailor (R6)', rows[2], '↻ Your items and time are kept — we’ll find you a new tailor');
    await assertText('[C] 03.1 CTA unchanged', '[data-act="confirm-reschedule"]', 'Reschedule / Cancel');
  }
  await page.click('[data-act="confirm-reschedule"]');
  /* R6: reschedule = cancel + resubmit → 02 pre-filled */
  await assertAt('[C] confirm → 02 (reschedule = cancel + resubmit, R6)', '02-appointment-details', 'cancelled', 'user');
  assertEq('[C] 02 toast', await q('toast'), 'Appointment cancelled — send the same job to find a new tailor');
  await assertTrue('[C] page scrolls after the 03.1 confirm (R2-U-01)', () => document.documentElement.style.overflow !== 'hidden');
  /* round 9: the pills read the copied dates in the pill grammar (fmtPill — "Sept 18" for a day-only need-by) */
  const farPill = await page.evaluate(async (f) => { const D = await import('/js/data.js'); return { when: D.fmtPill(f.when), needBy: D.fmtPill(f.needBy) }; }, { when: far.when, needBy: far.needBy });
  assertEq('[C] 02 requested-time pill = the cancelled visit’s time', await q('text', '[data-act="time"]'), farPill.when);
  assertEq('[C] 02 need-by pill = the cancelled visit’s need-by (pill grammar)', await q('text', '[data-act="needby"]'), farPill.needBy);
  assertEq('[C] 02 carries the same 2 garments', await q('count', '.garment-card'), 2);
  await assertTrue('[C] 02 visit type restored (Home Visit)', () => window.Taily.state.appt.where === 'Home Visit');
  {
    const t = await terminalPlacement();
    const f = await shared();
    log(t.status === 'cancelled' && t.by === 'customer' && t.reason === 'customer' && !t.wasRequested && t.inPast && t.stash, '[S] confirmed visit cancelled: past[0] + lastCancelled', JSON.stringify(t));
    log(f?.refund === 25 && f.feeKept === false, '[S] cancel before confirming: refund = $25, feeKept false (R7)', `refund=${f?.refund} kept=${f?.feeKept}`);
  }
  await openBookingsCard('[C] 09 Past lists the cancelled visit', { pill: 'Cancelled', meta: await cardWhen(far.when) });
  await assertAt('[C] card → 03/Cancelled', '03-status-cancelled', 'cancelled', 'user');
  await assertText('[C] 03/Cancelled pill', '.status-hero .pill span:last-child', 'Cancelled');
  await assertText('[C] 03/Cancelled customer title', '.status-hero__title', 'Appointment Cancelled');
  await assertText('[C] 03/Cancelled body: fee refunded to the real pay method (R7)', '.status-hero__body', 'Your $25 visitation fee is refunded to Apple Pay.');
  assertEq('[C] 03/Cancelled keeps Alterations (est.) + the fee row, no Total (R7-U-04)', await q('fees'), '$240 $25');
  assertIncludes('[C] 03/Cancelled fee row reads Refunded (R7)', (await q('feeDescs'))[1], 'Visitation fee — Refunded');
  await flip();
  await assertAt('[T] View as Tailor after the cancel', 't01-home', 'cancelled', 'tailor');
  await assertTrue('[T] T01: no request card', () => !document.querySelector('.req-card'));
  {
    /* closed rows render after the Leo Von filler (R2-T-05/06) */
    const row = (await q('jobCards')).find((j) => j.text.includes('Sarah Chen'));
    assertEq('[T] T01 Sarah job pill', row?.pill, 'Cancelled');
    assertEq('[T] T01 Sarah job right slot', row?.right, 'Slot reopened');
    assertEq('[T] T01 cancelled row has no payout column (closed, R3-T-03)', row?.payout, null);
  }
  await page.click('[data-act="open-job"]');
  await assertAt('[T] Cancelled card → T03B', 't03b-job-cancelled', 'cancelled');
  await assertText('[T] T03B hero', '.status-hero__title', 'Job Cancelled.');
  assertIncludes('[T] T03B names the live slot (not tonight)', await q('text', '.status-hero__body'), `your ${await fmtWhen(far.when)} slot is open on your calendar again`);
  await assertTrue('[T] T03B: nothing about the fee staying, no deposit / amount (R7)', () => !/stays with|deposit|\$\d/i.test(document.querySelector('.status-hero__body').textContent));
  await page.click('[data-act="home"]');
  await assertAt('[T] Back to Home', 't01-home', 'cancelled');

  /* ---- R6: the rescheduled job goes out again — a NEW matching
     request, no tailor name until Marco accepts ---- */
  await flip();
  await assertAt('[C] View as Customer (form still carries the job)', '01-home', 'cancelled', 'user');
  await render('02-appointment-details');
  const c = await rebookFrom02('Rescheduled job');
  log(c?.orderId !== far.orderId && c?.when === farPill.when && c.needBy === farPill.needBy && c.name == null && c.matching === true, '[S] new request: fresh order id, same time / need-by (pill grammar), no tailor yet', `orderId=${c?.orderId} (was ${far.orderId}) when=${c?.when} needBy=${c?.needBy} (want ${farPill.needBy}) name=${c?.name}`);
  await render('01-home');
  await assertText('[C] 01 card = Matching you with a tailor (R6)', '.appt-card__name', 'Matching you with a tailor');
  await assertText('[C] 01 card meta = Requested: …', '.appt-card__meta', `Requested: ${await cardWhen(c.when)}`);
  assertEq('[C] 01 card has no Message CTA while matching', await q('count', '.appt-card .cta-small'), 0);
  await flip();
  await assertAt('[T] View as Tailor: the new request is visible', 't01-home', 'searching', 'tailor');
  assertEq('[T] T01 shows the new request card', await q('count', '.req-card'), 1);
  await page.click('.req-card [data-act="view-details"]');
  await assertAt('[T] View Details → T02', 't02-appointment-request', 'searching');
  await page.click('[data-act="accept"]');
  await assertAt('[T] Accept → T03', 't03-request-accepted', 'confirmed', 'tailor');
  const d = await shared();
  log(d?.name === 'Marco Tailor' && d.matching === false, '[S] acceptance names Marco (R6)', `name=${d?.name}`);
  await flip();
  await assertAt('[C] View as Customer after accept', '01-home', 'confirmed', 'user');
  await assertText('[C] 01 card now reads Marco Tailor', '.appt-card__name', 'Marco Tailor');

  /* ---- R7: AFTER confirming the visit (the 24-hour prompt) → the fee is KEPT ---- */
  const near = await pinVisit({ days: 1 });
  await render('03-status-confirmed');
  await page.click('.summary-card');                     // the day before arrives → 03/Reminder
  await assertAt('[C] tailor card → 03/Reminder (the confirmation prompt)', '03-status-reminder', 'confirmed', 'user');
  await assertText('[C] 03/Reminder "Before you confirm" callout body before Confirm (R7-U-01)', '[data-fee-warning-body]', 'Confirming makes your $25 visitation fee non-refundable — no-shows included. Cancel before confirming and it’s refunded in full.');
  await assertTrue('[C] 03/Reminder callout heads the actions block, right above Confirm (R7-U-01)', () => { const w = document.querySelector('[data-fee-warning]'); return w.classList.contains('prepare-card') && w.parentElement.classList.contains('actions') && w.nextElementSibling.matches('[data-act="confirm"]'); });
  {
    const r = await page.evaluate(() => { const a = window.__shared(); const ok = window.__sync.confirmAppointment(a); return { ok, locked: a.feeLocked, at: a.confirmedAt ?? null }; });
    log(r.ok === true && r.locked === true && !!r.at, '[S] confirmAppointment: feeLocked + confirmedAt (R7)', JSON.stringify(r));
  }
  await render('03-status-reminder');
  await assertText('[C] 03/Reminder pill once confirmed (R7)', '.status-hero .pill span:last-child', 'Confirmed · fee non-refundable');
  assertEq('[C] 03/Reminder: the warning line is gone once confirmed', await q('count', '[data-fee-warning]'), 0);
  await page.click('[data-act="reschedule"]');
  await assertOverlay('[C]   …03.1 reschedule popup (visit confirmed)', '03.1-reschedule-popup');
  {
    const rows = await popupRows();
    assertEq('[C] 03.1 row 2: fee non-refundable after confirming (R7)', rows[1], '✕ Your $25 visitation fee is non-refundable (you confirmed the visit)');
    assertEq('[C] 03.1 row 3 still promises the new tailor', rows[2], '↻ Your items and time are kept — we’ll find you a new tailor');
  }
  await page.click('[data-act="confirm-reschedule"]');
  await assertAt('[C] confirm → 02 again', '02-appointment-details', 'cancelled', 'user');
  {
    const f = await shared();
    log(f?.refund === 0 && f.feeKept === true && f.cancelledBy === 'customer', '[S] cancel after confirming: refund 0, feeKept true (R7)', `refund=${f?.refund} kept=${f?.feeKept}`);
  }
  await openBookingsCard('[C] 09 Past lists the late-cancelled visit', { pill: 'Cancelled', meta: await cardWhen(near.when) });
  await assertAt('[C] card → 03/Cancelled', '03-status-cancelled', 'cancelled', 'user');
  await assertText('[C] 03/Cancelled body: fee kept after confirming (R7)', '.status-hero__body', 'Your $25 visitation fee was kept — you had confirmed the visit.');
  assertEq('[C] 03/Cancelled fee row reads Kept (R7)', (await q('feeDescs'))[1], 'Visitation fee — Kept');
  assertEq('[C] 03/Cancelled: no refund card (the body says it)', await q('count', '.prepare-card'), 0);
  await flip();
  await assertAt('[T] View as Tailor after the late cancel', 't01-home', 'cancelled', 'tailor');
  {
    /* two cancelled rows now — open the LATE one by its visit time */
    const time = (await fmtWhen(near.when)).split(' · ')[1];
    const found = await page.evaluate((t) => {
      const row = [...document.querySelectorAll('.job-card')].find((e) => /Slot reopened/.test(e.textContent) && e.textContent.includes(t));
      row?.click(); return !!row;
    }, time);
    log(found, '[T] T01 lists the late-cancelled row (Slot reopened)', `time=${time}`);
  }
  await assertAt('[T] Cancelled row → T03B', 't03b-job-cancelled', 'cancelled');
  await assertTrue('[T] T03B (Sarah cancelled): no deposit, no amount — the fee is Taily’s business (R7)', () => !/deposit|\$\d|stays with you/i.test(document.querySelector('.status-hero__body').textContent));
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
    log(jobs.length === 2 && jobs.every((j) => j.pill === 'Confirmed') && jobs.map((j) => j.payout).sort().join(',') === '$200,$240', '[T] T01 after Accept: two Confirmed Sarah jobs ($240 fresh + $200 seed, R7)', jobs.map((j) => `${j.pill}/${j.payout}`).join(', '));
  }
  await customerSeesConfirmed(b);
  const aWhen = await cardWhen(a.when);
  await render('09-bookings');
  {
    const cards = await q('bookings');
    const confirmed = cards.current.filter((c) => c.pill === 'Confirmed');
    log(confirmed.length === 2 && confirmed.some((c) => c.meta === aWhen) && confirmed.some((c) => c.meta === seedBefore.when), '[C] 09 Current lists both Confirmed bookings (fresh + seed)', `current=${cards.current.map((c) => `${c.pill}/${c.meta}`).join(', ')}`);
  }
  await render('01-home');
  await page.click('.appt-card');
  await assertAt('[C] 01 card (the fresh booking) → 03/Confirmed', '03-status-confirmed', 'confirmed');
  await page.click('[data-act="reschedule"]');
  await assertOverlay('[C]   …03.1 reschedule popup', '03.1-reschedule-popup');
  await page.click('[data-act="confirm-reschedule"]');
  /* R6: reschedule lands on 02 with the job copied over */
  await assertAt('[C] confirm → 02 (R6 reschedule)', '02-appointment-details', 'cancelled', 'user');
  {
    const t = await terminalPlacement();
    const s = await seed();
    log(t.status === 'cancelled' && t.inPast && t.stash, '[S] the fresh booking is the cancelled stash', JSON.stringify(t));
    log(s?.status === seedBefore.status && s.when === seedBefore.when && !s.cancelledAt && s.name === 'Marco Tailor', '[S] the seed is untouched by the cancel', `seed=${s?.status}/${s?.when}`);
  }
  /* R3-U-05: 02 replaced 03/Confirmed — back lands on Home, no ghost */
  await page.goBack();
  await page.waitForTimeout(400);
  log(['01-home', '09-bookings'].includes(await screenId()), '[C] back after the cancel lands on Home / Bookings, not a Confirmed ghost', `screen=${await screenId()}`);
  /* the copied-over job is not resubmitted in this run */
  await page.evaluate(() => { const s = window.Taily.state; s.garments = []; s.ui.homeSelection = {}; });
  await render('01-home');
  await assertHomeOutcome('[C] 01: today’s Cancelled outcome above the seed (R3-U-03)', { pill: 'Cancelled', meta: aWhen });
  {
    const cards = await homeCards();
    log(cards[1]?.meta === seedBefore.when, '[C] 01 live card = the seed’s date', `meta=${cards[1]?.meta}`);
  }
  {
    await render('09-bookings');
    const cards = await q('bookings');
    log(cards.current.filter((c) => c.pill === 'Confirmed').length === 1 && cards.current.some((c) => c.meta === seedBefore.when) && cards.past.some((c) => c.pill === 'Cancelled' && c.meta === aWhen),
      '[C] 09: seed still Current, the cancelled booking under Past', `current=${cards.current.map((c) => c.pill).join(',')} past=${cards.past.map((c) => `${c.pill}/${c.meta}`).join(', ')}`);
  }
  await flip();
  await assertAt('[T] View as Tailor after the cancel (seed present)', 't01-home', 'cancelled', 'tailor');
  {
    const jobs = await q('jobCards');
    log(jobs.some((j) => j.pill === 'Cancelled' && j.payout === null && j.right === 'Slot reopened'), '[T] T01 shows the cancelled booking · Slot reopened (closed row, no payout)', `jobs=${jobs.map((j) => `${j.pill}/${j.payout}`).join(', ')} req=${await q('count', '.req-card')}`);
    log(jobs.some((j) => j.pill === 'Confirmed' && j.payout === '$200'), '[T] T01 keeps the seed’s Confirmed job ($200, R7)', '');
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
  await assertText(`[T] ${label}: the time wheel opens, titled for a proposal`, '.screen-sheet--overlay .sheet__title', 'Request New Time');
  /* R3-U-02 / R3-T-01: the wheel offers the requested day → the need-by day, nothing later */
  {
    const a0 = await shared();
    const want = await page.evaluate(() => window.__data.proposalDays(window.__shared()));
    const rows = await page.evaluate(() => { const col = document.querySelector('.screen-sheet--overlay .wheel__col--scroll'); return [...col.children].map((e) => e.textContent.trim()).filter(Boolean); });
    const lastDay = rows[rows.length - 1] ?? '';
    log(rows.length === want.length && rows.join('|') === want.join('|'), `[T] ${label}: wheel days = proposalDays (requested day → need-by day)`, `rows=${rows.join(', ')} needBy=${await fmtDay(a0.needBy)}`);
    log(!!lastDay && (await fmtDay(lastDay.replace(/^(\w+) (\d+) (\w+)$/, '$1, $3 $2'))) === (await fmtDay(a0.needBy)), `[T] ${label}: the last wheel day IS the need-by day`, `last=${lastDay}`);
    /* R4-U-03 / R4-T-01: settle on the need-by day → the hour column caps to the slots before the need-by time (9:30 AM → 9 AM · 00/15) */
    await page.evaluate((n) => { document.querySelector('.screen-sheet--overlay .wheel__col--scroll').scrollTop = 40 * n; }, rows.length - 1);
    await page.waitForTimeout(400);
    const capped = await page.evaluate(() => {
      const cols = [...document.querySelectorAll('.screen-sheet--overlay .wheel__col--scroll')];
      const read = (c) => [...c.querySelectorAll('.wheel__row')].map((e) => e.textContent.trim());
      return { day: read(cols[0])[Number(cols[0].dataset.sel)], hours: read(cols[1]), mins: read(cols[2]), cta: document.querySelector('.screen-sheet--overlay [data-act="set-time"]').textContent };
    });
    const wantHours = await page.evaluate((d) => window.__data.proposalHours(window.__shared(), d), capped.day);
    log(capped.hours.join('|') === wantHours.join('|') && capped.hours.join('|') === '9 AM' && capped.mins.join('|') === '00|15', `[T] ${label}: on the need-by day the wheel offers only slots before the need-by time`, `day=${capped.day} hours=${capped.hours.join(',')} mins=${capped.mins.join(',')}`);
    log(/at 9:(00|15) AM$/.test(capped.cta), `[T] ${label}: the CTA follows the capped slot`, capped.cta);
    /* back to the requested day → the full studio hours return */
    await page.evaluate(() => { document.querySelector('.screen-sheet--overlay .wheel__col--scroll').scrollTop = 0; });
    await page.waitForTimeout(400);
    const full = await page.evaluate(() => [...document.querySelectorAll('.screen-sheet--overlay .wheel__col--scroll')[1].querySelectorAll('.wheel__row')].length);
    log(full === 10, `[T] ${label}: back on the requested day the hour column is whole again`, `hours=${full}`);
  }
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
  await assertTrue(`[T] ${label}: T01 card offers Decline, no Withdraw (round 11: Withdraw lives on T02)`, () => !!document.querySelector('.req-card [data-act="decline"]') && !document.querySelector('.req-card [data-act="withdraw"]'));
  return { a, proposed: p, when };
}

await fresh('F');
{
  const a = await bookAsCustomer();
  await flip();
  await assertAt('[T] View as Tailor', 't01-home', 'searching', 'tailor');
  const p1 = await tailorProposes('proposal 1');
  /* R3-U-02 / R3-T-01 (substrate): a proposal after the need-by day is refused */
  {
    const late = await page.evaluate(() => { const a = window.__shared(); const d = window.__data.shiftDay(a.needBy, 1); return `${d.replace(/^\w+, /, '')}, 10:00 AM`; });
    const r = await page.evaluate((w) => { const a = window.__shared(); const before = JSON.stringify(a.proposed); const ok = window.__sync.proposeTime(a, w); return { ok, kept: JSON.stringify(a.proposed) === before }; }, late);
    log(r.ok === false && r.kept, '[S] proposeTime refuses a day after the need-by (proposal untouched)', `late=${late} → ${r.ok}`);
    /* R4-U-03 / R4-T-01: the need-by DAY is allowed only before the need-by TIME (9:30 AM here) */
    const same = await page.evaluate(() => { const a = window.__shared(); const d = window.__data.fmtDay(a.needBy); return `${d.replace(/^\w+, /, '')}, 9:00 AM`; });
    const r2 = await page.evaluate((w) => { const a = window.__shared(); const p = a.proposed; const ok = window.__sync.proposeTime(a, w); const now = a.proposed; a.proposed = p; return { ok, now: now?.when }; }, same);
    log(r2.ok === true && r2.now === same, '[S] proposeTime accepts the need-by day before the need-by time', `same=${same} → ${r2.ok}`);
    const after = await page.evaluate(() => { const a = window.__shared(); const d = window.__data.fmtDay(a.needBy); return `${d.replace(/^\w+, /, '')}, 4:00 PM`; });
    const r3 = await page.evaluate((w) => { const a = window.__shared(); const before = JSON.stringify(a.proposed); const ok = window.__sync.proposeTime(a, w); return { ok, kept: JSON.stringify(a.proposed) === before }; }, after);
    log(r3.ok === false && r3.kept, '[S] proposeTime refuses the need-by day after the need-by time (proposal untouched)', `after=${after} → ${r3.ok}`);
    const at = await page.evaluate(() => { const a = window.__shared(); return `${window.__data.fmtDay(a.needBy).replace(/^\w+, /, '')}, ${window.__data.fmtWhen(a.needBy).split(' · ')[1]}`; });
    const r4 = await page.evaluate((w) => { const a = window.__shared(); return window.__sync.proposeTime(a, w); }, at);
    log(r4 === false, '[S] proposeTime refuses the need-by time itself (strictly before)', `at=${at} → ${r4}`);
  }
  await page.click('.req-card [data-act="view-details"]');
  await assertAt('[T] View Details on the proposed request → T02', 't02-appointment-request', 'searching');
  assertIncludes('[T] T02 notes the pending proposal', await q('text', '[data-s="t02-appointment-request"] > p.t-body'), `You proposed ${p1.when} — waiting for Sarah.`);
  /* R3-T-02b: while a proposal is pending T02 cannot book the original time */
  {
    const ctas = await q('texts', '.t-actions .cta');
    log(!(await q('count', '[data-act="accept"]')) && ctas.some((t) => /withdraw proposal/i.test(t)) && ctas.some((t) => /^decline/i.test(t)), '[T] T02 while proposed: Withdraw Proposal + Decline, no Accept', ctas.join(' | '));
  }

  /* customer: card "New time proposed" → Review Time → new-times hero → Keep Looking */
  await flip();
  await assertAt('[C] View as Customer (time proposed)', '01-home', 'searching', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Requested');
  await assertText('[C] 01 card meta = New time proposed', '.appt-card__meta', `New time proposed: ${p1.when}`);
  await assertText('[C] 01 card CTA', '.appt-card .cta-small', 'Review Time');
  await clickCardButton('Review Time');
  await assertAt('[C] Review Time → 03/Requested', '03-status-requested', 'searching');
  await assertTrue('[C] 03/Requested uses the new-times hero', () => !!document.querySelector('.status-hero--new-times'));
  /* R6: the proposing tailor stays anonymous until Sarah accepts */
  await assertText('[C] 03/Requested proposed hero (no name, R6)', '.status-hero__title', 'A tailor proposed a new time');
  assertEq('[C] 03/Requested proposed body names the need-by (R3-U-02)', await q('text', '.status-hero__body'), `Your ${await fmtWhen(a.when)} slot isn’t free. They can do ${p1.when}. Your need-by stays ${await fmtDay(a.needBy)}.`);
  await assertTrue('[C] 03/Requested still shows no tailor name while proposed', () => !document.querySelector('.request-card__name') && !/Marco/.test(document.querySelector('[data-s="03-status-requested"] .info-card')?.textContent ?? ''));
  assertEq('[C] 03/Requested CTAs', (await q('texts', '[data-s="03-status-requested"] .cta')).join(' | '), 'Accept New Time | Keep Looking');
  await page.click('[data-act="keep-looking"]');
  await assertAt('[C] Keep Looking → still searching', '03-status-requested', 'searching', 'user');
  await assertText('[C] 03/Requested hero back to searching', '.status-hero__title', 'Finding your tailor…');
  {
    const f = await shared();
    log(f?.proposed == null && f.proposalDeclined?.when === p1.proposed && f.proposalDeclined?.by === 'customer' && f.when === a.when, '[S] declineProposedTime: proposal cleared, remembered { when, by: customer }, when unchanged', `proposalDeclined=${JSON.stringify(f?.proposalDeclined)} when=${f?.when}`);
  }
  await render('01-home');
  await assertText('[C] 01 card meta back to the requested time', '.appt-card__meta', `Requested: ${await cardWhen(a.when)}`);
  assertEq('[C] 01 card has no Review Time', await q('count', '.appt-card .cta-small'), 0);
  await assertTrue('[C] 01 Requested card shows the matching note again', () => !!document.querySelector('.appt-card__note'));

  /* tailor: "Sarah kept her original time" → propose again → Withdraw */
  await flip();
  await assertAt('[T] View as Tailor (proposal declined)', 't01-home', 'searching', 'tailor');
  assertIncludes('[T] T01 card says Sarah kept her original time', await q('text', '.req-card__note'), 'Sarah kept her original time');
  await assertTrue('[T] T01 card back to Decline (no proposed line)', () => !!document.querySelector('.req-card [data-act="decline"]') && !document.querySelector('.req-card__proposed'));
  await tailorProposes('proposal 2');
  /* R3-U-07a: no "We will match you…" under a proposed time */
  await flip();
  await assertAt('[C] View as Customer (second proposal)', '01-home', 'searching', 'user');
  await assertTrue('[C] 01 proposed card drops the matching note (R3-U-07)', () => !document.querySelector('.appt-card__note') && /^New time proposed/.test(document.querySelector('.appt-card__meta')?.textContent.trim() ?? ''));
  await flip();
  await assertAt('[T] View as Tailor (proposal 2 pending)', 't01-home', 'searching', 'tailor');
  await page.click('.req-card [data-act="view-details"]');
  await assertAt('[T] View Details → T02 (proposal pending)', 't02-appointment-request', 'searching', 'tailor');
  await page.click('[data-act="withdraw"]');
  await assertAt('[T] Withdraw (T02) → T01', 't01-home', 'searching', 'tailor');
  assertIncludes('[T] Withdraw toast (Marco’s own act, R3-T-02)', await q('toast'), 'Proposal withdrawn');
  await assertTrue('[T] T01 card back to Decline + You withdrew your proposed time', () => !!document.querySelector('.req-card [data-act="decline"]') && !document.querySelector('.req-card__proposed') && /You withdrew your proposed time/.test(document.querySelector('.req-card')?.textContent ?? '') && !/Sarah kept her original time/.test(document.querySelector('.req-card')?.textContent ?? ''));
  {
    const f = await shared();
    log(f?.proposed == null && f.status === 'searching' && f.proposalDeclined?.by === 'tailor', '[S] withdraw = declineProposedTime(a, tailor), still searching', `proposed=${f?.proposed} proposalDeclined=${JSON.stringify(f?.proposalDeclined)}`);
  }
  await flip();
  await assertAt('[C] View as Customer (withdrawn)', '01-home', 'searching', 'user');
  await assertText('[C] 01 card meta = requested time (no proposal)', '.appt-card__meta', `Requested: ${await cardWhen(a.when)}`);
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
  log(f?.when === p3.proposed && f.proposed == null && !!f.feeChargedOn && f.feeHeld === false, '[S] acceptProposedTime: when = the proposal, confirmed, fee charged (R7)', `when=${f?.when} feeChargedOn=${f?.feeChargedOn}`);
  log(!(await page.evaluate(() => { const a = window.__shared(); return window.__data.isAfterDay(a.when, a.needBy); })), '[S] the accepted time is not after the need-by day (R3-U-02)', `when=${f?.when} needBy=${f?.needBy}`);
  /* R3-U-05: 03/Confirmed REPLACED 03/Requested — back does not resurrect "Finding your tailor…" */
  await page.goBack();
  await page.waitForTimeout(400);
  log((await screenId()) !== '03-status-requested', '[C] back from 03/Confirmed skips the spent 03/Requested', `screen=${await screenId()}`);
  await render('03-status-confirmed');
  const badge = await page.evaluate((w) => { const p = window.__data.parseWhen(w); return `${p.mon.slice(0, 3).toUpperCase()} ${p.day}`; }, f.when);
  await assertText('[C] 03/Confirmed pill', '.status-hero .pill span:last-child', 'Confirmed');
  assertIncludes('[C] 03/Confirmed rows carry the NEW time', (await q('texts', '.summary-card__row')).join(' | '), p3.when);
  await render('01-home');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Confirmed');
  await assertText('[C] 01 card meta = the new when (03 grammar)', '.appt-card__meta', await cardWhen(f.when));
  assertEq('[C] 01 card badge follows the new day', `${await q('text', '.appt-card__month')} ${await q('text', '.appt-card__day')}`, badge);

  await flip();
  await assertAt('[T] View as Tailor (time accepted)', 't01-home', 'confirmed', 'tailor');
  await assertTrue('[T] T01 request card gone', () => !document.querySelector('.req-card'));
  {
    const jobs = await q('jobCards');
    const j = jobs[0];
    log(j?.pill === 'Confirmed' && j.payout === '$240' && j.meta === `${p3.when.split(' · ')[1]} - 88 Leonard St, 4B` && j.badge === badge, '[T] T01 job card carries the new date / time', `first=${JSON.stringify(j)}`);
  }
  await page.click('[data-act="open-job"]');
  await assertAt('[T] job card → T03 pre-visit', 't03-request-accepted', 'confirmed');
  assertIncludes('[T] T03 pre-visit sub = the new when', await q('text', '.t-header .t-body'), `${p3.when} at 88 Leonard St, 4B`);
  await render('t02-appointment-request');
  await assertText('[T] T02 for the accepted job offers Back to Home (round 11)', '.t-actions .cta', 'Back to Home');
  /* R3-U-02 downstream: run the job to ready in the substrate — readyAt is never before the (accepted) visit */
  {
    const r = await page.evaluate(() => {
      const a = window.__shared(); const S = window.__sync; const D = window.__data;
      S.completeAppointment(a); S.approveOrder(a); S.markReady(a);
      return { status: S.canonicalStatus(a.status), readyAt: a.readyAt, when: a.when, needBy: a.needBy, early: D.isAfterDay(a.when, a.readyAt), late: D.isAfterDay(a.readyAt, a.needBy) };
    });
    log(r.status === 'ready-for-pickup' && !!r.readyAt && !r.early && !r.late, '[S] markReady after an accepted proposal: readyAt between the visit day and the need-by day', JSON.stringify(r));
  }
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
  await assertText('[T] T02 expired header (R7)', '.t-header .t-title', '$240 | Request Expired');
  await assertTrue('[T] T02 expired: no Accept / Decline', () => !document.querySelector('[data-act="accept"]') && !document.querySelector('[data-act="decline"]'));
  assertIncludes('[T] T02 expired note', await q('body'), 'This request lapsed before you responded.');
  await page.click('[data-act="home"]');
  await assertAt('[T] Back to Home', 't01-home', 'expired');

  await flip();
  await assertAt('[C] View as Customer (expired)', '01-home', 'expired', 'user');
  await assertHomeOutcome('[C] 01 shows the Expired outcome above the seed’s Confirmed card (R3-U-03)', { pill: 'Expired', meta: 'Request expired · no tailor accepted' });
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
    log(!(await q('count', '.req-card')) && jobs.filter((j) => j.pill === 'Expired').length === 2 && jobs.some((j) => j.pill === 'Confirmed' && j.payout === '$200'), '[T] T01: no request, two Expired rows, the seed job untouched', `jobs=${jobs.map((j) => `${j.pill}/${j.payout}`).join(', ')}`);
  }
  /* R3-T-02c: a request that lapses while Marco's proposal is pending keeps the proposal on record */
  {
    const r = await page.evaluate(() => {
      const S = window.__sync; const s = window.Taily.state;
      const a = s.past.find((x) => x.mine && S.canonicalStatus(x.status) === 'expired');
      const b = JSON.parse(JSON.stringify(a)); delete b.status; delete b.cancelledBy; delete b.reason; delete b.cancelledAt; delete b.wasRequested; delete b.lapsedProposal;
      b.status = 'searching'; b.when = 'Dec 1, 9:30 AM'; b.needBy = 'Dec 3, 9:30 AM'; b.tailor = {};
      s.upcoming.unshift(b);
      const ok = S.proposeTime(b, 'Dec 2, 10:00 AM');
      S.expireAppointment(b);
      return { ok, status: S.canonicalStatus(b.status), lapsed: b.lapsedProposal?.when, proposed: b.proposed };
    });
    log(r.ok && r.status === 'expired' && r.lapsed === 'Dec 2, 10:00 AM' && r.proposed == null, '[S] expireAppointment keeps the pending proposal as a.lapsedProposal', JSON.stringify(r));
    await flip();
    await render('09-bookings');
    const cards = await q('bookings');
    /* R6: the proposing tailor was never named — "a tailor" */
    log(cards.past.some((x) => x.pill === 'Expired' && x.meta === 'Request expired · a tailor’s proposed time went unanswered'), '[C] 09 Expired card names the unanswered proposal (no name, R6)', `past=${cards.past.map((x) => x.meta).join(' | ')}`);
    await openBookingsCard('[C] open it', { pill: 'Expired', meta: 'Request expired · a tailor’s proposed time went unanswered' });
    await assertAt('[C] → 03/Cancelled (expired)', '03-status-cancelled', 'expired');
    assertIncludes('[C] 03/Cancelled body: A tailor proposed … but the request lapsed', await q('text', '.status-hero__body'), 'A tailor proposed Wed, Dec 2 · 10:00 AM but the request lapsed before you answered.');
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
  assertIncludes('[T] T03B body names the slot (R3-T-05)', await q('text', '.status-hero__body'), `Your ${await fmtWhen(a.when)} slot is open again.`);
  await assertTrue('[T] T03B body: no deposit, no amount (R7)', () => !/deposit|\$\d/i.test(document.querySelector('.status-hero__body').textContent));
  {
    const t = await terminalPlacement();
    const f = await shared();
    log(t.status === 'cancelled' && t.by === 'tailor' && t.reason === 'cant-make-it' && !t.wasRequested && t.inPast && t.notUpcoming && t.stash, '[S] tailorCancels(cant-make-it): past[0] + lastCancelled', JSON.stringify(t));
    log(f?.refund === 25 && f.feeKept === false, '[S] tailor cancel: refund = $25, feeKept false (R7)', `refund=${f?.refund} kept=${f?.feeKept}`);
  }
  await page.click('[data-act="home"]');
  await assertAt('[T] Back to Home', 't01-home', 'cancelled');
  {
    const jobs = await q('jobCards');
    log(jobs.some((j) => j.pill === 'Cancelled' && j.right === 'Cancelled · by you' && j.payout === null), '[T] T01 row reads Cancelled · by you (closed row, no payout)', `jobs=${jobs.map((j) => `${j.pill}/${j.right}`).join(', ')}`);
  }
  await flip();
  await assertAt('[C] View as Customer (tailor cancelled)', '01-home', 'cancelled', 'user');
  await assertHomeOutcome('[C] 01 shows the Cancelled-by-Marco outcome above the seed (R3-U-03)', { pill: 'Cancelled', meta: 'Cancelled by Marco' });
  await openBookingsCard('[C] 09 Past card reads Cancelled by Marco', { pill: 'Cancelled', meta: 'Cancelled by Marco' });
  await assertAt('[C] card → 03/Cancelled', '03-status-cancelled', 'cancelled');
  await assertText('[C] 03/Cancelled tailor-cancelled title', '.status-hero__title', 'Marco had to cancel');
  await assertText('[C] 03/Cancelled pill', '.status-hero .pill span:last-child', 'Cancelled');
  assertEq('[C] 03/Cancelled body: the CHARGED fee is refunded (R7)', await q('text', '.status-hero__body'), 'Your $25 visitation fee is refunded to Apple Pay. We can find you another tailor.');
  assertEq('[C] 03/Cancelled keeps Alterations (est.) + the fee row, no Total (R7-U-04)', await q('fees'), '$240 $25');
  assertIncludes('[C] 03/Cancelled fee row reads Refunded (R7)', (await q('feeDescs'))[1], 'Visitation fee — Refunded');
  assertEq('[C] 03/Cancelled: no refund card (the body says it)', await q('count', '.prepare-card'), 0);
  await assertText('[C] 03/Cancelled primary CTA', '[data-act="rerequest"]', 'Find Another Tailor');
  await page.click('[data-act="rerequest"]');
  const c = await rebookFrom02('Find Another Tailor');

  /* no-show on the re-booked visit */
  const d = await tailorAccepts(c);
  await customerSeesConfirmed(d);
  await tailorOpensPreVisit(d);
  /* R3-T-05: the no-show row is gated on the visit time — when the run
     happens before the (today, 9:30 AM) visit, prove the gate, then let
     the visit pass and reopen the modal */
  await page.click('[data-act="cant-make-it"]');
  await assertOverlay('[T]   …Can’t make it modal', 't03.1-cant-make-it');
  {
    const ahead = await page.evaluate(() => { const a = window.__shared(); return (window.__data.parseWhen(a.when)?.date.getTime() ?? 0) > Date.now(); });
    const disabled = await page.evaluate(() => { const el = document.querySelector('[data-reason="no-show"]'); return !!el && (el.disabled || el.getAttribute('aria-disabled') === 'true'); });
    log(disabled === ahead, `[T] no-show row ${ahead ? 'disabled while the visit is ahead' : 'enabled once the visit time has passed'} (R3-T-05)`, `ahead=${ahead} disabled=${disabled}`);
    if (ahead) {
      assertIncludes('[T]   …the row says when it opens', await q('text', '[data-reason="no-show"]'), 'Available after');
      await page.click('[data-act="go-back"]');
      await page.waitForTimeout(400);
      await page.evaluate(() => { const a = window.__shared(); a.when = a.when.replace(/\d{1,2}:\d{2} [AP]M$/, '12:05 AM'); });   // the visit time passes
      await render('t03-request-accepted');
    } else {
      await page.click('[data-act="go-back"]');
      await page.waitForTimeout(400);
    }
  }
  /* R7: a no-show keeps the fee ONLY once Sarah confirmed the visit — prove the
     unlocked rule in the substrate first, then lock this visit and no-show it */
  {
    const r = await page.evaluate(() => {
      const S = window.__sync; const s = window.Taily.state;
      const a = window.__shared();
      const ghost = JSON.parse(JSON.stringify(a)); ghost.when = 'Dec 1, 9:30 AM'; ghost.needBy = 'Dec 3, 9:30 AM'; delete ghost.feeLocked; delete ghost.confirmedAt;
      s.upcoming.push(ghost);
      const res = S.tailorCancels(ghost, 'no-show');
      s.past.splice(s.past.indexOf(ghost), 1); s.lastCancelled = null;
      return { refund: res?.refund, kept: res?.kept, feeKept: ghost.feeKept };
    });
    log(r.refund === 25 && r.kept === false && r.feeKept === false, '[S] no-show BEFORE the visit is confirmed: fee refunded (R7)', JSON.stringify(r));
    const lock = await page.evaluate(() => { const a = window.__shared(); return window.__sync.confirmAppointment(a) && a.feeLocked === true; });
    log(lock, '[S] Sarah confirms the visit (feeLocked) before the no-show', '');
  }
  const dd = await shared();
  await tailorCantMakeIt('no-show');
  await assertText('[T] T03B no-show title', '.status-hero__title', 'Sarah didn’t show.');
  /* R7: nothing about Sarah's fee on Marco's side; R8: the trip compensation is named */
  await assertText('[T] T03B no-show body: the $20 trip compensation, nothing about the fee (R7/R8)', '.status-hero__body', 'The job is closed and the slot is open again. You’ll receive $20 for the trip.');
  {
    const t = await terminalPlacement();
    const f = await shared();
    log(t.status === 'cancelled' && t.by === 'tailor' && t.reason === 'no-show' && t.inPast && t.stash, '[S] tailorCancels(no-show): past[0] + lastCancelled', JSON.stringify(t));
    log(f?.refund === 0 && f.feeKept === true, '[S] no-show after confirming: refund 0, feeKept true (R7)', `refund=${f?.refund} kept=${f?.feeKept}`);
    log(f?.noShowComp === 20 && f.totals?.visitFee === 25, '[S] no-show stamps a.noShowComp = 20 on the $25 tier (R8); Sarah’s fee record unchanged', `noShowComp=${f?.noShowComp} visitFee=${f?.totals?.visitFee}`);
  }
  await page.click('[data-act="calendar"]');
  /* R3-T-06: View Calendar behaves like the Calendar tab — the soonest open job (the seed's pre-visit) */
  await assertAt('[T] View Calendar → the seed’s upcoming visit (Calendar tab, R3-T-06)', 't03-request-accepted', 'cancelled');
  await render('t01-home');
  {
    const jobs = await q('jobCards');
    log(jobs.some((j) => j.pill === 'Cancelled' && j.right === 'No-show · $20') && jobs.some((j) => j.right === 'Cancelled · by you'), '[T] T01 rows: No-show · $20 (R8) and Cancelled · by you', `jobs=${jobs.map((j) => `${j.pill}/${j.right}`).join(', ')}`);
  }
  await flip();
  await assertAt('[C] View as Customer (no-show)', '01-home', 'cancelled', 'user');
  await render('09-bookings');
  {
    const cards = await q('bookings');
    log(cards.past.some((x) => x.pill === 'Cancelled' && x.meta === 'Missed appointment') && cards.past.some((x) => x.pill === 'Cancelled' && x.meta === 'Cancelled by Marco'), '[C] 09 Past: Missed appointment + Cancelled by Marco', `past=${cards.past.map((x) => `${x.pill}/${x.meta}`).join(', ')}`);
  }
  await render('01-home');
  await assertHomeOutcome('[C] 01 shows the Missed-appointment outcome above the seed (R3-U-03)', { pill: 'Cancelled', meta: 'Missed appointment' });
  await openBookingsCard('[C] 09 Missed appointment card', { pill: 'Cancelled', meta: 'Missed appointment' });
  await assertAt('[C] card → 03/Cancelled', '03-status-cancelled', 'cancelled');
  await assertText('[C] 03/Cancelled no-show title (R3-U-08)', '.status-hero__title', 'We missed you');
  assertEq('[C] 03/Cancelled no-show body dates the visit, fee kept (R7)', await q('text', '.status-hero__body'), `Marco marked the ${await fmtWhen(dd.when)} visit as a no-show, so your $25 visitation fee was kept.`);
  assertEq('[C] 03/Cancelled keeps Alterations (est.) + the fee row, no Total (R7-U-04)', await q('fees'), '$240 $25');
  assertEq('[C] 03/Cancelled fee row reads Kept (R7)', (await q('feeDescs'))[1], 'Visitation fee — Kept');
  await assertText('[C] 03/Cancelled primary CTA', '[data-act="rerequest"]', 'Find Another Tailor');
  /* R8: the compensation is between Taily and Marco — nothing of it reaches Sarah's screens */
  await assertTrue('[C] 03/Cancelled says nothing about the tailor’s trip compensation (R8)', () => !/trip|protection|No-show ·|\$20\b/.test(document.querySelector('.screen').innerText));
  await render('09-bookings');
  await assertTrue('[C] 09 says nothing about the tailor’s trip compensation (R8)', () => !/trip|protection|\$20\b/.test(document.querySelector('.screen').innerText));
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
  assertEq('[T] T06 CTAs lead with Message Sarah, Edit Details next (round 10)', (await q('texts', '.t-actions .cta')).join(' | '), 'Message Sarah | Edit Details | Mark Ready | Back to Appointments');
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
  await assertAt('[C] card → 04/Modified directly (round 10)', '04-review-approve-modified', 'awaiting-approval');
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
  assertEq('[T] T04 payout recomputes ($120, R7)', await q('fees'), '$120');
  await page.click('[data-act="continue"]');
  await assertAt('[T] Continue → T05', 't05-confirm-final-pricing', 'confirmed');
  assertEq('[T] T05 cards = the survivor', await q('count', '.garment-card'), 1);
  assertEq('[T] T05 survivor is not marked added (matched by id)', await q('count', '.garment-card--info'), 0);
  await assertText('[T] T05 lists the removal', '.t-removed__row span', 'Removed at the visit — Pants / Jeans · Hem / Adjust Length');
  await assertText('[T] T05 removal price struck', '.t-removed__row s', '$120');
  assertEq('[T] T05 payout row (R7)', await q('fees'), '$120');
  await page.click('[data-act="send"]');
  await assertAt('[T] Send → T06 awaiting approval', 't06-appointment-status', 'awaiting-approval', 'tailor');
  {
    const f = await shared();
    log(f?.removed?.length === 1 && f.removed[0].type === 'Pants / Jeans' && f.removed[0].amount === 120 && f.garments.length === 1 && f.count === 1 && f.totals?.alterations === 120 && f.totals.visitFee === 25 && f.totals.visitFeeAdded === 0 && f.totals.total === 145 && f.booked?.length === 2,
      '[S] Send wrote a.removed + the 1-garment order (fee stays $25, booked kept, R7)', `removed=${JSON.stringify(f?.removed)} garments=${f?.garments?.length} count=${f?.count} alterations=${f?.totals?.alterations} fee=${f?.totals?.visitFee}`);
  }
  await assertText('[T] T06 job right slot follows the final order', '.job-card__bottom > span:last-child', '1 Suit Jacket');
  await assertText('[T] T06 job payout (R7)', '.job-card__payout', '$120');

  await flip();
  await assertAt('[C] View as Customer (awaiting approval)', '01-home', 'awaiting-approval', 'user');
  await assertText('[C] 01 card pill', '.appt-card .pill span:last-child', 'Awaiting Approval');
  assertIncludes('[C] 01 card items title follows the final order (1 item)', await q('text', '.appt-card'), '1 Item Total - Home Visit:');
  await assertTrue('[C] 01 card no longer lists the Pants / Jeans', () => !document.querySelector('.appt-card').textContent.includes('Pants / Jeans'));
  await page.click('.appt-card');
  await assertAt('[C] card → 04/Modified directly (a removal is a modification; round 10)', '04-review-approve-modified', 'awaiting-approval');
  assertEq('[C] 04/Modified cards = the survivor', await q('count', '.garment-card'), 1);
  assertEq('[C] 04/Modified lists one removal', await q('count', '.removed-row'), 1);
  await assertText('[C] 04/Modified removal line', '.removed-row span', 'Removed at the visit — Pants / Jeans · Hem / Adjust Length');
  await assertText('[C] 04/Modified removal price struck', '.removed-row s', '$120');
  assertEq('[C] 04/Modified alterations / fee / total / due (R7)', await q('fees'), '$120 $25 $145 $120');
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
    log(j?.pill === 'Tailoring' && j.right === '1 Suit Jacket' && j.payout === '$120', '[T] T01 job card follows the 1-garment order (R7)', `first=${j?.pill}/${j?.right}/${j?.payout}`);
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
